# HANDOFF — Bộ template Evose Light

> File bàn giao để tiếp tục ở phiên Claude Code mới. Cập nhật 2026-09-23.
> Nhánh: `main`, đã merge và push lên remote `evose`.

## 🆕 2026-09-23: bỏ slide statement, bắt buộc hai cảnh ảnh bài gốc

Feedback của đồng nghiệp (chạy trên macOS) có hai ý:

1. Slide `evose-statement` trông trống và lặp hai lần mỗi video.
2. Có bảo chụp ảnh bài báo nhưng ảnh không vào video. Bộ `frame-*` cũ thì có.

**Nguyên nhân slide statement:** `SKILL.md` ghi sẵn cảnh 3 và cảnh 10 là
statement, lại còn miễn cho nó khỏi giới hạn lặp. Template được thiết kế để
mascot lấp nửa dưới. Mascot là tuỳ chọn, thiếu nó thì nửa dưới chỉ còn một
badge ✅/❌.

**Nguyên nhân mất ảnh:** bộ cũ có hai template ảnh, `frame-screenshot-news`
(soi tiêu đề) và `frame-screenshot-scroll` (cuộn). Bộ Light gộp làm một và skill
chỉ đòi một cảnh, chụp `--mode news` nên ảnh chỉ cao một màn, không cuộn được.
Chụp lỗi thì skill cho bỏ cảnh im lặng.

**Vì sao máy đồng nghiệp chụp lỗi: CHƯA RÕ.** Từ bản này, lỗi sẽ in nguyên văn.
Xin dòng lỗi đó để khoanh tiếp.

### Đã sửa

| Commit | Việc |
|---|---|
| `6e9e713` | `capture-screenshot.js`: thêm `--mode full`, dò Chrome rộng hơn, lỗi thì thoát mã 1 |
| `006ec77` | `SKILL.md` + `CATALOG.md`: bỏ statement khỏi cấu trúc mẫu, bắt buộc hai cảnh ảnh |

- **Cấu trúc mẫu mới:** cảnh 3 là `evose-screenshot` soi tiêu đề (`shot-news.png`).
  Cảnh 9 là `evose-screenshot` cuộn (`shot-scroll.png`, `pan: "-85%"`). Câu chốt
  dùng `evose-title-card`.
- **`--mode full`:** cắt từ tiêu đề xuống tối đa 2400px CSS (`FULL_MAX_H`).
  Không lấy cả trang vì trang báo dài hàng chục nghìn px, dồn vào 8 giây thì
  cuộn nhanh tới mức không đọc được.
- **Popup "Đăng nhập bằng Google" của VnExpress** đè giữa ảnh chụp cả trang.
  Nay script xoá Google One Tap và ẩn mọi phần tử `fixed`/`sticky` ở mode news/full.
- **Chụp lỗi thì dừng.** Không có trình duyệt, mode lạ, ảnh dưới 8 KB đều thoát
  mã 1. Skill bắt dừng và hỏi user, không được bỏ cảnh rồi làm tiếp.
- **Chọn trình duyệt:** Chrome, Chromium, Brave, Edge ở `/Applications` và
  `~/Applications`. Đặt `CHROME_PATH` để chỉ định tay.
- `evose-statement` **vẫn giữ file** để render lại video cũ. Không dùng cho video mới.
- Phần tính thuần tách ra `scripts/capture-helpers.js`, test ở
  `src/utils/capture-helpers.test.ts` (12 test).

Video mẫu dựng lại theo cấu trúc mới, Mazino đã duyệt:
`output/ai-my-canh-tranh-gia-trung-quoc-20260923-0924/` (102.74 giây, 11 cảnh).

### 🎵 Nhạc nền nghe như không có — ĐÃ SỬA (commit `89d1ff1`)

Mazino hỏi sao video không có nhạc. Đã đo: **nhạc CÓ trộn vào, nhưng quá nhỏ.**

| Chỗ đo (giây 3.8 đến 5.3, giọng im lặng) | Mức trung bình |
|---|---|
| `voice.mp3` | -91 dB (im lặng) |
| `video-evose.mp4` | -34.4 dB (chỉ còn nhạc) |
| File nhạc gốc cùng đoạn | -21.7 dB |
| Giọng đọc cả bài | khoảng -17 dB |

