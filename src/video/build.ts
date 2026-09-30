#!/usr/bin/env node
/**
 * `npm run video:build -- <thư mục video> [--no-render]`
 *
 * Phần máy làm sau khi các khung đã dựng xong:
 *   1. Kiểm khung: còn chỗ điền `__X__`, font tải từ mạng → sửa hoặc dừng.
 *   2. Phụ đề (captions.mjs), tách lại cụm theo tiếng Việt, kéo dải phụ đề lên trên footer Evose.
 *   3. Ghép index.html, gắn chuyển cảnh, lint.
 *   4. Render → renders/video.mp4, phủ header/footer Evose → renders/final.mp4 (dưới 50 MB).
 *   5. Đo tỉ lệ hình đứng yên → renders/stillness.json, contact sheet → renders/contact-sheet.jpg.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OVERLAY_PNG, facelessScriptsDir, parseStoryboard, projectDir, readAudioMeta, run } from "./lib.js";
import { MAX_STILL_SEC, measure } from "./stillness.js";
import { normalizeFonts } from "./parse.js";
import { regroupCaptions, type CaptionWord } from "./captions.js";

/** Dải phụ đề: footer Evose phủ từ y 1690, phụ đề phải nằm trên nó. */
const CAPTION_BAND_TOP = 1530;
const CAPTION_BAND_HEIGHT = 150;

/** Tách lại cụm phụ đề của captions.mjs theo luật tiếng Việt, ghi đè caption_groups.json. */
function regroupVietnamese(path: string): ReturnType<typeof regroupCaptions> {
  const data = JSON.parse(readFileSync(path, "utf8")) as {
    groups?: { frame: number; words?: Omit<CaptionWord, "frame">[] }[];
  };
  if (!Array.isArray(data.groups)) throw new Error(`${path}: thiếu mảng groups`);
  const before = data.groups.length;
  const words = data.groups.flatMap((g) => (g.words ?? []).map((w) => ({ ...w, frame: g.frame })));
  if (words.length === 0) throw new Error(`${path}: không có chữ nào để làm phụ đề`);
  const groups = regroupCaptions(words);
  writeFileSync(path, JSON.stringify({ ...data, groups }, null, 2));
  console.log(`✓ phụ đề tiếng Việt: ${before} → ${groups.length} cụm`);
  return groups;
}

