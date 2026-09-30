import { describe, expect, it } from "vitest";
import { normalizeFonts, parseCues, parseScript } from "./parse.js";
import { parseStoryboard, syncDurations } from "./lib.js";
import { analyse } from "./stillness.js";

describe("parseScript", () => {
  const md = [
    "# SCRIPT — x",
    "**Speed:** 1.06",
    "",
    "## Line 1 — Hook (Frame 1)",
    "",
    "    [curious] Tháng sáu vừa rồi,",
    "    một công ty tắt hẳn AI Mỹ.",
    "",
    "## Line 2 — Kết (Frame 2)",
    "**Pad:** 1.2s",
    "",
    "    Truy cập evose.ai.",
  ].join("\n");

  it("reads speed, joins indented lines per frame, and reads pad", () => {
    const s = parseScript(md);
    expect(s.speed).toBe(1.06);
    expect(s.lines).toEqual([
      { frame: 1, text: "[curious] Tháng sáu vừa rồi, một công ty tắt hẳn AI Mỹ.", padSec: 0 },
      { frame: 2, text: "Truy cập evose.ai.", padSec: 1.2 },
    ]);
  });

  it("defaults speed to 1", () => {
    expect(parseScript(md.replace("**Speed:** 1.06", "")).speed).toBe(1);
  });

  it("throws when a frame has no indented narration", () => {
    expect(() => parseScript(md.replace("    Truy cập evose.ai.", "Truy cập evose.ai."))).toThrow(/khung 2/);
  });
});

describe("parseCues", () => {
  it("parses name@seconds lists", () => {
    expect(parseCues("whoosh@0, pop@2.6, impact-bass-1@5.6s")).toEqual([
      { name: "whoosh", at: 0 },
      { name: "pop", at: 2.6 },
      { name: "impact-bass-1", at: 5.6 },
    ]);
  });

  it("treats none as empty", () => {
    expect(parseCues("none")).toEqual([]);
  });

  it("rejects a cue without a time", () => {
    expect(() => parseCues("pop")).toThrow(/tên@giây/);
  });
});

describe("storyboard helpers", () => {
  const sb = [
    "## Frame 1 — A",
    "- duration: 3s",
    "- sfx: pop@1",
    "## Frame 2 — B",
    "- duration: 4s",
  ].join("\n");

  it("parses frame fields", () => {
    expect(parseStoryboard(sb).map((f) => [f.number, f.fields.duration, f.fields.sfx])).toEqual([
      [1, "3s", "pop@1"],
      [2, "4s", undefined],
    ]);
  });

  it("syncs durations only for frames with a voice", () => {
    const { md, updated } = syncDurations(sb, new Map([[2, 7.25]]));
    expect(updated).toBe(1);
    expect(md).toContain("- duration: 3s");
    expect(md).toContain("- duration: 7.25s");
  });
});

describe("normalizeFonts", () => {
  it("replaces remote and custom font-faces with the project fonts", () => {
    const html =
      '<template><style>\n@import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;800&display=swap");\n' +
      '@font-face { font-family: "X"; src: url("../../assets/x.woff2"); }\n#root{}</style></template>';
    const out = normalizeFonts(html);
    expect(out).not.toContain("googleapis");
    expect(out).not.toContain("x.woff2");
    expect(out).toContain('url("assets/fonts/HankenGrotesk-VF.ttf")');
    expect(out).toContain("#root{}");
  });

  it("inserts font-faces when a frame has none", () => {
    expect(normalizeFonts("<style>#root{}</style>")).toContain("JetBrainsMono-Bold.ttf");
  });
});

describe("stillness analyse", () => {
  it("measures still ratio and longest still run per frame", () => {
    // 10 mẫu/giây: khung 1 động 1s, khung 2 đứng yên 2s liền.
    const diffs = [...Array(10).fill(5), ...Array(20).fill(0)];
    const r = analyse(diffs, [
      { frame: 1, start: 0, end: 1 },
      { frame: 2, start: 1, end: 3 },
    ]);
    expect(r.frames[0]).toMatchObject({ frame: 1, stillRatio: 0, pass: true });
    expect(r.frames[1]).toMatchObject({ frame: 2, stillRatio: 1, longestStillSec: 2, pass: false });
    expect(r.longestStillSec).toBe(2);
  });
});
