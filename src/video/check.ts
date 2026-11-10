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
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Mức ưu tiên raea gán cho một lỗi, P0 nặng nhất. */
export type CheckPriority = "P0" | "P1" | "P2" | "P3";

/** P0 và P1 phải sửa trước khi giao. P2 và P3 chỉ ghi nhận. */
const BLOCKING: readonly CheckPriority[] = ["P0", "P1"];

export interface CheckIssue {
  readonly rule: string;
  readonly p: CheckPriority;
  readonly at: number;
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
  | { readonly status: "failed"; readonly code: number; readonly reason: string };

/** Mã thoát raea dùng cho kết quả soát: 0 là sạch, 1 là có lỗi trong video.
 *  Mọi mã khác nghĩa là bản thân lệnh hỏng, ví dụ 2 khi không mở được file. */
const RESULT_CODES: readonly number[] = [0, 1];

const PRIORITIES: readonly string[] = ["P0", "P1", "P2", "P3"];

/** Đọc check.json của raea và kiểm hình dạng. File do máy sinh ra, nhưng một bản raea khác
 *  có thể đổi khoá, nên kiểm vẫn rẻ hơn là để lỗi hiện ra ở chỗ khác. */
export function parseCheckReport(raw: unknown, source: string): CheckReport {
  if (typeof raw !== "object" || raw === null) throw new Error(`${source}: không phải một đối tượng JSON`);
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
    return {
      rule: issue.rule,
      p: issue.p as CheckPriority,
      at: typeof issue.at === "number" ? issue.at : 0,
      says: issue.says,
    };
  });

  return { file: data.file, issues, passed: data.passed.filter((p): p is string => typeof p === "string") };
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

/** Chạy một lệnh, trả về mã thoát thay vì ném. `null` nghĩa là không tìm thấy lệnh. */
function spawnForExitCode(cmd: string, args: readonly string[], cwd: string): Promise<number | null> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", "inherit", "ignore"] });
    p.on("close", (code) => res(code ?? 1));
    p.on("error", () => res(null));
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
  const code = await spawnForExitCode(bin, ["check", final, "--shape", shape, "-o", out], dir);

  if (code === null) return { status: "skipped", reason: "chưa cài raea (curl -fsSL https://raea.io/install | sh)" };
  if (!RESULT_CODES.includes(code)) return { status: "failed", code, reason: `raea check hỏng, thoát mã ${code}: kiểm lại ${final} có mở được không` };
  if (!existsSync(out)) return { status: "failed", code, reason: `raea thoát mã ${code} nhưng không ghi ${out}` };

  const report = parseCheckReport(JSON.parse(readFileSync(out, "utf8")) as unknown, "check.json");
  const { blocking, minor } = rank(report);
  return { status: "ran", report, blocking, minor };
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
