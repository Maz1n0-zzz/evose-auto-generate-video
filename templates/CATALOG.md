# Template Catalog

Repo có **hai bộ template**. Renderer của cả hai đều là `"hyperframes"`.

| Bộ | Tiền tố | Tông | Dùng khi |
|---|---|---|---|
| **Evose Light** | `evose-*` | Nền giấy sáng + lưới chấm, chip đen, một màu nhấn | **MẶC ĐỊNH — dùng bộ này** |
| Bộ cũ | `frame-*` | Nền tối, gradient, neon | Chỉ để render lại các video đã làm trước đây |

Mỗi cảnh trong `script.json` chọn một `templateId` bên dưới và điền `inputs`.
Template lo toàn bộ thiết kế và chuyển động; bạn chỉ viết chữ. **Giữ chữ NGẮN** —
đây là bố cục dạng poster, không phải đoạn văn.

> Chữ hiển thị (`inputs`) giữ định dạng số bình thường ("5.5", "82.7%") và được
> phép dùng emoji. Chỉ `voiceText` mới phải viết số ra chữ và tuyệt đối không
> emoji — xem quy tắc trong SKILL.md.

---

# BỘ EVOSE LIGHT (dùng bộ này)

## Bắt buộc trong script.json

```json
{
  "aspect": "9:16",
  "brand": { "overlay": true, "style": "light" }
}
```

`style: "light"` là **bắt buộc** với bộ Light. Overlay có hai bản: bản `dark`
(chữ trắng trên dải tối, cho bộ `frame-*`) và bản `light` (chữ navy trên dải
giấy mờ). Đặt nhầm `dark` lên nền giấy sẽ thành hai vệt đen chắn ngang trên dưới.

Overlay mang logo Evose.ai ở đỉnh và dãy icon mạng xã hội + `app.evose.ai` ở
chân khung, xuất hiện trên **mọi cảnh**. Vì vậy nội dung của template phải bắt
đầu từ **y ≥ 260px** để không bị dải header đè lên.

## Slot dùng chung

| Slot | Có ở | Ý nghĩa |
|---|---|---|
| `mascot` | node-diagram, title-card, chapter-card, statement, stat-hero | Đường dẫn PNG trong `evose-brand-kit/mascot/` — xem README ở đó để chọn tư thế |
| `mascot_side` | như trên | `"left"` / `"right"` |
| `mascot_scale` | như trên | Số, mặc định 1 |
| `media` | node-diagram, title-card, chapter-card, statement | Ảnh **làm NỀN** cho chữ đè lên. Cần ảnh để người xem ĐỌC thì dùng `evose-screenshot` |
| `media_fit` | như trên | `"contain"` nếu không muốn ảnh bị cắt |
| `{từ}` trong `title` | list, pipeline, screenshot, 3 chart | Tô một dải bút dạ sau cụm chữ đó |

Mọi slot trên đều **tuỳ chọn** — bỏ trống thì template tự co bố cục lại.

---

## evose-logo-card
**Vai trò:** cảnh mở và cảnh kết. Monogram hiện giữa khung rồi wordmark "Evose"
lộ ra, cả cụm dịch trái. Logo nhúng sẵn, không cần cấp file.

| slot | kiểu | ghi chú |
|---|---|---|
| `tagline` | string | Bỏ trống = cảnh mở. Điền = cảnh kết (canh phải dưới wordmark) |
| `url` | string | Cảnh kết: `"https://evose.ai/"` |

---

## evose-node-diagram
**Vai trò:** sơ đồ chip nối bằng nét chấm. Dùng cho **hook đối chiếu** hoặc mọi
cảnh so sánh hai đường đi.

| slot | kiểu | ghi chú |
|---|---|---|
| `layout` | `"split"` / `"stack"` | Bỏ trống: có `stem` → split, không thì stack |
| `stem` | string[] | Chuỗi chip chung phía trên trước khi rẽ nhánh (chỉ dùng ở `split`) |
| `branches` | object[] | 1–2 nhánh: `{ badge?, tone?, nodes: string[] }` |
| `verdict` | string | Ký hiệu giữa hàng cuối, thường `"≠"` (chỉ `split`) |
| `label` | string | Nhãn mono nhỏ góc trên |

