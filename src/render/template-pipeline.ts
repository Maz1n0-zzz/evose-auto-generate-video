import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import pLimit from "p-limit";
import { TemplateScriptSchema, type TemplateScript } from "./template-script-schema.js";
import { loadConfig } from "../config.js";
import { createTtsClient, type AlignedTake, type TtsClient } from "../tts/tts-client.js";
import { joinTake, sliceRanges, findSpokenTags } from "../tts/single-take.js";
import {
  getDurationSec,
  concatWithSilence,
  mixSfxOntoVoice,
  makeSilence,
  padSilence,
  cutAudio,
  type SfxMixSpec,
} from "../assets/audio-tools.js";
import { indexSfxLibrary, pickSfxForScene, defaultPlayback } from "../assets/sfx-selector.js";
import { composeTemplate } from "./template-composer.js";
import { fitClipToDuration, concatVideos, muxAudioOntoVideo } from "./video-tools.js";
import { log } from "../utils/logger.js";
import { runBrandFinalize } from "./brand-finalize.js";
import { hasAudioTags, stripAudioTags } from "../utils/audio-tags.js";


const TOTAL_STEPS = 8;
const SCENE_GAP_SEC = 0.3;
// Cảnh cuối đứng hình thêm bấy nhiêu giây sau khi hết tiếng. Để 3 giây thì
// đoạn cuối im lặng dài lê thê; 1.2 giây đủ để kết mà không hẫng.
const OUTRO_HOLD_SEC = 1.2;
const RENDER_FPS = 30;

/**
 * Lời dài quá bấy nhiêu ký tự thì không đọc một lần được nữa.
 *
 * `eleven_v3` là model chặt tay nhất trong số đang dùng (khoảng 3000 ký tự cho
 * một lần gọi). Để chừa biên vì ký tự ngăn giữa các cảnh cũng tính vào.
 */
const MAX_TAKE_CHARS = 2900;

/**
 * Đọc lại tối đa bấy nhiêu lần khi model lỡ đọc to thẻ cảm xúc.
 *
 * Đo thật thì bốn lần chạy mới trượt một lần, nên hai lượt là đủ để xác suất
 * hỏng gần như bằng không. Hết lượt thì bỏ thẻ rồi đọc lại — lần đó chắc chắn
 * sạch vì không còn thẻ nào để đọc nhầm.
 */
const TAKE_ATTEMPTS_WITH_TAGS = 2;

/**
 * Nối thêm lặng vào cuối file giọng của một cảnh, tại chỗ.
 *
 * Dùng khi cảnh cần đứng hình lâu hơn lời đọc. Kéo dài bằng chính file giọng
 * (chứ không chỉ kéo phần hình) để hình và tiếng các cảnh sau không lệch nhau.
 */
async function applyPad(audioPath: string, padSec: number, sceneId: string): Promise<void> {
  if (padSec <= 0) return;
  const tmp = audioPath.replace(/\.mp3$/, "-pad.mp3");
  await padSilence(audioPath, padSec, tmp);
  const { rename } = await import("node:fs/promises");
  await rename(tmp, audioPath);
  log.info(`  scene ${sceneId}: nối thêm ${padSec}s lặng`);
}

/**
 * Đọc cả bài MỘT LẦN rồi cắt ra từng cảnh.
 *
 * Đây là cách duy nhất giữ ngữ điệu liền mạch với `eleven_v3` — model này từ
 * chối mọi cơ chế nối giữa các lần gọi. Cả bài là một mạch đọc, không còn chỗ
 * nào để model chọn lại giọng.
 *
 * Trả về tập id các cảnh đã ghi được, hoặc tập rỗng nếu không dùng cách này
 * (client không hỗ trợ, chỉ có một cảnh có lời, hoặc lời quá dài) — khi đó
 * pipeline tự quay về cách gọi từng cảnh.
 */
