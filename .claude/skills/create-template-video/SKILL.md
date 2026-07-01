---
name: create-template-video
description: Tạo video tin tức 9:16 bằng TEMPLATE HyperFrames chuyên nghiệp (poster editorial) từ URL bài báo hoặc file .txt tiếng Việt. Trigger khi user muốn tạo video tin tức, làm short news, video kiểu template/poster đẹp, "tạo video template", "làm bản tin kiểu poster", "video chuyên nghiệp". Output: video.mp4 + voice.mp3 + script.txt cho CapCut.
---

# Create Template Video Skill

## 🎯 EVOSE BRAND v3 (BẮT BUỘC TUÂN THỦ)

**LƯU Ý CỰC QUAN TRỌNG: Repo này dùng cho thương hiệu Evose.**

### Header + Footer: KHÔNG ĐIỀN
Repo có **OVERLAY LAYER thống nhất** (header "Evose.ai" + footer social icons) tự động đè
lên mọi scene. Vì vậy:
- ❌ KHÔNG điền `footer_left`, `footer_right`, `side_left`, `side_right`, `caption`, `date`
  → để chuỗi rỗng `""` hoặc bỏ field
- ❌ KHÔNG điền filler text như "ISC 2026", "Hamburg", "VFX/GLITCH", "Edge workstation"
- ✅ Field hiển thị nội dung chính (headline, subtitle, label, number, items) vẫn điền bình thường

### Brand Fields (chỉ những fields KHÔNG bị overlay che)
| Field | Giá trị |
|---|---|
| `metadata.channel` | `"EVOSE"` |
| `inputs.kicker` (hook only, ở khu nội dung chính nếu có) | `"EVOSE"` hoặc bỏ |
| `inputs.brand_name` (outro) | `"EVOSE"` |
| `inputs.tagline` (outro) | `"Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."` |
| `inputs.primary_url` (outro) | `"app.evose.ai"` |

### Outro CTA — BẮT BUỘC
`voiceText` scene cuối (outro) **PHẢI** kết thúc bằng:
> **"Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."**

Có thể prefix "Cảm ơn bạn đã theo dõi." nhưng câu CTA Evose phải là câu cuối.

### Safe Zone (bắt buộc)
Vùng nội dung chỉ dùng từ **left: 120px → right: 960px** (rộng 840px) để chừa safe zone cho TikTok/Reels.
Top từ **280px** (tránh overlay header). Bottom đến **1600px** (tránh overlay footer).

### Cấm tuyệt đối trong voiceText và inputs:
- ❌ "Evose", "evose.ai", "Senior AI Engineer", "Bản tin AI"
- ❌ "ISC 2026", "Hamburg", "Edge workstation", "VFX/GLITCH", "CYAN × MAGENTA", "Signal CH-04"
- ❌ Ngày kiểu "12 · 06 · 2026" (fake date)
- ❌ Mọi URL chứa "vercel.app", "udemy", "aicoding"

---

Sinh video tin tức 9:16 dùng các template HyperFrames trong `templates/` (đẹp,
chuyên nghiệp hơn 6 scene Remotion cũ). Claude chỉ điền **chữ vào slot** của
template — toàn bộ thiết kế/animation do template lo.

## Input

1 tham số: URL bài báo (`http://`/`https://`) HOẶC đường dẫn file `.txt`.

## Workflow (theo đúng thứ tự)

### Step 1–3: Lấy nội dung + tạo output dir

Phát hiện input rồi lấy nội dung:

- **URL** (bắt đầu `http://`/`https://`) → `WebFetch` với prompt:
    ```
    Trích xuất từ trang này:
    - title (string): tiêu đề bài báo
    - content (string): nội dung chính, ~500-1500 từ
    - ogImage (string|null): URL ảnh og:image
    - domain (string): domain của URL
    Trả về JSON với 4 field trên.
    ```
    Fail (paywall/JS/4xx) → bảo user lưu nội dung vào `.txt` rồi gọi lại. Stop.
- **File `.txt`** → `Read`; title = dòng đầu (≤80 ký tự), content = phần còn lại, ogImage = `null`, domain = `"local"`.
- slug = ASCII không dấu (bỏ dấu tiếng Việt, đ→d), ≤40 ký tự; timestamp = `YYYYMMDD-HHmm`; `outputDir = output/<slug>-<timestamp>/`; `mkdir -p`.