Trong mỗi nhánh: `tone: "ink"` (chip đen, vế được nhấn) hoặc `"mute"` (chip xám,
vế đối chiếu). `badge: "no"` (❌) / `"ok"` (✅) — chỉ dùng ở `stack`.

```json
{ "layout": "split", "stem": ["Cùng model", "Cùng việc"], "verdict": "≠",
  "branches": [ { "tone": "ink",  "nodes": ["System prompt", "Kết quả"] },
                { "tone": "mute", "nodes": ["System prompt", "Kết quả"] } ] }
```

---

## evose-title-card
**Vai trò:** tiêu đề lớn chữ trắng viền đen dày, nghiêng, xếp chồng kiểu sticker.

| slot | kiểu | ghi chú |
|---|---|---|
| `lines` | string[] | **2–4 dòng, mỗi dòng NGẮN.** Cỡ chữ tự co theo dòng dài nhất |
| `tilt` | number | Độ nghiêng, mặc định `-2` |
| `italic` | boolean | `false` để tắt chữ nghiêng |

---

## evose-chapter-card
**Vai trò:** banner đen công bố một phần / một bước.

| slot | kiểu | ghi chú |
|---|---|---|
| `title` | string | ≤34 ký tự là đẹp nhất, in nghiêng đậm |
| `subtitle` | string | Một dòng phụ, chữ thường |

Không có `media` thì banner tự phóng to và canh giữa khung; có `media` thì thu
lại và neo lên đỉnh.

---

## evose-statement
**Vai trò:** câu chốt — cảnh to tiếng nhất của video.

| slot | kiểu | ghi chú |
|---|---|---|
| `badge_top` | `"no"` / `"ok"` | Badge nhỏ phía trên, gắn nhãn cho điều đang bị phủ nhận |
| `lines` | string[] | Chip dẫn, thường 1 dòng |
| `hero` | string | **Chip lớn, 1–3 từ.** Giữ trên một dòng nên phải ngắn |
| `badge` | `"no"` / `"ok"` | Badge KHỔNG LỒ nổi ở nửa dưới |
| `badge_side` | `"left"` / `"right"` | Mặc định `"right"` |
| `lines_tone`, `hero_tone` | `"mute"` | Đổi sang chip xám |

---

## evose-list
**Vai trò:** danh sách 2–5 mục — xếp hạng, ưu/nhược, checklist.

| slot | kiểu | ghi chú |
|---|---|---|
| `title` | string | |
| `accent` | string | Một cụm **có thật trong title** sẽ được tô bút dạ |
| `subtitle` | string | |
| `items` | object[] | 2–5 mục, quá 5 sẽ bị cắt |

Mỗi mục: `{ icon, title, desc, tag, level }`.
`icon` — bạn tự chọn emoji hợp nội dung. `tag` — nhãn ngắn bên phải (≤6 ký tự).
`level` — `danger` (đỏ) / `warn` (cam) / `good` (xanh lá) / `info` (lam); quyết
định màu vệt trái, chip icon và nhãn.

---

## evose-stat-hero
**Vai trò:** MỘT con số lớn duy nhất.
**Chỉ dùng khi con số KHÔNG phải phần trăm** — phần trăm thì `evose-chart-donut`
hợp hơn vì có vòng tỉ lệ để nhìn ra tương quan.

| slot | kiểu | ghi chú |
|---|---|---|
| `label` | string | Nhãn mono phía trên |
| `figure` | string | Con số. Cỡ chữ tự co, "1,2 triệu" cũng vừa |
| `unit` | string | Đơn vị đứng cạnh, vd `"phút"` |
| `headline` | string | Dòng in hoa dưới gạch nhấn |
| `note` | string | Một câu bổ nghĩa |

---

## evose-pipeline
**Vai trò:** quy trình 3–6 bước dọc, mỗi bước có icon + tiêu đề + mô tả.
Khác `node-diagram` ở chỗ sơ đồ kia chỉ có chip chữ trần để đối chiếu hai nhánh,
còn cái này diễn giải **từng bước** nên mỗi bước có chỗ cho mô tả.

| slot | kiểu | ghi chú |
|---|---|---|
| `label`, `title`, `caption` | string | |
| `steps` | object[] | 3–6 bước `{ icon, title, desc }`. Bỏ trống → dùng 5 bước pipeline Evose mặc định |

Bước cuối tự động tô nền đen vì đó là kết quả.

