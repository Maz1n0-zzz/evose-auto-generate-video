# Changelog

## 2.1.0 — 2026-08-20

Bản này gỡ nút thắt tồn từ đầu dự án: **giọng đọc lệch ngữ điệu ở chỗ chuyển
cảnh**. Nhân đó tìm ra và sửa luôn hai lỗi âm thanh khác đã âm thầm làm hỏng
mọi video xuất ra từ trước tới nay.

Không đổi model — `eleven_v3` giữ nguyên vì nghe so ba model thì nó vẫn hay nhất
cho tiếng Việt.

### Giọng đọc liền mạch — đọc MỘT LẦN cả bài rồi cắt

Trước đây mỗi cảnh là một lần gọi API riêng. ElevenLabs không biết mạch câu nên
mỗi lần tự chọn lại ngữ điệu mở đầu, cao độ và nhịp lệch nhau, nghe rõ ở chỗ
chuyển cảnh.

ElevenLabs có hai cơ chế nối chính thức và **`eleven_v3` từ chối cả hai** (đã
kiểm bằng API thật, trả `400 unsupported_model`). Nên bỏ hẳn cách gọi từng
cảnh: nối lời cả bài thành một chuỗi, gọi endpoint `/with-timestamps` **một
lần**, rồi cắt theo mốc thời gian của từng ký tự. Cả bài là một mạch đọc nên
không còn chỗ nào để lệch.

- Quãng nghỉ model tự chèn giữa hai đoạn bị **gọt bỏ**, chỉ chừa 0.12s hai đầu.
  Không gọt thì video mẫu phình từ 96.78s lên 110.26s vì mỗi cảnh ôm nửa quãng
  nghỉ rồi pipeline lại cộng thêm khoảng nghỉ riêng.
- Lời quá 2900 ký tự, hoặc chỉ một cảnh có lời, thì tự quay về cách gọi từng cảnh.

**Đánh đổi:** không render lại riêng một cảnh được nữa — thiếu một file giọng là
đọc lại cả bài. Nhịp đọc cũng chậm hơn ~7% vì model đọc có nhịp hơn khi liền mạch.

### Tự bắt thẻ cảm xúc bị đọc to

`eleven_v3` thỉnh thoảng **đọc to** thẻ cảm xúc thay vì hiểu là chỉ dẫn diễn
xuất — `[curious]` phát ra thành tiếng nghe như "CU Arius". Cùng một chuỗi đầu
vào chạy bốn lần thì trượt một; không tránh được bằng cách viết lời khác.

Từ khi đọc một lần cả bài thì một lần trượt là hỏng nguyên video, nên phải chặn:

- Nhận biết qua mốc thời gian có sẵn trong phản hồi, **không tốn thêm lần gọi
  nào**. Thẻ bị đọc thì mỗi chữ cái tốn thời gian như chữ thường (0.164
  giây/ký tự); thẻ hiểu đúng thì cả thẻ gộp lại chỉ tốn một khoảnh khắc (0.069
  cao nhất). Ngưỡng đặt ở 0.12.
- Bắt được thì đọc lại, tối đa 2 lượt. Vẫn hỏng thì bỏ hẳn thẻ rồi đọc lại —
  không còn thẻ thì không còn gì để đọc nhầm.

### Sửa: video giao đi mất 6 dB

`amix` khi ghép nhạc nền thiếu cờ `normalize=0`, mà mặc định amix **chia biên độ
cho số input** → hạ cả giọng lẫn nhạc đi 6.02 dB. Nghĩa là `video-evose.mp4` —
file được đánh dấu "DÙNG FILE NÀY" — xưa nay vẫn nhỏ tiếng hơn hẳn `voice.mp3`
mà không có gì báo.

Đo trên video mẫu: `voice.mp3` −16.93 LUFS nhưng `video-evose.mp4` chỉ −23.08.
Sau khi sửa: −17.06, đúng bằng phần giọng. Tỉ lệ giọng/nhạc không đổi vì cả hai
cùng được trả lại.

### Chuẩn hoá âm lượng giữa các cảnh

Đưa mỗi cảnh về −16 LUFS bằng gain tĩnh rồi hãm đỉnh bằng `alimiter`. Cố ý
không chạy `loudnorm` ghi đè vì nó nén dải động và làm giọng nghe bẹt.

Giọng đọc có đỉnh nhọn hơn mức trung bình 18–20 dB, nên nếu bắt riêng đỉnh phải
nằm dưới trần thì gain bị chặn còn 2–3 dB và không cảnh nào lên nổi mức đích.
Phải kéo đủ tay rồi hãm riêng phần đỉnh — đúng cách các bộ chuẩn hoá phát thanh
vẫn làm.

### Sửa: thẻ cảm xúc gác nhầm theo provider

Chỉ `eleven_v3` hiểu thẻ; dòng v2 sẽ đọc to chữ trong ngoặc. Code cũ gác theo
*provider* nên đổi sang model v2 là thẻ lọt thẳng vào lời đọc. Nay gác theo
*model*.

### Thêm

- `previous_request_ids` để nối ngữ điệu với những model có hỗ trợ (dòng v2).
  Không dùng tới vì đang ở v3, nhưng sẵn sàng nếu sau này ElevenLabs mở cho v3.
- `scripts/probe-elevenlabs-stitching.ts` — kiểm model nào nối được ngữ điệu.
- `scripts/probe-v3-capabilities.ts` — kiểm v3 nhận `stability`, `seed`,
  `/with-timestamps` tới đâu.
- `scripts/compare-tts-models.ts` — đọc cùng một câu bằng nhiều model để nghe so.
  Dùng khi nghi model phát âm sai từ nào.
- Lỗi 4xx từ ElevenLabs nay nêu nguyên văn thông báo của API thay vì chỉ mã số.
- 39 test mới (99 tổng). `ElevenLabsClient` trước đó chưa có test nào.

### Đã thử và loại

| Cách | Kết quả |
|---|---|
| `previous_text` / `next_text` với v3 | 400 — v3 không nhận |
| `previous_request_ids` với v3 | 400 `unsupported_model` |
| Đổi sang `eleven_flash_v2_5` | Nối được ngữ điệu nhưng **nuốt dấu thanh** — "tháng bảy" → "tháng bay" |
| Đổi sang `eleven_multilingual_v2` | Nối được nhưng nghe như người nước ngoài tập nói tiếng Việt |

Và một chuyện tưởng là vấn đề nhưng đo ra thì không: **chênh lệch âm lượng giữa
các cảnh**. Đo 12 cảnh chỉ chênh 1.43 dB, dưới ngưỡng tai nghe ra — ElevenLabs
đã tự chuẩn hoá. Cái nghe thấy ở chỗ chuyển cảnh là lệch ngữ điệu chứ không phải
lệch âm lượng.

---

## 2.0.0 — 2026-08-20

Thay thế hoàn toàn bộ template cũ bằng bộ **Evose Light**.

- 12 template `evose-*` theo phong cách nền giấy sáng, chip đen bo tròn, một màu
  nhấn duy nhất, mascot robot 3D. Không gradient, không dark mode.
- Một file `portrait.html` dùng cho cả 9:16 và 16:9; bản 16:9 sinh tự động bằng
  `scripts/gen-aspect.py`.
- Gỡ 20 template `frame-*` cũ khỏi cả git lẫn đĩa. Lấy lại bằng
  `git checkout 458f13f -- templates/`.
- Overlay thương hiệu bản sáng bật trên mọi cảnh; cảnh kết có nút FOLLOW động.
