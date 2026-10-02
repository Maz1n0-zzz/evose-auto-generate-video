#!/usr/bin/env node
/**
 * `npm run video:brand -- <tên-brand> <thư mục video>` — lắp một bộ nhận diện vào video.
 *
 * Thay cho tám lệnh `cp` gõ tay. Chép từ `brands/<tên>/` vào thư mục video đúng chỗ
 * mà từng phần của pipeline đi tìm:
 *
 *   brand/rules.md  → <dir>/brand/rules.md          packets.ts đọc, nhét vào _dispatch.md
 *   brand/frame.md  → <dir>/frame.md                worker đọc, captions.mjs lấy token
 *   (rút từ rules)  → <dir>/brand/fonts.css         build.ts dùng thay bộ font Evose cứng
 *   overlays/*.png  → <dir>/brand/overlay.png       lib.ts overlayPng() đọc
 *   caption-skin    → <dir>/.hyperframes/caption-skin.html
 *   voice.json      → <dir>/brand/voice.json        voice.ts đè ELEVENLABS_VOICE_ID
 *   fonts/*         → <dir>/assets/fonts/
 *   logo/*-gold.*   → <dir>/assets/brand/
 *   brand/open|close.html → <dir>/brand/            mẫu để chép tay vào compositions/frames
 *
 * KIỂM HẾT RỒI MỚI GHI. Hỏng nửa chừng là tệ nhất: thư mục còn lại một nửa bộ Evose
 * một nửa bộ brand, video vẫn render ra và không ai nhìn log.
 *
 * Không có brand nào thì pipeline vẫn chạy bằng bộ Evose mặc định.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BrandVoiceSchema, REPO_ROOT, projectDir, readJsonFile } from "./lib.js";

const BRANDS_DIR = join(REPO_ROOT, "brands");

/** Vùng trong rules.md chứa bộ @font-face chính thức của brand. Phải có mốc, nếu không
 *  một khối @font-face nêu làm ví dụ phản diện cũng bị rút nhầm vào fonts.css. */
export const FONT_REGION = /<!--\s*fonts:start\s*-->([\s\S]*?)<!--\s*fonts:end\s*-->/;

/** Bốn móc build.ts và captions.mjs cần có trong caption skin. */
export const SKIN_HOOKS: [RegExp, string][] = [
  [/^\s*var GROUPS = .*;$/m, "dòng `var GROUPS = ...;`"],
  [/var DURATION = 0;/, "dòng `var DURATION = 0;`"],
  [/<style data-brand-tokens><\/style>/, "chỗ chừa `<style data-brand-tokens></style>`"],
  [/data-composition-id="captions"/, 'thuộc tính `data-composition-id="captions"`'],
  [/__timelines\["captions"\]/, 'khoá `window.__timelines["captions"]`'],
];

/** build.ts vá `font-weight: 400; font-style: normal;` vào captions.html. Chuỗi đó do
 *  captions.mjs sinh ra từ MỘT file font nét 400 (tên chứa book/regular/roman, hoặc không
 *  chứa từ nét nào). Không có file đó thì `npm run video:build` ném lỗi khó truy.
 *  Đây là phỏng đoán theo TÊN FILE, không mở font ra đọc — đủ làm chốt chặn, không phải bằng chứng. */
export function hasWeight400Font(files: string[]): boolean {
  const weightWord = /black|heavy|ultra|extrabold|semibold|demibold|bold|medium|light|thin/i;
  return files.some((f) => {
    const stem = f.replace(/\.(woff2|woff|ttf|otf)$/i, "");
    const m = /(?:^|[^0-9])([1-9]00)(?![0-9a-z])/.exec(stem.toLowerCase());
    if (m) return Number(m[1]) === 400;
    return !weightWord.test(stem);
  });
}

const isFontFile = (f: string) => /\.(woff2|woff|ttf|otf)$/i.test(f);

function listFiles(dir: string, filter?: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && (!filter || filter(e.name)))
    .map((e) => e.name)
    .sort();
}

