---
name: create-template-video
description: Tạo video 9:16 theo bộ template Evose Light (nền giấy sáng, chip đen, mascot) từ URL bài báo hoặc file .txt tiếng Việt. Trigger khi user muốn tạo video tin tức, làm short news, video kiểu template/poster đẹp, "tạo video template", "làm bản tin kiểu poster", "video chuyên nghiệp". Output: video.mp4 + voice.mp3 + script.txt cho CapCut.
---

# Create Template Video Skill

## 🎯 EVOSE BRAND — BỘ LIGHT (BẮT BUỘC)

Repo có hai bộ template. **Luôn dùng bộ `evose-*` (Evose Light)** cho video mới.
Bộ `frame-*` cũ chỉ giữ để render lại video đã làm trước đây — không chọn nó.

### Bắt buộc trong script.json

```json
"aspect": "9:16",
"brand": { "overlay": false }
```

`brand.overlay: false` là **bắt buộc**. Bộ cũ dựa vào lớp overlay header/footer
để có nhận diện trên từng cảnh; bộ Light thì không — nhận diện chỉ nằm ở cảnh mở
và cảnh kết. Quên đặt `false` thì overlay của bộ cũ đè lên và phá bố cục.

### Nhận diện

| Chỗ | Cách làm |
|---|---|
| Cảnh mở | `evose-logo-card`, để trống `tagline` và `url` |
| Cảnh kết | `evose-logo-card` với `tagline: "Begin a new era"` và `url: "https://evose.ai/"` |
| Giữa video | **Không đặt logo, không đặt footer.** Mascot đã mang monogram Evose trên ngực |
| `metadata.channel` | `"EVOSE"` |

### Outro CTA — BẮT BUỘC

`voiceText` cảnh cuối **PHẢI** kết thúc bằng:
> **"Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."**

Được phép thêm "Cảm ơn bạn đã theo dõi." phía trước, nhưng câu CTA phải là câu cuối.

### Cấm trong voiceText và inputs

- ❌ Ngày giả kiểu "12 · 06 · 2026"
- ❌ Chữ độn vô nghĩa cho đủ chỗ ("ISC 2026", "Hamburg", "Signal CH-04"…)
- ❌ URL chứa "vercel.app", "udemy", "aicoding"
- ❌ Slot nào không có nội dung thật thì **bỏ hẳn**, đừng bịa chữ cho đầy —
  template tự co bố cục lại khi thiếu slot

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

### Step 4: Chọn template

Đọc `templates/CATALOG.md` để biết slot đầy đủ. **Chỉ dùng `templateId` bắt đầu
bằng `evose-`.** Danh sách đủ 12 cái:

**MỞ ĐẦU**
- `evose-logo-card` — cảnh mở (bỏ trống tagline/url). Lời đọc ngắn, 1 câu.

**HOOK (cảnh 2, ngay sau logo)**
- `evose-node-diagram` — hook dạng **đối chiếu** ("cùng X, khác Y → kết quả khác"). Ưu tiên dùng.
- `evose-title-card` — hook dạng **tuyên bố**, chữ lớn viền dày 2–4 dòng ngắn.

**THÂN BÀI — chọn theo NỘI DUNG cảnh, không chọn cho đẹp**

| Cảnh nói về | Dùng |
|---|---|
| So sánh hai đường đi / hai lựa chọn | `evose-node-diagram` |
| Danh sách, xếp hạng, ưu–nhược, checklist (2–5 mục) | `evose-list` |
| Một tỉ lệ phần trăm | `evose-chart-donut` |
| So sánh 2–6 mục có số liệu | `evose-chart-bars` |
| Xu hướng theo thời gian (3+ mốc) | `evose-chart-line` |
| Một con số lớn **không phải phần trăm** | `evose-stat-hero` |
| Quy trình 3–6 bước | `evose-pipeline` |
| Công bố một phần / một bước | `evose-chapter-card` |
| Ảnh chụp màn hình mà người xem cần ĐỌC | `evose-screenshot` |
| Câu chốt mạnh, kết luận | `evose-statement` |