### Step 4: Đọc danh mục template

Đọc `templates/CATALOG.md` để biết template nào có + slot inputs của mỗi cái.
**Chỉ dùng templateId có trong CATALOG.** Hiện có:

**HOOK (chỉ 1):**
- `frame-liquid-bg-hero` — hero aurora (blob động + headline + CTA). LUÔN dùng cho scene hook.

**BODY (Claude tự chọn theo nội dung — xem Step 5):**
- `frame-vignelli` — 1 con số nền tối charcoal + đỏ.
- `frame-pentagram-stat` — 1 con số nền tối neon (Swiss grid, số cam phát sáng + accent cyan + biểu đồ cột).
- `frame-bold-poster` — tuyên bố mạnh nhiều dòng + figure số lớn.
- `frame-build-minimal` — câu chốt mạnh nền tối (1 từ lớn IN ĐẬM, glow cam, reveal từng chữ).
- `frame-creative-voltage` — câu sáng tạo/khẩu hiệu, split xanh điện + chữ viết tay.
- `frame-glitch-title` — cyberpunk glitch RGB-split (nền nhiễu) — hợp tin sốc/breaking/công nghệ.
- `frame-aicoding-list` — **DANH SÁCH** 2–5 mục (mỗi mục có icon + tag mức độ), nền tối gradient. Dùng khi scene là list/xếp hạng.
- `frame-aicoding-comparison` — **SO SÁNH 2 thứ** (cũ vs mới, A vs B) — 2 card khung gradient + badge WIN + stat. Dùng khi scene đối đầu/đối chiếu.
- `frame-chart-bars` — **BIỂU ĐỒ CỘT** so sánh nhiều mục có số liệu (doanh thu theo quý, xếp hạng, số lượng theo nhóm), nền tối gradient xanh điện. Dùng khi scene so sánh 2–6 mục bằng số.
- `frame-chart-donut` — **BIỂU ĐỒ VÒNG / %** một tỉ lệ phần trăm nổi bật (thị phần, tỉ lệ hoàn thành), nền tối. Dùng khi scene xoay quanh 1 con số phần trăm.
- `frame-chart-line` — **BIỂU ĐỒ ĐƯỜNG** xu hướng theo thời gian (đà tăng/giảm), nền tối. Dùng khi scene là chuỗi số theo thời gian.
- `frame-screenshot-scroll` — **NHÚNG ẢNH CHỤP TRANG WEB + CUỘN** (GitHub repo / trang dài), khung điện thoại. Dùng khi scene giới thiệu repo hoặc trang web dài.
- `frame-screenshot-news` — **NHÚNG ẢNH CHỤP BÀI BÁO + HIGHLIGHT tiêu đề**, khung điện thoại. Dùng khi scene trích nguồn tin tức/bài báo.

**OUTRO:**
- `frame-logo-outro` — mặc định (logo glow + tên + tagline + url).
- `frame-statement-outro` — thay thế (card đỏ nền giấy).
- `frame-logo-outro` — **outro mặc định** / end-card thương hiệu (logo glow + tên + tagline + url).
- `frame-statement-outro` — outro thay thế (card đỏ trên nền giấy).

### Step 5: Sinh script.json (template mode)

Cấu trúc bắt buộc:

```json
{
    "version": "1.0",
    "renderer": "hyperframes",
    "aspect": "9:16",
    "metadata": {
        "title": "...",
        "source": { "url": "...", "domain": "...", "image": null },
        "channel": "EVOSE"
    },
    "voice": { "provider": "omnivoice", "speed": 1.0 },
    "scenes": [
        /* 8–12 scene: 1 hook + 6–10 body + 1 outro */
    ]
}
```

