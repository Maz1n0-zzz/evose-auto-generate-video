#!/usr/bin/env node
/**
 * `npm run video:voice -- <dự án>` — đọc SCRIPT.md bằng ElevenLabs.
 *
 * Đọc cả bài MỘT LẦN (cách duy nhất giữ ngữ điệu liền với eleven_v3), cắt theo
 * khung, gọt quãng lặng dài, rồi ghi:
 *   assets/voice/NN.mp3            giọng từng khung
 *   audio_meta.json                voices[] kèm mốc từng chữ (giữ nguyên bgm/sfx đã có)
 *   .hyperframes/words.txt         bảng mốc chữ dễ đọc, dùng để viết Scene timing
 *   STORYBOARD.md                  dòng `- duration:` đổi thành độ dài giọng thật
 *
 * Đã có đủ file giọng thì không gọi lại ElevenLabs (tốn tiền). Muốn đọc lại thì
 * xoá thư mục assets/voice.
 */

import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config.js";
import { createTtsClient, type AlignedTake } from "../tts/tts-client.js";
import { findSpokenTags, joinTake, sliceRanges } from "../tts/single-take.js";
import { cutAudio, detectSilences, getDurationSec, padSilence, removeSpans } from "../assets/audio-tools.js";
import { planCuts, remapWords, wordsOfScene } from "../timing/word-timing.js";
import { stripAudioTags } from "../utils/audio-tags.js";
import {
  REPO_ROOT,
  projectDir,
  readAudioMeta,
  syncDurations,
  writeAudioMeta,
  type VoiceEntry,
} from "./lib.js";
import { parseScript, type Script } from "./parse.js";

config({ path: join(REPO_ROOT, ".env.local"), quiet: true });

/** eleven_v3 nhận tối đa khoảng 3000 ký tự mỗi lần gọi. */
const MAX_TAKE_CHARS = 2900;
/** Model thỉnh thoảng đọc to thẻ cảm xúc; đọc lại tối đa bấy nhiêu lần trước khi bỏ thẻ. */
const TAKE_ATTEMPTS_WITH_TAGS = 2;

const pad2 = (n: number) => String(n).padStart(2, "0");

async function main(): Promise<void> {
  const dir = projectDir(process.argv[2], "Dùng: npm run video:voice -- <thư mục dự án>");
  const script = parseScript(readFileSync(join(dir, "SCRIPT.md"), "utf8"));
  const voiceDir = join(dir, "assets", "voice");
  mkdirSync(voiceDir, { recursive: true });
  const takeJson = join(voiceDir, "_take.json");

  const have = script.lines.every((l) => existsSync(join(voiceDir, `${pad2(l.frame)}.mp3`))) && existsSync(takeJson);
  if (!have) await readTake(script, voiceDir);
  else console.log("✓ đã có giọng, không gọi lại ElevenLabs (xoá assets/voice để đọc lại)");

  // Mốc từng chữ, đổi sang file đã gọt lặng.
  const take = JSON.parse(readFileSync(takeJson, "utf8"));
  const voices: VoiceEntry[] = [];
  const table: string[] = [];
  for (const l of script.lines) {
    const id = pad2(l.frame);
    const span = take.spans.find((s: { id: string }) => s.id === id);
    const range = take.ranges.find((r: { id: string }) => r.id === id);
    const cuts = JSON.parse(readFileSync(join(voiceDir, `${id}.cuts.json`), "utf8"));
    const text = take.text.slice(span.lo, span.hi + 1);
    const words = remapWords(wordsOfScene(text, span.lo, take.charStartSec, take.charEndSec, range.startSec), cuts);
    const path = `assets/voice/${id}.mp3`;
    const dur = Number((await getDurationSec(join(dir, path))).toFixed(3));
    voices.push({
      frame: l.frame,
      path,
      duration_s: dur,
      words: words.map((w, i) => ({ id: `w${i}`, text: w.text, start: +w.s.toFixed(3), end: +w.e.toFixed(3) })),
    });
    table.push(`Frame ${l.frame} (${dur}s): ${words.map((w) => `${w.text}@${w.s.toFixed(2)}`).join(" ")}`);
  }

  const meta = readAudioMeta(dir);
  writeAudioMeta(dir, { ...meta, voices });
  mkdirSync(join(dir, ".hyperframes"), { recursive: true });
  writeFileSync(join(dir, ".hyperframes", "words.txt"), table.join("\n\n") + "\n");

  const sbPath = join(dir, "STORYBOARD.md");
  if (existsSync(sbPath)) {
    const { md, updated } = syncDurations(readFileSync(sbPath, "utf8"), new Map(voices.map((v) => [v.frame, v.duration_s])));
    writeFileSync(sbPath, md);
    console.log(`✓ STORYBOARD.md: cập nhật ${updated} dòng duration`);
  }
  const total = voices.reduce((a, v) => a + v.duration_s, 0);
  console.log(`✓ ${voices.length} khung, tổng ${total.toFixed(2)}s → audio_meta.json, .hyperframes/words.txt`);
}