**KẾT**
- `evose-logo-card` với `tagline` + `url`.

**Quy tắc chọn**
- Không lặp một template quá 2 lần trong cùng video (`evose-statement` và
  `evose-chapter-card` được phép, vì chúng đánh dấu nhịp).
- Hai cảnh liền nhau **không được** dùng cùng một template.
- Cảnh có số liệu → dùng đúng loại chart hợp với dạng số, đừng ép mọi con số vào donut.
- Bài không có số liệu thật thì **đừng bịa số** để dùng chart — chọn template chữ.

### Step 5: Sinh script.json (template mode)

Cấu trúc bắt buộc:

```json
{
    "version": "1.0",
    "renderer": "hyperframes",
    "aspect": "9:16",
    "brand": { "overlay": false },
    "metadata"    "voice": { "provider": "omnivoice", "speed": 1.0 },
    "scenes": [
        /* 8–12 scene: 1 hook + 6–10 body + 1 outro */
    ]
}
```

- `provider`: luôn là `omnivoice` (TTS local duy nhất; không cần `voiceId`/API key).
- Mỗi scene: `{ id, type, voiceText, templateId, inputs }`. `inputs` khớp slot trong CATALOG.
- scenes[0].type = `hook`; scene cuối .type = `outro` (templateId = `evose-logo-card`).
- Cảnh MỞ bằng logo: đặt nó là scenes[0] (type `hook`) với 1 câu dẫn ngắn, rồi
  cảnh 2 mới là hook nội dung. Bộ Light chưa có cảnh mở câm riêng.
- **8–12 scene**; tổng voiceText ~270–360 từ (~90–120s) — **GIỮ NGUYÊN tổng thời lượng**, chỉ chia nhỏ ra NHIỀU scene hơn cho nhịp nhanh, đỡ nhàm. Mỗi body scene **~25–40 từ** (mỗi scene chỉ 1 ý duy nhất — nếu 1 đoạn có 2 ý thì TÁCH thành 2 scene thay vì nhồi vào 1). Mục tiêu: mỗi scene xuất hiện trên màn hình chỉ ~6–10s rồi chuyển cảnh.

**Cấu trúc khuyến nghị (theo video mẫu của designer):**

1. `evose-logo-card` — mở, 1 câu
2. `evose-node-diagram` hoặc `evose-title-card` — hook
3. `evose-statement` — nêu VẤN ĐỀ (badge ❌)
4. `evose-chapter-card` — công bố phần 1
5–9. thân bài — chọn theo bảng ở Step 4, xen kẽ chart và chữ
10. `evose-statement` — câu chốt (badge ✅)
11. `evose-logo-card` — kết, có tagline + url

Slot chi tiết của từng template nằm trong `templates/CATALOG.md`. Vài điểm dễ sai:

- `evose-title-card.lines` — mảng 2–4 dòng, **mỗi dòng ngắn**; cỡ chữ tự co.
- `evose-statement.hero` — **1–3 từ**, giữ trên một dòng.
- `evose-node-diagram` — `layout: "split"` có `stem` + `verdict`; `layout: "stack"`
  dùng `badge` ❌/✅ cho hai khối đối nhau.
- `evose-list.accent` — phải là **cụm chữ có thật trong `title`**, không phải mã màu.
- Cú pháp `{từ}` tô bút dạ, dùng được ở `title` của list / pipeline / screenshot /
  3 chart. **Không** dùng ở các template khác.
- `mascot` — đường dẫn PNG trong `evose-brand-kit/mascot/`; xem README ở đó để
  chọn tư thế hợp cảm xúc của cảnh (`mascot-shrug` bó tay, `mascot-think` suy nghĩ,
  `mascot-thumbsup` chốt đúng, `mascot-teacher` giảng giải…). Không bắt buộc.

### 🗣️ Quy tắc VĂN PHONG voiceText — DỄ HIỂU, ÍT JARGON (BẮT BUỘC)

Người xem là **công chúng phổ thông trên MXH (TikTok/Reels)**, KHÔNG phải chuyên gia. `voiceText` phải nghe hiểu ngay lần đầu, không cần đọc lại.