Tức lúc im lặng, nhạc đã nằm dưới giọng khoảng 17 dB. Lúc có giọng thì
`sidechaincompress` còn dìm thêm, loa điện thoại gần như không nghe ra. Cấu hình
(`volume=0.30`, `ratio 4`, `threshold 0.10` trong `brand-finalize.ts`) y hệt bản
20/08, không phải lỗi mới.

**Ducking vẫn chạy suốt, chưa từng bị tắt.** Nhạc có hạ khi có giọng và lên lại
khi giọng nghỉ. Nhưng "lên" chỉ là về mức nền 0.30, mà mức nền đó đã gần như
không nghe thấy. Dưới giọng cũng chỉ hạ khoảng 5 dB, nên nhạc nhỏ đều suốt bài.

**Mazino nghe so rồi chốt bản E:**

| Bản | volume | threshold | ratio | attack | release | Nhạc lúc nghỉ | Nhạc lúc nói |
|---|---|---|---|---|---|---|---|
| A (cũ) | 0.30 | 0.10 | 4 | 100ms | 600ms | -32.7 dB | -32.1 dB |
| **E (đang dùng)** | **0.80** | **0.03** | **12** | **20ms** | **250ms** | **-24.2 dB** | **-27.9 dB** |

Đo riêng tiếng nhạc, lúc nghỉ ở giây 4 đến 6, lúc nói ở giây 20 đến 30.
Release 250ms để nhạc kịp lên trong quãng nghỉ dưới 1 giây giữa các câu.

Video mẫu sau khi sửa: nhạc lúc nghỉ -26.3 dB, cả bài -16.1 LUFS, đỉnh -1.0 dBFS.
Có test khoá bộ thông số trong `brand-finalize.test.ts`.

⚠️ **Đoạn đầu file nhạc nhỏ hơn đoạn giữa khoảng 5 dB**, và quãng nghỉ dài nhất
của video (sau cảnh mở) rơi đúng vào đó. Mazino chưa quyết có cho nhạc bắt đầu
từ giữa bài không. Chưa làm.

Bốn bản nghe so A, B, C, D cùng bản E nằm ở `output/_music-compare/` (ngoài git).

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

- TTS: **ElevenLabs**, giọng "Nhật Phong - Narrative & Compelling" (nam, giọng
  Bắc). Key nằm trong `.env.local`.
- Model: **`eleven_v3`, giữ nguyên** — Mazino nghe so ba model và chốt v3 hay
  nhất. Ngữ điệu liền mạch giải bằng cách đọc một lần cả bài, không phải bằng
  cách đổi model. Xem mục "Giọng đọc" bên dưới.
- **Claude KHÔNG đọc/ghi được `.env*`** — bị chặn bởi quy tắc quyền. Muốn
  đổi thì Mazino tự sửa file. Chạy thử thì đè bằng biến môi trường ngoài dòng
  lệnh: `ELEVENLABS_MODEL_ID=... npm run pipeline -- ...` (dotenv không ghi đè
  biến đã có sẵn nên cách này thắng).
- OmniVoice không còn trên máy (không tìm thấy dấu vết). Đừng đề xuất lại.
- Thẻ cảm xúc `[excited]`, `[sighs]`… viết thẳng vào `voiceText`;
  `src/utils/audio-tags.ts` tự bỏ thẻ khi ghi `script.txt` và khi model không
  hiểu thẻ. Chỉ `eleven_v3` hiểu thẻ, mà cũng **không đáng tin** — xem mục thẻ
  cảm xúc bên dưới.

## Thương hiệu

- `brand.overlay` (mặc định `true`) + `brand.style: "dark" | "light"`.
- Bộ Light phải dùng `{ "overlay": true, "style": "light" }` — Mazino ĐÃ ĐỔI
  Ý so với quyết định ban đầu: **muốn logo + icon mạng xã hội trên MỌI cảnh**,
  không chỉ cảnh mở/kết.