async function readTake(script: Script, voiceDir: string): Promise<void> {
  const cfg = loadConfig();
  const tts = createTtsClient(cfg);
  if (typeof tts.generateAlignedTake !== "function") {
    throw new Error(`TTS "${cfg.ttsProvider}" không hỗ trợ mốc từng chữ. Quy trình làm video cần ElevenLabs (TTS_PROVIDER=elevenlabs).`);
  }
  const keepTags = tts.supportsAudioTags?.() ?? false;
  const segs = script.lines.map((l) => ({ id: pad2(l.frame), text: keepTags ? l.text : stripAudioTags(l.text) }));
  let joined = joinTake(segs);
  if (joined.text.length > MAX_TAKE_CHARS) {
    throw new Error(`Lời dài ${joined.text.length} ký tự, quá mức đọc một lần (${MAX_TAKE_CHARS}). Rút gọn SCRIPT.md.`);
  }
  console.log(`… đọc MỘT LẦN ${segs.length} khung, ${joined.text.length} ký tự, tốc độ ${script.speed}`);

  let take: AlignedTake | undefined;
  for (let attempt = 1; attempt <= TAKE_ATTEMPTS_WITH_TAGS; attempt++) {
    const cand = await tts.generateAlignedTake(joined.text, { speed: script.speed });
    const spoken = findSpokenTags(joined.text, cand.charStartSec, cand.charEndSec);
    if (!spoken.length) {
      take = cand;
      break;
    }
    console.log(`⚠ model đọc to thẻ cảm xúc (${spoken.map((t) => t.literal).join(", ")}), đọc lại lần ${attempt}`);
  }
  if (!take) {
    console.log("⚠ bỏ thẻ cảm xúc rồi đọc lại, mất biểu cảm nhưng sạch");
    joined = joinTake(script.lines.map((l) => ({ id: pad2(l.frame), text: stripAudioTags(l.text) })));
    take = await tts.generateAlignedTake(joined.text, { speed: script.speed });
  }

  const takePath = join(voiceDir, "_take.mp3");
  writeFileSync(takePath, take.audio);
  const ranges = sliceRanges(joined.spans, take.charStartSec, take.charEndSec);
  writeFileSync(
    join(voiceDir, "_take.json"),
    JSON.stringify({ text: joined.text, spans: joined.spans, ranges, charStartSec: take.charStartSec, charEndSec: take.charEndSec }),
  );
  const padBy = new Map(script.lines.map((l) => [pad2(l.frame), l.padSec]));
  for (const r of ranges) {
    const out = join(voiceDir, `${r.id}.mp3`);
    const raw = join(voiceDir, `${r.id}-raw.mp3`);
    await cutAudio(takePath, r.startSec, r.endSec, raw);
    // Quãng nghỉ trên 0.3s thu về 0.3s. Chữ không bị tua nhanh.
    const cuts = planCuts(await detectSilences(raw), await getDurationSec(raw));
    await removeSpans(raw, cuts, out);
    writeFileSync(join(voiceDir, `${r.id}.cuts.json`), JSON.stringify(cuts));
    const pad = padBy.get(r.id) ?? 0;
    if (pad > 0) {
      const tmp = join(voiceDir, `${r.id}-pad.mp3`);
      await padSilence(out, pad, tmp);
      renameSync(tmp, out);
    }
    console.log(`  khung ${r.id}: ${r.startSec.toFixed(2)}–${r.endSec.toFixed(2)}s, gọt ${cuts.length} quãng lặng${pad ? `, nối ${pad}s lặng` : ""}`);
  }
}

main().catch((e) => {
  console.error(`✗ video:voice: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
