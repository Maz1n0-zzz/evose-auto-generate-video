## Luật AI Engineer cho mọi khung (bắt buộc, đè lên frame.md khi khác nhau)

Bộ này dùng cho series bài giảng YouTube "Trở thành AI Engineer từ con số không".
Mỗi chương là một lượt `/create-video` riêng, dài 2 tới 3 phút, rồi `npm run video:join`
nối các chương thành một tập 12 tới 18 phút.

### Khổ hình và vùng an toàn

- **Canvas 1920×1080, khung NGANG.** Captions: enabled. Frontmatter STORYBOARD phải có
  `format: 1920x1080` và `lang: vi`. Mọi con số toạ độ dưới đây tính theo khung ngang.
  Đừng chép số của bộ Evose dọc (y 290–1520) sang.
- **Dải phụ đề y 900–1080.** `captionBandFor(1080)` trong `src/video/lib.ts` trả về
  `top 900, height 180`. Nội dung không bao giờ được chạm dải này.
- **Logo Evose y 44–80, x 1711–1856**, góc trên phải, nằm trong lớp phủ
  `brand/overlay.png`. Không khung nào được vẽ nội dung vào vùng đó. Không vẽ thêm logo
  Evose trong khung giữa, lớp phủ đã lo.
- **Nội dung chính nằm trong y 120–860, x 130–1790 ở MỌI thời điểm**, kể cả khi camera
  đẩy. Nền và lưới chấm được tràn toàn khung.
- Lý do của các con số: camera phóng tối đa 3% quanh tâm (960, 540). Mép dưới 860 bị đẩy
  xuống 869,6, vẫn cách dải phụ đề 30px. Mép trên 120 bị kéo lên 107,4, vẫn dưới logo 27px.
  Lề trái 130 co lại còn 105,1. Muốn phóng 4% thì phải thu vùng nội dung lại, đừng chỉ đổi số phóng.
- Khung ngang rộng gấp đôi khung dọc. Đừng để một nửa khung trống khi lời đọc mới nói tới
  vế đầu. Dựng cái vỏ của cả hai vế trước, để trống ruột, rồi đổ nội dung vào đúng mốc lời đọc.

### Bảng màu và chữ

- Nền giấy `#f2f2f0` cộng lưới chấm `#d6d6d1`, chấm 1,35px, bước 26px. Lưới trôi chéo
  nhẹ, quãng trôi tính theo độ dài khung.
- Chữ `#0a0a0a`. Chữ phụ `#4b5563`. Chữ mờ `#6b7280`. Logo và tiêu đề đậm có thể dùng navy `#0A1532`.
- **Một màu nhấn mỗi cảnh**, mặc định xanh `#2563eb`. Không trộn hai màu nhấn trong một cảnh.
  Đỏ `#d64545` chỉ dùng để gạch bỏ hoặc báo lỗi thật trong output.
- Hanken Grotesk cho nhãn và tiêu đề. JetBrains Mono cho số, mã lệnh, tên file, output.
- Cỡ chữ tối thiểu 28px cho nhãn, 26px cho code. Người xem YouTube hay xem trên điện thoại
  đặt ngang, chữ nhỏ hơn mức này không đọc được.

### Chuyển động

- Mốc Scene trong gói là giây thật khớp lời đọc, bám đúng ±0.1s.
- Không thứ gì đứng yên: không quãng nào quá 1,5 giây mà không có chuyển động nhìn thấy được.
  Nội dung đã hiện đủ thì camera vẫn đẩy chậm (tối đa 3%) trên một lớp bọc bên trong, và
  lưới nền trôi nhẹ.
- Tất định: không `repeat:-1`, không CSS transition, không tween letterSpacing/width/height,
  không `onUpdate` để đổi chữ (dùng `tl.set`). Không `Math.random`, không `Date`.
- id phần tử bắt đầu bằng chữ cái (vd "f07-bar"), không bắt đầu bằng số.

### Nội dung trên khung

- Chữ trên màn hình: tiếng Việt, ngắn (nhãn, số, tên khái niệm). Không in nguyên câu lời đọc.
  Thuật ngữ tiếng Anh giữ nguyên dạng gốc (agent, token, prompt, API) kèm nhãn tiếng Việt ngắn
  ở lần đầu xuất hiện.