- `provider`: luôn là `omnivoice` (TTS local duy nhất; không cần `voiceId`/API key).
- Mỗi scene: `{ id, type, voiceText, templateId, inputs }`. `inputs` khớp slot trong CATALOG.
- scenes[0].type = `hook`; scene cuối .type = `outro` (templateId = `frame-logo-outro`).
- **8–12 scene**; tổng voiceText ~270–360 từ (~90–120s) — **GIỮ NGUYÊN tổng thời lượng**, chỉ chia nhỏ ra NHIỀU scene hơn cho nhịp nhanh, đỡ nhàm. Mỗi body scene **~25–40 từ** (mỗi scene chỉ 1 ý duy nhất — nếu 1 đoạn có 2 ý thì TÁCH thành 2 scene thay vì nhồi vào 1). Mục tiêu: mỗi scene xuất hiện trên màn hình chỉ ~6–10s rồi chuyển cảnh.

**Map nội dung → template:**

- hook → **LUÔN `frame-liquid-bg-hero`** (slots: kicker, headline, subheadline, cta, brand). `headline` hiển thị bằng gradient bắt mắt (mặc định vàng→tím); có thể đặt `headline_from`/`headline_to` (2 màu hex) để đổi tông. **`headline` ≤4 từ ngắn, không dấu phẩy, không số** (vd "AI Bùng Nổ!" ✅, "Alexa For Shopping Ra Mắt!" ❌ — quá dài). **`voiceText` hook ≤18 từ** (nếu dài hơn, hook frame phải kéo dài bằng loop — animation sẽ lặp từ đầu, chấp nhận được; nhưng ≤18 từ vẫn là best practice). Không dùng template khác cho hook.
- **body → Claude TỰ CHỌN template hợp nhất cho từng scene** theo nội dung (ưu tiên ĐA DẠNG — đừng lặp 1 template cho mọi body). Chọn trong:
    - `frame-vignelli` — scene có **1 con số/stat** muốn nhấn mạnh, tông tối charcoal + đỏ. Slots: kicker, number, label, note, brand.
    - `frame-pentagram-stat` — scene có **1 con số/benchmark**, nền tối neon (Swiss grid, số cam phát sáng + accent cyan) + biểu đồ cột. Slots: label, headline (số), subtitle, anchor, footer_left, footer_right.
    - `frame-build-minimal` — **câu chốt/nhận định ngắn** xoay quanh 1 từ khoá, nền tối + 1 từ lớn in đậm glow cam. Slots: eyebrow, hero (1 từ), desc, side_left, side_right.
    - `frame-bold-poster` — **tuyên bố mạnh nhiều dòng** + figure số lớn. Slots: kicker, date, figure, headline[], standfirst, footer_left, footer_right.
    - `frame-creative-voltage` — **câu sáng tạo/khẩu hiệu** (vài từ), split xanh điện + viết tay. Slots: meta, display_lines, accent_index, script, caption.
    - `frame-glitch-title` — **tin sốc/breaking/công nghệ** kiểu cyberpunk glitch. Slots: title, subtitle.
    - `frame-aicoding-list` — **scene là DANH SÁCH / SO SÁNH 2–5 mục** (ai bị ảnh hưởng, ưu/nhược, các bậc, checklist). Slots: title, accent, accent_from, accent_to, subtitle, items[]. Mỗi item `{icon, title, desc, tag, level}`:
        - `icon`: Claude TỰ CHỌN emoji hợp từng mục (🚫 ⚠️ ✅ ❌ 📈 💡 🔒 🚀 …), KHÔNG cố định.
        - `level`: `danger`/`warn`/`good`/`info` → quyết định màu icon+tag+thanh. `tag`: nhãn ngắn (Nguy/Cao/Lợi…).
        - `accent_from`/`accent_to`: Claude TỰ CHỌN 2 màu hex cho gradient chữ nhấn (hợp tông bài), vd cam→đỏ, tím→lam, xanh lá.
    - `frame-aicoding-comparison` — **scene SO SÁNH ĐÚNG 2 thứ** (cũ vs mới, A vs B, trước/sau). Slots: badge, pre, vs, post, left{}, right{}. Mỗi vế `{label, from, to, icon?, bullets[], stat?, stat_label?, win?}`:
        - `from`/`to`: Claude TỰ CHỌN 2 màu hex gradient cho mỗi vế (thường 2 vế khác tông, vd trái cam→đỏ, phải teal→lam).
        - `icon`: emoji tuỳ chọn cho mỗi vế. `win: true` cho vế thắng (viền sáng + badge WIN). `stat`/`stat_label`: số liệu tuỳ chọn dưới mỗi card.
    - Gợi ý cân bằng: nếu nhiều scene đều là số, xen kẽ `frame-vignelli` (than + đỏ/vàng) và `frame-pentagram-stat` (tối neon cam/cyan) cho đỡ đơn điệu; chèn `frame-build-minimal` cho scene không-số.
    - `frame-chart-bars` — **scene SO SÁNH DỮ LIỆU nhiều mục có số**. Slots: label, title, bars, caption. `title` hiển thị `{...}` bằng gradient. `bars` là JSON `[{label, value, unit?, active?}]` (2–6 cột); `active: true` cho cột muốn nhấn, `active: false` làm mờ cột.
    - `frame-chart-donut` — **scene có 1 TỈ LỆ PHẦN TRĂM chủ đạo**. Slots: label, title, percent (0–100), unit (mặc định "%"), caption.
    - `frame-chart-line` — **scene XU HƯỚNG THEO THỜI GIAN**. Slots: label, title, points, caption. `points` là JSON `[{label, value}]` (3–8 điểm).
    - `frame-screenshot-scroll` — **scene GIỚI THIỆU REPO / TRANG WEB DÀI**. Slots: label, title, image, pan, caption. `image` là ảnh PNG chụp bằng `scripts/capture-screenshot.js --mode github`; `pan` là mức cuộn (vd "-55%"), đặt "0%" để ảnh tĩnh.
    - `frame-screenshot-news` — **scene TRÍCH NGUỒN BÀI BÁO / TIN TỨC**. Slots: label, title, image, hl_top, hl_left, hl_width, hl_height, caption. `image` là ảnh PNG chụp bằng `scripts/capture-screenshot.js --mode news`; `hl_*` là % vị trí khung soi tiêu đề (bỏ trống = tắt highlight).
    - **Quy tắc dữ liệu cho 5 frame chart/screenshot (Claude tự quyết):** (1) bài CÓ số liệu cụ thể → vẽ chart THẬT với số đó; (2) bài KHÔNG có số nhưng minh hoạ được khái niệm → chart minh hoạ (số tượng trưng + label mô tả); (3) không hợp trực quan hoá → KHÔNG dùng chart frame, chọn frame chữ. Nguồn GitHub → `frame-screenshot-scroll` (cuộn); nguồn báo → `frame-screenshot-news` (tĩnh + highlight). Số trong `inputs` giữ định dạng đẹp ("5.6", "45%"); `voiceText` vẫn viết số ra chữ theo quy tắc TTS bên dưới.
