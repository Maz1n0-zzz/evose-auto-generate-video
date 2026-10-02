---
name: create-video
description: Tạo video tin tức 9:16 cho Evose từ URL bài báo hoặc file .txt tiếng Việt. Một composition HyperFrames duy nhất, có chuyển cảnh, hình bám từng chữ lời đọc, SFX và nhạc nền ElevenLabs, agent chấm độc lập. Trigger khi user muốn tạo video, làm short news, "/create-video <url>", "làm video từ bài này". Output: output/<slug>-<ngày>/renders/final.mp4, đăng được ngay (đã có logo Evose, phụ đề, nhạc).
---

# Tạo video Evose

Đây là quy trình DUY NHẤT để làm video trong repo này. Pipeline template cũ
(`npm run pipeline`, `templates/evose-*`) đã bị xoá ngày 30/09/2026.

Mẫu đã duyệt để tham khảo cách viết: `docs/vi-du-video/ai-my-canh-tranh-gia/`
(SCRIPT.md, STORYBOARD.md, 11 khung HTML, contact sheet).

Việc của Claude: viết lời, viết storyboard, điền khung mở/kết, giao worker dựng
khung, đọc kết quả chấm. Việc của máy: các lệnh `npm run video:*`.

## Kiểm máy trước khi bắt đầu (một lần mỗi phiên)

```bash
node --version            # >= 20
ffmpeg -version | head -1
ls ~/.claude/skills/faceless-explainer/scripts/frame-packets.mjs
```

Thiếu skill HyperFrames thì chạy `npx hyperframes skills update faceless-explainer`
rồi báo user khởi động lại Claude Code. `.env.local` phải có `ELEVENLABS_API_KEY`,
`ELEVENLABS_VOICE_ID`, `TTS_PROVIDER=elevenlabs`, `ELEVENLABS_MODEL_ID=eleven_v3`.
Claude KHÔNG đọc/ghi `.env*`. Thiếu key thì lệnh sẽ báo, chuyển nguyên văn cho user.

## Hồ sơ thương hiệu (chọn trước Bước 1)

Mặc định là Evose. Thương hiệu khác thì chạy thêm một lệnh sau `video:new`:

```bash
npm run video:brand -- <tên-brand> $DIR     # brand có sẵn: ls brands/
```

Lệnh đó chép luật, hợp đồng bố cục, lớp phủ, phụ đề, font và logo của thương hiệu vào
thư mục video, sinh `brand/fonts.css`, và bỏ font của template không thuộc bộ đó.

| | Evose (mặc định) | WTC |
|---|---|---|
| Ngôn ngữ | tiếng Việt | **tiếng Anh** (`lang: en` ở frontmatter STORYBOARD) |
| Độ dài | 250–300 chữ, 9–12 khung, 80–90 giây | **60–70 chữ, 6–8 khung, 28–32 giây** |
| Khung mở / kết | `template/brand/` | `brands/wtc/brand/` (lệnh trên đã chép sẵn vào `$DIR/brand/`) |
| Câu kết bắt buộc | "Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn." | khung kết WTC đã in sẵn CTA, miễn trừ và handle — **không viết câu kết vào lời đọc** |
| Chữ trên khung | tiếng Việt | tiếng Anh, in hoa |
| Số trong lời đọc | viết ra chữ | giữ chữ số, trừ giá tiền: "sixty-eight thousand" thay cho "$68,000" |

**Luật riêng của WTC** nằm ở `brands/wtc/brand/rules.md`, đọc trước khi viết storyboard.
Hai điều cấm không có ở Evose: không tô vàng vào thân nến hay vùng giá,
và không cam kết lợi nhuận.

**Tốc độ đọc đo thật, đừng ước.** Giọng tiếng Anh `HNLnm2dLXPBSK0FmAPS0` ở speed 1.06
chạy **2,2 chữ mỗi giây**, không phải 3,1 như tiếng Việt. Đo ngày 02/10/2026: 97 chữ ra
43,5 giây. Muốn 30 giây thì viết khoảng 65 chữ. Đổi giọng thì đo lại bằng một video rồi
sửa con số này, đừng nhân nhẩm.

