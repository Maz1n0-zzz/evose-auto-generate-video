#!/usr/bin/env node
/**
 * `npm run video:packets -- <thư mục video>` — chia gói việc cho worker dựng khung.
 *
 * Chạy frame-packets.mjs của HyperFrames (một gói mỗi khung + `_role.md`), rồi
 * ghi thêm `_dispatch.md`: phần Video direction của storyboard + luật riêng
 * của Evose (vùng an toàn, không đứng yên, font). Mỗi worker đọc đúng ba file:
 * `_role.md`, gói của khung mình, `_dispatch.md`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { facelessScriptsDir, projectDir, run } from "./lib.js";

const EVOSE_RULES = `## Luật Evose cho mọi khung (bắt buộc, đè lên frame.md khi khác nhau)

- Canvas 1080×1920. Captions: enabled.
- Vùng an toàn chặt hơn mặc định: header logo Evose phủ y 0–270, footer mạng xã hội phủ y 1690–1920,
  phụ đề nằm y 1530–1680. Mọi nội dung chính phải nằm trong y 290–1520 ở MỌI thời điểm, kể cả khi camera
  lướt. Nền và lưới được tràn toàn khung. Chữ không được chạm mép trái/phải: chừa ít nhất 48px.
- Mốc Scene trong gói là giây thật khớp lời đọc, bám đúng ±0.1s.
- Không thứ gì đứng yên: không quãng nào quá 1,5 giây mà không có chuyển động nhìn thấy được. Nội dung
  đã hiện đủ thì camera vẫn đẩy chậm (tối đa 4%) trên một lớp bọc bên trong, và lưới nền trôi nhẹ.
- Tất định: không repeat:-1, không CSS transition, không tween letterSpacing/width/height, không onUpdate
  để đổi chữ (dùng tl.set). Không Math.random, không Date.
- Font: chỉ dùng đúng khối này, đường dẫn tính từ gốc dự án:
    @font-face { font-family: "Hanken Grotesk"; src: url("assets/fonts/HankenGrotesk-VF.ttf") format("truetype"); font-weight: 100 900; }
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype"); font-weight: 100 599; }
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Bold.ttf") format("truetype"); font-weight: 600 900; }
  Không tải font từ Google Fonts hay CDN.
- id phần tử bắt đầu bằng chữ cái (vd "f07-bar"), không bắt đầu bằng số.
- Chữ trên màn hình: tiếng Việt, ngắn (nhãn, số). Không in nguyên câu lời đọc. Không bịa số ngoài lời đọc.
  Không dùng logo thật của hãng, chỉ chip chữ. Không tiếng Việt trong hiệu ứng xáo chữ ngẫu nhiên.
- Ảnh thật chỉ dùng khi gói có dòng asset_candidates, đường dẫn dạng assets/<file>.
- Viết file xong, tự chụp để kiểm: từ thư mục dự án chạy
    npx hyperframes snapshot --at <3-4 mốc giây tuyệt đối trong khung> --no-end --timeout 15000 -o <thư mục tạm riêng>
  rồi dùng Read xem ảnh. Sửa tới khi không có chữ đè nhau, không cắt chữ, không vùng trống lớn.
`;

async function main(): Promise<void> {
  const dir = projectDir(process.argv[2], "Dùng: npm run video:packets -- <thư mục video>");
  await run("node", [join(facelessScriptsDir(), "frame-packets.mjs"), "--project", dir, "--storyboard", join(dir, "STORYBOARD.md")], dir);
  const sb = readFileSync(join(dir, "STORYBOARD.md"), "utf8");
  const direction = sb.match(/^## Video direction[\s\S]*?(?=^## (?:Frame|Beat|Scene)\b)/m)?.[0] ?? "";
  if (!direction) throw new Error("STORYBOARD.md thiếu mục `## Video direction` (đặt trước Frame 1)");
  const ownRules = join(dir, "brand", "rules.md");
  const rules = existsSync(ownRules) ? readFileSync(ownRules, "utf8") : EVOSE_RULES;
  writeFileSync(join(dir, ".hyperframes", "frame-packets", "_dispatch.md"), `${direction.trim()}\n\n${rules}`);
  console.log("✓ đã ghi .hyperframes/frame-packets/_dispatch.md");
}

main().catch((e) => {
  console.error(`✗ video:packets: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
