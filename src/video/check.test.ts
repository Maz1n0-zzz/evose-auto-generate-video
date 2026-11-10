import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FALLBACK_SHAPE, parseCheckReport, parseProbeSize, probeShape, rank, runCheck, shapeFor, type CheckReport } from "./check.js";

/** Nguyên văn check.json raea ghi ra cho bản DecodeFX ngày 10/11/2026, rút gọn phần says. */
const CO_LOI = {
  file: "final.mp4",
  issues: [
    { rule: "blotching", p: "P1", at: 0.0, says: "blocky patches in dark areas in 11 of 28 sampled frames" },
    { rule: "frozen", p: "P2", at: 12.0, says: "nothing changes for 4 s" },
  ],
  passed: ["loudness: -14.1 LUFS, true peak -1.5 dBTP", "sound: no steady sound stops dead"],
};

const SACH = { file: "video.mp4", issues: [], passed: ["blotching: encoded by x264 at crf 15, which keeps the darks"] };

describe("parseCheckReport", () => {
  it("đọc được báo cáo có lỗi", () => {
    const report = parseCheckReport(CO_LOI, "check.json");
    expect(report.file).toBe("final.mp4");
    expect(report.issues).toHaveLength(2);
    expect(report.issues[0].rule).toBe("blotching");
    expect(report.issues[0].p).toBe("P1");
    expect(report.passed).toHaveLength(2);
  });

  it("đọc được báo cáo sạch", () => {
    const report = parseCheckReport(SACH, "check.json");
    expect(report.issues).toHaveLength(0);
    expect(report.passed).toHaveLength(1);
  });

  it("thiếu mảng issues thì ném lỗi gọi đúng tên khoá", () => {
    expect(() => parseCheckReport({ file: "a.mp4", passed: [] }, "check.json")).toThrow(/thiếu mảng issues/);
  });

  it("mức ưu tiên lạ thì ném lỗi, không âm thầm nhận", () => {
    const xau = { file: "a.mp4", issues: [{ rule: "x", p: "P9", at: 0, says: "..." }], passed: [] };
    expect(() => parseCheckReport(xau, "check.json")).toThrow(/mức ưu tiên lạ: P9/);
  });

  it("không phải đối tượng thì ném lỗi", () => {
    expect(() => parseCheckReport("[]", "check.json")).toThrow(/không phải một đối tượng JSON/);
  });

  it("thiếu khoá at thì mặc định về 0 chứ không ném", () => {
    const thieu = { file: "a.mp4", issues: [{ rule: "x", p: "P2", says: "..." }], passed: [] };
    expect(parseCheckReport(thieu, "check.json").issues[0].at).toBe(0);
  });
});

describe("rank", () => {
  it("P0 và P1 là phải sửa, P2 và P3 là ghi nhận", () => {
    const { blocking, minor } = rank(parseCheckReport(CO_LOI, "check.json"));
    expect(blocking.map((i) => i.rule)).toEqual(["blotching"]);
    expect(minor.map((i) => i.rule)).toEqual(["frozen"]);
  });

  it("báo cáo sạch thì cả hai danh sách đều rỗng", () => {
    const { blocking, minor } = rank(parseCheckReport(SACH, "check.json"));
    expect(blocking).toHaveLength(0);
    expect(minor).toHaveLength(0);
  });

  it("chỉ có P3 thì không có mục nào phải sửa", () => {
    const report: CheckReport = { file: "a.mp4", issues: [{ rule: "x", p: "P3", at: 1, says: "..." }], passed: [] };
    expect(rank(report).blocking).toHaveLength(0);
    expect(rank(report).minor).toHaveLength(1);
  });
});

describe("shapeFor", () => {
  it("khung dọc 1080x1920 là 9:16", () => expect(shapeFor(1080, 1920)).toBe("9:16"));
  it("khung ngang 1920x1080 là 16:9", () => expect(shapeFor(1920, 1080)).toBe("16:9"));
  it("khung vuông 1080x1080 là 1:1", () => expect(shapeFor(1080, 1080)).toBe("1:1"));
  it("khung 1080x1350 là 4:5", () => expect(shapeFor(1080, 1350)).toBe("4:5"));
});

describe("parseProbeSize", () => {
  it("đọc được kích thước ffprobe in ra", () => {
    expect(parseProbeSize("1080x1920\n")).toEqual({ w: 1080, h: 1920 });
  });

  it("ffprobe hỏng, stdout là null thì trả về null", () => {
    expect(parseProbeSize(null)).toBeNull();
  });

  it("stdout rỗng thì trả về null chứ không đoán", () => {
    expect(parseProbeSize("")).toBeNull();
  });

  it("stdout là chữ lạ thì trả về null", () => {
    expect(parseProbeSize("N/AxN/A")).toBeNull();
  });

  it("kích thước 0 thì trả về null, không chia cho 0", () => {
    expect(parseProbeSize("0x0")).toBeNull();
  });

  it("nhiều luồng thì lấy dòng đầu", () => {
    expect(parseProbeSize("1920x1080\n1280x720\n")).toEqual({ w: 1920, h: 1080 });
  });
});

describe("probeShape", () => {
  it("video không tồn tại thì lui về khổ dọc, không ném", async () => {
    expect(await probeShape("/khong/co/file/nay.mp4")).toBe(FALLBACK_SHAPE);
  });
});

describe("runCheck", () => {
  it("máy chưa cài raea thì trả về bỏ qua, không ném", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, "raea-khong-ton-tai-tren-may-nay");
    expect(outcome.status).toBe("skipped");
    if (outcome.status === "skipped") expect(outcome.reason).toMatch(/chưa cài raea/);
  });

  it("lệnh thoát mã 0 nhưng không ghi check.json thì báo hỏng, không báo bỏ qua", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, "true");
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") expect(outcome.reason).toMatch(/không ghi/);
  });

  it("lệnh thoát mã 2 thì báo hỏng kèm mã, không nuốt lỗi thành bỏ qua", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    // raea thoát mã 2 khi không mở được file. Cần một lệnh thật trả đúng mã đó,
    // vì `false` trả mã 1 và mã 1 vẫn là một kết quả soát hợp lệ.
    const fake = join(dir, "thoat-2.sh");
    writeFileSync(fake, "#!/bin/sh\nexit 2\n", { mode: 0o755 });
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, fake);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.code).toBe(2);
      // Phải là thông báo "lệnh hỏng", KHÔNG phải thông báo "không ghi check.json".
      // Hai câu đó đều chứa chuỗi "thoát mã 2", nên khớp lỏng là không kiểm được gì.
      expect(outcome.reason).toMatch(/^raea check hỏng, thoát mã 2/);
    }
  });
});
