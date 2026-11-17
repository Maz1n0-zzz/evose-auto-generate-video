import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { plan } from "./brand.js";
import { REPO_ROOT, captionBandFor } from "./lib.js";

/* Bộ ai-engineer là hồ sơ THẬT trong repo, không phải fixture. Test này chạy đúng
 * `plan()` mà `npm run video:brand -- ai-engineer <dir>` chạy, rồi đọc lại thư mục. */

const BRAND = join(REPO_ROOT, "brands", "ai-engineer");
const read = (...p: string[]) => readFileSync(join(BRAND, ...p), "utf8");

/** Rộng và cao của một file PNG, đọc thẳng từ khối IHDR. */
function pngSize(path: string): { w: number; h: number } {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const placeholders = (html: string) => [...new Set(html.match(/__[A-Z_]+__/g) ?? [])].sort();

let root: string;
let dir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ai-engineer-brand-test-"));
  dir = join(root, "video");
  mkdirSync(dir, { recursive: true });
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

const files = () =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
    .sort();

describe("video:brand ai-engineer", () => {
  test("chép đủ bộ file vào thư mục video", () => {
    plan(BRAND, "ai-engineer", dir).forEach((op) => op.run());
    expect(files()).toEqual(
      [
        "assets/brand/evose-horizontal-navy.svg",
        "assets/brand/evose-symbol-navy.svg",
        "assets/fonts/HankenGrotesk-VF.ttf",
        "assets/fonts/JetBrainsMono-Bold.ttf",
        "assets/fonts/JetBrainsMono-Regular.ttf",
        "brand/close.html",
        "brand/fonts.css",
        "brand/open.html",
        "brand/overlay.png",
        "brand/rules.md",
        "frame.md",
      ].sort(),
    );
  });

  test("không có voice.json: dùng giọng tiếng Việt mặc định trong .env.local, tốc độ đã đo 3,1 chữ/giây", () => {
    plan(BRAND, "ai-engineer", dir).forEach((op) => op.run());
    expect(files()).not.toContain("brand/voice.json");
  });

  test("fonts.css có đủ ba @font-face trỏ vào assets/fonts", () => {
    plan(BRAND, "ai-engineer", dir).forEach((op) => op.run());
    const css = readFileSync(join(dir, "brand", "fonts.css"), "utf8");
    expect(css.match(/@font-face/g)).toHaveLength(3);
    expect(css).toContain('url("assets/fonts/HankenGrotesk-VF.ttf")');
  });
});

describe("hồ sơ ai-engineer khai khổ ngang 1920×1080", () => {
  test("rules.md khai canvas 1920×1080 và dải phụ đề khớp captionBandFor(1080)", () => {
    const rules = read("brand", "rules.md");
    expect(rules).toMatch(/Canvas 1920×1080/);
    expect(rules).toContain("format: 1920x1080");
    const band = captionBandFor(1080);
    expect(rules).toContain(`y ${band.top}–${band.top + band.height}`);
  });

  test("vùng nội dung nằm trên dải phụ đề cả khi camera phóng 3%", () => {
    const rules = read("brand", "rules.md");
    const m = /y (\d+)–(\d+), x (\d+)–(\d+) ở MỌI thời điểm/.exec(rules);
    expect(m).not.toBeNull();
    const [top, bottom] = [Number(m![1]), Number(m![2])];
    const pushed = (y: number) => 540 + (y - 540) * 1.03;
    expect(pushed(bottom)).toBeLessThan(captionBandFor(1080).top);
    // logo của lớp phủ kết thúc ở y 80
    expect(pushed(top)).toBeGreaterThan(80);
  });

  test("lớp phủ là PNG 1920×1080", () => {
    expect(pngSize(join(BRAND, "overlays", "overlay-frame-ai-engineer.png"))).toEqual({ w: 1920, h: 1080 });
  });

  test("khung mở và kết là khổ ngang, đúng bộ chỗ chừa", () => {
    const open = read("brand", "open.html");
    const close = read("brand", "close.html");
    for (const html of [open, close]) {
      expect(html).toContain('data-width="1920" data-height="1080"');
      expect(html.trimStart().startsWith("<template>")).toBe(true);
    }
    expect(placeholders(open)).toEqual(
      ["__CHAPTER__", "__DURATION__", "__EPISODE__", "__HEADLINE__", "__ID__", "__SUB__"].sort(),
    );
    expect(placeholders(close)).toEqual(["__DURATION__", "__ID__"]);
  });

  test("câu kêu gọi evose.ai chỉ ở chương cuối của tập", () => {
    expect(read("brand", "rules.md")).toMatch(/CHỈ có ở khung cuối của\s+chương cuối mỗi tập/);
  });
});
