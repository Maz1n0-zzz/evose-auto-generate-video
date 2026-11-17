import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeFonts, parseCues, parseScript } from "./parse.js";
import { captionBandFor, parseStoryboard, readFormat, syncDurations } from "./lib.js";
import { analyse, cropFor, parseSize } from "./stillness.js";

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

describe("stillness cropFor", () => {
  it("giữ nguyên vùng đã duyệt cho khung dọc 1080x1920", () => {
    expect(cropFor(1080, 1920)).toEqual({ crop: "crop=1080:1230:0:290", sw: 108, sh: 123, regime: "vertical" });
  });

  it("khung dọc độ phân giải khác vẫn cắt đúng dải nội dung theo tỉ lệ", () => {
    // 720x1280 cung ti le 9:16. Truoc day roi xuong nhanh toan khung va do ca
    // header lan phu de, nen con so bi keo ve phia "dung yen".
    expect(cropFor(720, 1280)).toEqual({ crop: "crop=720:820:0:193", sw: 108, sh: 123, regime: "vertical" });
    expect(cropFor(2160, 3840)).toEqual({ crop: "crop=2160:2460:0:580", sw: 108, sh: 123, regime: "vertical" });
  });

  it("khung ngang 16:9 cắt dải nội dung y 96-880, không đo cả dải phụ đề", () => {
    expect(cropFor(1920, 1080)).toEqual({ crop: "crop=1920:784:0:96", sw: 192, sh: 78, regime: "wide" });
  });

  it("tỉ lệ lạ thì đo toàn khung và nói rõ là chưa hiệu chuẩn", () => {
    expect(cropFor(1000, 1000)).toEqual({ crop: "crop=iw:ih:0:0", sw: 100, sh: 100, regime: "full" });
  });

  it("nhận đúng hai khổ ở sát biên dung sai, và loại khổ gần giống", () => {
    // 1920x1088 la ban 1080p ma hoa theo luoi 16, lech 0,74% so voi 16:9.
    expect(cropFor(1920, 1088).regime).toBe("wide");
    // 1366x768 lech 0,045%.
    expect(cropFor(1366, 768).regime).toBe("wide");
    // Day la cac kho PHAI roi xuong toan khung. Dung sai 0.02 tuyet doi cu
    // cung loai dung chung, nhung mot dung sai long hon thi khong.
    for (const [w, h] of [[1080, 1350], [1080, 1080], [1920, 1200], [1080, 2340], [2560, 1080]] as const) {
      expect(cropFor(w, h).regime, `${w}x${h}`).toBe("full");
    }
  });

  it("cửa sổ dung sai rộng đúng 1,5%, không rộng hơn cũng không hẹp hơn", () => {
    // Bai nay do do rong THAT cua cua so nhan dang, roi so voi 1,5% tinh doc lap
    // tu 9/16 va 16/9. Bo cu chi liet ke vai do phan giai, nen noi dung sai len
    // 5% khong bi bat: khong co ca nao nam trong dai 1,5% den 5%.
    const TOL = 0.015;
    const H = 100000;
    const window = (target: number) => {
      const want = target === 9 / 16 ? "vertical" : "wide";
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = -0.08; k <= 0.08; k += 0.0002) {
        const r = target * (1 + k);
        if (cropFor(Math.round(H * r), H).regime !== want) continue;
        lo = Math.min(lo, k);
        hi = Math.max(hi, k);
      }
      return { lo, hi };
    };
    for (const target of [9 / 16, 16 / 9]) {
      const { lo, hi } = window(target);
      expect(hi, `bien tren cua ${target}`).toBeCloseTo(TOL, 3);
      expect(lo, `bien duoi cua ${target}`).toBeCloseTo(-TOL, 3);
    }
  });

  it("khổ lệch 5% so với hai tỉ lệ chuẩn phải rơi xuống toàn khung", () => {
    // Hai con so cu the nam trong dai mot dung sai bi noi rong se nhan nham.
    expect(cropFor(1080, 1829).regime).toBe("full");   // lech 4,97% so voi 9:16
    expect(cropFor(1920, 1137).regime).toBe("full");   // lech 5,01% so voi 16:9
  });

  it("không khổ nào nhận cả hai nhánh, và cả ba nhánh đều có ca", () => {
    const seen = new Set<string>();
    for (let r = 0.3; r < 3; r += 0.001) {
      seen.add(cropFor(Math.round(1000 * r), 1000).regime);
    }
    expect([...seen].sort()).toEqual(["full", "vertical", "wide"]);
    expect((9 / 16) * (1 + 0.015)).toBeLessThan((16 / 9) * (1 - 0.015));
  });

  it("không bao giờ cắt ra ngoài khung", () => {
    const sizes = [[1920, 1080], [1080, 1920], [1280, 720], [720, 1280], [2160, 3840],
      [1920, 1088], [1366, 768], [1000, 1000], [1080, 1350], [4, 4], [3, 7]] as const;
    for (const [w, h] of sizes) {
      const { crop } = cropFor(w, h);
      if (crop === "crop=iw:ih:0:0") continue;
      const m = /^crop=(\d+):(\d+):(\d+):(\d+)$/.exec(crop);
      expect(m, `${w}x${h} -> ${crop}`).not.toBeNull();
      const [cw, ch, cx, cy] = m!.slice(1).map(Number);
      expect(cx + cw).toBeLessThanOrEqual(w);
      expect(cy + ch).toBeLessThanOrEqual(h);
      expect(ch).toBeGreaterThan(0);
    }
  });

  it("cỡ thu nhỏ không bao giờ bằng không", () => {
    const r = cropFor(4, 4);
    expect(r.sw).toBeGreaterThan(0);
    expect(r.sh).toBeGreaterThan(0);
  });
});