- Overlay bản sáng: `evose-brand-kit/overlays/overlay-frame-light.png`, sinh từ
  `overlay-frame-light.html` bằng `generate-overlay-png.sh` (Chrome headless).
- Mascot: `evose-brand-kit/mascot/` — 14 tư thế PNG alpha, xem README ở đó.

## 🎙️ Giọng đọc lệch ngữ điệu giữa các cảnh — ĐÃ GIẢI XONG

> Kết luận nằm ở mục "ĐÃ GIẢI XONG" phía dưới. Phần ngay sau đây là quá trình
> loại trừ, giữ lại để đừng ai đi lại những đường đã bít.

Mỗi cảnh là một lần gọi API riêng nên ElevenLabs không biết mạch câu, tự chọn
ngữ điệu mở đầu mỗi lần → cao độ và nhịp lệch nhau, nghe rõ ở chỗ chuyển cảnh.
`eleven_v3` nhạy hơn vì biểu cảm mạnh.

### Kết luận đã kiểm bằng API thật (2026-08-20)

ElevenLabs có đúng **hai** cơ chế nối ngữ điệu, và **`eleven_v3` từ chối cả
hai**:

| Cơ chế | Với `eleven_v3` | Với `eleven_flash_v2_5` |
|---|---|---|
| `previous_text` / `next_text` | 400 | nhận |
| `previous_request_ids` / `next_request_ids` | 400 `unsupported_model` | **nhận** |

Nguyên văn lỗi của v3:

> Providing previous_request_ids or next_request_ids is not yet supported with
> the 'eleven_v3' model.

Kiểm lại bất cứ lúc nào (ElevenLabs có thể mở hỗ trợ sau):

```bash
npx tsx scripts/probe-elevenlabs-stitching.ts eleven_v3 eleven_flash_v2_5
```

Tốn 2 lần gọi API cho mỗi model, không ghi file âm thanh.

### Đã hiện thực: nối bằng `previous_request_ids`

Cơ chế liên tục nhất — cho model nghe lại chính đoạn vừa tạo, không chỉ đọc
lời cảnh kề. Code đã xong trong `elevenlabs-client.ts` +
`template-pipeline.ts`, gác sau `supportsRequestIdChaining()`:

- Với **v3**: không gửi tham số nối nào. Không có tác dụng gì.
- Với **dòng v2**: tự bật, và pipeline **ép gọi tuần tự** (bỏ qua
  `TTS_CONCURRENCY`) vì phải có kết quả cảnh trước mới gọi được cảnh sau.

Chuỗi id **đứt** khi một cảnh không sinh id mới — dùng lại mp3 cũ hoặc cảnh câm.
Khi đó chuỗi bị xoá, cảnh sau không nối vào id của một cảnh xa hơn. Hệ quả:
render lại **riêng một cảnh** thì cảnh đó không nối được với hàng xóm; muốn
liền mạch phải xoá cả thư mục `voice/` và sinh lại từ đầu.

### ✅ ĐÃ GIẢI XONG: giữ `eleven_v3`, đọc MỘT LẦN cả bài rồi cắt

Mazino nghe ba mẫu và chốt: **v3 hay nhất**, `multilingual_v2` nghe như người
nước ngoài tập nói tiếng Việt, `flash_v2_5` nuốt dấu thanh. Vậy phải giữ v3,
mà v3 lại chặn mọi cơ chế nối — nên bỏ hẳn việc gọi riêng từng cảnh.

**Cách làm:** nối lời cả bài thành một chuỗi (ngăn bằng `\n\n`), gọi
`/with-timestamps` MỘT lần, rồi cắt theo mốc thời gian từng ký tự. Cả bài là
một mạch đọc nên không còn chỗ nào để ngữ điệu lệch.

Code: `src/tts/single-take.ts` (phần tính thuần) + `renderSingleTake` trong
`template-pipeline.ts`. Quãng nghỉ model tự chèn giữa hai đoạn bị **gọt bỏ**,
chỉ chừa 0.12s hai đầu — không gọt thì video phình từ 96.78s lên 110.26s.