async function main(): Promise<void> {
  const dir = projectDir(process.argv[2], "Dùng: npm run video:build -- <thư mục video> [--no-render]");
  const noRender = process.argv.includes("--no-render");
  const S = facelessScriptsDir();
  const sbPath = join(dir, "STORYBOARD.md");

  // 1. Kiểm khung
  const frameDir = join(dir, "compositions", "frames");
  const files = readdirSync(frameDir).filter((f) => f.endsWith(".html"));
  const frames = parseStoryboard(readFileSync(sbPath, "utf8"));
  const missing = frames.filter((f) => f.fields.src && !existsSync(join(dir, f.fields.src))).map((f) => f.fields.src);
  if (missing.length) throw new Error(`chưa dựng: ${missing.join(", ")}`);
  for (const f of files) {
    const p = join(frameDir, f);
    const html = normalizeFonts(readFileSync(p, "utf8").replace(/\.\.\/\.\.\/assets\//g, "assets/"));
    const left = html.match(/__[A-Z_]+__/g);
    if (left) throw new Error(`${f} còn chỗ chưa điền: ${[...new Set(left)].join(", ")}`);
    writeFileSync(p, html);
  }
  writeFileSync(sbPath, readFileSync(sbPath, "utf8").replace(/^(\s*[-*]\s+status\s*:\s*)(outline|built)\s*$/gim, "$1animated"));
  console.log(`✓ ${files.length} khung: font chuẩn hoá, không còn chỗ trống`);

  // 2–3. Phụ đề, ghép, chuyển cảnh, lint
  await run("node", [join(S, "captions.mjs"), "build", "--storyboard", sbPath, "--audio-meta", join(dir, "audio_meta.json"), "--hyperframes", dir, "--out", join(dir, "caption_groups.json")], dir);
  const capPath = join(dir, "compositions", "captions.html");
  if (existsSync(capPath)) {
    const groups = regroupVietnamese(join(dir, "caption_groups.json"));
    // Chèn vào <script>: escape "<" để chữ như "</script>" không cắt ngang script.
    const groupsJs = JSON.stringify(groups).replace(/</g, "\\u003c");
    let html = readFileSync(capPath, "utf8");
    const patches: [RegExp, (m: string, ...g: string[]) => string, string][] = [
      [/^(\s*var GROUPS = ).*;$/m, (_m, head) => `${head}${groupsJs};`, "dòng var GROUPS"],
      [/--cap-band-top:\s*\d+px;/, () => `--cap-band-top: ${CAPTION_BAND_TOP}px;`, "--cap-band-top"],
      [/--cap-band-height:\s*\d+px;/, () => `--cap-band-height: ${CAPTION_BAND_HEIGHT}px;`, "--cap-band-height"],
      [/font-weight: 400; font-style: normal;/, () => "font-weight: 100 900; font-style: normal;", "font-weight của phụ đề"],
    ];
    for (const [re, fn, label] of patches) {
      // Không khớp = captions.mjs đã đổi khuôn: dừng hẳn thay vì render phụ đề cũ.
      if (!re.test(html)) throw new Error(`captions.html: không tìm thấy ${label} (captions.mjs đổi khuôn?)`);
      html = html.replace(re, fn);
    }
    writeFileSync(capPath, html);
  }
  await run("node", [join(S, "assemble-index.mjs"), "--storyboard", sbPath, "--hyperframes", dir], dir);
  await run("node", [join(S, "transitions.mjs"), "inject", "--storyboard", sbPath, "--hyperframes", dir], dir);
  await run("node", [join(S, "transitions.mjs"), "verify", "--storyboard", sbPath, "--index", join(dir, "index.html")], dir);
  await run("npx", ["--yes", "hyperframes@0.8.96", "lint"], dir);
  if (noRender) {
    console.log("✓ đã ghép xong (--no-render). Kiểm nhanh: npx hyperframes snapshot --at <giây,...> --no-end");
    return;
  }

  // 4. Render + phủ logo
  const renders = join(dir, "renders");
  mkdirSync(renders, { recursive: true });
  const raw = join(renders, "video.mp4");
  const final = join(renders, "final.mp4");
  await run("npx", ["--yes", "hyperframes@0.8.96", "render", "--skill=faceless-explainer", "--quality", "high", "--output", raw], dir);
  await run("ffmpeg", [
    "-y", "-v", "error", "-i", raw, "-i", OVERLAY_PNG,
    "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
    "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "slow", "-crf", "22",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", final,
  ], dir);

  // 5. Đo + contact sheet
  const meta = readAudioMeta(dir);
  const report = await measure(raw, meta.voices.map((v) => ({ frame: v.frame, duration: v.duration_s })));
  writeFileSync(join(renders, "stillness.json"), JSON.stringify(report, null, 1));
  await run("ffmpeg", ["-y", "-v", "error", "-i", final, "-vf", "fps=1/2.5,scale=270:-1,tile=8x4", "-frames:v", "1", join(renders, "contact-sheet.jpg")], dir);

  const fails = report.frames.filter((f) => !f.pass);
  console.log(`\n✓ ${final}`);
  console.log(`  hình đứng yên: ${(report.overallStillRatio * 100).toFixed(0)}% · lâu nhất ${report.longestStillSec}s (ngưỡng ${MAX_STILL_SEC}s)`);
  if (fails.length) console.log(`  ⚠ khung đứng yên quá lâu: ${fails.map((f) => `${f.frame} (${f.longestStillSec}s)`).join(", ")}`);
  console.log(`  contact sheet: ${join(renders, "contact-sheet.jpg")}`);
}

main().catch((e) => {
  console.error(`✗ video:build: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