- outro → `frame-logo-outro` (mặc định; slots: brand_name, tagline, primary_url). Dùng `frame-statement-outro` nếu muốn card đỏ nền giấy.

### ⚠️ Quy tắc TTS tiếng Việt (BẮT BUỘC cho `voiceText`)

`voiceText` được OmniVoice (TTS tiếng Việt) đọc to. **Số và ký
hiệu bị đọc theo nghĩa đen** — vd "5.5" có thể thành "năm rưỡi" (sai cho số phiên
bản). Vì vậy **luôn viết số ra chữ tiếng Việt trong `voiceText`**. Còn `inputs`
(chữ hiển thị trên màn hình) thì GIỮ định dạng số đẹp ("5.5" / "82.7%").

Bảng đầy đủ (áp dụng cho `voiceText`):

| Dạng số                  | SAI (TTS đọc nhầm)             | ĐÚNG (viết ra chữ)                                          |
| ------------------------ | ------------------------------ | ---------------------------------------------------------- |
| Phiên bản thập phân      | `GPT 5.5` → "năm rưỡi"         | `GPT năm chấm năm`                                         |
| Số liệu thập phân        | `82.7%`                        | `tám mươi hai phẩy bảy phần trăm`                          |
| Phiên bản số nguyên      | `iPhone 17`                    | `iPhone mười bảy` (hoặc `iPhone 17` cũng được)             |
| Phiên bản có chấm        | `iOS 18.2`                     | `iOS mười tám chấm hai`                                    |
| Thông số kỹ thuật        | `200MP`                        | `hai trăm megapixel`                                       |
| Pin                      | `5000mAh`                      | `năm nghìn miliampe giờ`                                   |
| Token                    | `1M tokens`                    | `một triệu token`                                         |
| Giá VND                  | `21 triệu đồng`                | `hai mươi mốt triệu đồng`                                  |
| Giá USD                  | `$5`                           | `năm đô la` (hoặc `năm đô`)                                |
| Bội số                   | `2x`                           | `gấp đôi` (tự nhiên hơn "hai lần")                         |
| Phần trăm                | `30%`                          | `ba mươi phần trăm`                                        |
| Thời gian                | `60 giây`                      | `sáu mươi giây`                                            |
| Tỉ lệ                    | `3:1`                          | `ba trên một` / `ba so với một`                           |

