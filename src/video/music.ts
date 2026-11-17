#!/usr/bin/env node
/**
 * `npm run video:music -- <dự án>` — nhạc nền không lời bằng ElevenLabs Music.
 *
 * Mood lấy từ dòng `music:` trong frontmatter STORYBOARD.md. Độ dài = tổng
 * giọng + 4s.
 *
 * HAI CỬA MỞ RA cho phim không phải phim giải thích, thêm ngày 17/11/2026:
 *   music_prompt:  thay TRỌN câu mô tả, bỏ hẳn phần bọc "news explainer ... sits
 *                  under a voiceover" phía dưới. Phần bọc đó đóng công cụ vào đúng
 *                  một thể loại, nên nó chỉ đẻ ra nhạc nền chứ không đẻ ra xương sống.
 *   music_length:  thay độ dài, tính bằng giây. Phim 30 giây chỉ có 11,7 giây lời,
 *                  lấy "tổng giọng + 4" thì nhạc dài 15,7 giây trên một phim 30 giây. Ghi assets/bgm/bgm.mp3 và gắn vào audio_meta.json (âm lượng 0.14,
 * nằm dưới giọng đọc). Đã có file thì bỏ qua, muốn tạo lại thì xoá file.
 */

import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, durationSec, projectDir, readAudioMeta, writeAudioMeta } from "./lib.js";

config({ path: join(REPO_ROOT, ".env.local"), quiet: true });

const BGM_VOLUME = 0.14;
const DEFAULT_MOOD = "warm news underscore, light pulsing synth, steady 100bpm, hopeful";

async function main(): Promise<void> {
  const dir = projectDir(process.argv[2], "Dùng: npm run video:music -- <thư mục dự án>");
  const out = join(dir, "assets", "bgm", "bgm.mp3");
  const meta = readAudioMeta(dir);
  const voiceTotal = meta.voices.reduce((a, v) => a + v.duration_s, 0);
  if (!voiceTotal) throw new Error("chưa có giọng đọc, chạy npm run video:voice trước");

  if (!existsSync(out)) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("thiếu ELEVENLABS_API_KEY trong .env.local");
    const sb = readFileSync(join(dir, "STORYBOARD.md"), "utf8");
    const tron = sb.match(/^music_prompt:\s*(.+)$/m)?.[1]?.trim();
    const mood = sb.match(/^music:\s*(.+)$/m)?.[1]?.trim() || DEFAULT_MOOD;
    const prompt =
      tron ??
      (`Background underscore for a Vietnamese TikTok news explainer. ${mood}. ` +
        "Subtle build in the middle, gentle resolve at the end. Instrumental only, no vocals, sits under a voiceover.");
    const daiRieng = Number(sb.match(/^music_length:\s*([\d.]+)/m)?.[1]);
    const lengthMs = Math.min(
      300_000,
      Math.round((daiRieng > 0 ? daiRieng : voiceTotal + 4) * 1000),
    );
    console.log(`… ElevenLabs Music ${Math.round(lengthMs / 1000)}s: ${tron ? "câu mô tả riêng" : mood}`);
    const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, music_length_ms: lengthMs, force_instrumental: true }),
    });
    if (!res.ok) throw new Error(`ElevenLabs Music HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    mkdirSync(join(dir, "assets", "bgm"), { recursive: true });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  } else {
    console.log("✓ đã có assets/bgm/bgm.mp3, không tạo lại");
  }
  const dur = await durationSec(out);
  writeAudioMeta(dir, {
    ...readAudioMeta(dir),
    bgm: { path: "assets/bgm/bgm.mp3", volume: BGM_VOLUME, query: "elevenlabs music", duration_s: +dur.toFixed(3) },
    bgm_pending: false,
  });
  console.log(`✓ nhạc nền ${dur.toFixed(1)}s → audio_meta.json`);
}

main().catch((e) => {
  console.error(`✗ video:music: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
