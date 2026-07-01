import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import pLimit from "p-limit";
import { TemplateScriptSchema, type TemplateScript } from "./template-script-schema.js";
import { loadConfig } from "../config.js";
import { createTtsClient } from "../tts/tts-client.js";
import {
  getDurationSec,
  concatWithSilence,
  mixSfxOntoVoice,
  type SfxMixSpec,
} from "../assets/audio-tools.js";
import { indexSfxLibrary, pickSfxForScene, defaultPlayback } from "../assets/sfx-selector.js";
import { composeTemplate } from "./template-composer.js";
import { fitClipToDuration, concatVideos, muxAudioOntoVideo } from "./video-tools.js";
import { log } from "../utils/logger.js";
import { spawn as evoseSpawn } from "node:child_process";
import { existsSync as evoseExists } from "node:fs";


const TOTAL_STEPS = 8;
const SCENE_GAP_SEC = 0.3;
const OUTRO_HOLD_SEC = 3;
const RENDER_FPS = 30;

/** Maps a scene role to a key the SFX selector understands (tier-3 defaults). */
const TYPE_TO_SFX: Record<string, string> = {
  hook: "hook",
  body: "callout",
  outro: "outro",
};


// ============================================================
// EVOSE BRAND: overlay header/footer + background music (auto)
// ============================================================
async function evoseFinalize(outputDir: string, videoPath: string, voiceMp3: string, durationSec: number): Promise<void> {
  const path = await import("node:path");
  const repoRoot = path.resolve(outputDir, "..", "..");
  const kitDir = path.join(repoRoot, "evose-brand-kit");
  const overlayPng = path.join(kitDir, "overlays", "overlay-frame.png");
  const musicMp3 = path.join(kitDir, "music", "background.mp3");
  const finalOut = path.join(outputDir, "video-evose.mp4");

  const hasOverlay = evoseExists(overlayPng);
  const hasMusic = evoseExists(musicMp3);

  console.log(`\n[evose] Finalize: overlay=${hasOverlay} music=${hasMusic}`);
  if (!hasOverlay && !hasMusic) {
    console.log("[evose] Skipping finalize (no overlay/music found).");
    return;
  }

  const args: string[] = ["-y", "-loglevel", "warning"];
  args.push("-i", videoPath);
  if (hasOverlay) args.push("-i", overlayPng);
  if (hasMusic) args.push("-stream_loop", "-1", "-i", musicMp3);

  const filters: string[] = [];
  let vmap = "0:v";
  if (hasOverlay) {
    filters.push("[0:v][1:v]overlay=0:0:format=auto[vovr]");
    vmap = "[vovr]";
  }
  let amap = "0:a";
  if (hasMusic) {
    const mi = hasOverlay ? 2 : 1;
    filters.push(
      `[${mi}:a]volume=0.28[mus];` +
      `[0:a]asplit=2[vm][vs];` +
      `[mus][vs]sidechaincompress=threshold=0.04:ratio=10:attack=80:release=400[md];` +
      `[vm][md]amix=inputs=2:duration=first:dropout_transition=0[ao]`
    );
    amap = "[ao]";
  }
  if (filters.length) args.push("-filter_complex", filters.join(";"));
  args.push("-map", vmap, "-map", amap);
  args.push("-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p");
  args.push("-c:a", "aac", "-b:a", "192k");
  args.push("-t", String(durationSec));
  args.push(finalOut);

  await new Promise<void>((resolve, reject) => {
    const proc = evoseSpawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"], shell: false });
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`evose finalize ffmpeg exit ${code}`)));
    proc.on("error", reject);
  });
  console.log(`[evose] OK Final video: ${finalOut}`);
}

