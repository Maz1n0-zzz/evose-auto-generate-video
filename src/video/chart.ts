#!/usr/bin/env node
/**
 * `npm run video:chart -- <thư mục video> <file cảnh>`
 *
 * Sinh chart nến cho từng khung đã khai trong file cảnh. Mỗi khung ra hai file trong
 * `<dir>/assets/chart/`: một `.svg` để nhúng thẳng vào khung, và một `.coords.json`
 * cho worker gắn hiệu ứng. Worker không bao giờ tự gõ toạ độ nến nữa.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { REPO_ROOT, projectDir, readJsonFile } from "./lib.js";
import { loadDataset, toCandles } from "./chart/data.js";
import { renderChart } from "./chart/render.js";
import { DEFAULT_THEME, parseScene, parseTheme, resolveShot } from "./chart/scene.js";

/** Đường dẫn trong file cảnh tính từ gốc repo, để file cảnh đọc được bằng mắt. */
const fromRepo = (p: string) => (isAbsolute(p) ? p : resolve(REPO_ROOT, p));

function main(): void {
  const dir = projectDir(process.argv[2], "Dùng: npm run video:chart -- <thư mục video> <file cảnh>");
  const scenePath = process.argv[3];
  if (!scenePath) {
    console.error("Dùng: npm run video:chart -- <thư mục video> <file cảnh>");
    process.exit(2);
  }

  const scene = parseScene(readJsonFile(fromRepo(scenePath)), scenePath);
  const dataset = loadDataset(fromRepo(scene.dataset));
  const candles = toCandles(dataset);
  const theme = scene.theme ? parseTheme(readJsonFile(fromRepo(scene.theme)), scene.theme) : DEFAULT_THEME;

  const out = join(dir, "assets", "chart");
  mkdirSync(out, { recursive: true });

  for (const shot of scene.shots) {
    const { view, annotations } = resolveShot(shot, candles, scene.panel);
    const { svg, coords } = renderChart({
      candles,
      view,
      panel: scene.panel,
      symbol: dataset.symbol,
      interval: scene.interval,
      theme,
      annotations,
    });
    writeFileSync(join(out, `${shot.id}.svg`), `${svg}\n`);
    writeFileSync(join(out, `${shot.id}.coords.json`), `${JSON.stringify(coords, null, 1)}\n`);
    const span = `${shot.fromDate}→${shot.toDate}`;
    console.log(`  ${shot.id}: ${view.to - view.from} nến ${span} · ${coords.zones.length} vùng · ${coords.markers.length} mốc`);
  }

  console.log(`✓ ${scene.shots.length} khung chart → ${out}`);
  console.log(`  dữ liệu: ${dataset.symbol} ${dataset.interval}, ${dataset.candles.length} nến, tải ${dataset.fetchedAt.slice(0, 10)}`);
  // Nhắc một lần: số trên trục là giá thật, nên nguồn phải nói ra được.
  console.log(`  nguồn: ${dataset.source}`);
}

try {
  main();
} catch (e) {
  console.error(`✗ video:chart: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