---

## evose-chart-bars
**Vai trò:** so sánh 2–6 mục có số liệu.

| slot | kiểu | ghi chú |
|---|---|---|
| `label`, `title`, `caption` | string | |
| `bars` | object[] | 2–6 cột `{ label, value, unit?, active? }` |

`active: true` → cột màu nhấn. `active: false` → cột xám mờ. Không khai báo →
cột đen thường.

---

## evose-chart-donut
**Vai trò:** một tỉ lệ phần trăm chủ đạo.

| slot | kiểu | ghi chú |
|---|---|---|
| `label`, `title`, `caption` | string | |
| `percent` | number | 0–100 |
| `unit` | string | Mặc định `"%"` |
| `label_donut` | string | Dòng mô tả ngay dưới vòng |

---

## evose-chart-line
**Vai trò:** xu hướng theo thời gian.

| slot | kiểu | ghi chú |
|---|---|---|
| `label`, `title`, `caption` | string | |
| `points` | object[] | 3–8 điểm `{ label, value }` |

---

## evose-screenshot
**Vai trò:** ảnh chụp màn hình **LÀ nội dung chính** (người xem cần đọc nó).
Khác slot `media` của các template kia — ở đó ảnh chỉ là phông và bị làm nhoè.

| slot | kiểu | ghi chú |
|---|---|---|
| `label`, `title`, `caption` | string | |
| `image` | asset | PNG chụp bằng `scripts/capture-screenshot.js` |
| `pan` | string | `"-65%"` = cuộn 65% quãng cuộn được. Bỏ trống hoặc `"0%"` = ảnh tĩnh |
| `hl_top` `hl_left` `hl_width` `hl_height` | string | Vị trí khung soi tính theo **%** của khung máy. Bỏ trống = tắt |
| `duration` | number | Ghi đè thời lượng cuộn. Bình thường không cần: pipeline tự cấp độ dài cảnh thật |

Đặt `hl_*` phải ngắm theo ảnh cụ thể — chụp xong nên render thử một cảnh để soi
lại toạ độ. Dùng `pan` và `hl_*` cùng lúc cũng được.

---

## Thêm template mới vào bộ Light

1. Tạo `templates/evose-<tên>/compositions/portrait.html` — chép một file có sẵn
   làm mẫu. Giữ nguyên **4 khai báo khung** (viewport, `html,body`, `#root`,
   `data-width`/`data-height`) và object `GEO` ở cuối, vì mọi hằng số hình học
   nằm trong đó và được chọn theo kích thước canvas lúc chạy.
2. Chạy `python3 scripts/gen-aspect.py templates/evose-<tên>` để sinh
   `index.html` (bản 16:9). **Đừng sửa `index.html` bằng tay** — nó bị ghi đè.
3. Thêm `meta.json` và `hyperframes.json` (chép từ template khác).
4. Thêm một mục vào danh sách trên.

⚠️ Trong comment CSS, **đừng gõ dấu sao rồi gạch chéo** (hay gặp khi viết đường
dẫn có ký tự đại diện) — nó đóng comment sớm, nuốt luôn khối quy tắc phía sau và
frame render ra **trắng trơn mà không báo lỗi**. `gen-aspect.py` có bộ chặn lỗi
này, đó cũng là lý do phải chạy nó thay vì tự chép file.

---
---

# BỘ CŨ (`frame-*`) — GIỮ ĐỂ RENDER LẠI VIDEO CŨ

> 🔴 **Không dùng cho video mới.** Bộ này nền tối / gradient / neon, đi ngược
> hướng nhận diện hiện tại. Giữ lại để các `script.json` đã làm trước đây render
> lại vẫn ra đúng kết quả cũ.
>
> Bộ này **cần** lớp overlay header/footer, tức `brand.overlay` phải để mặc định
> `true`. Vì vậy KHÔNG điền các slot `footer_left`, `footer_right`, `side_left`,
> `side_right`, `caption`, `date` — overlay tự thêm.

## frame-bold-poster

**Role:** hook / strong statement. 1970s editorial poster — giant red figure,
3-line tilted headline (middle line auto-red), serif standfirst.
**Best for:** the opening hook, or a punchy single-claim body beat.

