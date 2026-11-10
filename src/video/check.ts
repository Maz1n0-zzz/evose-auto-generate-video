/**
 * Soát bản xuất bằng `raea check`.
 *
 * Engine raea cài riêng ở ~/.raea, không phải dependency của repo này. Máy nào chưa cài thì
 * pipeline vẫn chạy bình thường, chỉ bỏ qua bước soát. Xem ~/.claude/skills/evose-render-gpu/.
 *
 * `raea check` thoát mã 1 khi tìm thấy lỗi, nên không dùng được `run()` của lib.ts: nó sẽ ném
 * và giết cả pipeline ngay ở một lỗi P3. Ở đây tự gọi spawn và đọc mã thoát.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

/** Mức ưu tiên raea gán cho một lỗi, P0 nặng nhất. */
export type CheckPriority = "P0" | "P1" | "P2" | "P3";

/** P0 và P1 phải sửa trước khi giao. P2 và P3 chỉ ghi nhận. */
const BLOCKING: readonly CheckPriority[] = ["P0", "P1"];

export interface CheckIssue {
  readonly rule: string;
  readonly p: CheckPriority;
  /** Giây xảy ra lỗi, hoặc `null` khi lỗi không gắn với một thời điểm nào.
   *  Raea thật ghi `null` cho lỗi độ ồn, vì độ ồn đo trên cả bài chứ không ở một giây. */
  readonly at: number | null;
  readonly says: string;
}

export interface CheckReport {
  readonly file: string;
  readonly issues: readonly CheckIssue[];
  readonly passed: readonly string[];
}

export type CheckOutcome =
  | { readonly status: "ran"; readonly report: CheckReport; readonly blocking: readonly CheckIssue[]; readonly minor: readonly CheckIssue[] }
  | { readonly status: "skipped"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string; readonly code?: number; readonly signal?: string };

/** Mã thoát raea dùng cho kết quả soát: 0 là sạch, 1 là có lỗi trong video.
 *  Mọi mã khác nghĩa là bản thân lệnh hỏng, ví dụ 2 khi không mở được file. */
const RESULT_CODES: readonly number[] = [0, 1];

const PRIORITIES: readonly string[] = ["P0", "P1", "P2", "P3"];

/** Đọc check.json của raea và kiểm hình dạng. File do máy sinh ra, nhưng một bản raea khác
 *  có thể đổi khoá, nên kiểm vẫn rẻ hơn là để lỗi hiện ra ở chỗ khác. */
export function parseCheckReport(raw: unknown, source: string): CheckReport {
  if (typeof raw !== "object" || raw === null) throw new Error(`${source}: không phải một đối tượng JSON`);
  // Mảng cũng có typeof "object", và nếu để nó đi tiếp thì lỗi báo ra là "thiếu khoá file",
  // một câu dẫn người đọc đi sai hướng hẳn.
  if (Array.isArray(raw)) throw new Error(`${source}: là một mảng, phải là một đối tượng`);
  const data = raw as Record<string, unknown>;
  if (typeof data.file !== "string") throw new Error(`${source}: thiếu khoá file`);
  if (!Array.isArray(data.issues)) throw new Error(`${source}: thiếu mảng issues`);
  if (!Array.isArray(data.passed)) throw new Error(`${source}: thiếu mảng passed`);

  const issues = data.issues.map((item, i) => {
    if (typeof item !== "object" || item === null) throw new Error(`${source}: issues[${i}] không phải đối tượng`);
    const issue = item as Record<string, unknown>;
    if (typeof issue.rule !== "string") throw new Error(`${source}: issues[${i}] thiếu rule`);
    if (typeof issue.says !== "string") throw new Error(`${source}: issues[${i}] thiếu says`);
    if (typeof issue.p !== "string" || !PRIORITIES.includes(issue.p)) {
      throw new Error(`${source}: issues[${i}] có mức ưu tiên lạ: ${String(issue.p)}`);
    }
    // `at` vắng mặt hoặc null là hợp lệ và giữ nguyên là null. Một kiểu khác, hay NaN, là
    // dấu hiệu raea đổi hình dạng: ném, đừng đổi âm thầm thành 0 rồi in ra "tại 0s".
    const at = issue.at ?? null;
    if (at !== null && (typeof at !== "number" || !Number.isFinite(at) || at < 0)) {
      throw new Error(`${source}: issues[${i}] có at không phải giây hợp lệ: ${String(issue.at)}`);
    }
    return { rule: issue.rule, p: issue.p as CheckPriority, at, says: issue.says };
  });

  // Lọc im lặng ở đây là làm `passed.length` hụt mà không ai biết, và chính con số đó đi
  // thẳng ra dòng tóm tắt "N mục đạt". Raea đổi hình dạng thì phải ném, như mọi khoá khác.
  const passed = data.passed.map((p, i) => {
    if (typeof p !== "string") throw new Error(`${source}: passed[${i}] không phải chuỗi: ${String(p)}`);
    return p;
  });

  return { file: data.file, issues, passed };
}

