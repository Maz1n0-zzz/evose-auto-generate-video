# HANDOFF — Bộ template Evose Light

> File bàn giao để tiếp tục ở phiên Claude Code mới. Cập nhật 2026-08-19.
> Nhánh: `feat/evose-light-templates` (chưa merge, chưa push).

## Bối cảnh

Mazino đưa một video mẫu do designer làm (TikTok `@evose.ai_vn`, series
"EVOSE MASTERY AI", tập về System Prompt — YouTube Shorts `DKdE8k5o8PA`).
Yêu cầu: dựng **bộ template mới bám theo phong cách video đó** để thay thế
toàn bộ bộ cũ, nhưng **không xoá bộ cũ** cho tới khi bộ mới chạy ổn.

Phong cách video mẫu: nền giấy sáng `#f2f2f0` + lưới chấm, chip đen bo tròn,
nét nối chấm, một màu nhấn duy nhất, mascot robot 3D, **không** gradient,
**không** dark mode.

## Đã xong (T1–T7)

12 template `evose-*` trong `templates/`, mỗi cái một file
`compositions/portrait.html` tự chứa:

| Template | Việc |
|---|---|
| `evose-logo-card` | Cảnh mở + cảnh kết (gộp một, phân biệt bằng `tagline`/`url`) |
| `evose-node-diagram` | Sơ đồ chip, `layout: split` (có `verdict`) hoặc `stack` (badge ❌/✅) |
| `evose-title-card` | Chữ trắng viền đen dày, nghiêng lệch dần |
| `evose-chapter-card` | Banner đen công bố phần/bước |
| `evose-statement` | Câu chốt: badge trên + chip dẫn + hero + badge lớn dưới |
| `evose-list` | Danh sách 2–5 mục `{icon,title,desc,tag,level}` |
| `evose-stat-hero` | Một con số lớn (không phải %) |
| `evose-pipeline` | Quy trình 3–6 bước có icon + mô tả |
| `evose-chart-bars` / `-donut` / `-line` | 3 biểu đồ |
| `evose-screenshot` | Ảnh chụp màn hình: `pan` để cuộn, `hl_*` để soi |

## Kiến trúc quan trọng — ĐỌC TRƯỚC KHI SỬA TEMPLATE

1. **Một file dùng cho cả 9:16 và 16:9.** Mọi hằng số hình học nằm trong
   object `GEO` ở cuối `<script>`, chọn theo `data-width`/`data-height` lúc
   chạy. Bản 16:9 (`index.html`) **sinh tự động**:
   ```bash
   python3 scripts/gen-aspect.py templates/evose-<tên>
   ```
   **Đừng sửa `index.html` bằng tay** — nó bị ghi đè. Sửa `portrait.html`
   rồi chạy lại lệnh trên.

2. **`gen-aspect.py` có bộ chặn lỗi comment CSS.** Viết dấu sao + gạch chéo
   trong comment CSS (hay gặp khi gõ đường dẫn có ký tự đại diện) sẽ đóng
   comment sớm, nuốt khối `:root` phía sau, và frame render ra **trắng trơn
   không báo lỗi**. Đã dính một lần ở `evose-logo-card`.

3. **Animation không được gắn bất đồng bộ.** HyperFrames render bằng nhiều
   worker và tua đồng hồ ảo. Gắn class chạy animation trong `img.onload` →
   mỗi worker bắt đầu ở mốc khác nhau → frame lộn xộn. Đã dính ở
   `evose-screenshot` (cuộn). Nay quãng cuộn tính hoàn toàn bằng CSS:
   `translateY(calc(-1 * var(--panfrac) * max(0px, 100% - var(--dev-h))))`.

## Cấu hình đang dùng

- TTS: **ElevenLabs**, model `eleven_v3`, giọng "Nhật Phong - Narrative &
  Compelling" (nam, giọng Bắc). Key nằm trong `.env.local`.
- **Claude KHÔNG đọc/ghi được `.env*`** — bị chặn bởi quy tắc quyền. Muốn
  đổi thì Mazino tự sửa file.
- OmniVoice không còn trên máy (không tìm thấy dấu vết). Đừng đề xuất lại.
- Thẻ cảm xúc `[excited]`, `[sighs]`… viết thẳng vào `voiceText`;
  `src/utils/audio-tags.ts` tự bỏ thẻ khi ghi `script.txt` và khi provider
  không phải ElevenLabs.

## Thương hiệu

- `brand.overlay` (mặc định `true`) + `brand.style: "dark" | "light"`.
- Bộ Light phải dùng `{ "overlay": true, "style": "light" }` — Mazino ĐÃ ĐỔI
  Ý so với quyết định ban đầu: **muốn logo + icon mạng xã hội trên MỌI cảnh**,
  không chỉ cảnh mở/kết.
- Overlay bản sáng: `evose-brand-kit/overlays/overlay-frame-light.png`, sinh từ
  `overlay-frame-light.html` bằng `generate-overlay-png.sh` (Chrome headless).
- Mascot: `evose-brand-kit/mascot/` — 14 tư thế PNG alpha, xem README ở đó.

## ⚠️ VIỆC CÒN DANG DỞ

1. **`templates/CATALOG.md` và `.claude/skills/create-template-video/SKILL.md`
   đang GHI SAI** — vẫn bảo `brand.overlay: false` là bắt buộc cho bộ Light.
   Phải sửa thành `{ "overlay": true, "style": "light" }`, nếu không lần chạy
   `/create-template-video` sau sẽ tự tắt overlay và mất logo.

2. **Nút FOLLOW ở cảnh kết** — Mazino muốn giống bộ cũ: nút bo tròn màu xanh
   ghi "FOLLOW", con trỏ chuột di vào bấm, chữ đổi thành "FOLLOWING". Chưa làm.

3. **Icon mạng xã hội ở footer overlay** — Mazino thấy còn nhạt, muốn đậm
   thành màu brand navy `#0A1532`.

4. Chưa merge `feat/evose-light-templates` vào `main`, chưa push lên remote
   `evose` (`git push evose main` — KHÔNG dùng `origin`).

5. Phương án C (nhúng video/quay màn hình thật làm nền) đã bàn nhưng **hoãn
   lại**. Video mẫu của designer có ~40% thời lượng là quay app thật; bộ Light
   hiện chỉ nhúng được ảnh tĩnh.

## Cách chạy

```bash
/create-template-video <link bài báo>          # tự động toàn bộ
npm run pipeline -- output/<thư-mục>/script.json   # chạy lại từ script có sẵn
```

Clip và file giọng **idempotent** — xoá `clips/scene-sN*.mp4` để render lại
riêng một cảnh, giữ nguyên phần còn lại (nhanh hơn nhiều).

Video mẫu đã dựng: `output/ai-my-canh-tranh-gia-trung-quoc-20260819-2240/`
(87 giây, 11 cảnh) — dùng để đối chiếu.
