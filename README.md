<div align="center">

# Evose Auto Generate Video

**Dán một link bài báo — nhận về video dọc 9:16 đã lồng tiếng, ghép nhạc, sẵn sàng đăng.**

`Node ≥ 22` · `TypeScript` · `HyperFrames` · `ElevenLabs` · `1080×1920`

</div>

---

## Nó làm gì

Bạn đưa một link bài báo tiếng Việt (hoặc một file `.txt`). Pipeline sẽ:

1. Đọc bài, viết kịch bản chia cảnh
2. Chụp ảnh bài gốc để trích nguồn
3. Lồng tiếng từng cảnh bằng ElevenLabs
4. Dựng hình từng cảnh bằng template có sẵn
5. Cắt mỗi cảnh khớp đúng độ dài lời đọc, ghép lại, trộn nhạc nền
6. Đè lớp nhận diện Evose lên toàn bộ

Kết quả trong `output/<slug>/`:

| File | Dùng để |
|---|---|
| `video-evose.mp4` | **Video hoàn chỉnh — dùng file này** |
| `voice.mp3` | Riêng track giọng đọc, kéo vào CapCut |
| `script.txt` | Text thô cho CapCut tự bắt phụ đề |

**AI chỉ lo phần chữ. Phần hình do code dựng, từng pixel một.** Nhờ vậy cùng một
`script.json` thì lúc nào cũng ra đúng một video — không hên xui.

---

## Bắt đầu

```bash
git clone https://github.com/Maz1n0-zzz/evose-auto-generate-video.git
cd evose-auto-generate-video
npm install
```

**Cần có sẵn:** Node ≥ 22 · `ffmpeg` + `ffprobe` trong PATH · Google Chrome
(HyperFrames dùng để render) · Python 3 (cho `scripts/gen-aspect.py`).

```bash
brew install ffmpeg        # macOS
sudo apt install ffmpeg    # Linux
winget install Gyan.FFmpeg # Windows
```

### Cấu hình giọng đọc

Tạo `.env.local` ở gốc repo (file này đã nằm trong `.gitignore`):

```env
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=<key của bạn>
ELEVENLABS_VOICE_ID=<voice id>
ELEVENLABS_MODEL_ID=eleven_v3
```