- **Hạn chế tối đa thuật ngữ chuyên ngành (jargon).** Nếu bài gốc có thuật ngữ khó:
  (a) ưu tiên **DIỄN ĐẠT LẠI** bằng lời thường ngày, hoặc
  (b) nếu buộc phải nhắc → **GIẢI THÍCH ngắn gọn ngay sau** bằng ngôn ngữ đời thường.
- **Không bê nguyên tên sản phẩm/công cụ kỹ thuật ít người biết** (vd "RAPIDS-singlecell", "nvMolKit", "BioNeMo Agent Toolkit", "Parabricks"). Thay bằng mô tả **chức năng** dễ hiểu (vd "công cụ AI của NVIDIA giúp xử lý dữ liệu sinh học"). Chỉ giữ tên thương hiệu LỚN quen thuộc (NVIDIA, Anthropic, Claude, OpenAI, Google, Apple...).
- **Ưu tiên câu ngắn, chủ-vị rõ ràng, giọng kể chuyện gần gũi.** Tránh câu học thuật dài dòng.
- **Quy đổi khái niệm trừu tượng thành lợi ích/hình ảnh cụ thể** người xem thấy được (vd thay "gia tốc tác vụ hoá tin học 3000 lần" → "việc trước đây mất hàng giờ, giờ chỉ vài giây").
- **Mỗi scene 1 ý duy nhất, nói như đang giải thích cho một người bạn không rành công nghệ.**
- **Thông tin/số liệu vẫn phải CHÍNH XÁC theo bài gốc** — chỉ đổi CÁCH DIỄN ĐẠT cho dễ hiểu, KHÔNG bịa/sai lệch nội dung.

**Ví dụ TRƯỚC/SAU:**
> ❌ TRƯỚC (nhiều jargon): *"BioNeMo Agent Toolkit của NVIDIA đóng gói các hàm tính toán thành kỹ năng có thể gọi trực tiếp; Claude tự chọn công cụ, format dữ liệu, thực thi trên GPU."*
>
> ✅ SAU (dễ hiểu): *"NVIDIA tạo ra bộ công cụ AI giúp nhà khoa học chỉ cần nói bằng lời thường, máy tính sẽ tự hiểu và làm phần tính toán phức tạp thay họ."*

---

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
- **`voiceText` TUYỆT ĐỐI KHÔNG có emoji/icon, không có URL** (ngoặc vuông `[...]` được phép — xem mục thẻ cảm xúc bên dưới) và không có `→ & % $ # + =` (giọng đọc sạch). Brand (Apple, OpenAI, TikTok) giữ nguyên. Kết câu bằng `.` hoặc `?` để có ngắt nghỉ tự nhiên.
- **`inputs` (chữ HIỂN THỊ trên màn hình) ĐƯỢC PHÉP dùng emoji/icon** để sinh động (🔥 🚀 ✨ ⚡ 📈 ⚠️ → …) — render màu OK. Giữ định dạng số đẹp ("5.5", "82%"). Tách biệt hoàn toàn với voiceText.
  - Dùng emoji **vừa phải** (0–1 icon mỗi field, đặt ở nhãn/headline/CTA ngắn — vd kicker "🔥 Tin nóng", cta "Theo dõi ngay →"). ĐỪNG nhét emoji vào chữ lớn pop từng ký tự (vd `hero` của build-minimal) vì sẽ vỡ animation.

### 🎭 Thẻ cảm xúc cho giọng đọc (model `eleven_v3`)

Giọng đọc dùng ElevenLabs `eleven_v3` — model này hiểu **thẻ chỉ dẫn diễn xuất**
đặt trong ngoặc vuông và KHÔNG phát âm chúng. Thẻ giúp giọng lên xuống theo nội
dung thay vì đọc đều một mạch.

Pipeline tự bỏ thẻ khi ghi `script.txt` (file cho CapCut bắt phụ đề) và khi gọi
TTS không phải ElevenLabs, nên cứ viết thẳng thẻ vào `voiceText`.