Lời quá 2900 ký tự, hoặc chỉ một cảnh có lời, thì tự quay về cách gọi từng cảnh.

**Cái mất:** không render lại riêng một cảnh được nữa. Thiếu dù chỉ một file
giọng là đọc lại CẢ BÀI (một lần gọi API), vì đọc bù riêng một cảnh thì rơi
đúng vào chỗ ngữ điệu sẽ lệch.

**Nhịp đọc chậm hơn ~7%** — video mẫu 103.68s so với 96.78s. Đọc liền mạch thì
model nói có nhịp hơn. Muốn kéo về nhịp cũ thì thêm `speed` vào `voice_settings`
(ElevenLabs cho 0.7–1.2), chưa làm.

### 🎭 Thẻ cảm xúc của v3 KHÔNG đáng tin — đã có cơ chế chặn

v3 thỉnh thoảng **ĐỌC TO** thẻ thay vì hiểu là chỉ dẫn. Đã gặp thật:
`[curious]` phát thành tiếng ngay đầu video, nghe ra **"CU Arius"**. Cùng một
chuỗi đầu vào chạy bốn lần thì trượt một — không tránh được bằng cách viết lời
khác, và cũng không phải do `voice_settings` (đã loại trừ bằng thực nghiệm).

Đọc một lần cả bài làm chuyện này nguy hiểm hơn hẳn: trước đây một lần xui chỉ
hỏng một cảnh, nay hỏng nguyên video.

**Cách chặn** (`findSpokenTags`): thẻ bị đọc thì mỗi chữ cái tốn thời gian như
chữ thường; thẻ hiểu đúng thì cả thẻ gộp lại chỉ tốn một khoảnh khắc, dài bao
nhiêu chữ cũng vậy. Chia thời lượng cho số ký tự là tách được — 0.069 so với
0.164, ngưỡng đặt ở **0.12 giây/ký tự**. Dữ liệu có sẵn trong phản hồi nên
không tốn thêm lần gọi nào.

⚠️ **Đừng dùng tổng thời lượng làm thước.** `[sighs]` tốn 0.48s vì nó thở dài
THẬT — dài hơn cả `[curious]` bị đọc to khi chia đều ra từng ký tự. Tôi đã thử
thước đó trước và nó cho kết quả sai.

Bắt được thì đọc lại, tối đa 2 lượt; vẫn hỏng thì **bỏ hẳn thẻ rồi đọc lại**,
lần đó chắc chắn sạch. Kiểm trên video mẫu: bắt đúng ngay lần render đầu tiên.

### Ghi chú lịch sử: `flash_v2_5` đọc sai dấu thanh

Mazino nghe bản dựng lại và bắt được lỗi: **"tháng bảy" đọc thành "tháng bay"**.
Đã kiểm lời trong `script.json` — viết đúng chữ "tháng bảy", không dùng chữ số,
nên **lỗi ở model chứ không ở lời**. `eleven_flash_v2_5` là bản chưng cất cho
nhanh và rẻ; đánh đổi nằm ở chỗ này, nó nuốt dấu thanh tiếng Việt.

**`eleven_multilingual_v2` là đường ra:** đã kiểm, **cũng nhận
`previous_request_ids`** — tức giữ được khả năng nối ngữ điệu — mà là bản chất
lượng đầy đủ, không phải bản chưng cất. Cũng không hiểu thẻ cảm xúc (chỉ v3
hiểu), và cũng trả về ~-22 LUFS như flash nên bước chuẩn hoá âm lượng vẫn cần y
nguyên.

Ba mẫu đọc cùng một câu để nghe so đã dựng sẵn ở `output/_model-compare/`.
Dựng lại bất cứ lúc nào, với bất cứ từ nào nghi đọc sai:

```bash
npx tsx scripts/compare-tts-models.ts "Cuối tháng bảy, giá giảm tám mươi phần trăm."
```

| Model | Nối ngữ điệu | Thẻ cảm xúc | Dấu thanh tiếng Việt |
|---|---|---|---|
| `eleven_v3` | ❌ | ✅ | tốt |
| `eleven_multilingual_v2` | ✅ | ❌ | **cần nghe thử** |
| `eleven_flash_v2_5` | ✅ | ❌ | ❌ nuốt dấu |