| slot           | type     | limit                    | notes                                                |
| -------------- | -------- | ------------------------ | ---------------------------------------------------- |
| `kicker`       | string   | ≤24                      | small uppercase label, top-left (e.g. "Evose")   |
| `date`         | string   | ≤24                      | top-right metadata (e.g. "12 · 06 · 2026")           |
| `figure`       | string   | ≤4                       | giant red figure — a number/stat (e.g. "5.5", "200") |
| `headline`     | string[] | ≤3 lines, ≤14 chars/line | line 2 renders red                                   |
| `standfirst`   | string   | ≤160                     | italic serif sub-line                                |
| `footer_left`  | string   | ≤32                      | channel name                                         |
| `footer_right` | string   | ≤32                      | source domain (renders red)                          |

---

## frame-statement-outro

**Role:** outro / closing CTA. Paper card: red rule, CTA, giant red channel
name, muted source, ink rule.
**Best for:** the final scene (always `type: "outro"`).

| slot      | type   | limit | notes                                                                  |
| --------- | ------ | ----- | ---------------------------------------------------------------------- |
| `cta`     | string | ≤60   | uppercase call-to-action (e.g. "Theo dõi để xem bản tin mới mỗi ngày") |
| `channel` | string | ≤24   | channel name (giant red)                                               |
| `source`  | string | ≤40   | "Nguồn: <domain>"                                                      |

---

## frame-pentagram-stat

**Role:** body / stat. Swiss-grid data anchor on a **dark neon** canvas
(`#0a0c12` + blue ambient glow) — giant glowing amber number, cyan eyebrow label,
faint oversized cyan number bleeding off the right, a small bar chart (cyan hero
bar), dark footer bar with a cyan rule.
**Best for:** a single hero statistic / benchmark / percentage with a premium,
high-tech dark look.

