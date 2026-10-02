## Luật WTC cho mọi khung (bắt buộc, đè lên frame.md khi khác nhau)

- Canvas 1080×1920. Captions: enabled.

- **Bảng màu, không có ngoại lệ.** Nền đen `#000000`. Thẻ và bảng `#0C0C0E`, lớp nổi `#16161A`.
  Màu nhận diện là vàng `#E8B018`, đỉnh gradient `#F7D64A`, đáy `#A8730A`.
  Màu kêu gọi là cam `#F8A000`, mỗi khung dùng tối đa MỘT chi tiết cam.
  Chữ trắng `#FFFFFF`, chữ phụ `#9C9790`. Nến tăng `#26D07C`, nến giảm `#FF4B4B`.
  Không xanh dương, không tím, không hồng, không màu thứ ba ngoài bảng này.

- **Vàng không bao giờ tô vào thân nến hay vùng giá.** Vàng dành cho khung viền, nhãn,
  pill chú thích, con trỏ. Nến và vùng cung cầu dùng xanh đỏ. Trộn vào nhau là chart đọc không ra.

- **Sàn lưới cam là chữ ký của WTC.** Mọi khung không phải chart toàn màn phải có lưới phối cảnh
  `#7A3C00` chạy về điểm tụ, đậm dần xuống chân khung thành `#A05000`, kèm quầng ấm
  `rgba(160,80,0,0.55)` ở đường chân trời. Lưới trôi chậm suốt khung, không bao giờ đứng yên.

- **Vùng an toàn.** Watermark WTC phủ y 0–230. Dải phụ đề y 1530–1680 (build.ts cố định,
  không được đổi). Chân khung Telegram và dòng miễn trừ phủ y 1700–1920.
  Mọi nội dung chính nằm trong y 250–1500 ở MỌI thời điểm, kể cả khi camera lướt.
  Chữ chừa ít nhất 64px mỗi mép trái phải. Nền và lưới được tràn toàn khung.

- **Mốc Scene** trong gói là giây thật khớp lời đọc, bám đúng ±0.1s.

- **Ô vùng giá do bộ vẽ chart sinh ra, không vẽ tay.** Chạy `npm run video:chart` rồi nhúng
  file `assets/chart/<id>.svg`. Ô vùng nằm đúng toạ độ hai mức giá thật, nên kích thước trên
  màn hình đổi theo mức zoom của từng khung — đó là đúng, không phải lỗi. Tính liên tục đến từ
  việc cả video dùng CHUNG MỘT chart, không phải từ việc các ô bằng nhau từng pixel.
  Viền vàng `#E8B018` 3px nét đứt 8/8, ruột cầu `rgba(38,208,124,0.12)`, ruột cung
  `rgba(255,75,75,0.12)`. Không quầng vàng phía sau.

  Luật cũ bắt ô cố định 708×160 đã bỏ. Nó là cái nạng cho thời chart vẽ tay, khi mỗi worker
  tự chọn một cỡ và mô-típ không đọc ra là cùng một vật.

- **Nến và chú thích đọc từ `assets/chart/<id>.coords.json`.** File đó cho toạ độ từng cây nến,
  từng ô vùng, từng mốc. Mỗi cây nến là một nhóm `id="cdl-000"` nên bám GSAP được để cho nó
  hiện dần. TUYỆT ĐỐI không tự đặt toạ độ nến. Đây là lỗi làm hỏng cả video trước: tám khung
  đều vẽ tay nên chart nhìn như vẽ đại.

- **Lấp đầy vùng nội dung, đo được chứ không ước lượng.** Vùng nội dung y 250–1500 cao 1250px.
  Hai ngưỡng, cả hai phải đạt:
  1. Tại mọi thời điểm sau giây 0,5 của khung, hộp bao phần sáng phải cao ít nhất **688px**.
  2. Gộp cả cảnh lại, không dải ngang cao 300px nào trong y 250–1500 được trống hoàn toàn.

  Lưới sàn cam KHÔNG tính là nội dung khi đo, nó là nền. Không đạt thì dời bố cục cho trải đều,
  đừng phóng to chữ để lấp. Đây là lỗi hay gặp nhất: dồn hết lên một dải 200px rồi bỏ trống
  hai phần ba dưới.

  **Ngoại lệ cho thẻ mở và thẻ kết.** Hai kiểu khung `Mở` và `Kết` chỉ cần **500px**, không phải 688px.
  Bảng kiểu khung ở trên đã cho chúng 45% và 40% khoảng trống, vì chúng là thẻ nhận diện chứ không
  phải khung dạy nội dung. Ngưỡng 688px áp cho các kiểu còn lại. Dù vậy khối chữ phải canh theo
  quang học: tâm khối nằm trong khoảng y 800–950, đừng dồn hết lên nửa trên.


- **Không thứ gì đứng yên.** Không quãng nào quá 1,5 giây mà không có chuyển động nhìn thấy được.
  Nội dung đã hiện đủ thì camera vẫn đẩy chậm (tối đa 4%) trên một lớp bọc bên trong,
  và lưới sàn vẫn trôi.

- **Tất định.** Không `repeat:-1`, không CSS transition, không tween `letterSpacing`/`width`/`height`,
  không `onUpdate` để đổi chữ (dùng `tl.set`). Không `Math.random`, không `Date`.

