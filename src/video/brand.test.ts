import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FONT_REGION, SKIN_HOOKS, hasWeight400Font, plan } from "./brand.js";

/* ------------------------------------------------------------------ *
 * fixtures — một brand tối thiểu nhưng HỢP LỆ, mỗi test bẻ gãy một chỗ
 * ------------------------------------------------------------------ */

const FACES = [
  '@font-face { font-family: "Demo"; src: url("assets/fonts/Demo-Book.woff2") format("woff2"); font-weight: 400; }',
  '@font-face { font-family: "Demo"; src: url("assets/fonts/Demo-Bold.woff2") format("woff2"); font-weight: 700; }',
];

const SKIN = `<style data-brand-tokens></style>
<div data-composition-id="captions"></div>
<script>
  var GROUPS = [];
  var DURATION = 0;
  window.__timelines["captions"] = null;
</script>`;

function rulesMd(faces: string[] = FACES): string {
  return [
    "## Luật Demo",
    "",
    "- Font: chỉ dùng đúng khối này.",
    "",
    "  <!-- fonts:start -->",
    ...faces.map((f) => `      ${f}`),
    "  <!-- fonts:end -->",
    "",
  ].join("\n");
}

let root: string;
let brand: string;
let dir: string;

/** Brand hợp lệ + thư mục video giả, giống cái `video:new` tạo ra. */
function makeFixture(): void {
  root = mkdtempSync(join(tmpdir(), "wtc-brand-test-"));
  brand = join(root, "brands", "demo");
  dir = join(root, "out", "video-1");
  for (const d of [join(brand, "brand"), join(brand, "fonts"), join(brand, "logo"), join(brand, "overlays"), dir]) {
    mkdirSync(d, { recursive: true });
  }
  writeFileSync(join(brand, "brand", "rules.md"), rulesMd());
  writeFileSync(join(brand, "brand", "frame.md"), "---\nname: Demo\n---\n");
  writeFileSync(join(brand, "brand", "open.html"), "<template>open</template>");
  writeFileSync(join(brand, "brand", "close.html"), "<template>close</template>");
  writeFileSync(join(brand, "fonts", "Demo-Book.woff2"), "x");
  writeFileSync(join(brand, "fonts", "Demo-Bold.woff2"), "x");
  writeFileSync(join(brand, "logo", "demo-mark-gold.png"), "x");
  writeFileSync(join(brand, "overlays", "overlay-demo.png"), "x");
  writeFileSync(join(brand, "caption-skin.html"), SKIN);
  writeFileSync(join(brand, "voice.json"), JSON.stringify({ voiceId: "abc123", modelId: "eleven_v3" }));
}

const run = () => plan(brand, "demo", dir).forEach((op) => op.run());
/** Mọi thứ brand có thể ghi vào thư mục video. */
const dirFiles = () =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
        .sort()
    : [];

