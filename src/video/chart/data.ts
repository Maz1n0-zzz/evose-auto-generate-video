/**
 * Nạp và kiểm bộ dữ liệu nến.
 *
 * Đây là chỗ duy nhất chặn được dữ liệu hỏng. Chart vẽ từ dữ liệu sai vẫn ra ảnh đẹp,
 * vẫn có trục giá, và nói sai giá BTC cho người xem. Nên mọi ràng buộc của một cây nến
 * (cao nhất phải cao nhất, mốc thời gian phải tăng dần) kiểm ở đây, không kiểm ở chỗ vẽ.
 */

import { readFileSync } from "node:fs";
import { z } from "zod";
import type { Candle } from "./render.js";

const Price = z.number().finite().positive();

/** Một nến lưu dạng mảng cho gọn file: [mốc, mở, cao, thấp, đóng]. */
const Row = z.tuple([z.number().int().finite().nonnegative(), Price, Price, Price, Price]);

export const DatasetSchema = z.object({
  symbol: z.string().min(1),
  interval: z.string().min(1),
  source: z.string().min(1),
  fetchedAt: z.string().min(1),
  candles: Row.array().min(2, "cần ít nhất 2 nến"),
});

export type Dataset = z.infer<typeof DatasetSchema>;

/**
 * Kiểm bộ dữ liệu. `where` chỉ để ghép vào thông báo lỗi — SyntaxError hay lỗi zod trần
 * không nói file nào hỏng, mà thường có vài bộ dữ liệu cùng lúc.
 */
export function parseDataset(raw: unknown, where: string): Dataset {
  const parsed = DatasetSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(gốc)"}: ${i.message}`)
      .join("; ");
    throw new Error(`${where}: sai định dạng — ${detail}`);
  }
  const d = parsed.data;

  for (let i = 0; i < d.candles.length; i++) {
    const [t, o, h, l, c] = d.candles[i];
    if (h < l) {
      throw new Error(`${where}: nến ${i} có giá cao nhất ${h} thấp hơn giá thấp nhất ${l}`);
    }
    if (o > h || o < l || c > h || c < l) {
      throw new Error(
        `${where}: nến ${i} có giá mở ${o} hoặc giá đóng ${c} nằm ngoài khoảng cao thấp ${l}–${h}`,
      );
    }
    if (i > 0 && t <= d.candles[i - 1][0]) {
      throw new Error(
        `${where}: nến ${i} có mốc thời gian ${t} không lớn hơn nến trước ${d.candles[i - 1][0]}; ` +
          `mốc phải tăng dần và không được trùng`,
      );
    }
  }
  return d;
}

export function loadDataset(path: string): Dataset {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: JSON hỏng — ${e instanceof Error ? e.message : e}`);
  }
  return parseDataset(raw, path);
}

export function toCandles(d: Dataset): Candle[] {
  return d.candles.map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Chỉ số của nến theo ngày UTC. File cảnh khai ngày cho người đọc hiểu,
 * không khai chỉ số, vì chỉ số đổi mỗi lần tải lại dữ liệu.
 */
export function findIndexByDate(candles: readonly Candle[], day: string): number {
  if (!ISO_DAY.test(day)) {
    throw new Error(`"${day}" sai định dạng ngày, cần YYYY-MM-DD`);
  }
  const want = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(want)) throw new Error(`"${day}" không phải ngày có thật`);
  const i = candles.findIndex((c) => {
    const d = new Date(c.t);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) === want;
  });
  if (i < 0) throw new Error(`không có nến nào vào ngày ${day} trong bộ dữ liệu`);
  return i;
}

/**
 * Biên giá của một vùng, lấy từ chính các nến nền.
 *
 * Luôn dùng hàm này thay vì gõ hai con số vào file cảnh. Gõ tay là cách cũ,
 * và nó chính là lý do chart trước đây nhìn như vẽ đại.
 */
export function baseZone(
  candles: readonly Candle[],
  from: number,
  to: number,
): { low: number; high: number } {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    throw new Error(`khoảng nền [${from}, ${to}] không hợp lệ`);
  }
  if (from < 0 || to >= candles.length) {
    throw new Error(`khoảng nền [${from}, ${to}] nằm ngoài bộ dữ liệu có ${candles.length} nến`);
  }
  const win = candles.slice(from, to + 1);
  return {
    low: Math.min(...win.map((c) => c.l)),
    high: Math.max(...win.map((c) => c.h)),
  };
}
