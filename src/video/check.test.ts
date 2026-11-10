import { afterEach, describe, expect, it, vi } from "vitest";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
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

  it("thiếu khoá at thì là null, KHÔNG phải 0", () => {
    const thieu = { file: "a.mp4", issues: [{ rule: "x", p: "P2", says: "..." }], passed: [] };
    expect(parseCheckReport(thieu, "check.json").issues[0].at).toBeNull();
  });

  it("at là null giữ nguyên null: raea ghi vậy cho lỗi độ ồn", () => {
    // Nguyên văn raea 0.1.0 trả về cho output/mazino-ai-automation-intro-20261022-1834.
    const doOn = { file: "a.mp4", issues: [{ rule: "loudness", p: "P1", at: null, says: "-15.1 LUFS" }], passed: [] };
    expect(parseCheckReport(doOn, "check.json").issues[0].at).toBeNull();
  });

  it("at sai kiểu thì ném, không đổi âm thầm thành 0", () => {
    const xau = { file: "a.mp4", issues: [{ rule: "x", p: "P2", at: "12s", says: "..." }], passed: [] };
    expect(() => parseCheckReport(xau, "check.json")).toThrow(/at không phải số/);
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

  it("đủ bốn mức: P0 và P1 phải sửa, P2 và P3 ghi nhận", () => {
    // P0 là mức nặng nhất của hệ soát. Không có ca nào chứa P0 thì bỏ P0 khỏi danh sách
    // phải sửa vẫn làm cả bảng xanh, tức là mức nặng nhất không được bài nào canh.
    const bon = {
      file: "a.mp4",
      issues: (["P0", "P1", "P2", "P3"] as const).map((p) => ({ rule: `luat-${p}`, p, at: 1, says: "..." })),
      passed: [],
    };
    const { blocking, minor } = rank(parseCheckReport(bon, "check.json"));
    expect(blocking.map((i) => i.p)).toEqual(["P0", "P1"]);
    expect(minor.map((i) => i.p)).toEqual(["P2", "P3"]);
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

  it("tỉ lệ lạ thì lấy khổ gần nhất, không phải khổ đầu danh sách", () => {
    expect(shapeFor(1080, 1440)).toBe("4:5");
    expect(shapeFor(2560, 1080)).toBe("16:9");
  });

  it("đúng điểm giữa hai khổ thì giữ khổ xét trước", () => {
    // 1090/1600 = 0,68125, cách 9:16 và 4:5 bằng nhau. Luật hoà phải là "giữ cái đang có",
    // nếu không một khung sát giữa sẽ nhảy khổ tuỳ thứ tự duyệt.
    expect(shapeFor(1090, 1600)).toBe("9:16");
  });
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
    // "0x0" làm cả hai vế cùng sai, nên nó không phân biệt được phép AND với phép OR.
    // Hai ca lệch bên dưới mới ghim được luật "cả hai chiều đều phải dương".
    expect(parseProbeSize("0x0")).toBeNull();
    expect(parseProbeSize("1080x0")).toBeNull();
    expect(parseProbeSize("0x1920")).toBeNull();
  });

  it("nhiều luồng thì lấy dòng đầu", () => {
    expect(parseProbeSize("1920x1080\n1280x720\n")).toEqual({ w: 1920, h: 1080 });
  });
});

describe("probeShape", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ffprobe không đo được thì lui về khổ mặc định, không ném", async () => {
    expect(await probeShape("/khong/co/file/nay.mp4")).toBe(FALLBACK_SHAPE);
  });

  it("đo thật: đọc kích thước ffprobe in ra chứ không trả khổ mặc định", async () => {
    // Ca trên xanh cả khi probeShape luôn trả FALLBACK_SHAPE, vì khổ mặc định cũng là 9:16.
    // Ca này dựng một ffprobe giả in ra khung ngang, nên nó đỏ nếu đường đo thật không chạy.
    const dir = mkdtempSync(join(tmpdir(), "probe-"));
    writeFileSync(join(dir, "ffprobe"), "#!/bin/sh\necho 1920x1080\n", { mode: 0o755 });
    vi.stubEnv("PATH", `${dir}:${process.env.PATH ?? ""}`);
    expect(await probeShape("bat-ky.mp4")).toBe("16:9");
  });
});