/** Tách lỗi phải sửa khỏi lỗi chỉ ghi nhận. */
export function rank(report: CheckReport): { blocking: CheckIssue[]; minor: CheckIssue[] } {
  const blocking = report.issues.filter((i) => BLOCKING.includes(i.p));
  const minor = report.issues.filter((i) => !BLOCKING.includes(i.p));
  return { blocking, minor };
}

/** Chạy một lệnh và lấy stdout. `null` nghĩa là lệnh hỏng hoặc không có. */
function captureStdout(cmd: string, args: readonly string[]): Promise<string | null> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    p.stdout.on("data", (c: Buffer) => (out += c.toString()));
    p.on("close", (code) => res(code === 0 ? out : null));
    p.on("error", () => res(null));
  });
}

/**
 * Tỉ lệ khung của một video, đo thẳng từ file thay vì suy từ storyboard.
 *
 * Đo file là đo đúng thứ sắp giao. Suy từ storyboard thì một bước cắt hay phủ ở giữa làm
 * sai mà không ai biết. Không đo được thì trả về khổ dọc, vì mọi video của pipeline này là 9:16.
 */
export async function probeShape(video: string): Promise<string> {
  const out = await captureStdout("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", video,
  ]);
  const size = parseProbeSize(out);
  return size ? shapeFor(size.w, size.h) : FALLBACK_SHAPE;
}

/** Khổ mặc định khi không đo được: mọi video của pipeline này là 9:16. */
export const FALLBACK_SHAPE = "9:16";

/** Đọc "1080x1920" từ stdout của ffprobe. Trả về `null` khi không đọc được. */
export function parseProbeSize(out: string | null): { w: number; h: number } | null {
  const m = out?.trim().match(/^(\d+)x(\d+)$/m);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return w > 0 && h > 0 ? { w, h } : null;
}

/** Ba kết cục của một lần gọi lệnh. Tách `signal` khỏi `exit` vì một tiến trình bị giết
 *  không có mã thoát, và gộp nó vào một mã nào đó là biến tai nạn thành kết quả soát. */
type SpawnResult =
  | { readonly kind: "exit"; readonly code: number }
  | { readonly kind: "signal"; readonly signal: string }
  | { readonly kind: "unknown" }
  | { readonly kind: "broken"; readonly why: string }
  | { readonly kind: "missing" };

/** Chạy một lệnh, trả về kết cục thay vì ném. */
function spawnOnce(cmd: string, args: readonly string[], cwd: string): Promise<SpawnResult> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", "inherit", "ignore"] });
    // `close` vẫn phát sau `error`, nhưng promise chỉ nhận lần resolve đầu nên vô hại.
    p.on("close", (code, signal) => {
      if (signal) return res({ kind: "signal", signal });
      // Theo tài liệu Node thì `code` chỉ null khi có `signal`, nên nhánh này không chạy
      // trong thực tế và CỐ Ý không có test. Nó ở đây để một kết cục không rõ không bị
      // đọc thành "thoát sạch": quy về 0 là biến cái không biết thành một kết quả soát.
      if (code === null) return res({ kind: "unknown" });
      res({ kind: "exit", code });
    });
    // Chỉ ENOENT mới là "không có lệnh này". Gộp mọi lỗi spawn vào đó là nuốt một cấu
    // hình hỏng thành "bỏ qua bước soát", và người đọc đi cài lại raea mà không khỏi.
    p.on("error", (e: NodeJS.ErrnoException) =>
      res(e.code === "ENOENT" ? { kind: "missing" } : { kind: "broken", why: `${e.code ?? "lỗi"}: ${e.message}` }));
  });
}