function listBrands(): string[] {
  if (!existsSync(BRANDS_DIR)) return [];
  return readdirSync(BRANDS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export interface Op {
  label: string;
  run(): void;
}

/** Kiểm toàn bộ bộ nhận diện và dựng danh sách việc. Ném lỗi là chưa ghi gì cả. */
export function plan(brand: string, name: string, dir: string): Op[] {
  const ops: Op[] = [];
  const add = (label: string, run: () => void) => ops.push({ label, run });
  const need = (p: string, why: string) => {
    if (!existsSync(p)) throw new Error(`brands/${name} thiếu ${p.slice(brand.length + 1)} — ${why}`);
    return p;
  };

  // --- luật và hợp đồng bố cục ---
  const rulesPath = need(join(brand, "brand", "rules.md"), "packets.ts cần nó, thiếu là rơi về luật Evose");
  const framePath = need(join(brand, "brand", "frame.md"), "worker và captions.mjs đọc nó");
  const rules = readFileSync(rulesPath, "utf8");

  // --- bộ @font-face rút từ rules.md, chỉ trong vùng có mốc ---
  const region = FONT_REGION.exec(rules);
  if (!region?.[1]) {
    throw new Error(
      `brands/${name}/brand/rules.md thiếu mốc <!-- fonts:start --> ... <!-- fonts:end -->. ` +
        `build.ts cần bộ @font-face từ vùng đó, và rút cả file thì một khối nêu làm ví dụ cũng bị lấy nhầm.`,
    );
  }
  const faces = region[1].match(/@font-face\s*\{[^}]*\}/g) ?? [];
  if (!faces.length) throw new Error(`brands/${name}/brand/rules.md: vùng fonts không có khối @font-face nào.`);

  const fontFiles = listFiles(join(brand, "fonts"), isFontFile);
  if (!fontFiles.length) throw new Error(`brands/${name}/fonts không có file font nào.`);
  const facesWithoutUrl = faces.filter((f) => !/url\(\s*["']?assets\/fonts\/[^"')]+["']?\s*\)/.test(f));
  if (facesWithoutUrl.length) {
    throw new Error(
      `brands/${name}/brand/rules.md: ${facesWithoutUrl.length} khối @font-face không trỏ tới assets/fonts/... — ` +
        `không kiểm được file có thật hay không.`,
    );
  }
  const wanted = faces.flatMap((f) =>
    [...f.matchAll(/url\(\s*["']?assets\/fonts\/([^"')]+)["']?\s*\)/g)].map((m) => m[1] as string),
  );
  const missingFonts = [...new Set(wanted)].filter((f) => !fontFiles.includes(f));
  if (missingFonts.length) {
    throw new Error(`brands/${name}/brand/rules.md trỏ tới font không có trong fonts/: ${missingFonts.join(", ")}`);
  }
  if (!hasWeight400Font(fontFiles)) {
    throw new Error(
      `brands/${name}/fonts không có file font nét 400. build.ts vá chuỗi ` +
        `"font-weight: 400; font-style: normal;" vào captions.html, chuỗi đó chỉ sinh ra khi ` +
        `có một file nét 400 (vd AcuminPro-Book.woff2). Thêm file đó rồi chạy lại.`,
    );
  }

  // --- lớp phủ: đúng một .png, không để thứ tự thư mục quyết định ---
  const overlayDir = join(brand, "overlays");
  const pngs = listFiles(overlayDir, (f) => f.toLowerCase().endsWith(".png"));
  if (pngs.length !== 1) {
    throw new Error(
      pngs.length === 0
        ? `brands/${name}/overlays không có file .png nào — thiếu lớp phủ thì video bị phủ logo Evose.`
        : `brands/${name}/overlays có ${pngs.length} file .png (${pngs.join(", ")}) — để đúng một cái thôi.`,
    );
  }

  // --- phụ đề riêng (tuỳ chọn) ---
  const skinSrc = join(brand, "caption-skin.html");
  const skinDest = join(dir, ".hyperframes", "caption-skin.html");
  if (existsSync(skinSrc)) {
    const html = readFileSync(skinSrc, "utf8");
    const miss = SKIN_HOOKS.filter(([re]) => !re.test(html)).map(([, l]) => l);
    if (miss.length) throw new Error(`${skinSrc} thiếu móc: ${miss.join(", ")}`);
  }

  // --- giọng riêng (tuỳ chọn) ---
  const voiceSrc = join(brand, "voice.json");
  const voiceDest = join(dir, "brand", "voice.json");
  let voiceNote = "";
  if (existsSync(voiceSrc)) {
    const raw = readJsonFile(voiceSrc) as { voiceId?: unknown };
    if (raw?.voiceId === "REPLACE_ME") {
      voiceNote = "  ⚠ CHƯA ĐIỀN voiceId — npm run video:voice sẽ chặn cho tới khi điền";
    } else {
      const parsed = BrandVoiceSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `${voiceSrc}: sai định dạng — ${parsed.error.issues.map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`).join("; ")}`,
        );
      }
      voiceNote = ` (${parsed.data.voiceId})`;
    }
  }

  // ===== kiểm xong, từ đây mới ghi =====

  add("brand/rules.md", () => {
    mkdirSync(join(dir, "brand"), { recursive: true });
    copyFileSync(rulesPath, join(dir, "brand", "rules.md"));
  });
  add("frame.md", () => copyFileSync(framePath, join(dir, "frame.md")));
  add(`brand/fonts.css (${faces.length} @font-face)`, () =>
    writeFileSync(join(dir, "brand", "fonts.css"), faces.join("\n    ") + "\n"),
  );
  add("brand/overlay.png", () => copyFileSync(join(overlayDir, pngs[0] as string), join(dir, "brand", "overlay.png")));

  // Font: chép bộ của brand, rồi bỏ font của template không thuộc bộ đó. Bộ font của
  // brand là bộ ĐẦY ĐỦ — để sót font Evose là worker có thể lỡ tay tham chiếu.
  const destFonts = join(dir, "assets", "fonts");
  add(`assets/fonts/ (${fontFiles.length} file)`, () => {
    mkdirSync(destFonts, { recursive: true });
    for (const f of fontFiles) copyFileSync(join(brand, "fonts", f), join(destFonts, f));
    const keep = new Set(fontFiles);
    const dropped = listFiles(destFonts, isFontFile).filter((f) => !keep.has(f));
    for (const f of dropped) rmSync(join(destFonts, f));
    if (dropped.length) console.log(`  · bỏ ${dropped.length} font không thuộc bộ ${name}: ${dropped.join(", ")}`);
  });

  const logos = listFiles(join(brand, "logo"), (f) => f.includes("-gold."));
  add(`assets/brand/ (${logos.length} file)`, () => {
    if (!logos.length) {
      console.log(`  · ⚠ brands/${name}/logo không có file nào tên "*-gold.*" — khung mở/kết sẽ thiếu logo`);
      return;
    }
    const d = join(dir, "assets", "brand");
    mkdirSync(d, { recursive: true });
    for (const f of logos) copyFileSync(join(brand, "logo", f), join(d, f));
  });

  // Phụ đề và giọng là tuỳ chọn, nên phải DỌN bản của brand trước. Lắp đè brand khác
  // mà giữ lại skin hay voice.json cũ là ship nhầm giọng, không có cảnh báo nào.
  add(existsSync(skinSrc) ? ".hyperframes/caption-skin.html" : ".hyperframes/caption-skin.html (về bản template)", () => {
    if (existsSync(skinSrc)) {
      mkdirSync(join(dir, ".hyperframes"), { recursive: true });
      copyFileSync(skinSrc, skinDest);
    } else if (existsSync(skinDest)) {
      rmSync(skinDest);
    }
  });
  add(existsSync(voiceSrc) ? `brand/voice.json${voiceNote}` : "brand/voice.json (không có, dùng .env.local)", () => {
    if (existsSync(voiceSrc)) copyFileSync(voiceSrc, voiceDest);
    else if (existsSync(voiceDest)) rmSync(voiceDest);
  });

  for (const f of ["open.html", "close.html"] as const) {
    const from = join(brand, "brand", f);
    const to = join(dir, "brand", f);
    if (existsSync(from)) add(`brand/${f}`, () => copyFileSync(from, to));
    else console.log(`  · ⚠ brands/${name}/brand/${f} không có — phải tự viết khung ${f === "open.html" ? "mở" : "kết"}`);
  }

  return ops;
}

function main(): void {
  const usage = "Dùng: npm run video:brand -- <tên-brand> <thư mục video>";
  const name = process.argv[2];
  if (!name) {
    console.error(usage);
    console.error(`Brand có sẵn: ${listBrands().join(", ") || "(chưa có)"}`);
    process.exit(2);
  }
  const brand = join(BRANDS_DIR, name);
  if (!existsSync(brand)) {
    console.error(`✗ Không có brand "${name}" trong ${BRANDS_DIR}`);
    console.error(`Brand có sẵn: ${listBrands().join(", ") || "(chưa có)"}`);
    process.exit(2);
  }
  const dir = projectDir(process.argv[3], usage);

  const ops = plan(brand, name, dir);
  console.log(`✓ đã lắp brand "${name}" vào ${dir}`);
  for (const op of ops) {
    op.run();
    console.log(`  · ${op.label}`);
  }
  console.log(`\nCòn lại (bước 6 của skill): chép brand/open.html và brand/close.html vào`);
  console.log(`compositions/frames/ rồi thay các chỗ chừa __ID__ __DURATION__ ...`);
}

// Chỉ chạy khi gọi thẳng file này. Có vậy brand.test.ts mới import được `plan`
// mà không bị main() chạy rồi process.exit giữa lúc test.
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  try {
    main();
  } catch (e) {
    console.error(`✗ video:brand: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