- Dấu thập phân: dùng `chấm` (nói tự nhiên) hoặc `phẩy` (trang trọng) — chọn nhất quán.
- Acronym tiếng Anh: `AI`/`GPT` thường OK; nếu đọc sai thì viết phiên âm `ây ai` / `gí pi tí`, `API` → `ây pi ai`.
- **`voiceText` TUYỆT ĐỐI KHÔNG có emoji/icon, không có URL** và không có `→ & % $ # + =` (giọng đọc sạch). Brand (Apple, OpenAI, TikTok) giữ nguyên. Kết câu bằng `.` hoặc `?` để có ngắt nghỉ tự nhiên.
- **`inputs` (chữ HIỂN THỊ trên màn hình) ĐƯỢC PHÉP dùng emoji/icon** để sinh động (🔥 🚀 ✨ ⚡ 📈 ⚠️ → …) — render màu OK. Giữ định dạng số đẹp ("5.5", "82%"). Tách biệt hoàn toàn với voiceText.
  - Dùng emoji **vừa phải** (0–1 icon mỗi field, đặt ở nhãn/headline/CTA ngắn — vd kicker "🔥 Tin nóng", cta "Theo dõi ngay →"). ĐỪNG nhét emoji vào chữ lớn pop từng ký tự (vd `hero` của build-minimal) vì sẽ vỡ animation.

### Step 6: Tự kiểm tra

- scenes[0]=hook, scene cuối=outro; mỗi templateId ∈ CATALOG; mỗi inputs đủ slot bắt buộc;
- **Hook headline**: ≤4 từ ngắn, không dấu phẩy, không số. Hook `voiceText` ≤18 từ.
- **⚠️ Slot bắt buộc cho stat frame** — nếu thiếu, phần dưới frame render rỗng (tối đen):
  - `frame-vignelli`: `kicker`, `number`, `label`, `note` — **TẤT CẢ phải có giá trị thực**.
  - `frame-pentagram-stat`: `label`, `headline`, `subtitle`, `anchor` — **TẤT CẢ phải có giá trị thực**.
- headline ≤3 dòng & mỗi dòng ngắn; voiceText đã viết số ra chữ **và KHÔNG chứa emoji/icon**; emoji (nếu có) chỉ nằm trong `inputs`. Sửa thầm tối đa 2 lần.

### Step 7: Ghi script.json

Dùng tool `Write` ghi `<outputDir>/script.json`.

### Step 8: Chạy pipeline

Bash **foreground**, stream output:

```bash
npm run pipeline -- <outputDir>/script.json
```

CLI tự nhận `renderer: "hyperframes"` và chạy template pipeline (TTS → render
từng template → fit theo giọng đọc → ghép + trộn SFX). Lỗi → báo rõ + đường dẫn outputDir.

### Step 9: Báo kết quả

```markdown
✓ Video: [video.mp4](output/<slug>/video.mp4)
✓ Audio: [voice.mp3](output/<slug>/voice.mp3) — cho CapCut
✓ Script: [script.txt](output/<slug>/script.txt) — cho CapCut auto-caption
Tổng thời lượng: XX.Xs
```

## Ghi chú

- Render mỗi scene ~15–20s (Chromium). Video 8–10 scene ~3–5 phút. Cần ffmpeg + Chrome (đã có).
- TTS idempotent (giữ `voice/scene-*.mp3`); clip cũng idempotent (giữ `clips/scene-*.mp4`) — xoá để render lại sau khi sửa inputs.
- Thêm template mới: làm theo mục cuối `templates/CATALOG.md` rồi bổ sung 1 dòng vào catalog.