/**
 * Soát `final.mp4` và ghi `renders/check.json`.
 *
 * @param final đường dẫn tuyệt đối tới bản giao
 * @param renders thư mục renders của video
 * @param shape tỉ lệ khung, ví dụ "9:16"
 * @param dir thư mục làm việc của video
 * @param bin tên lệnh, chỉ đổi trong test để kiểm nhánh máy chưa cài
 */
export async function runCheck(final: string, renders: string, shape: string, dir: string, bin = "raea"): Promise<CheckOutcome> {
  const out = join(renders, "check.json");
  // Xoá báo cáo của lần dựng trước. Không xoá thì một lần raea không ghi được file sẽ làm
  // `existsSync` bên dưới đọc nhầm kết quả cũ và báo nó như kết quả của video lần này.
  // `force` chỉ nuốt ENOECT, còn EACCES và EISDIR vẫn ném, nên phải bắt: để nó ném là
  // dựng lại đúng lớp lỗi mà cả hàm này sinh ra để tránh.
  try {
    rmSync(out, { force: true });
  } catch (e: unknown) {
    const why = e instanceof Error ? e.message : String(e);
    return { status: "failed", reason: `không xoá được báo cáo cũ ${out}: ${why}` };
  }

  // Thư mục làm việc không có cũng cho ENOENT y như lệnh không có, nên phải loại trừ nó
  // trước, không thì một đường dẫn sai bị báo thành "chưa cài raea".
  if (!existsSync(dir)) return { status: "failed", reason: `thư mục làm việc không tồn tại: ${dir}` };

  const r = await spawnOnce(bin, ["check", final, "--shape", shape, "-o", out], dir);

  if (r.kind === "missing") return { status: "skipped", reason: "chưa cài raea (curl -fsSL https://raea.io/install | sh)" };
  if (r.kind === "broken") return { status: "failed", reason: `không chạy được ${bin}, ${r.why}` };
  if (r.kind === "signal") return { status: "failed", signal: r.signal, reason: `raea check bị giết bằng tín hiệu ${r.signal}, chưa soát xong` };
  if (r.kind === "unknown") return { status: "failed", reason: "raea check kết thúc không rõ: không có mã thoát và không có tín hiệu" };
  if (!RESULT_CODES.includes(r.code)) return { status: "failed", code: r.code, reason: `raea check hỏng, thoát mã ${r.code}: kiểm lại ${final} có mở được không` };
  if (!existsSync(out)) return { status: "failed", code: r.code, reason: `raea thoát mã ${r.code} nhưng không ghi ${out}` };

  // Mọi sự cố của bước soát phải thành một trạng thái trả về, không được ném: bản giao đã
  // xuất xong rồi, giết pipeline ở đây là báo thất bại cho một video dùng được.
  try {
    const report = parseCheckReport(JSON.parse(readFileSync(out, "utf8")) as unknown, "check.json");
    const { blocking, minor } = rank(report);
    return { status: "ran", report, blocking, minor };
  } catch (e: unknown) {
    const why = e instanceof Error ? e.message : String(e);
    return { status: "failed", code: r.code, reason: `không đọc được ${out}: ${why}` };
  }
}

/** Tỉ lệ khung mà raea check nhận, suy từ kích thước khung dựng. */
export function shapeFor(w: number, h: number): string {
  const ratio = w / h;
  const known: readonly [string, number][] = [["9:16", 9 / 16], ["4:5", 4 / 5], ["1:1", 1], ["16:9", 16 / 9]];
  let best = known[0];
  for (const candidate of known) {
    if (Math.abs(candidate[1] - ratio) < Math.abs(best[1] - ratio)) best = candidate;
  }
  return best[0];
}