**Hồ sơ short 30 giây** đổi ba chỗ so với bảng ở Bước 2:
mục 8 thành 60–70 chữ / 6–8 khung / mỗi khung 1 câu / khoảng 30 giây;
mục 6 bỏ (khung kết WTC tự lo CTA);
mục 5 giữ nguyên, nhưng vì ít khung hơn nên tối đa ba khung có thẻ cảm xúc.

## Bước 1 — Lấy nội dung, tạo thư mục

- **URL** → `WebFetch` lấy title, nội dung chính 500–1500 từ, domain. Lỗi (paywall,
  chặn bot) thì bảo user lưu bài vào `.txt` rồi gọi lại. Dừng.
- **File .txt** → dòng đầu là tựa, còn lại là nội dung.

```bash
DIR=$(npm run -s video:new -- "<tựa bài>")
```

Nguồn là URL thì chụp hai ảnh bài gốc (dùng cho khung trích nguồn và khung lướt bài):

```bash
npm run -s capture -- --url "<url>" --out $DIR/assets/shot-news.png --mode news
npm run -s capture -- --url "<url>" --out $DIR/assets/shot-scroll.png --mode full
```

Chụp lỗi thì báo nguyên văn lỗi và hỏi user: chụp tay rồi làm tiếp, hay làm không có ảnh.

## Bước 2 — Viết SCRIPT.md

Định dạng (lời đọc THỤT LỀ 4 dấu cách, mỗi khung một mục):

```markdown
# SCRIPT — <slug>

**Speed:** 1.06

## Line 1 — Hook (Frame 1)

    [curious] Tháng sáu vừa rồi, một công ty ở San Francisco tắt hẳn mô hình AI của Mỹ... để chuyển sang hàng Trung Quốc.

## Line 11 — CTA (Frame 11)

**Pad:** 0.5

    [warm] Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn.
```

**Luật lời đọc (bắt buộc):**

1. **Kể MỘT MẠCH.** Viết cả bài thành một đoạn liền, đọc thành tiếng thấy trôi rồi
   mới cắt thành khung. Mở bằng một khoảnh khắc cụ thể, không mở bằng câu hỏi chung
   chung. Bám một sợi chỉ, nối bằng "vì", "nên", "còn", "mà". Mỗi khung kết bằng
   thứ khung sau trả lời. Câu kết quay lại sợi chỉ ở câu mở.
2. **Dễ hiểu cho người lướt TikTok.** Câu ngắn, ít thuật ngữ. Tên công cụ kỹ thuật
   ít người biết thì thay bằng mô tả chức năng. Chỉ giữ tên hãng lớn.
3. **Không bịa số.** Mọi con số phải có trong bài gốc. Mỗi khung tối đa một con số.
4. **Số viết ra chữ** vì TTS đọc nghĩa đen: "tám mươi phần trăm", "GPT năm chấm năm",
   "gấp đôi". Không emoji, URL, ký hiệu `% $ & → # + =` trong lời đọc.
5. **Thẻ cảm xúc eleven_v3**, chỉ dùng: `[curious] [excited] [thoughtful] [serious]
   [warm] [sighs] [laughs]`. Tối đa 1 thẻ mỗi khung, khoảng một nửa số khung không
   có thẻ. Khung đầu và khung cuối nên có.
6. **Khung cuối BẮT BUỘC** là đúng câu: "Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."
   Kèm `**Pad:** 0.5` để logo kết kịp hiện đủ.
7. **Cấm:** "Cảm ơn bạn đã theo dõi", "trong video này", "hãy cùng", "tóm lại", "có thể thấy".
8. **Độ dài:** 250–300 chữ, 9–12 khung, mỗi khung 1–2 câu, khoảng 80–90 giây.

## Bước 3 — Đọc giọng

```bash
npm run video:voice -- $DIR
```