| slot           | type   | limit | notes                                                      |
| -------------- | ------ | ----- | ---------------------------------------------------------- |
| `label`        | string | ≤40   | small cyan uppercase eyebrow (e.g. "Hiệu năng · Coding")   |
| `headline`     | string | ≤12   | the giant glowing amber stat (e.g. "82%", "1M", "200")     |
| `subtitle`     | string | ≤120  | one supporting sentence under the stat                     |
| `anchor`       | string | ≤4    | faint giant number behind it (usually = the stat's digits) |
| `footer_left`  | string | ≤32   | channel name (on the dark footer bar)                      |
| `footer_right` | string | ≤32   | source domain                                              |

---

## frame-build-minimal

**Role:** body / bold statement. Dark cinematic canvas (`#0b0a09` + a warm amber
ambient glow) — one **big bold word** revealed letter-by-letter (glowing warm
white), an amber eyebrow, an amber hairline, a two-line description, rotated side
labels.
**Best for:** a punchy single-concept beat (a verdict, a theme, a turning point)
with a premium dark/amber look.

| slot         | type   | limit | notes                                                         |
| ------------ | ------ | ----- | ------------------------------------------------------------- |
| `eyebrow`    | string | ≤20   | small uppercase label above the word                          |
| `hero`       | string | ≤10   | ONE short word/phrase (revealed char-by-char — keep it short) |
| `desc`       | string | ≤90   | one supporting sentence below                                 |
| `side_left`  | string | ≤20   | rotated label on the left edge (e.g. channel)                 |
| `side_right` | string | ≤20   | rotated label on the right edge                               |

---

## frame-vignelli

**Role:** body / bold stat hero. Massimo Vignelli editorial — **dark charcoal**
canvas, a single red accent column on the right, 6-column grid, a giant white
number, uppercase label, footer wordmark with red underline.
**Best for:** a striking single statistic when you want a dark, high-contrast
beat (variety vs the white/paper templates).

| slot     | type   | limit | notes                                                            |
| -------- | ------ | ----- | ---------------------------------------------------------------- |
| `kicker` | string | ≤30   | small uppercase label next to a red bar (e.g. "Khảo sát · 2026") |
| `number` | string | ≤6    | the giant white stat (e.g. "62%", "3/4", "1M")                   |
| `label`  | string | ≤40   | uppercase white label under the number (≤2 short lines)          |
| `note`   | string | ≤120  | one muted supporting sentence                                    |
| `brand`  | string | ≤24   | footer wordmark (channel name)                                   |

---

## frame-logo-outro

**Role:** outro / brand end-card (**default outro**). Deep-violet radial canvas,
a glowing segmented logo mark that assembles in, brand name with a shimmer
sweep, tagline, and a footer URL.
**Best for:** the final scene (`type: "outro"`) — a polished brand sign-off.

| slot          | type   | limit | notes                                                       |
| ------------- | ------ | ----- | ----------------------------------------------------------- |
| `brand_name`  | string | ≤60   | channel/brand name (big, shimmering)                        |
| `tagline`     | string | ≤120  | one line under the name                                     |
| `primary_url` | string | ≤40   | footer URL / source (e.g. "https://evose.ai/") |

---

## frame-liquid-bg-hero

**Role:** hook / hero (**default hook**). "Aurora Violet" — deep-indigo canvas
with large soft floating colour blobs + faint grid; a centred white headline,
subheadline and a rounded CTA pill.
**Best for:** the opening hook (`type: "hook"`) — a modern, premium intro.

| slot          | type   | limit | notes                                              |
| ------------- | ------ | ----- | -------------------------------------------------- |
| `kicker`        | string | ≤24  | small uppercase label, top-left (e.g. "Evose")            |
| `headline`      | string | ≤60  | the hook line (keep punchy, ~2 short lines) — shown in a vivid gradient |
| `headline_from` | string | hex  | headline gradient start (optional; default vivid gold→purple) |
| `headline_to`   | string | hex  | headline gradient end (optional)                              |
| `subheadline`   | string | ≤120 | one supporting sentence                                       |
| `cta`           | string | ≤24  | rounded pill label (e.g. "Theo dõi ngay")                    |
| `brand`         | string | ≤24  | footer-left label (channel/source)                           |

> Headline renders in an eye-catching gradient (default gold→orange→pink→purple).
> Override with `headline_from`/`headline_to` to fit the tone if you want.

---

## frame-creative-voltage
**Role:** hook / creative statement (alternative). Electric split — an electric-
blue panel (mono meta + a handwritten script accent + hand-drawn underline) and
a dark panel with a stacked display title, one line outlined in electric blue.
Bold, energetic, design-forward.
**Best for:** a punchy hook or a strong creative body statement (a few short words).

| slot            | type     | limit            | notes                                                            |
| --------------- | -------- | ---------------- | ---------------------------------------------------------------- |
| `meta`          | string   | ≤40              | mono label on the blue panel (e.g. "// CHE_DO_SANG_TAO · ON")    |
| `display_lines` | string[] | ≤4 lines, short  | the big title, one line per word/phrase                          |
| `accent_index`  | number   | 0-based          | which `display_lines` line gets the electric blue outline (default 1) |
| `script`        | string   | ≤20              | handwritten accent on the blue panel (Dancing Script)            |
| `caption`       | string   | ≤60              | mono caption, bottom-right                                       |

---

## frame-glitch-title
**Role:** hook / cyberpunk glitch (alternative). Dark signal-noise canvas —
scanlines, grid, grain, vignette, mono "REC"/timecode chrome, and a big title
with a cyan×magenta RGB-split glitch. High-energy, edgy.
**Best for:** a dramatic/breaking or tech hook (a short shouty title).

| slot       | type   | limit | notes                                                  |
| ---------- | ------ | ----- | ------------------------------------------------------ |
| `title`    | string | ≤40   | the big glitch title (short; uppercased automatically) |
| `subtitle` | string | ≤80   | mono line under the title                              |

---

## frame-aicoding-list
**Role:** body / list · comparison (original). Dark canvas with a warm gradient
glow, a big gradient-accent title + subtitle, then a stack of rounded item cards
— each with a coloured icon chip, title + description, and a coloured level tag.
**Best for:** any scene that is a **list / ranking / comparison of 2–5 items**
(who's affected, pros vs cons, tiers, a checklist).

| slot       | type     | limit       | notes                                                        |
| ---------- | -------- | ----------- | ------------------------------------------------------------ |
| `title`       | string   | ≤40       | big headline (text before the accent)                          |
| `accent`      | string   | ≤20       | trailing word shown in a gradient (optional)                   |
| `accent_from` | string   | hex       | gradient start colour for `accent` (optional; default `#ff9a3d`) |
| `accent_to`   | string   | hex       | gradient end colour for `accent` (optional; default `#ff2d55`)   |
| `subtitle`    | string   | ≤60       | muted line under the title                                     |
| `items`       | object[] | 2–5 items | each: `{ icon, title, desc, tag, level }`                      |

Each `items[]` entry:
- `icon` — **you choose** an emoji that fits the item (🚫 ⚠️ ✅ 🔴 📈 ❌ 💡 🔒 🚀 …), shown in a tinted chip. Not fixed.
- `title` — bold item name (≤24). `desc` — small muted line (≤40).
- `tag` — short right-hand label (≤6, e.g. "Nguy", "Cao", "Lợi").
- `level` — `danger` (red) · `warn` (amber) · `good` (green) · `info` (blue); sets the icon/tag/bar colour.

> The accent gradient colours (`accent_from`/`accent_to`) are free to choose to fit the tone
> (e.g. warm `#ff9a3d`→`#ff2d55`, cool `#7c5cff`→`#22d3ee`, green `#34d399`→`#22c55e`).

---

## frame-aicoding-comparison
**Role:** body / head-to-head comparison (original). Dark canvas with a teal
glow, a pill badge, a "X vs Y" headline with two differently-coloured gradient
sides, two framed cards (big gradient label + bullets, a WIN badge on the winner)
and an optional stat row.
**Best for:** comparing **two things** (old vs new, A vs B, before vs after).

| slot       | type   | limit | notes                                                            |
| ---------- | ------ | ----- | ---------------------------------------------------------------- |
| `badge`    | string | ≤16   | pill label (e.g. "Đối đầu", "HEAD TO HEAD")                      |
| `pre`      | string | ≤16   | plain word before the left side in the headline (optional)       |
| `vs`       | string | ≤6    | middle word (default "vs")                                       |
| `post`     | string | ≤16   | plain word after the right side in the headline (optional)       |
| `left`     | object | —     | left side (see below)                                            |
| `right`    | object | —     | right side (see below)                                           |

Each side (`left` / `right`) object:
- `label` — short name (≤8, e.g. "LMS", "AI") shown gradient in the headline + big on the card.
- `from` / `to` — **caller-chosen** gradient hex for that side (e.g. left warm `#ffb020`→`#ff7a3d`, right teal `#34e0c0`→`#22d3ee`).
- `icon` — optional emoji shown above the card label.
- `bullets` — array of short lines (use "/" inside a line, e.g. "Khoá cố định / lộ trình tuyến tính").
- `stat` + `stat_label` — optional stat chip under the card (e.g. "88%" + "Ưa nền tảng mới").
- `win` — `true` (or a custom badge string) marks the winning side (teal border + WIN badge).

---

## Adding a template

Drop a folder `templates/<id>/` with `index.html` (16:9 root, `data-composition-id`),
`compositions/portrait.html` (9:16), `hyperframes.json`, `meta.json`, and a
`NOTICE.md` if vendored. Use a Vietnamese-capable font stack (Alfa Slab One /
Lora / Be Vietnam Pro are known-good). Then add a row here.

---

## frame-chart-bars
> 🔴 **LEGACY — KHÔNG DÙNG**. Dùng `frame-chart-bars-v2` thay thế.
**Role:** trực quan hoá dữ liệu — bar chart. So sánh nhiều mục/hạng mục.
**Best for:** doanh thu theo quý, xếp hạng, số lượng theo nhóm.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono trên cùng |
| title | text | ~40 | tiêu đề; `{...}` = gradient |
| bars | json | 2–6 cột | `[{label,value,unit?,active?}]` |
| caption | text | ~60 | dòng chốt dưới cùng |

## frame-chart-donut
> 🔴 **LEGACY — KHÔNG DÙNG**. Dùng `frame-chart-donut-v2` thay thế.
**Role:** trực quan hoá dữ liệu — 1 tỷ lệ % nổi bật.
**Best for:** thị phần, tỷ lệ hoàn thành, 1 con số phần trăm chủ đạo.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono |
| title | text | ~34 | tiêu đề; `{...}` = gradient |
| percent | number | 0–100 | phần trăm chính |
| unit | text | ~3 | mặc định "%" |
| caption | text | ~50 | dòng chốt |

## frame-chart-line
> 🔴 **LEGACY — KHÔNG DÙNG**. Dùng `frame-chart-line-v2` thay thế.
**Role:** trực quan hoá dữ liệu — xu hướng theo thời gian.
**Best for:** đà tăng/giảm, chuỗi thời gian.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono |
| title | text | ~40 | tiêu đề; `{...}` = gradient |
| points | json | 3–8 điểm | `[{label,value}]` |
| caption | text | ~60 | dòng chốt |

## frame-screenshot-scroll
**Role:** nhúng ảnh chụp trang web (GitHub repo / trang dài) + pan/scroll dọc.
**Best for:** giới thiệu repo, trang dài cần cuộn.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono |
| title | text | ~36 | tiêu đề; `{...}` = gradient |
| image | asset | — | PNG từ capture-screenshot.js --mode github |
| pan | text | — | mức cuộn, VD "-55%"; "0%" = tĩnh |
| caption | text | ~60 | dòng chốt |

## frame-screenshot-news
**Role:** nhúng ảnh chụp bài báo (tĩnh) + khung highlight tiêu đề.
**Best for:** trích nguồn tin tức, soi headline.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono |
| title | text | ~36 | tiêu đề; `{...}` = gradient |
| image | asset | — | PNG từ capture-screenshot.js --mode news |
| hl_top/hl_left/hl_width/hl_height | text | — | % vị trí khung highlight; bỏ trống = tắt |
| caption | text | ~50 | dòng chốt |

---

## frame-chart-bars-v2
**Role:** trực quan hoá dữ liệu — bar chart với nền blob động (CSS @keyframe floating orbs).
**Best for:** so sánh 2–6 mục có số liệu; nền atmosphere hơn v1 (3 blob BLUE/CYAN/LAVENDER).
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono (JetBrains Mono, uppercase) |
| title | text | ~40 | tiêu đề; `{...}` = gradient CYAN→BLUE→VIOLET |
| bars | json | 2–6 cột | `[{label,value,unit?,active?}]`; `active:false` = mờ |
| caption | text | ~60 | dòng chốt dưới cùng |

> v2 khác v1: thêm 3 blob CSS animated background (`mix-blend-mode:screen`). Không thay đổi slot.

---

## frame-chart-donut-v2
**Role:** trực quan hoá dữ liệu — 1 tỷ lệ % nổi bật, nền blob động. Cũng sửa lỗi v1 (thiếu `data-composition-id` + `window.__timelines`).
**Best for:** thị phần, tỷ lệ hoàn thành, 1 con số phần trăm chủ đạo.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono |
| title | text | ~34 | tiêu đề; `{...}` = gradient |
| percent | number | 0–100 | phần trăm chính (SVG sweep animate) |
| unit | text | ~3 | mặc định "%" |
| label_donut | text | ~40 | mô tả dưới số donut (tuỳ chọn) |
| caption | text | ~50 | dòng chốt |

> v2 khác v1: blob animated bg + fix cả hai bug render trong v1 portrait.html.

---

## frame-chart-line-v2
**Role:** trực quan hoá dữ liệu — xu hướng theo thời gian, nền blob động.
**Best for:** đà tăng/giảm, chuỗi thời gian với atmosphere hơn v1.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono |
| title | text | ~40 | tiêu đề; `{...}` = gradient |
| points | json | 3–8 điểm | `[{label,value}]`; SVG cubic-bezier draw-on |
| caption | text | ~60 | dòng chốt |

> v2 khác v1: blob animated bg. Đường kẻ cubic bezier smooth, dots spring `pop` animation.

---

## frame-pipeline-flow
**Role:** sơ đồ quy trình — 6 bước dọc với icon + tiêu đề + mô tả, bước cuối highlight gradient.
**Best for:** giải thích pipeline/workflow (AI pipeline, quy trình sản xuất, automation flow). Không có analogue trong repo.
| slot | type | limit | notes |
|---|---|---|---|
| label | text | ~24 | eyebrow mono (JetBrains Mono, uppercase) |
| title | text | ~50 | tiêu đề; `{...}` = gradient CYAN→BLUE→VIOLET |
| steps | json | 3–6 bước | `[{icon,title,desc}]`; bước cuối tự động gradient fill |
| caption | text | ~60 | dòng chốt (bottom:180px) |

> Default 6 bước: 🔗 Nhập link → 🤖 AI phân tích → 📝 Sinh kịch bản → 🎨 Dựng frame → 🎬 Ghép + lồng tiếng → 📱 Xuất video 9:16.