describe("stillness parseSize", () => {
  it("đọc được kích thước ffprobe trả về", () => {
    expect(parseSize("1920x1080\n")).toEqual({ w: 1920, h: 1080 });
  });

  it("ném lỗi có tên file khi ffprobe trả về rác", () => {
    for (const bad of ["", "N/A", "1920x1080\n1080x1920", "1920", "ax b"]) {
      expect(() => parseSize(bad, "phim.mp4"), JSON.stringify(bad)).toThrow(/phim\.mp4/);
    }
  });

  it("ném lỗi khi kích thước bằng không", () => {
    expect(() => parseSize("0x1080", "phim.mp4")).toThrow(/phim\.mp4/);
  });
});

describe("dải phụ đề theo chiều cao khung", () => {
  it("khổ dọc 1080x1920 giữ nguyên cặp số đã duyệt của ba bộ cũ", () => {
    // 1530 va 150 nang phu de len tren footer Evose o y 1690. Doi hai con so
    // nay la doi ca ba video Evose, WTC va DecodeFX da duyet.
    expect(captionBandFor(1920)).toEqual({ top: 1530, height: 150 });
  });

  it("khổ ngang 1080 cao đặt dải phụ đề TRONG khung, không rơi xuống dưới mép", () => {
    const b = captionBandFor(1080);
    expect(b).toEqual({ top: 900, height: 180 });
    // Day la phep kiem that su quan trong: bug that la top 1530 tren khung cao
    // 1080, tuc phu de nam duoi mep duoi 450px va bien mat khoi ban render.
    expect(b.top + b.height).toBe(1080);
  });

  it("mọi chiều cao đều cho dải nằm gọn trong khung", () => {
    for (const h of [1080, 1350, 1440, 1920, 2160, 720]) {
      const b = captionBandFor(h);
      expect(b.top, `h=${h}`).toBeGreaterThan(0);
      expect(b.top + b.height, `h=${h}`).toBeLessThanOrEqual(h);
    }
  });
});

describe("readFormat", () => {
  const sb = (fm: string) => {
    const f = join(mkdtempSync(join(tmpdir(), "fmt-")), "STORYBOARD.md");
    writeFileSync(f, `---\n${fm}\n---\n\nthan bai\n`);
    return f;
  };

  it("đọc đúng WxH, tên khổ, và chữ hoa", () => {
    expect(readFormat(sb("format: 1920x1080"))).toEqual({ w: 1920, h: 1080 });
    expect(readFormat(sb("format: 1080x1920"))).toEqual({ w: 1080, h: 1920 });
    expect(readFormat(sb("format: Portrait"))).toEqual({ w: 1080, h: 1920 });
    expect(readFormat(sb("format: 1080 × 1080"))).toEqual({ w: 1080, h: 1080 });
  });

  it("thiếu format hoặc format hỏng thì về khổ ngang, giống parseFormat của skill", () => {
    expect(readFormat(sb("lang: en"))).toEqual({ w: 1920, h: 1080 });
    expect(readFormat(sb("format: khong-phai-kho"))).toEqual({ w: 1920, h: 1080 });
    expect(readFormat(sb("format: 10x10"))).toEqual({ w: 1920, h: 1080 });
  });

  it("bỏ chú thích đuôi dòng, không nuốt nhầm vào con số", () => {
    // Phai dung kho DOC o day. Lay 1920x1080 thi gia tri du phong TRUNG dung ket
    // qua mong doi, nen bai test van xanh ca khi phep cat chu thich bi go han.
    expect(readFormat(sb("format: 1080x1920   # TikTok, Shorts, Reels"))).toEqual({ w: 1080, h: 1920 });
  });
});