describe("runCheck", () => {
  it("máy chưa cài raea thì trả về bỏ qua, không ném", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, "raea-khong-ton-tai-tren-may-nay");
    expect(outcome.status).toBe("skipped");
    if (outcome.status === "skipped") expect(outcome.reason).toMatch(/chưa cài raea/);
  });

  it("thư mục làm việc không tồn tại thì báo hỏng, KHÔNG báo chưa cài raea", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const outcome = await runCheck("x.mp4", dir, "9:16", join(dir, "khong-ton-tai"), "true");
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") expect(outcome.reason).toMatch(/thư mục làm việc không tồn tại/);
  });

  it("file lệnh thiếu quyền chạy thì báo hỏng, KHÔNG báo chưa cài raea", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const sh = join(dir, "khong-quyen.sh");
    writeFileSync(sh, "#!/bin/sh\nexit 0\n", { mode: 0o644 });
    const outcome = await runCheck("x.mp4", dir, "9:16", dir, sh);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") expect(outcome.reason).toMatch(/không chạy được/);
  });

  it("lệnh thoát mã 0 nhưng không ghi check.json thì báo hỏng, không báo bỏ qua", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, "true");
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") expect(outcome.reason).toMatch(/không ghi/);
  });

  /** Một raea giả: ghi sẵn nội dung check.json rồi thoát bằng mã đã chọn. */
  function fakeRaea(dir: string, json: string | null, exit: number): string {
    const sh = join(dir, `raea-gia-${exit}-${json === null ? "khong-ghi" : "co-ghi"}.sh`);
    const ghi = json === null ? "" : `cat > "$6" <<'JSON'\n${json}\nJSON\n`;
    writeFileSync(sh, `#!/bin/sh\n${ghi}exit ${exit}\n`, { mode: 0o755 });
    return sh;
  }

  it("mã 0 kèm check.json hợp lệ thì chạy được, không có lỗi phải sửa", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const bin = fakeRaea(dir, JSON.stringify(SACH), 0);
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, bin);
    expect(outcome.status).toBe("ran");
    if (outcome.status === "ran") {
      expect(outcome.blocking).toHaveLength(0);
      expect(outcome.report.passed).toHaveLength(1);
    }
  });

  it("mã 1 là kết quả soát hợp lệ, không phải lệnh hỏng", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const bin = fakeRaea(dir, JSON.stringify(CO_LOI), 1);
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, bin);
    expect(outcome.status).toBe("ran");
    if (outcome.status === "ran") {
      expect(outcome.blocking.map((i) => i.rule)).toEqual(["blotching"]);
      expect(outcome.minor.map((i) => i.rule)).toEqual(["frozen"]);
    }
  });

  it("check.json hỏng cú pháp thì báo hỏng, KHÔNG ném ra ngoài giết pipeline", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const bin = fakeRaea(dir, '{"file": "a.mp4", "issues": [', 0);
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, bin);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") expect(outcome.reason).toMatch(/không đọc được/);
  });

  it("check.json sai hình dạng cũng báo hỏng chứ không ném", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const bin = fakeRaea(dir, '{"file": "a.mp4", "passed": []}', 0);
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, bin);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") expect(outcome.reason).toMatch(/thiếu mảng issues/);
  });

  it("raea không ghi file mới thì KHÔNG được đọc check.json của lần dựng trước", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    // Dựng hiện trường: lần trước đã để lại một báo cáo sạch trong thư mục.
    writeFileSync(join(dir, "check.json"), JSON.stringify(SACH));
    const bin = fakeRaea(dir, null, 0);
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, bin);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") expect(outcome.reason).toMatch(/không ghi/);
  });

  it("xoá báo cáo cũ không được thì báo hỏng, KHÔNG ném ra ngoài giết pipeline", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    writeFileSync(join(dir, "check.json"), JSON.stringify(SACH));
    chmodSync(join(dir, "check.json"), 0o444);
    chmodSync(dir, 0o555);
    try {
      const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, "true");
      expect(outcome.status).toBe("failed");
      if (outcome.status === "failed") expect(outcome.reason).toMatch(/không xoá được báo cáo cũ/);
    } finally {
      chmodSync(dir, 0o755);
    }
  });

  it("bị tín hiệu giết thì báo hỏng kèm tên tín hiệu, không hoá thành mã 1", async () => {
    const dir = mkdtempSync(join(tmpdir(), "check-"));
    const sh = join(dir, "tu-giet.sh");
    writeFileSync(sh, "#!/bin/sh\nkill -TERM $$\n", { mode: 0o755 });
    const outcome = await runCheck(join(dir, "final.mp4"), dir, "9:16", dir, sh);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.signal).toBe("SIGTERM");
      expect(outcome.code).toBeUndefined();
    }
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
