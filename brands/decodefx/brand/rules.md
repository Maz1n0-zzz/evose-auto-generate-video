## Luật DecodeFX cho mọi khung (bắt buộc, đè lên frame.md khi khác nhau)

- Canvas 1080×1920. Captions: enabled.
- **Bảng màu, không có ngoại lệ:** nền `#08090B`, panel `#0E1013` và `#16181D`, viền panel `#23262C`,
  chữ `#FFFFFF`, chữ phụ `#B9BCC4`, chữ mờ `#8C8E9E`.
  Màu nhấn duy nhất là vàng `#F8CE0F`, gradient được phép đi từ `#FEC91E` xuống `#E2B31B`.
  Không xanh dương, không tím, không cam. Nến tăng `#26D07C` và nến giảm `#FF4B4B` chỉ dùng trong chart.
- **Chữ ký thị giác là dải giải mã, không phải sàn lưới.** Mọi khung không phải chart toàn màn đều có
  một lớp nền gồm các ký tự `JetBrains Mono` cỡ 26px xếp thành cột dọc, màu `rgba(185,188,196,.12)`,
  trôi lên chậm 1 dòng mỗi 2 đến 3 giây. Một phần nhỏ ký tự chuyển sang `rgba(248,206,15,.30)` như vừa
  được giải mã. Lớp này luôn nằm dưới mọi nội dung và không bao giờ đứng yên.
  Tuyệt đối không dựng lưới phối cảnh kiểu sàn, đó là nhận diện của WTC.
- **Hình khối là terminal, không phải thẻ bo tròn.** Mọi panel bo đúng 4px, viền 1px `#23262C`.
  Nút kêu gọi bo 8px, nền gradient vàng, chữ đen. Không bo tròn 999px, không đổ bóng lan rộng.
- Vùng an toàn: lớp phủ chiếm y 0–230 ở trên và y 1700–1920 ở dưới, phụ đề nằm y 1530–1680.
  Mọi nội dung chính phải nằm trong y 250–1500 ở MỌI thời điểm, kể cả khi camera lướt.
  Chữ chừa ít nhất 64px mỗi mép trái phải.
- Mốc Scene trong gói là giây thật khớp lời đọc, bám đúng ±0.1s.
- Không thứ gì đứng yên: không quãng nào quá 1,5 giây mà không có chuyển động nhìn thấy được.
  Nội dung đã hiện đủ thì camera vẫn đẩy chậm tối đa 4% trên một lớp bọc bên trong.
- Tất định: không `repeat:-1`, không CSS transition, không tween letterSpacing/width/height,
  không `onUpdate` để đổi chữ (dùng `tl.set`). Không `Math.random`, không `Date`.
- **Số liệu chỉ được lấy từ lời đọc hoặc từ SCRIPT.md.** Không bịa thêm con số nào.
  Năm con số được phép dùng trong bộ này: `0.0` pip, `2000` đòn bẩy, `1.000+` sản phẩm,
  `5` giấy phép, và các số hiệu giấy phép ghi nguyên văn ở `frame.md`. Không có số nào khác.
- Không dùng logo của bên thứ ba (TradingView, AWS, CoinMarketCap và các đối tác khác trên website).
  Đưa logo hãng khác vào video là ngụ ý tài trợ, và không ai cấp quyền đó cho chúng ta.
- Không cam kết lợi nhuận, không nói "chắc thắng", "lãi đều", "không rủi ro".
- Chữ trên khung: tiếng Việt, ngắn, dạng nhãn và số. Không in nguyên câu lời đọc lên khung.
- Logo dùng file `assets/brand/decodefx-lockup-h-gold.png`, luôn đặt trên nền tối, bề ngang
  tối thiểu 360px để chữ DECODE còn đọc được. Không đổi màu, không kéo méo, không xoay.
- Ảnh thật chỉ dùng khi gói có dòng `asset_candidates`, đường dẫn dạng `assets/<file>`.
- Viết file xong, tự chụp để kiểm: từ thư mục dự án chạy
    npx hyperframes snapshot --at <3-4 mốc giây tuyệt đối trong khung> --no-end --timeout 15000 -o <thư mục tạm riêng>
  rồi dùng Read xem ảnh. Sửa tới khi không có chữ đè nhau, không cắt chữ, không vùng trống lớn.

<!-- fonts:start -->
    @font-face { font-family: "Hanken Grotesk"; src: url("assets/fonts/HankenGrotesk-VF.ttf") format("truetype"); font-weight: 100 900; }
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype"); font-weight: 100 599; }
    @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Bold.ttf") format("truetype"); font-weight: 600 900; }
<!-- fonts:end -->

Khối `@font-face` ở trên là bộ ĐẦY ĐỦ của DecodeFX. `video:brand` rút đúng vùng giữa hai mốc
để sinh `brand/fonts.css`, nên một khối nêu làm ví dụ phản diện đặt ngoài vùng đó không bị lấy nhầm.
Không tải font từ Google Fonts hay bất kỳ CDN nào.