- **Font: chỉ dùng đúng khối này**, đường dẫn tính từ gốc dự án:

  <!-- fonts:start -->
      @font-face { font-family: "Acumin Pro"; src: url("assets/fonts/AcuminPro-Book.woff2") format("woff2"); font-weight: 400; }
      @font-face { font-family: "Acumin Pro"; src: url("assets/fonts/AcuminPro-Medium.woff2") format("woff2"); font-weight: 500; }
      @font-face { font-family: "Acumin Pro"; src: url("assets/fonts/AcuminPro-Semibold.woff2") format("woff2"); font-weight: 600; }
      @font-face { font-family: "Acumin Pro"; src: url("assets/fonts/AcuminPro-Bold.woff2") format("woff2"); font-weight: 700; }
      @font-face { font-family: "Acumin Pro"; src: url("assets/fonts/AcuminPro-Black.woff2") format("woff2"); font-weight: 800 900; }
      @font-face { font-family: "Acumin Pro Cond"; src: url("assets/fonts/AcuminProCond-Bold.woff2") format("woff2"); font-weight: 700; }
      @font-face { font-family: "Acumin Pro Cond"; src: url("assets/fonts/AcuminProCond-Black.woff2") format("woff2"); font-weight: 800 900; }
      @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype"); font-weight: 100 599; }
      @font-face { font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-Bold.ttf") format("truetype"); font-weight: 600 900; }
  <!-- fonts:end -->

  Không tải font từ Google Fonts hay CDN. Mọi con số (giá, phần trăm, R:R, khung giờ)
  dùng JetBrains Mono với `font-variant-numeric: tabular-nums` để số không nhảy khi đếm.

- **id phần tử bắt đầu bằng chữ cái** (vd `f07-candle`), không bắt đầu bằng số.

- **Ngôn ngữ.** Video WTC là **tiếng Anh**. `STORYBOARD.md` phải có `lang: en` ở frontmatter,
  nếu không `build.ts` sẽ tách cụm phụ đề bằng từ điển tiếng Việt và cắt sai chỗ.

- **Chữ trên màn hình:** tiếng Anh, viết hoa toàn bộ cho tuyên bố, ngắn (nhãn, số).
  Không in nguyên câu lời đọc lên khung — phụ đề đã lo việc đó.
  Giữ nguyên thuật ngữ ngành: supply zone, demand zone, base, entry, stop loss, take profit,
  breakout, pullback, liquidity, order block, fair value gap, CHoCH, BOS, swing high,
  swing low, long, short, scalp, setup, R:R. Không viết tắt tự chế.

- **Số liệu phải có nguồn.** Mọi giá, phần trăm, ngày tháng phải lấy từ bài gốc hoặc từ
  bộ dữ liệu nến đã ghim ở `brands/wtc/chart/data/`. Không bịa. Chart phải vẽ từ dữ liệu thật, toạ độ chú thích
  tính từ dữ liệu đó, không đặt tay. Khung nào không có dữ liệu thì không có chart.
  Trục giá của chart ĐƯỢC phép hiện số, vì số đó lấy từ file dữ liệu. Luật là cấm số KHÔNG
  có nguồn, không phải cấm mọi số. Nhãn mã luôn kèm năm, dữ liệu cũ mà thiếu năm là người
  xem tưởng giá hôm nay.

- **Cấm cam kết lợi nhuận.** Không "chắc thắng", "x lần tài khoản", "không bao giờ lỗ",
  "tín hiệu chính xác 100%". Khung cuối BẮT BUỘC có dòng miễn trừ.

- **Ảnh thật** chỉ dùng khi gói có dòng `asset_candidates`, đường dẫn dạng `assets/<file>`.

- **Nhãn không bao giờ che thứ nó gán nhãn.** Pill, chip, biển giá, mốc chữ đều tồn tại để
  chỉ vào một thứ khác. Thứ được chỉ phải thấy rõ hơn cái nhãn. Đo hở từ mép NGOÀI CÙNG của
  nhãn, tính cả quầng sáng và bóng đổ, tới mép đối tượng. Tối thiểu 24px. Đo bằng pixel trên
  ảnh chụp, không đo bằng toạ độ CSS, vì quầng sáng không nằm trong hộp bố cục.

- **Viết file xong, tự chụp để kiểm:** từ thư mục dự án chạy

      npx hyperframes snapshot --at <3-4 mốc giây tuyệt đối trong khung> --no-end --timeout 15000 -o <thư mục tạm riêng>

  rồi dùng Read xem ảnh. Sửa tới khi không có chữ đè nhau, không cắt chữ, không mất dấu tiếng Việt,
  không vùng trống lớn, không nội dung lọt vào y<250 hay y>1500.
  Ba phép đo bắt buộc ở mỗi mốc, báo số ra chứ đừng nói "đã kiểm":
  1. Hộp bao phần sáng cao từ 688px trở lên.
  2. Không khối đen liền nào vừa rộng hơn 320px vừa cao hơn 320px trong y 250–1500.
  3. Mỗi nhãn hở ít nhất 24px tới đối tượng nó chỉ, đo cả quầng sáng.
