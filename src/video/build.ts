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

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertBrandComplete,
  facelessScriptsDir,
  isBranded,
  overlayPng,
  parseStoryboard,
  projectDir,
  readAudioMeta,
  readJsonFile,
  run,
} from "./lib.js";
import { MAX_STILL_SEC, measure } from "./stillness.js";
import { normalizeFonts } from "./parse.js";
import { regroupCaptions, type CaptionWord } from "./captions.js";
import { probeShape, runCheck } from "./check.js";

/** Dải phụ đề: footer Evose phủ từ y 1690, phụ đề phải nằm trên nó. */
const CAPTION_BAND_TOP = 1530;
const CAPTION_BAND_HEIGHT = 150;

/** Chất lượng của lần mã hoá thứ hai, lúc phủ header và footer lên bản thô.
 *
 *  Bản thô do HyperFrames xuất ra ở crf 15 và sạch. Mã hoá lại ở crf 22 bỏ đói vùng gần đen:
 *  `raea check` bắt được lỗi blotching P1 trên bản DecodeFX, 11 trên 28 frame mẫu. Đo bốn mức
 *  trên cùng một nguồn ngày 10/11/2026: crf 22 ra P1, crf 20 ra P2, crf 18 vẫn P2, crf 15 sạch.
 *  Đổi lại là file to lên khoảng 2,3 lần. */
const OVERLAY_CRF = 15;

/** Trần dung lượng một bản giao, tính bằng byte. Nền tảng nào cũng nhận dưới mức này. */
const MAX_FINAL_BYTES = 50 * 1024 * 1024;

/** Mốc cảnh báo sớm, để một video dài bất thường lộ ra trước khi chạm trần. */
const WARN_FINAL_BYTES = 45 * 1024 * 1024;

type RawGroups = { frame: number; words?: Omit<CaptionWord, "frame">[] }[];

/** Đọc caption_groups.json của captions.mjs và kiểm hình dạng. File do máy sinh ra nên
 *  một kiểm `Array.isArray` là đủ, không cần schema. */
function readGroups(path: string): { data: { groups: RawGroups }; groups: RawGroups } {
  const data = readJsonFile(path) as { groups?: RawGroups };
  if (!Array.isArray(data.groups)) throw new Error(`${path}: thiếu mảng groups`);
  return { data: data as { groups: RawGroups }, groups: data.groups };
}

/** Tách lại cụm phụ đề của captions.mjs theo luật tiếng Việt, ghi đè caption_groups.json. */
function regroupVietnamese(path: string): ReturnType<typeof regroupCaptions> {
  const { data } = readGroups(path);
  const before = data.groups.length;
  const words = data.groups.flatMap((g) => (g.words ?? []).map((w) => ({ ...w, frame: g.frame })));
  if (words.length === 0) throw new Error(`${path}: không có chữ nào để làm phụ đề`);
  const groups = regroupCaptions(words);
  writeFileSync(path, JSON.stringify({ ...data, groups }, null, 2));
  console.log(`✓ phụ đề tiếng Việt: ${before} → ${groups.length} cụm`);
  return groups;
}

/**
 * Ngôn ngữ lời đọc, lấy từ frontmatter STORYBOARD.md (`lang: en`).
 *
 * Chỉ đọc trong khối `---` đầu file: một dòng `lang:` lẫn trong thân bài từng khớp
 * nhầm. Bỏ dấu nháy và chú thích đuôi. Mặc định tiếng Việt để video Evose cũ không
 * đổi hành vi, nhưng thư mục đã lắp brand thì BẮT BUỘC khai, vì đoán sai ngôn ngữ
 * nghĩa là tách cụm phụ đề bằng từ điển tiếng Việt cho lời tiếng Anh, âm thầm.
 */