async function renderSingleTake(
  ttsClient: TtsClient,
  scenes: readonly { id: string; voiceText: string; padSec: number }[],
  voiceDir: string,
  keepTags: boolean,
): Promise<Set<string>> {
  const none = new Set<string>();
  if (typeof ttsClient.generateAlignedTake !== "function") return none;

  const voiced = scenes.filter((s) => s.voiceText.trim());
  // Một cảnh thì không có chỗ chuyển nào để lệch — gọi thường cho nhẹ.
  if (voiced.length < 2) return none;

  const withTags = joinTake(
    voiced.map((s) => ({
      id: s.id,
      text: keepTags ? s.voiceText : stripAudioTags(s.voiceText),
    })),
  );
  if (withTags.text.length > MAX_TAKE_CHARS) {
    log.info(
      `  lời dài ${withTags.text.length} ký tự, quá mức đọc một lần (${MAX_TAKE_CHARS}) — ` +
        `quay về gọi từng cảnh, ngữ điệu sẽ lệch ở chỗ chuyển cảnh`,
    );
    return none;
  }

  log.info(`  đọc MỘT LẦN cả bài: ${voiced.length} cảnh, ${withTags.text.length} ký tự`);

  // eleven_v3 thỉnh thoảng ĐỌC TO thẻ cảm xúc thay vì hiểu là chỉ dẫn — đã gặp
  // `[curious]` phát ra thành tiếng ngay đầu video. Bảng mốc thời gian cho biết
  // ngay điều đó, nên kiểm rồi đọc lại chứ không giao video hỏng.
  let joined = withTags;
  let take: AlignedTake | undefined;
  for (let attempt = 1; attempt <= TAKE_ATTEMPTS_WITH_TAGS; attempt++) {
    const candidate = await ttsClient.generateAlignedTake(joined.text);
    const spoken = findSpokenTags(joined.text, candidate.charStartSec, candidate.charEndSec);
    if (spoken.length === 0) {
      take = candidate;
      break;
    }
    const which = spoken.map((t) => `${t.literal} ${t.durationSec.toFixed(2)}s`).join(", ");
    log.info(`  ⚠ model ĐỌC TO thẻ cảm xúc (${which}) — đọc lại (lần ${attempt})`);
  }

  if (!take) {
    // Đọc lại mấy lần vẫn hỏng thì bỏ hẳn thẻ. Không còn thẻ thì không còn gì
    // để đọc nhầm — thà mất phần chỉ dẫn diễn xuất còn hơn giao video lỗi.
    log.info("  ⚠ bỏ thẻ cảm xúc rồi đọc lại — mất biểu cảm nhưng chắc chắn sạch");
    joined = joinTake(voiced.map((s) => ({ id: s.id, text: stripAudioTags(s.voiceText) })));
    take = await ttsClient.generateAlignedTake(joined.text);
  }

  const takePath = join(voiceDir, "_take.mp3");
  await writeFile(takePath, take.audio);

  const ranges = sliceRanges(joined.spans, take.charStartSec, take.charEndSec);
  const byId = new Map(voiced.map((s) => [s.id, s]));
  for (const r of ranges) {
    const out = join(voiceDir, `scene-${r.id}.mp3`);
    await cutAudio(takePath, r.startSec, r.endSec, out);
    log.info(`  scene ${r.id}: cắt ${r.startSec.toFixed(2)}s → ${r.endSec.toFixed(2)}s`);
    await applyPad(out, byId.get(r.id)!.padSec, r.id);
  }
  return new Set(ranges.map((r) => r.id));
}