**Bộ thẻ được dùng — chỉ dùng đúng những chuỗi này, viết thường:**

| Thẻ | Khi nào |
|---|---|
| `[curious]` | Đặt câu hỏi, gợi tò mò |
| `[excited]` | Tin vui, con số ấn tượng, điểm nhấn |
| `[thoughtful]` | Giải thích, phân tích, rút ra bài học |
| `[serious]` | Cảnh báo, nêu rủi ro, nói điều quan trọng |
| `[warm]` | Lời khuyên, câu kết thân thiện, CTA |
| `[sighs]` | Nêu cái bất tiện, cái mệt mỏi của cách làm cũ |
| `[laughs]` | Chỗ nhẹ nhàng, đùa nhẹ — rất hạn chế dùng |

**Quy tắc đặt thẻ — quan trọng, đặt sai thì giọng nghe giả:**

- **Tối đa 1 thẻ mỗi cảnh, và KHÔNG phải cảnh nào cũng cần.** Khoảng **một nửa
  số cảnh để trống thẻ** là hợp lý. Nhồi thẻ vào mọi câu khiến giọng nhấn nhá
  liên tục, nghe kịch và mệt.
- Đặt thẻ **ngay trước câu** mà nó chi phối, cách một dấu cách:
  `[curious] Vì sao tính từ lại vô dụng?`
- **Thẻ đặt giữa câu thì đặt trước mệnh đề**, đừng chèn giữa cụm từ.
- Thẻ **không tính** vào giới hạn số từ mỗi cảnh.
- Cảnh hook và cảnh outro nên có thẻ (mở phải hút, kết phải ấm).
- **Không tự chế thẻ mới** ngoài bảng trên. Thẻ lạ thì model đọc thành chữ.
- Muốn ngắt nghỉ thì dùng dấu ba chấm `...` hoặc tách câu, **đừng** dùng thẻ.

**Ví dụ một cảnh:**

```json
{
  "id": "s4",
  "type": "body",
  "voiceText": "[sighs] Trước đây mỗi lần cần một video, bạn phải ngồi cắt ghép cả buổi tối.",
  "templateId": "evose-statement",
  "inputs": { "lines": ["Cách làm cũ"], "hero": "Cả buổi tối", "badge": "no" }
}
```

---

### Step 6: Tự kiểm tra

**🔴 CHECKLIST (bắt buộc kiểm trước khi ghi script.json):**
- [ ] Mọi `templateId` đều bắt đầu bằng `evose-`? (không sót `frame-` nào)
- [ ] Có `"brand": { "overlay": false }` chưa?
- [ ] Cảnh đầu và cảnh cuối đều là `evose-logo-card`?
- [ ] Hai cảnh liền nhau có trùng template không?
- [ ] Có template nào lặp quá 2 lần không?
- [ ] Số liệu trong chart có phải số THẬT từ bài không? (không bịa để lấy cớ dùng chart)
- [ ] `voiceText` còn thuật ngữ nào người thường không hiểu ngay mà chưa giải thích không?
- [ ] Thẻ cảm xúc: có cảnh nào quá 1 thẻ không? Có ít nhất một nửa số cảnh KHÔNG có thẻ chứ?
- [ ] Mọi thẻ đều nằm trong bảng cho phép, viết thường, đặt trước câu?

- scenes[0]=hook, scene cuối=outro; mỗi templateId ∈ CATALOG; mỗi inputs đủ slot bắt buộc;
- **Hook `voiceText` ≤18 từ.** Chữ trên hình phải ngắn hơn nữa.
- **Slot bị bỏ trống thì BỎ HẲN, đừng điền chuỗi rỗng hay chữ độn** — template
  Light tự co bố cục khi thiếu slot, còn chữ độn thì nằm lại trên hình.
- `evose-title-card.lines`: 2–4 dòng, mỗi dòng ngắn; voiceText đã viết số ra chữ **và KHÔNG chứa emoji/icon**; emoji (nếu có) chỉ nằm trong `inputs`. Sửa thầm tối đa 2 lần.

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