function readLang(sbPath: string, branded: boolean): string {
  const md = readFileSync(sbPath, "utf8");
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = fm?.[1]?.match(/^lang:\s*(.+)$/m)?.[1];
  const value = line
    ?.replace(/\s+#.*$/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
  if (!value) {
    if (branded) {
      throw new Error(
        `${sbPath}: thư mục đã lắp brand nhưng frontmatter thiếu \`lang:\`. ` +
          `Thêm \`lang: en\` (hoặc \`lang: vi\`) vào khối --- đầu file. ` +
          `Đoán sai ngôn ngữ thì phụ đề bị tách bằng từ điển tiếng Việt.`,
      );
    }
    return "vi";
  }
  if (!/^[a-z]{2}([-_][a-z0-9]+)*$/.test(value)) {
    throw new Error(`${sbPath}: \`lang: ${value}\` không phải mã ngôn ngữ hợp lệ (vd \`en\`, \`vi\`, \`en-US\`).`);
  }
  return value;
}

async function main(): Promise<void> {
  const dir = projectDir(process.argv[2], "Dùng: npm run video:build -- <thư mục video> [--no-render]");
  const noRender = process.argv.includes("--no-render");
  const S = facelessScriptsDir();
  const sbPath = join(dir, "STORYBOARD.md");

  // Lắp brand thì phải lắp đủ. Thiếu một mảnh mà vẫn render là ra video mang font
  // hoặc logo Evose, và không ai nhìn log để biết.
  assertBrandComplete(dir);

  // Bộ @font-face của thương hiệu. `npm run video:brand` sinh brand/fonts.css từ rules.md.
  // `|| undefined` để file rỗng rơi về bộ mặc định chứ không xoá sạch font của khung.
  const brandFontsPath = join(dir, "brand", "fonts.css");
  const fontFaces = existsSync(brandFontsPath) ? readFileSync(brandFontsPath, "utf8").trim() || undefined : undefined;

  const lang = readLang(sbPath, isBranded(dir));
  const isVietnamese = lang.split(/[-_]/)[0] === "vi";

  // 1. Kiểm khung
  const frameDir = join(dir, "compositions", "frames");
  const files = readdirSync(frameDir).filter((f) => f.endsWith(".html"));
  const frames = parseStoryboard(readFileSync(sbPath, "utf8"));
  const missing = frames.filter((f) => f.fields.src && !existsSync(join(dir, f.fields.src))).map((f) => f.fields.src);
  if (missing.length) throw new Error(`chưa dựng: ${missing.join(", ")}`);
  for (const f of files) {
    const p = join(frameDir, f);
    const html = normalizeFonts(readFileSync(p, "utf8").replace(/\.\.\/\.\.\/assets\//g, "assets/"), fontFaces);
    const left = html.match(/__[A-Z_]+__/g);
    if (left) throw new Error(`${f} còn chỗ chưa điền: ${[...new Set(left)].join(", ")}`);
    writeFileSync(p, html);
  }
  writeFileSync(sbPath, readFileSync(sbPath, "utf8").replace(/^(\s*[-*]\s+status\s*:\s*)(outline|built)\s*$/gim, "$1animated"));
  console.log(`✓ ${files.length} khung: font chuẩn hoá (${fontFaces ? "brand/fonts.css" : "bộ Evose mặc định"}), không còn chỗ trống`);

  // 2–3. Phụ đề, ghép, chuyển cảnh, lint
  await run("node", [join(S, "captions.mjs"), "build", "--storyboard", sbPath, "--audio-meta", join(dir, "audio_meta.json"), "--hyperframes", dir, "--out", join(dir, "caption_groups.json")], dir);
  const capPath = join(dir, "compositions", "captions.html");
  if (existsSync(capPath)) {
    const groupsPath = join(dir, "caption_groups.json");
    let groups: unknown;
    if (isVietnamese) {
      groups = regroupVietnamese(groupsPath);
    } else {
      groups = readGroups(groupsPath).groups;
      console.log(`✓ phụ đề lang=${lang}: giữ cách tách của captions.mjs`);
    }
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
    "-y", "-v", "error", "-i", raw, "-i", overlayPng(dir),
    "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
    "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "slow", "-crf", String(OVERLAY_CRF),
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
  const finalBytes = statSync(final).size;
  const finalMb = finalBytes / 1024 / 1024;
  console.log(`  dung lượng: ${finalMb.toFixed(1)} MB (crf ${OVERLAY_CRF})`);
  if (finalBytes > MAX_FINAL_BYTES) {
    console.log(`  ⚠ vượt trần ${(MAX_FINAL_BYTES / 1024 / 1024).toFixed(0)} MB: nâng crf lên 18 rồi soát lại vùng tối`);
  } else if (finalBytes > WARN_FINAL_BYTES) {
    console.log(`  ⚠ gần trần ${(MAX_FINAL_BYTES / 1024 / 1024).toFixed(0)} MB: video dài hơn nữa sẽ vượt`);
  }

  const outcome = await runCheck(final, renders, await probeShape(final), dir);
  if (outcome.status === "skipped") {
    console.log(`  soát bản xuất: bỏ qua, ${outcome.reason}`);
  } else if (outcome.status === "failed") {
    console.log(`  ⚠ soát bản xuất KHÔNG chạy được: ${outcome.reason}`);
  } else {
    const { blocking, minor, report } = outcome;
    console.log(`  soát bản xuất: ${report.passed.length} mục đạt, ${blocking.length} phải sửa, ${minor.length} ghi nhận`);
    const when = (at: number | null): string => (at === null ? "không rõ thời điểm" : `tại ${at}s`);
    for (const issue of blocking) console.log(`  ⚠ ${issue.p} ${issue.rule} ${when(issue.at)}: ${issue.says}`);
    for (const issue of minor) console.log(`    ${issue.p} ${issue.rule} ${when(issue.at)}: ${issue.says}`);
    console.log(`  chi tiết: ${join(renders, "check.json")}`);
  }

  console.log(`  contact sheet: ${join(renders, "contact-sheet.jpg")}`);
}

main().catch((e) => {
  console.error(`✗ video:build: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
