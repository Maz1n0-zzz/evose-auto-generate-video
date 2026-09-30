#!/usr/bin/env node
/**
 * `npm run video:sfx -- <dự án>` — đặt SFX theo dòng `- sfx:` của từng khung.
 *
 * Cú pháp: `- sfx: whoosh@0, pop@2.6, impact-bass-1@5.6` (tên @ giây tính từ
 * đầu khung). Tên lấy từ thư viện assets/sfx (xem assets/sfx/manifest.json). Ghi đè
 * phần sfx trong audio_meta.json, giữ nguyên giọng và nhạc.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SFX_LIB_DIR, durationSec, parseStoryboard, projectDir, readAudioMeta, writeAudioMeta, type SfxEntry } from "./lib.js";
import { parseCues } from "./parse.js";

/** Tiếng lớn và dài thì nhỏ hơn, để không át giọng. */
const VOLUME: Record<string, number> = {
  whoosh: 0.22,
  "whoosh-short": 0.22,
  "whoosh-cinematic": 0.22,
  "impact-bass-1": 0.3,
  "impact-bass-2": 0.3,
  riser: 0.2,
  "glitch-1": 0.18,
  "glitch-2": 0.18,
  "glitch-3": 0.18,
};
const DEFAULT_VOLUME = 0.28;
const MAX_SFX_SEC = 3;

async function main(): Promise<void> {
  const dir = projectDir(process.argv[2], "Dùng: npm run video:sfx -- <thư mục dự án>");
  const manifest = JSON.parse(readFileSync(join(SFX_LIB_DIR, "manifest.json"), "utf8")) as Record<string, { file: string }>;
  const frames = parseStoryboard(readFileSync(join(dir, "STORYBOARD.md"), "utf8"));
  mkdirSync(join(dir, "assets", "sfx"), { recursive: true });

  const sfx: SfxEntry[] = [];
  const unknown: string[] = [];
  for (const f of frames) {
    if (!f.fields.sfx) continue;
    for (const cue of parseCues(f.fields.sfx)) {
      const entry = manifest[cue.name];
      if (!entry) {
        unknown.push(`khung ${f.number}: ${cue.name}`);
        continue;
      }
      const rel = `assets/sfx/${entry.file}`;
      const abs = join(dir, rel);
      if (!existsSync(abs)) copyFileSync(join(SFX_LIB_DIR, entry.file), abs);
      sfx.push({
        frame: f.number,
        file: rel,
        offset_s: cue.at,
        duration_s: +Math.min(await durationSec(abs), MAX_SFX_SEC).toFixed(3),
        volume: VOLUME[cue.name] ?? DEFAULT_VOLUME,
      });
    }
  }
  if (unknown.length) {
    throw new Error(`tên SFX không có trong thư viện: ${unknown.join("; ")}. Có: ${Object.keys(manifest).join(", ")}`);
  }
  writeAudioMeta(dir, { ...readAudioMeta(dir), sfx });
  console.log(`✓ ${sfx.length} SFX → audio_meta.json`);
}

main().catch((e) => {
  console.error(`✗ video:sfx: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