/** Maps a scene role to a key the SFX selector understands (tier-3 defaults). */
const TYPE_TO_SFX: Record<string, string> = {
  hook: "hook",
  body: "callout",
  outro: "outro",
};


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
  // Bỏ thẻ cảm xúc: file này để CapCut bắt phụ đề, thẻ mà lọt vào sẽ hiện
  // lên màn hình.
  await writeFile(
    join(outputDir, "script.txt"),
    script.scenes.map((s) => stripAudioTags(s.voiceText)).join("\n\n"),
  );

  // STEP 3 — TTS per scene (idempotent)
  log.step(3, TOTAL_STEPS, "TTS each scene");
  const ttsClient = createTtsClient(cfg);
  // Chỉ vài MODEL hiểu thẻ cảm xúc (hiện chỉ eleven_v3). Model không hiểu sẽ
  // ĐỌC TO chữ trong ngoặc vuông, nên phải bỏ thẻ trước khi gửi.
  const keepTags = ttsClient.supportsAudioTags?.() ?? false;
  const taggedScenes = script.scenes.filter((s) => hasAudioTags(s.voiceText)).length;
  if (taggedScenes > 0 && !keepTags) {
    const which =
      cfg.ttsProvider === "elevenlabs" ? `model "${cfg.elevenlabsModelId}"` : `provider "${cfg.ttsProvider}"`;
    log.info(`  ${taggedScenes} cảnh có thẻ cảm xúc — ${which} không hiểu, sẽ bỏ thẻ`);
  }
  const voiceDir = join(outputDir, "voice");
  await mkdir(voiceDir, { recursive: true });

  // Đọc MỘT LẦN cả bài rồi cắt theo cảnh — cách duy nhất giữ ngữ điệu liền
  // mạch với eleven_v3. Chỉ chạy khi có cảnh nào đó chưa có file giọng: đã đủ
  // file thì dùng lại, mà thiếu dù chỉ một cảnh cũng phải đọc lại CẢ BÀI, vì
  // đọc bù riêng một cảnh thì đúng vào chỗ ngữ điệu sẽ lệch.
  const missingVoice = script.scenes.some(
    (s) => s.voiceText.trim() && !existsSync(join(voiceDir, `scene-${s.id}.mp3`)),
  );
  const fromTake = missingVoice
    ? await renderSingleTake(ttsClient, script.scenes, voiceDir, keepTags)
    : new Set<string>();

  // Nối ngữ điệu bằng request-id: cho model nghe lại chính đoạn vừa tạo. Chỉ
  // đúng khi các cảnh gọi lần lượt, vì phải có kết quả cảnh trước mới gọi được
  // cảnh sau — nên bật cái này thì bỏ qua TTS_CONCURRENCY. Đọc một lần được
  // rồi thì không cần tới nữa.
  const chaining = fromTake.size === 0 && (ttsClient.supportsRequestIdChaining?.() ?? false);
  if (chaining) {
    log.info(
      cfg.ttsConcurrency > 1
        ? `  nối ngữ điệu bằng request-id — ép gọi tuần tự (bỏ TTS_CONCURRENCY=${cfg.ttsConcurrency})`
        : "  nối ngữ điệu bằng request-id",
    );
  }
  const limit = pLimit(chaining ? 1 : cfg.ttsConcurrency);
  // Id các lần gọi đã xong trong LẦN CHẠY NÀY, cũ nhất trước. Client tự cắt cho
  // vừa giới hạn của API.
  let chainIds: readonly string[] = [];
  const sceneAudio = await Promise.all(
    script.scenes.map((scene, idx) =>
      limit(async () => {
        const out = join(voiceDir, `scene-${scene.id}.mp3`);
        const srtOut = join(voiceDir, `scene-${scene.id}.srt`);
        if (existsSync(out)) {
          const dur = await getDurationSec(out);
          // Cảnh vừa cắt ra từ bản đọc chung đã tự log rồi, đừng báo REUSE
          // nghe như dùng lại file cũ.
          if (!fromTake.has(scene.id)) {
            log.info(`  scene ${scene.id}: REUSE mp3 (${dur.toFixed(2)}s)`);
          }
          // Không sinh ra id mới, mạch đứt ở đây. Xoá chuỗi thay vì để cảnh sau
          // nối vào id của một cảnh xa hơn — nối sai còn tệ hơn không nối.
          chainIds = [];
          return { id: scene.id, path: out, durationSec: dur };
        }
        // Cảnh câm: dựng đoạn lặng thay vì gọi TTS. Vì vẫn sinh ra một file
        // giọng thật nên mốc thời gian và bước cắt clip phía sau không đổi.
        if (!scene.voiceText.trim()) {
          log.info(`  scene ${scene.id}: CÂM ${scene.silentSec}s (không gọi TTS)`);
          await makeSilence(scene.silentSec, out);
          chainIds = [];
          return { id: scene.id, path: out, durationSec: scene.silentSec };
        }
        const spoken = keepTags ? scene.voiceText : stripAudioTags(scene.voiceText);
        log.info(`  TTS scene ${scene.id} (${spoken.length} chars)...`);
        // Cấp lời cảnh trước/sau để ngữ điệu nối liền giữa các cảnh.
        const neighbour = (k: number) => {
          const sc = script.scenes[k];
          if (!sc || !sc.voiceText.trim()) return undefined;
          return stripAudioTags(sc.voiceText);
        };
        const tts = await ttsClient.generate(spoken, out, srtOut, {
          previousText: neighbour(idx - 1),
          nextText: neighbour(idx + 1),
          previousRequestIds: chaining ? [...chainIds] : undefined,
        });
        chainIds = tts.requestId ? [...chainIds, tts.requestId] : [];
        await applyPad(out, scene.padSec, scene.id);
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
        // Cấp độ dài cảnh cho template. Cần cho những frame có animation phải
        // chạy trọn cảnh (vd evose-screenshot cuộn dọc): template không tự
        // biết clip sẽ bị cắt còn bao nhiêu, mà ở đây thì biết rồi vì lời đọc
        // đã sinh xong ở bước 3. Tác giả điền tay `duration` thì cái đó thắng.
        inputs: { sceneDurationSec: Number(visualDur.toFixed(2)), ...scene.inputs },
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

  // EVOSE: overlay (tuỳ script) + nhạc nền
  try {
    const videoDurationSec = await getDurationSec(silentVideo);
    await runBrandFinalize({
      outputDir,
      videoPath,
      durationSec: videoDurationSec,
      useOverlay: script.brand.overlay,
      style: script.brand.style,
    });
  } catch (e) {
    console.error("[evose] Bước hoàn thiện lỗi (video.mp4 vẫn dùng được):", e);
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