- Không bịa số ngoài lời đọc. Không dùng logo thật của hãng khác, chỉ chip chữ.
  Không tiếng Việt trong hiệu ứng xáo chữ ngẫu nhiên.
- **Được chiếu code.** Code phải ngắn, tối đa khoảng 14 dòng một khung, và chép từ nguồn thật
  (repo bài học, tài liệu chính chủ). Không tự viết code "cho đẹp" rồi gán là của nguồn.
  Output hiện trên khung phải là output chép từ một lần chạy thật. Không bịa output.
- Chiếu code thì dùng khung có sẵn `brands/ai-engineer/brand/code.html`. Claude tự điền,
  không giao worker. Code hiện từng dòng, dòng đang nói tới sáng lên bằng màu nhấn, các dòng
  khác mờ đi. Cách điền và cách escape ký tự `< > &` xem README của bộ.
- Ảnh thật chỉ dùng khi gói có dòng asset_candidates, đường dẫn dạng assets/<file>.

### Lời đọc kiểu bài giảng (đè lên luật lời đọc TikTok của skill)

1. **Được dùng thuật ngữ**, nhưng lần đầu nhắc thì giải thích ngay bằng tiếng Việt đời thường.
   Ví dụ: "agent, tức là một chương trình tự quyết bước tiếp theo".
2. **Mỗi khung 2 tới 3 câu.** Vẫn kể một mạch, nối bằng "vì", "nên", "còn", "mà".
3. **Một chương nhắm 2 phút 30 tới 2 phút 50**, tức khoảng 540 tới 620 chữ, chia 11 tới 13 khung. Trần cứng: cả SCRIPT.md tối đa 2900 ký tự lời đọc (`src/video/voice.ts:39`), khoảng 630 chữ,
   mỗi khung khoảng 50 chữ. Tốc độ đo thật của giọng bài giảng ở speed 1.06 là 3,7 chữ mỗi
   giây: chương 3 tập 6 có 494 chữ lời đọc ra 132,1 giây.
4. **Số viết ra chữ** vì TTS đọc nghĩa đen: "tám mươi phần trăm", "GPT năm chấm năm".
   Không emoji, URL, ký hiệu `% $ & # + =` trong lời đọc. Tên hàm hay tên biến thì đọc
   thành lời: "hàm run agent", không đọc dấu gạch dưới.
5. **Thẻ cảm xúc eleven_v3**, chỉ dùng: `[curious] [excited] [thoughtful] [serious] [warm]
   [sighs] [laughs]`. Tối đa 1 thẻ mỗi khung, khoảng một nửa số khung không có thẻ.
6. **Câu "Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn." CHỈ có ở khung cuối của
   chương cuối mỗi tập**, kèm `**Pad:** 0.5`. Các chương khác kết bằng câu bắc cầu sang
   chương sau, không có câu kêu gọi.
7. Cấm: "Cảm ơn bạn đã theo dõi", "trong video này", "hãy cùng", "tóm lại", "có thể thấy".

### Kiểm sau khi viết khung

- Worker không chạy lệnh CLI nào, kể cả `hyperframes snapshot`. Lúc worker viết khung,
  `index.html` chưa được ghép nên lệnh chụp không có gì đúng để chụp.
- Viết file xong, đọc lại chính file HTML của mình và soát theo luật trong file này: toạ độ
  mọi phần tử nằm trong y 120–860 và x 130–1790, không chạm vùng logo, chữ không đè nhau,
  cỡ chữ không dưới mức tối thiểu, không vế nào trống khi lời đọc đã nói tới.
- Chụp ảnh để kiểm là việc của Claude ở Bước 8 của skill `create-video`, chạy sau
  `video:build --no-render`. Khung nào lỗi thì Claude giao lại kèm mô tả lỗi và mốc giây.

### Font

Chỉ dùng đúng khối này, đường dẫn tính từ gốc dự án:

<!-- fonts:start -->
    @font-face { font-family: "Hanken Grotesk"; src: url("assets/fonts/HankenGrotesk-VF.ttf") format("truetype"); font-weight: 100 900; }
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype"); font-weight: 100 599; }
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Bold.ttf") format("truetype"); font-weight: 600 900; }
<!-- fonts:end -->

Không tải font từ Google Fonts hay CDN. `video:brand` rút đúng vùng giữa hai mốc để sinh
`brand/fonts.css`.