Key lấy ở [elevenlabs.io](https://elevenlabs.io/) → ảnh đại diện → **API Keys**.
Voice ID lấy ở **Voice Library** → mở giọng muốn dùng → nút copy cạnh tên.

> **Chọn model:** `eleven_v3` biểu cảm nhất và **có tiếng Việt**.
> `eleven_flash_v2_5` rẻ hơn một nửa, cũng có tiếng Việt nhưng giọng phẳng hơn.
> `eleven_multilingual_v2` **KHÔNG hỗ trợ tiếng Việt** — đừng dùng.

---

## Dùng

### Cách 1 — với Claude Code (khuyến nghị)

```
/create-template-video https://vnexpress.net/bai-viet-nao-do.html
```

Claude tự đọc bài, chọn template, viết `script.json` rồi chạy pipeline.

### Cách 2 — tự viết kịch bản

```bash
npm run pipeline -- output/ten-thu-muc/script.json
```

---

## Bộ template Evose Light

12 template, nền giấy sáng có lưới chấm, chip đen bo tròn, một màu nhấn duy nhất,
mascot robot. Không gradient, không dark mode.

| Template | Dùng cho |
|---|---|
| `evose-logo-card` | Cảnh mở (tựa bài cỡ lớn) và cảnh kết (nút FOLLOW) |
| `evose-node-diagram` | So sánh hai đường đi, sơ đồ chip nối nét chấm |
| `evose-title-card` | Tuyên bố mạnh, chữ trắng viền đen dày |
| `evose-chapter-card` | Công bố một phần / một bước |
| `evose-statement` | Câu chốt, nêu vấn đề hoặc kết luận |
| `evose-list` | Danh sách 2–5 mục có icon và nhãn mức độ |
| `evose-stat-hero` | Một con số lớn không phải phần trăm |
| `evose-pipeline` | Quy trình 3–6 bước |
| `evose-chart-bars` | So sánh 2–6 mục có số liệu |
| `evose-chart-donut` | Một tỉ lệ phần trăm |
| `evose-chart-line` | Xu hướng theo thời gian |
| `evose-screenshot` | Ảnh chụp màn hình, cuộn hoặc soi tiêu đề |

Slot chi tiết của từng cái nằm trong [`templates/CATALOG.md`](templates/CATALOG.md).

---

## Sửa hoặc thêm template

Mỗi template là **một file HTML tự chứa**, dùng chung cho cả 9:16 và 16:9. Mọi
hằng số hình học nằm trong object `GEO` ở cuối `<script>`, chọn theo kích thước
canvas lúc chạy.

```bash
# sửa compositions/portrait.html, rồi sinh lại bản 16:9:
python3 scripts/gen-aspect.py templates/evose-<tên>
```

**Đừng sửa `index.html` bằng tay** — nó bị ghi đè mỗi lần chạy lệnh trên.

### Ba cái bẫy đã trả giá mới biết

1. **Đừng gõ dấu sao rồi gạch chéo trong comment CSS** (hay gặp khi viết đường
   dẫn có ký tự đại diện). Nó đóng comment sớm, nuốt luôn khối `:root` phía sau,
   và frame render ra **trắng trơn mà không báo lỗi**. `gen-aspect.py` có bộ chặn
   lỗi này — đó là lý do phải chạy nó thay vì tự chép file.

2. **Đừng gắn animation trong sự kiện bất đồng bộ** (`img.onload`…). HyperFrames
   render bằng nhiều worker và tua đồng hồ ảo; animation gắn sau lúc tua sẽ bắt
   đầu ở mốc khác nhau tuỳ worker, cho ra chuỗi frame lộn xộn. Cần đo đạc thì đo
   đồng bộ ngay lúc dựng.

3. **`<svg>` xén nội dung theo khung nhìn của nó.** Hiệu ứng phóng to hoặc blur
   sẽ bị cắt cụt thành ô vuông nếu quên `overflow: visible`.

---

## Nhận diện thương hiệu

`evose-brand-kit/` chứa logo (SVG + PNG), 14 tư thế mascot nền trong suốt, lớp
overlay và nhạc nền.

```json
"brand": { "overlay": true, "style": "light" }
```

Lớp overlay đè logo Evose ở đỉnh và dãy icon mạng xã hội ở chân khung, trên **mọi
cảnh**. Có hai bản: `light` (chữ navy trên dải giấy mờ) và `dark` (chữ trắng trên
dải tối). **Bộ template Light phải dùng `style: "light"`** — đặt nhầm `dark` sẽ
thành hai vệt đen chắn ngang khung.

Sửa overlay: sửa `overlays/overlay-frame-light.html` rồi render lại bằng Chrome
headless (xem `generate-overlay-png.sh` để lấy tham số).

---

## Vài slot hay dùng

```jsonc
{
  "brand": { "overlay": true, "style": "light" },
  "scenes": [
    {
      "id": "s1", "type": "hook",
      "voiceText": "[curious] Câu dẫn mở đầu.",
      "padSec": 2.0,                    // giữ cảnh lâu hơn lời đọc
      "templateId": "evose-logo-card",
      "inputs": { "headline": "Tựa bài", "subheadline": "Một câu tóm tắt." }
    },
    {
      "id": "sN", "type": "outro",
      "voiceText": "[warm] Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn.",
      "templateId": "evose-logo-card",
      "inputs": { "tagline": "Begin a new era", "url": "https://evose.ai/", "follow": true }
    }
  ]
}
```

- **`voiceText` viết số ra chữ** — máy đọc "8.4" thành "tám rưỡi". Viết
  "tám phẩy bốn phần trăm". Chữ hiển thị trong `inputs` thì giữ "8,4%".
- **Thẻ cảm xúc** `[curious]` `[excited]` `[thoughtful]` `[serious]` `[warm]`
  `[sighs]` — model `eleven_v3` đọc như chỉ dẫn diễn xuất, không phát âm chúng.
  Tối đa 1 thẻ mỗi cảnh, khoảng một nửa số cảnh nên để trống. Pipeline tự bỏ thẻ
  khi ghi `script.txt` và khi dùng TTS khác.
- **`voiceText: ""` + `silentSec`** cho cảnh câm chỉ có nhạc.

---

## Chạy lại nhanh

Cả file giọng lẫn clip đều **idempotent** — có sẵn thì dùng lại. Sửa một cảnh thì
chỉ cần xoá đúng cảnh đó:

```bash
rm output/<slug>/clips/scene-s7*.mp4     # dựng lại riêng cảnh 7
rm output/<slug>/voice/scene-s7.mp3      # đọc lại lời cảnh 7
npm run pipeline -- output/<slug>/script.json
```

---

## Kiểm tra

```bash
npm test          # 49 test
npm run typecheck
```

---

## Ghi chú

- Render mỗi cảnh mất 15–20 giây (Chromium). Video 10–12 cảnh khoảng 4–6 phút.
- Bộ template `frame-*` cũ (nền tối, gradient) **đã gỡ bỏ**. Cần xem lại thì lấy
  ở lịch sử git, các commit trước `458f13f`.
- [`HANDOFF.md`](HANDOFF.md) ghi bối cảnh dự án và những việc còn dang dở.

<div align="center"><sub>MIT · <a href="https://evose.ai/">evose.ai</a></sub></div>