export async function runTemplatePipeline(scriptPath: string): Promise<void> {
  const cfg = loadConfig();
  const outputDir = dirname(scriptPath);
  log.info(`Output directory: ${outputDir}`);

  // STEP 1 — load + validate
  log.step(1, TOTAL_STEPS, `Load + validate template script (TTS: ${cfg.ttsProvider})`);
  const raw = JSON.parse(await readFile(scriptPath, "utf8"));
  const script: TemplateScript = TemplateScriptSchema.parse(raw);

  // STEP 2 — script.txt for CapCut
  log.step(2, TOTAL_STEPS, "Write script.txt");
  await writeFile(join(outputDir, "script.txt"), script.scenes.map((s) => s.voiceText).join("\n\n"));

  // STEP 3 — TTS per scene (idempotent)
  log.step(3, TOTAL_STEPS, "TTS each scene");
  const ttsClient = createTtsClient(cfg);
  const limit = pLimit(cfg.ttsConcurrency);
  const voiceDir = join(outputDir, "voice");
  await mkdir(voiceDir, { recursive: true });
  const sceneAudio = await Promise.all(
    script.scenes.map((scene) =>
      limit(async () => {
        const out = join(voiceDir, `scene-${scene.id}.mp3`);
        const srtOut = join(voiceDir, `scene-${scene.id}.srt`);
        if (existsSync(out)) {
          const dur = await getDurationSec(out);
          log.info(`  scene ${scene.id}: REUSE mp3 (${dur.toFixed(2)}s)`);
          return { id: scene.id, path: out, durationSec: dur };
        }
        log.info(`  TTS scene ${scene.id} (${scene.voiceText.length} chars)...`);
        await ttsClient.generate(scene.voiceText, out, srtOut);
        const dur = await getDurationSec(out);
        log.info(`  scene ${scene.id}: ${dur.toFixed(2)}s`);
        return { id: scene.id, path: out, durationSec: dur };
      }),
    ),
  );

  // STEP 4 — concat voice + compute scene timings
  log.step(4, TOTAL_STEPS, "Concat voice + compute timings");
  const voiceRawMp3 = join(outputDir, "voice-raw.mp3");
  const voiceMp3 = join(outputDir, "voice.mp3");
  await concatWithSilence(sceneAudio.map((a) => a.path), SCENE_GAP_SEC, voiceRawMp3);

  let cursor = 0;
  const sceneStarts: Record<string, number> = {};
  for (const a of sceneAudio) {
    sceneStarts[a.id] = cursor;
    cursor += a.durationSec + SCENE_GAP_SEC;
  }

  // STEP 5 — SFX selection + mix
  log.step(5, TOTAL_STEPS, "Pick + mix SFX");
  const SFX_DIR = join(outputDir, "..", "..", "assets", "sfx");
  const sfxIndex = existsSync(SFX_DIR) ? indexSfxLibrary(SFX_DIR) : {};
  const sfxList: SfxMixSpec[] = [];
  for (const scene of script.scenes) {
    const startSec = sceneStarts[scene.id];
    if (scene.sfx) {
      if (scene.sfx.name === "none") continue;
      const p = join(SFX_DIR, `${scene.sfx.name}.mp3`);
      if (existsSync(p)) sfxList.push({ path: p, startSec: startSec + scene.sfx.startOffsetSec, volume: scene.sfx.volume });
      continue;
    }
    if (Object.keys(sfxIndex).length === 0) continue;
    const picked = pickSfxForScene({
      voiceText: scene.voiceText,
      templateName: TYPE_TO_SFX[scene.type] ?? "callout",
      sceneId: scene.id,
      index: sfxIndex,
    });
    if (!picked) continue;
    const pb = defaultPlayback(picked);
    sfxList.push({ path: join(SFX_DIR, picked.relPath), startSec: startSec + pb.offsetSec, volume: pb.volume });
  }
  await mixSfxOntoVoice(voiceRawMp3, sfxList, voiceMp3);
  const totalAudioSec = await getDurationSec(voiceMp3);
  log.info(`  voice.mp3: ${totalAudioSec.toFixed(2)}s, ${sfxList.length} SFX`);

  // STEP 6 — render each scene's template clip, fit to its narration length
  log.step(6, TOTAL_STEPS, "Render template clips + fit to narration");
  const clipsDir = join(outputDir, "clips");
  await mkdir(clipsDir, { recursive: true });
  const lastIdx = script.scenes.length - 1;
  const fittedClips: string[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const dur = sceneAudio.find((a) => a.id === scene.id)!.durationSec;
    const visualDur = dur + (i < lastIdx ? SCENE_GAP_SEC : OUTRO_HOLD_SEC);

    const rawClip = join(clipsDir, `scene-${scene.id}.mp4`);
    const fitClip = join(clipsDir, `scene-${scene.id}-fit.mp4`);
    // IDEMPOTENT: reuse an already-rendered clip. Delete it to force a
    // re-render after editing the scene's inputs or template.
    if (existsSync(rawClip)) {
      log.info(`  scene ${scene.id}: REUSE clip — delete to force re-render`);
    } else {
      await composeTemplate({
        templateId: scene.templateId,
        inputs: scene.inputs,
        aspect: script.aspect,
        outputPath: rawClip,
        fps: RENDER_FPS,
      });
    }
    let needFit = true;
    if (existsSync(fitClip)) {
      const existingDur = await getDurationSec(fitClip);
      if (Math.abs(existingDur - visualDur) < 0.05) {
        log.info(`  scene ${scene.id}: REUSE fit clip (${existingDur.toFixed(2)}s)`);
        needFit = false;
      }
    }
    if (needFit) {
      await fitClipToDuration(rawClip, visualDur, fitClip, RENDER_FPS, scene.type === "hook");
    }
    log.info(`  scene ${scene.id}: ${scene.templateId} → ${visualDur.toFixed(2)}s`);
    fittedClips.push(fitClip);
  }

  // STEP 7 — concat clips + mux voice
  log.step(7, TOTAL_STEPS, "Concat clips + mux audio");
  const silentVideo = join(outputDir, "video-silent.mp4");
  const videoPath = join(outputDir, "video.mp4");
  await concatVideos(fittedClips, silentVideo);
  await muxAudioOntoVideo(silentVideo, voiceMp3, videoPath);

  // EVOSE: auto overlay + music
  try {
    const videoDurationSec = await getDurationSec(silentVideo);
    await evoseFinalize(outputDir, videoPath, voiceMp3, videoDurationSec);
  } catch (e) {
    console.error("[evose] finalize failed (video.mp4 still OK):", e);
  }

  // STEP 8 — done
  log.step(8, TOTAL_STEPS, "Done");
  console.log("\n=== Result ===");
  console.log(`Video:  ${videoPath}`);
  console.log(`Video (Evose, FINAL):  ${join(outputDir, "video-evose.mp4")}  ← DÙNG FILE NÀY`);
  console.log(`Audio:  ${voiceMp3}  (cho CapCut)`);
  console.log(`Script: ${join(outputDir, "script.txt")}  (cho CapCut auto-caption)`);
  console.log(`Tong thoi luong: ${totalAudioSec.toFixed(2)}s`);
}