### Đã chốt trước đó: `eleven_flash_v2_5` (2026-08-20)

⚠️ **`.env.local` VẪN ĐANG LÀ `eleven_v3` — Mazino phải tự sửa.** Claude bị
chặn ghi `.env*`. Video mẫu dựng lại bằng cách đè biến môi trường ngoài dòng
lệnh (dotenv không ghi đè biến đã có sẵn nên cách này thắng):

```bash
ELEVENLABS_MODEL_ID=eleven_flash_v2_5 npm run pipeline -- output/<thư-mục>/script.json
```

Muốn thành mặc định thì đổi dòng `ELEVENLABS_MODEL_ID` trong `.env.local`.

**Cái giá đã trả:** thẻ cảm xúc `[excited]` không dùng được nữa. Chỉ `eleven_v3`
hiểu thẻ; dòng v2 sẽ ĐỌC TO chữ trong ngoặc. Code đang gác theo *provider* nên
đổi model là thẻ lọt thẳng vào lời đọc — **đã sửa thành gác theo model**
(`supportsAudioTags()`). Không model nào vừa nối được ngữ điệu vừa hiểu thẻ; có
test khoá tính chất đó lại. Vẫn cứ viết thẻ vào `voiceText` được, pipeline tự bỏ.

**Đường còn lại nếu sau này muốn quay về v3:** đọc một lần rồi cắt — gọi 1 lần
cho toàn bộ lời, dùng endpoint có timestamp để cắt theo cảnh. Đồng nhất tuyệt
đối và giữ được biểu cảm v3, nhưng phải viết lại bước 3 của pipeline và mất
tính idempotent theo từng cảnh.

## 🔊 Chênh lệch âm lượng — ĐO RỒI, HOÁ RA KHÔNG PHẢI VẤN ĐỀ

Handoff cũ ghi cần xử bằng `loudnorm`. Đã đo thật 12 cảnh của
`output/ai-my-canh-tranh-gia-trung-quoc-20260819-2240/voice/`:

```
I (LUFS)  : -15.95 … -17.38   → chênh 1.43 dB
True peak : -1.87 … -4.23     → chênh 2.36 dB
```

Chênh 1.43 dB là **dưới ngưỡng tai nghe ra**. ElevenLabs đã tự chuẩn hoá đầu
ra, và mức nó trả về (~-16.5 LUFS) trùng luôn với mức đích thường dùng cho
tiếng nói trên mạng xã hội. Nói cách khác: **cái Mazino nghe thấy ở chỗ chuyển
cảnh là lệch NGỮ ĐIỆU, không phải lệch âm lượng.**

Vẫn đã thêm bước chuẩn hoá vào `concatWithSilence`. Cách làm: đo trước rồi áp
**gain tĩnh** đưa mỗi cảnh về `TARGET_LUFS` (-16) rồi **hãm đỉnh** bằng
`alimiter`. CỐ Ý không chạy `loudnorm` ghi đè vì nó nén dải động và làm giọng
nghe bẹt. Trần kéo +12 dB để đoạn gần im lặng không bị thổi tiếng ồn nền lên.

### Hoá ra lại rất cần — sau khi đổi sang flash

Với v3 thì bước này gần như không làm gì. Nhưng **`eleven_flash_v2_5` trả về
nhỏ hơn v3 tới 5.7 dB** (~-22.2 LUFS so với -16.5) và **kém đều hơn** (chênh
2.83 dB so với 1.43 dB). Không có bước chuẩn hoá thì đổi model là video tụt
tiếng thấy rõ.

**Bẫy đã dính:** ban đầu chặn cứng cho đỉnh nằm dưới -1 dBTP. Giọng đọc có đỉnh
nhọn hơn mức trung bình 18–20 dB, nên cách đó chặn gain còn 2–3 dB và bản ghép
chỉ tới -20 LUFS — vẫn thua bản v3 cũ 3.2 dB. Phải kéo đủ tay rồi hãm riêng
phần đỉnh (`alimiter`), đúng cách các bộ chuẩn hoá phát thanh vẫn làm.