Ra `assets/voice/NN.mp3`, `audio_meta.json`, và `.hyperframes/words.txt` — bảng
`chữ@giây` của từng khung. **Đọc words.txt trước khi viết storyboard**: mọi mốc
Scene phải lấy từ đây. Đã có giọng thì lệnh không gọi lại ElevenLabs; muốn đọc
lại (sửa lời) thì xoá `$DIR/assets/voice` rồi chạy lại.

## Bước 4 — Viết STORYBOARD.md

Theo đúng khuôn của `docs/vi-du-video/ai-my-canh-tranh-gia/STORYBOARD.md`:

1. **Frontmatter:** `format: 1080x1920`, `duration`, `message`, `arc: story-explainer`,
   `mode: autonomous`, `music:` (mood nhạc bằng tiếng Anh, không lời).
   Lời đọc không phải tiếng Việt thì thêm `lang: en` — thiếu nó, `video:build` tách
   cụm phụ đề bằng từ điển tiếng Việt và cắt sai chỗ.
2. **`## Video direction`** (trước Frame 1): palette Evose, type, vùng an toàn, luật
   không đứng yên, motion grammar, nhịp (khung nào chậm), danh sách cấm, "đồ vật
   xuyên suốt" nối các khung. Chép khung của mẫu rồi sửa phần riêng của bài.
3. **Mỗi khung `## Frame N — Tên`** với các dòng:
   - `scene`, `voiceover` (nguyên văn khung đó), `duration` (lệnh voice tự điền),
     `transition_in`, `status: outline`, `src: compositions/frames/NN-ten.html`,
     `type`, `persuasion`, `beat`, `focal`, `roles`.
   - `blueprint:` **chỉ ghi đúng id**, không thêm "(Adapt)". Id hợp lệ là tên file
     trong `ls ~/.claude/skills/hyperframes-animation/blueprints/` (bỏ `.md`).
     `blueprints-index.md` có nhắc cả id không có file, dùng id đó thì `video:packets` báo lỗi.
   - `sfx:` dạng `tên@giây`, vd `whoosh@0, pop@2.6, impact-bass-1@5.6`. Tên lấy từ
     `assets/sfx/manifest.json`. Tiếng rơi đúng lúc hình hiện, 3–7 tiếng mỗi khung.
   - `asset_candidates: assets/shot-news.png — <mô tả>` chỉ cho khung dùng ảnh bài gốc.
   - Rồi dòng Adapt (giữ gì, đổi gì) và các dòng `Scene N (a–b s): …` có **mốc giây
     thật lấy từ words.txt**, mỗi thứ hiện đúng lúc giọng nhắc tới nó.
4. **Luật storyboard (bắt buộc):** mỗi khung ít nhất 3 trạng thái hình khác hẳn nhau.
   Không quãng nào quá 1,5 giây đứng yên. Hình chính chiếm 40–60% khung. Không front-load.
5. **Chuyển cảnh:** Frame 1 là `cut`. Còn lại chọn 2–3 kiểu trong
   `crossfade | blur-crossfade | push-slide UP | zoom-through` và lặp lại.
6. **Frame 1 và khung cuối** là khung thương hiệu (bước 6), ghi `blueprint: logo-assemble-lockup`.
7. Không logo thật của hãng khác, chỉ chip chữ. Không bịa số ngoài lời đọc.

Sau khi viết, đăng một đoạn tóm tắt storyboard cho user (mỗi khung một dòng) rồi
làm tiếp, không dừng chờ.

## Bước 5 — Nhạc, SFX, gói việc

```bash
npm run video:music -- $DIR     # ElevenLabs Music, chạy nền được
npm run video:sfx -- $DIR
npm run video:packets -- $DIR
```

## Bước 6 — Khung mở và khung kết (Claude tự làm, KHÔNG giao worker)

- `cp template/brand/open.html $DIR/compositions/frames/01-hook.html`, thay:
  `__ID__` = `01-hook` (trùng tên file), `__DURATION__` = duration Frame 1,
  `__HEADLINE__` (tựa, tối đa 24 ký tự: chữ 118px chỉ chứa khoảng 12–14 ký tự mỗi dòng, dài hơn là rớt xuống dòng ba), `__SUB__` (một câu tóm tắt),
  `__WHERE__` (nơi · thời điểm, chữ in hoa), `__FROM__` / `__TO__` (cái cũ bị gạch, cái mới),
  `__T_WHERE__ __T_FROM__ __T_STRIKE__ __T_TO__` = giây trong words.txt lúc giọng nhắc tới.
