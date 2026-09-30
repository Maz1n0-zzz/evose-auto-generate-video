#!/usr/bin/env node
/**
 * `npm run video:new -- <slug>` — tạo thư mục làm việc cho một video.
 *
 * Chép khung mẫu `template/` (nhận diện Evose, font, caption skin, khung mở và
 * kết đã duyệt) sang `output/<slug>-<YYYYMMDD-HHmm>/`. In ra đường dẫn thư mục.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toSlug } from "../utils/slug.js";
import { REPO_ROOT, TEMPLATE_DIR } from "./lib.js";

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function main(): void {
  const raw = process.argv.slice(2).join(" ").trim();
  if (!raw) {
    console.error("Dùng: npm run video:new -- <slug hoặc tựa bài>");
    process.exit(2);
  }
  const slug = toSlug(raw).slice(0, 40) || "video";
  const dir = join(REPO_ROOT, "output", `${slug}-${stamp()}`);
  if (existsSync(dir)) throw new Error(`${dir} đã có`);

  // brand/ là mẫu để chép tay vào compositions/frames, không nằm trong dự án.
  cpSync(TEMPLATE_DIR, dir, { recursive: true, filter: (src) => !src.includes(`${TEMPLATE_DIR}/brand`) });
  mkdirSync(join(dir, "compositions", "frames"), { recursive: true });
  mkdirSync(join(dir, "capture", "extracted"), { recursive: true });
  const pkgPath = join(dir, "package.json");
  writeFileSync(pkgPath, readFileSync(pkgPath, "utf8").replace("__SLUG__", slug));
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: slug, name: slug, createdAt: new Date().toISOString() }, null, 2));
  console.log(dir);
}

try {
  main();
} catch (e) {
  console.error(`✗ video:new: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