beforeEach(() => {
  makeFixture();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ */

describe("hasWeight400Font", () => {
  test("nhận ra nét 400 qua từ trong tên file", () => {
    expect(hasWeight400Font(["X-Book.woff2"])).toBe(true);
    expect(hasWeight400Font(["X-Regular.ttf"])).toBe(true);
    expect(hasWeight400Font(["X-Roman.otf"])).toBe(true);
  });

  test("số trong tên file thắng từ chỉ nét", () => {
    expect(hasWeight400Font(["X-400.woff2"])).toBe(true);
    expect(hasWeight400Font(["X-700.woff2"])).toBe(false);
  });

  test("bộ chỉ có nét đậm thì không có 400 — build.ts sẽ gãy ở bước phụ đề", () => {
    expect(hasWeight400Font(["X-Bold.woff2", "X-Black.woff2", "X-Semibold.woff2"])).toBe(false);
  });

  test("hậu tố hash không bị đọc nhầm thành nét", () => {
    expect(hasWeight400Font(["Newsreader-a1b200c3.woff2"])).toBe(true);
  });
});

describe("FONT_REGION và SKIN_HOOKS", () => {
  test("chỉ lấy @font-face trong vùng có mốc, bỏ khối nêu làm ví dụ phản diện", () => {
    const md = [
      "KHÔNG được viết thế này:",
      '    @font-face { font-family: "Sai"; src: url("https://fonts.googleapis.com/x"); }',
      "",
      rulesMd(),
    ].join("\n");
    const region = FONT_REGION.exec(md)?.[1] ?? "";
    const faces = region.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    expect(faces).toHaveLength(2);
    expect(region).not.toContain("googleapis");
  });

  test("bộ móc khớp với skin hợp lệ", () => {
    expect(SKIN_HOOKS.filter(([re]) => !re.test(SKIN))).toHaveLength(0);
  });
});

describe("plan — chặn trước khi ghi", () => {
  test.each([
    [
      "rules.md thiếu mốc fonts",
      () => writeFileSync(join(brand, "brand", "rules.md"), FACES.join("\n")),
      /fonts:start/,
    ],
    [
      "vùng fonts rỗng",
      () => writeFileSync(join(brand, "brand", "rules.md"), rulesMd([])),
      /không có khối @font-face/,
    ],
    [
      "@font-face trỏ tới font không có thật",
      () => rmSync(join(brand, "fonts", "Demo-Bold.woff2")),
      /trỏ tới font không có trong fonts\/: Demo-Bold\.woff2/,
    ],
    [
      "@font-face không trỏ assets/fonts nên không kiểm được",
      () =>
        writeFileSync(
          join(brand, "brand", "rules.md"),
          rulesMd(['@font-face { font-family: "Demo"; src: url("https://cdn/x.woff2"); font-weight: 400; }']),
        ),
      /không trỏ tới assets\/fonts/,
    ],
    [
      "bộ font không có nét 400",
      () => {
        rmSync(join(brand, "fonts", "Demo-Book.woff2"));
        writeFileSync(join(brand, "fonts", "Demo-Black.woff2"), "x");
        writeFileSync(
          join(brand, "brand", "rules.md"),
          rulesMd(['@font-face { font-family: "Demo"; src: url("assets/fonts/Demo-Black.woff2"); font-weight: 900; }']),
        );
      },
      /không có file font nét 400/,
    ],
    ["overlays không có png", () => rmSync(join(brand, "overlays", "overlay-demo.png")), /không có file \.png/],
    [
      "overlays có hai png — thứ tự thư mục không được quyết định",
      () => writeFileSync(join(brand, "overlays", "overlay-khac.png"), "x"),
      /có 2 file \.png/,
    ],
    [
      "caption skin mất một móc build.ts cần",
      () => writeFileSync(join(brand, "caption-skin.html"), SKIN.replace("var GROUPS = [];", "")),
      /thiếu móc/,
    ],
    ["voice.json hỏng cú pháp", () => writeFileSync(join(brand, "voice.json"), "{nope"), /JSON hỏng/],
    [
      "voice.json có voiceId không phải chuỗi",
      () => writeFileSync(join(brand, "voice.json"), JSON.stringify({ voiceId: 123 })),
      /sai định dạng/,
    ],
    [
      "voice.json có modelId rỗng",
      () => writeFileSync(join(brand, "voice.json"), JSON.stringify({ voiceId: "ok", modelId: "" })),
      /sai định dạng/,
    ],
    ["thiếu frame.md", () => rmSync(join(brand, "brand", "frame.md")), /thiếu brand\/frame\.md/],
    ["thiếu rules.md", () => rmSync(join(brand, "brand", "rules.md")), /thiếu brand\/rules\.md/],
  ])("%s", (_name, breakIt, message) => {
    breakIt();
    expect(() => plan(brand, "demo", dir)).toThrow(message);
    // Tính chất quan trọng nhất: hỏng thì KHÔNG để lại thư mục lắp nửa chừng.
    expect(dirFiles()).toEqual([]);
  });

  test("voiceId REPLACE_ME vẫn lắp được, chỉ cảnh báo — điền ID là việc sau", () => {
    writeFileSync(join(brand, "voice.json"), JSON.stringify({ voiceId: "REPLACE_ME" }));
    const ops = plan(brand, "demo", dir);
    expect(ops.find((o) => o.label.includes("voice.json"))?.label).toMatch(/CHƯA ĐIỀN/);
  });
});

describe("plan — kết quả sau khi ghi", () => {
  test("đặt đủ file vào đúng chỗ pipeline đi tìm", () => {
    run();
    expect(dirFiles()).toEqual([
      ".hyperframes/caption-skin.html",
      "assets/brand/demo-mark-gold.png",
      "assets/fonts/Demo-Bold.woff2",
      "assets/fonts/Demo-Book.woff2",
      "brand/close.html",
      "brand/fonts.css",
      "brand/open.html",
      "brand/overlay.png",
      "brand/rules.md",
      "brand/voice.json",
      "frame.md",
    ]);
  });

  test("fonts.css rút đúng bộ @font-face trong vùng mốc", () => {
    run();
    const css = readFileSync(join(dir, "brand", "fonts.css"), "utf8");
    expect(css).toContain("Demo-Book.woff2");
    expect(css).toContain("Demo-Bold.woff2");
    expect(css.match(/@font-face/g)).toHaveLength(2);
  });

  test("bỏ font của template không thuộc bộ brand", () => {
    mkdirSync(join(dir, "assets", "fonts"), { recursive: true });
    writeFileSync(join(dir, "assets", "fonts", "HankenGrotesk-VF.ttf"), "x");
    run();
    expect(readdirSync(join(dir, "assets", "fonts")).sort()).toEqual(["Demo-Bold.woff2", "Demo-Book.woff2"]);
  });

  test("lắp đè brand khác thì dọn skin và voice cũ, không ship nhầm giọng", () => {
    run();
    expect(existsSync(join(dir, "brand", "voice.json"))).toBe(true);
    expect(existsSync(join(dir, ".hyperframes", "caption-skin.html"))).toBe(true);

    // brand thứ hai không có giọng riêng và không có skin riêng
    rmSync(join(brand, "voice.json"));
    rmSync(join(brand, "caption-skin.html"));
    run();

    expect(existsSync(join(dir, "brand", "voice.json"))).toBe(false);
    expect(existsSync(join(dir, ".hyperframes", "caption-skin.html"))).toBe(false);
  });

  test("chạy lại hai lần ra cùng kết quả", () => {
    run();
    const first = dirFiles();
    run();
    expect(dirFiles()).toEqual(first);
  });
});
