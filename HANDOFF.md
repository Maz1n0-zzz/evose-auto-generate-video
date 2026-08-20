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

1. **Kho logo + font brand** — Mazino có nhắc muốn làm nhưng CHƯA mô tả rõ là
   gì (một trang tra cứu bộ nhận diện? một thư mục asset chuẩn hoá?). Hỏi lại
   trước khi bắt tay.

2. **Phương án C — nhúng video quay màn hình thật làm nền.** Đã bàn, hoãn lại.
   Video mẫu của designer có ~40% thời lượng là quay app thật; bộ Light hiện
   chỉ nhúng được ảnh tĩnh (có cuộn). Hướng làm: template render lớp chữ nền
   trong suốt rồi ffmpeg overlay lên clip nền — giống cách `runBrandFinalize`
   đang đè overlay PNG. Ẩn số cần kiểm trước: HyperFrames 0.6.94 có xuất được
   video có kênh alpha không.

3. **README bản tiếng Anh.** Bản cập nhật lớn chỉ viết lại `README.md` bằng
   tiếng Việt và đã xoá `README.vi.md` (trùng nội dung). Cần bản tiếng Anh cho
   người ngoài thì dịch lại từ `README.md`.

4. **Đã merge và push.** `main` trên remote `evose` đã có toàn bộ.
   Push bằng `git push evose main` — KHÔNG dùng `origin` (không có quyền).

## Bản cập nhật lớn (2026-08-20) — commit `d4cf4eb`

Bộ `frame-*` cũ đã bị THAY THẾ HOÀN TOÀN. Đã push lên `evose/main`.

- **XOÁ 20 template `frame-*` khỏi cả git LẪN đĩa.** Dùng `git rm -r` chứ không
  phải `git rm --cached`, nên file thật trên máy cũng biến mất. Không còn
  `templates/frame-*` nào.
- `README.md` viết lại hoàn toàn cho bộ Light; `README.vi.md` bị xoá vì trùng.
- `CATALOG.md` cắt bỏ 332 dòng tài liệu bộ cũ.

### ⚠️ Hệ quả phải nhớ

1. **Hai thư mục `output/` cũ không render lại được nữa** —
   `deploying-retail-ai-20260706-0001` và `takeda-insilico-drug-ai-20260706-1442`
   có `script.json` trỏ tới `frame-*`. Chạy `npm run pipeline` trên chúng sẽ LỖI.
   File `.mp4` đã xuất thì vẫn còn nguyên.

2. **Lấy lại bộ cũ khi cần:**
   ```bash
   git checkout 458f13f -- templates/
   ```
   Phục hồi nguyên vẹn cả 20 template từ lịch sử git.

3. **Người clone mới chỉ cần tạo `.env.local`** là chạy được ngay. Đã kiểm:
   overlay bản sáng, nhạc nền, mascot, bản 16:9 của template và
   `scripts/gen-aspect.py` đều đã nằm trong git. `.env*` bị gitignore nên
   không bao giờ có sẵn — đó là chủ ý.

4. **Máy Mazino nay mặc định dùng bộ Light.** `SKILL.md` chỉ còn liệt kê 12
   template `evose-*`; gõ nhầm tên `frame-*` sẽ lỗi ngay vì thư mục không tồn tại.

## Đã làm xong sau đợt T1–T7

- Overlay bản Light bật trên mọi cảnh (`brand.style: "light"`), icon mạng xã
  hội đậm màu navy.
- Cảnh kết có nút FOLLOW: con trỏ đi từ ngoài khung vào, bấm, chữ đổi thành
  FOLLOWING (`follow: true`).
- Cảnh mở dùng slot `headline` + `subheadline`: tựa bài cỡ lớn canh giữa, có
  dải màu brand chạy ngang chữ để bắt mắt. Bỏ monogram khỏi khung vì header
  overlay đã có logo.
- `evose-title-card` mặc định chữ THẲNG (tilt 0, không italic). Kiểu nghiêng
  sticker vẫn bật lại được bằng `tilt` khác 0 + `italic: true`.
- Thẻ cảm xúc cho `eleven_v3`, tự bỏ thẻ ở `script.txt` và ở provider khác.
- Cảnh CÂM: `voiceText: ""` + `silentSec` (hiện không dùng nhưng còn trong code).
- `padSec`: nối lặng vào file giọng của một cảnh để nó đứng lâu hơn.
- `OUTRO_HOLD_SEC` 3 → 1.2 giây.
- Nhạc nền: bản mới, `volume 0.30`, ducking `ratio 4 / threshold 0.10`.
- `CATALOG.md` và `SKILL.md` đã sửa đúng theo `overlay: true, style: "light"`,
  và thêm Step 3b BẮT BUỘC chụp ảnh bài báo khi nguồn là URL.
- Hiệu ứng xoáy logo (`intro: "swirl"`) — có trong code nhưng KHÔNG dùng ở
  cảnh mở nữa vì Mazino đã đổi sang kiểu tựa bài cỡ lớn.

## Cách chạy

```bash
/create-template-video <link bài báo>          # tự động toàn bộ
npm run pipeline -- output/<thư-mục>/script.json   # chạy lại từ script có sẵn
```

Clip và file giọng **idempotent** — xoá `clips/scene-sN*.mp4` để render lại
riêng một cảnh, giữ nguyên phần còn lại (nhanh hơn nhiều).

Video mẫu đã dựng: `output/ai-my-canh-tranh-gia-trung-quoc-20260819-2240/`
(87 giây, 11 cảnh) — dùng để đối chiếu.