- `cp template/brand/close.html $DIR/compositions/frames/NN-ket.html`, thay `__ID__`
  và `__DURATION__`. Không sửa gì khác: đây là cảnh kết đã duyệt.
- Không áp camera hay hiệu ứng chung lên hai khung này.

## Bước 7 — Giao worker dựng các khung giữa

Một worker cho mỗi khung giữa, chạy song song (Agent tool, chạy nền). Prompt cho
mỗi worker, thay `<DIR>` và `<ID>`:

```
You are a HyperFrames frame worker. Read these files in full, in order, and follow them exactly:
1. <DIR>/.hyperframes/frame-packets/_role.md  (your contract)
2. <DIR>/.hyperframes/frame-packets/<ID>.md   (your frame)
3. <DIR>/.hyperframes/frame-packets/_dispatch.md  (video direction + Evose rules, binding)
4. <DIR>/frame.md  (look)
PROJECT_DIR: <DIR>. frame_id: <ID>. Output: compositions/frames/<ID>.html. Confirmed sketch: none.
Writing the file, after self-check and a snapshot check, is your terminal action. Reply with one line: path and size.
```

Chờ đủ file trên đĩa (không tin thông báo). Thiếu file nào thì giao lại đúng worker đó.

## Bước 8 — Ghép, kiểm, render

```bash
npm run video:build -- $DIR --no-render   # ghép + lint
npx hyperframes snapshot --at <3 mốc mỗi khung> --no-end --timeout 15000   # chạy trong $DIR
```

Xem contact sheet ở `$DIR/snapshots/`. Lỗi rõ (chữ bị cắt, đè nhau, ra ngoài vùng
y 290–1520) thì sửa hoặc giao lại worker kèm mô tả lỗi. Rồi:

```bash
npm run video:build -- $DIR
```

Ra `renders/final.mp4` (đã có logo Evose, phụ đề, nhạc, dưới 50 MB),
`renders/stillness.json`, `renders/contact-sheet.jpg`.

## Bước 9 — Chấm độc lập (bắt buộc, tối đa 2 vòng)

Giao một agent `general-purpose` chưa từng thấy quá trình dựng:

```
You are an independent, harsh critic of a Vietnamese 9:16 TikTok news explainer (brand Evose). Judge ONLY what is visible.
Video: <DIR>/renders/final.mp4. Frame boundaries (cumulative seconds): <liệt kê>. Stillness: <số trong stillness.json>.
Criteria in order: (1) picture changes a lot; (2) motion lands when the voice says it; (3) nothing broken: overlaps,
clipped or edge-cut text, empty dead areas, clipped Vietnamese diacritics, content under the logo header (y<270) or
social footer (y>1690); (4) opening/closing cards clean.
Extract frames with ffmpeg at 2 fps into a scratch dir, tile into sheets, LOOK at every sheet with Read, zoom where odd.
Output under 400 words: score 1-10 per criterion, then numbered defects with timestamp, frame, what is wrong,
one-line fix, each marked BLOCKER or MINOR.
```

Sửa mọi BLOCKER (giao lại worker của khung đó kèm đúng mô tả lỗi và mốc giây), build
lại, chấm lại. Sau vòng 2 còn BLOCKER thì dừng và báo user.

## Bước 10 — Báo kết quả

- Đường dẫn `renders/final.mp4`, độ dài, tỉ lệ hình đứng yên.
- Điểm chấm và các lỗi MINOR còn lại (để user quyết).
- Lệnh mở: `open <DIR>/renders/final.mp4`.

## Chi phí (nói thật với user khi được hỏi)

Mỗi video khoảng 1,5–2 triệu token Claude (10 worker + chấm) và 20–30 phút, cộng
phí ElevenLabs cho giọng và nhạc. Sửa một khung chỉ tốn một worker.