## 🔉 Lỗi có sẵn đã sửa luôn: video giao đi mất 6 dB

Phát hiện lúc đo bản dựng lại. `amix` trong `brand-finalize.ts` thiếu
`normalize=0`, mà mặc định amix **chia biên độ cho số input** → khâu ghép nhạc
nền hạ CẢ giọng LẪN nhạc đi 6.02 dB.

Nghĩa là `video-evose.mp4` — file `SKILL.md` đánh dấu "DÙNG FILE NÀY" — xưa nay
vẫn nhỏ tiếng hơn hẳn `voice.mp3`, không có gì báo. `mixSfxOntoVoice` trong
`audio-tools.ts` vốn đã có cờ này; chỗ kia bị sót.

Tỉ lệ giọng/nhạc **không đổi** vì cả hai cùng bị hạ và nay cùng được trả lại —
mức nhạc `0.30` hồi đó giữ nguyên (nay đã đổi sang bản E, xem mục 🎵). Thêm `alimiter` sau khi trộn để
đỉnh cộng dồn không vượt trần.

## 📊 Số đo của lần đổi model (video mẫu, 12 cảnh)

| | v3 (cũ) | flash_v2_5 (mới) |
|---|---|---|
| Từng cảnh, trước chuẩn hoá | -16.5 LUFS, chênh 1.43 dB | **-22.2 LUFS, chênh 2.83 dB** |
| `voice.mp3` sau chuẩn hoá | -17.07 | **-16.93** |
| `video-evose.mp4` (file giao) | *(đo trước khi sửa amix: -23.08)* | **-17.06**, đỉnh -0.93 dBTP |
| Tổng thời lượng | 96.78s | **99.58s** (đọc chậm hơn ~3%) |

Bản v3 để đối chiếu đã sao lưu ngoài repo, KHÔNG nằm trong git — mất là mất.
Muốn dựng lại thì xoá `voice/` rồi chạy pipeline không đè biến môi trường.

⚠️ Con số **"87 giây"** ở các bản handoff cũ là SAI/lỗi thời — video mẫu bản v3
thật ra dài 96.78s.

## ⚠️ VIỆC CÒN DANG DỞ

- **Cho nhạc bắt đầu từ giữa bài?** Đoạn đầu file nhạc nhỏ. Xem mục 🎵. Chưa quyết.
- **`SKILL.md` còn dòng cũ ghi TTS là OmniVoice** (Step 5 và mục quy tắc TTS),
  và dòng `"metadata"    "voice"` trong mẫu JSON bị vỡ cú pháp. Chưa dọn.
- **Lỗi chụp ảnh trên máy đồng nghiệp.** Chưa có dòng lỗi thật.

0. **Không phải đổi model nữa.** `.env.local` đang là `eleven_v3` — ĐÚNG rồi,
   cứ để nguyên. Mọi thứ chạy trên v3.

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
- Nhạc nền: bản mới. Mức nhạc nay là bản E (`volume 0.80`, `ratio 12`), xem mục 🎵.
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

⚠️ Nhưng render lại RIÊNG một cảnh thì **chuỗi nối ngữ điệu đứt** ở đó (xem mục
"Giọng đọc"). Sửa lời một cảnh → nên xoá cả `voice/` và sinh lại từ đầu; sửa
hình thì xoá clip là đủ.

Muốn dựng lại chỉ phần tiếng mà không tốn lần gọi API nào: giữ `voice/`, xoá
`voice.mp3 voice-raw.mp3 video*.mp4` rồi chạy pipeline. Các cảnh sẽ báo
`REUSE mp3` và chỉ khâu ghép chạy lại.

Video mẫu theo cấu trúc mới (hai cảnh ảnh, không statement):
`output/ai-my-canh-tranh-gia-trung-quoc-20260923-0924/` (102.74 giây, 11 cảnh).

Bản cũ còn statement để đối chiếu: `output/ai-my-canh-tranh-gia-trung-quoc-20260819-2240/`
(103.68 giây, 12 cảnh, dựng bằng `eleven_v3` đọc một lần).
