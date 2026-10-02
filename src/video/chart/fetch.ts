/**
 * Tải nến thật từ Binance về một file ghim trong repo.
 *
 * Dữ liệu ghim vào repo chứ không gọi mạng lúc dựng video, vì hai lý do: dựng lại một
 * video cũ phải ra đúng ảnh cũ, và một lần Binance chặn IP không được làm hỏng cả pipeline.
 * Chạy lại lệnh này khi muốn làm mới.
 *
 * Dùng: npm run video:chart:fetch -- <mã> <khung> <số nến> <file ra>
 *   vd: npm run video:chart:fetch -- BTCUSDT 1d 1000 brands/wtc/chart/data/btcusdt-1d.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseDataset, type Dataset } from "./data.js";

const HOST = "https://api.binance.com";

export function klinesToRows(raw: unknown): Dataset["candles"] {
  if (!Array.isArray(raw)) throw new Error("Binance trả về thứ không phải mảng");
  return raw.map((k, i) => {
    if (!Array.isArray(k) || k.length < 5) throw new Error(`dòng ${i} của Binance thiếu trường`);
    const row: [number, number, number, number, number] = [
      Number(k[0]),
      Number(k[1]),
      Number(k[2]),
      Number(k[3]),
      Number(k[4]),
    ];
    if (row.some((v) => !Number.isFinite(v))) throw new Error(`dòng ${i} của Binance có số không đọc được`);
    return row;
  });
}

async function main(): Promise<void> {
  const [symbol, interval, limitArg, out] = process.argv.slice(2);
  if (!symbol || !interval || !limitArg || !out) {
    console.error("Dùng: npm run video:chart:fetch -- <mã> <khung> <số nến> <file ra>");
    process.exit(2);
  }
  const limit = Number(limitArg);
  if (!Number.isInteger(limit) || limit < 2 || limit > 1000) {
    console.error(`số nến phải là số nguyên trong khoảng 2–1000, nhận được "${limitArg}"`);
    process.exit(2);
  }

  const url = `${HOST}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Binance trả mã ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const rows = klinesToRows(await res.json());
  // Bỏ nến cuối: nó có thể đang chạy dở, tải lại lúc khác sẽ ra số khác.
  rows.pop();

  const data: Dataset = {
    symbol,
    interval,
    source: `binance:${HOST}/api/v3/klines`,
    fetchedAt: new Date().toISOString(),
    candles: rows,
  };
  parseDataset(data, out); // tự kiểm trước khi ghi, đừng ghim dữ liệu hỏng vào repo

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(data, null, 0).replace(/\],\[/g, "],\n  [")}\n`);

  const d0 = new Date(rows[0][0]).toISOString().slice(0, 10);
  const d1 = new Date(rows[rows.length - 1][0]).toISOString().slice(0, 10);
  console.log(`✓ ${out}`);
  console.log(`  ${rows.length} nến ${symbol} ${interval} · ${d0} → ${d1}`);
}

main().catch((e) => {
  console.error(`✗ video:chart:fetch: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
