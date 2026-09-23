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
> ⛔ **Không dùng cho video mới** (quyết định 2026-09-23). Thiếu mascot thì nửa
> dưới khung chỉ còn một badge lẻ loi, và skill cũ bắt dùng nó hai lần mỗi
> video. Giữ file để render lại video cũ. Câu chốt dùng `evose-title-card`.

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

**Nguồn là URL thì video có đúng HAI cảnh này**, mỗi cảnh một ảnh riêng:

| Cảnh | Lệnh chụp | Slot |
|---|---|---|
| Trích nguồn | `capture-screenshot.js --mode news` (một màn điện thoại) | `hl_*` soi tiêu đề |
| Lướt bài gốc | `capture-screenshot.js --mode full` (cao 2400px; GitHub dùng `--mode github`) | `pan: "-85%"` |

Ảnh `--mode news` chỉ cao bằng khung máy nên đặt `pan` cũng không cuộn được bao
nhiêu. Cảnh cuộn bắt buộc phải dùng ảnh `--mode full`.

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

# Bộ cũ đã gỡ bỏ

Bộ `frame-*` (nền tối, gradient, neon) đã bị xoá khỏi repo ở bản cập nhật lớn
này. Cần xem lại thì lấy ở lịch sử git, commit trước `458f13f`.
