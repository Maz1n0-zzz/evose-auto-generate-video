---
version: alpha
name: DecodeFX Terminal — Frame (video / frame layer)
description: >
  Bộ nhận diện video dọc cho sàn DecodeFX. Đơn vị là khung 1080×1920.
  Nguyên tử không đổi: nền đen xanh gần tuyệt đối, dải ký tự giải mã trôi ở lớp sâu nhất,
  panel viền mảnh kiểu màn hình giao dịch, vàng DecodeFX là màu nhấn duy nhất,
  Hanken Grotesk cho chữ, JetBrains Mono cho mọi con số và mọi mã giấy phép.
  Chuyển động nằm ngoài phạm vi file này.
unit: khung 1080×1920 (9:16) là chính
principle: nguyên tử bất biến · bố cục tự do · mọi con số đến từ lời đọc, không từ trí nhớ

colors:
  ground:     "#08090B"
  outline:    "#FFFFFF"
  panel:      "#0E1013"
  panel-2:    "#16181D"
  line:       "#23262C"
  gold:       "#F8CE0F"
  gold-hi:    "#FEC91E"
  gold-lo:    "#E2B31B"
  text-dim:   "#B9BCC4"
  text-mute:  "#8C8E9E"
  up:         "#26D07C"
  down:       "#FF4B4B"

typography:
  body:         { fontFamily: "Hanken Grotesk", px: 44, weight: 400, lineHeight: 1.35 }
  body-lede:    { fontFamily: "Hanken Grotesk", px: 52, weight: 500, lineHeight: 1.3 }
  label:        { fontFamily: "Hanken Grotesk", px: 36, weight: 600, tracking: "0.14em", upper: true }
  micro:        { fontFamily: "Hanken Grotesk", px: 26, weight: 500, tracking: "0.18em", upper: true }
  statement:    { fontFamily: "Hanken Grotesk", px: 64, weight: 700, lineHeight: 1.18 }
  title:        { fontFamily: "Hanken Grotesk", px: 88, weight: 800, lineHeight: 1.05 }
  headline:     { fontFamily: "Hanken Grotesk", px: 112, weight: 900, lineHeight: 0.98, tracking: "-0.015em", upper: true }
  display:      { fontFamily: "Hanken Grotesk", px: 150, weight: 900, lineHeight: 0.92, tracking: "-0.02em", upper: true }
  num-hero:     { fontFamily: "JetBrains Mono", px: 128, weight: 700, tnum: true }
  num:          { fontFamily: "JetBrains Mono", px: 54, weight: 700, tnum: true }
  num-tick:     { fontFamily: "JetBrains Mono", px: 24, weight: 400, tnum: true }
  chip:         { fontFamily: "JetBrains Mono", px: 30, weight: 700, tracking: "0.04em" }
  tagline:      { fontFamily: "Hanken Grotesk", px: 56, weight: 800, lineHeight: 1.16 }
  cta:          { fontFamily: "Hanken Grotesk", px: 48, weight: 900, tracking: "0.03em" }
  site:         { fontFamily: "JetBrains Mono", px: 34, weight: 400, tracking: "0.10em" }

spacing:
  edge: "80px"            # padding sân khấu. 80 chứ không phải 64: camera phóng 3% kéo lề còn 66px
  safe-top: "250px"       # dưới watermark của lớp phủ
  safe-bottom: "1500px"   # trên dải phụ đề
  grid-cols: 8            # 8 cột × 98px + 7 rãnh × 24px = 952px
  grid-col: "98px"
  grid-gutter: "24px"
  baseline: "4px"         # toạ độ dọc do mình đặt là bội của 4. Ba mốc 250, 1500 và 1530 do
                          # build.ts cố định và không chia hết cho 8, nên baseline 8 là luật không theo được
  gap-sm: "16px"
  gap-md: "32px"
  gap-lg: "64px"
  radius-panel: "4px"
  radius-cta: "8px"
  hairline: "1px"

components:
  decode-tape:
    description: >
      Dải giải mã — chữ ký thị giác của DecodeFX, có ở mọi khung không phải chart toàn màn.
      Các cột ký tự JetBrains Mono 26px, màu {colors.text-dim} ở 20% độ đục, xếp dọc kín khung,
      trôi lên 15px mỗi giây, quãng trôi tính bằng 15 nhân __DURATION__ chứ không phải một số
      cố định. Khoảng 8% ký tự đổi sang vàng ở 62% độ đục như vừa được giải mã, các vị trí đó
      cố định theo khung chứ không chọn ngẫu nhiên lúc chạy. Lớp veil phủ lên trên chỉ được
      tối tới 92% ở mép, đậm hơn nữa thì dải mất hẳn và thương hiệu không còn chữ ký nào.
      Luôn nằm dưới mọi nội dung, không bao giờ đứng yên, không bao giờ đọc được thành chữ có nghĩa.
    forbidden: lưới phối cảnh kiểu sàn, mưa ký tự kiểu Matrix màu xanh lá, ký tự nhấp nháy ngẫu nhiên

  terminal-tab:
    description: >
      Nhãn kiểu tab của màn hình giao dịch, dùng thay cho kicker chữ trần. Nền {colors.panel},
      viền 1px {colors.line}, bo 4px, padding 12px trên dưới và 24px hai bên. Bên trong là một
      chấm vàng 10px rồi tới chữ micro in hoa màu {colors.text-dim}. Luôn căn trái, không căn giữa.
    forbidden: chữ trần không có khung, nhãn đánh số kiểu "01", gạch trang trí kéo dài sau nhãn

  terminal-panel:
    description: >
      Hộp chứa số liệu và nhãn. Nền {colors.panel}, viền 1px {colors.line}, bo 4px.
      Góc trên trái có một nhãn micro in hoa. Số bên trong luôn là JetBrains Mono.
      Panel lồng nhau thì lớp trong dùng {colors.panel-2}, không thêm viền thứ hai.
    forbidden: bo tròn lớn, đổ bóng lan, nền gradient, viền vàng dày

  licence-row:
    description: >
      Dòng giấy phép: tên cơ quan quản lý in hoa bằng label, quốc gia bằng micro màu {colors.text-mute},
      số hiệu bằng num-tick màu {colors.text-mute} căn phải. Năm dòng xếp dọc trong một terminal-panel,
      mỗi dòng padding 20px trên dưới, ngăn nhau bằng một gạch 1px {colors.line}. Số hiệu ghi nguyên
      văn, không rút gọn, không làm tròn. Đây là bố cục đang dùng thật ở khung kết, không phải dự định.
    data:
      - { body: "ASIC",  region: "Úc",           id: "246796" }
      - { body: "FSC",   region: "Mauritius",    id: "GB25204877" }
      - { body: "VFSC",  region: "Vanuatu",      id: "700415" }
      - { body: "FSA",   region: "St. Vincent",  id: "25431BC 2019" }
      - { body: "FSCA",  region: "Nam Phi",      id: "FSP 55001" }

  stat-block:
    description: >
      Một con số lớn kiểu num-hero màu {colors.gold} kèm một nhãn micro bên dưới màu {colors.text-mute}.
      Dùng cho spread, đòn bẩy, số sản phẩm. Tối đa ba khối trên một khung.
      Con số đếm lên được, nhưng phải đếm bằng tl.set theo mốc cố định, không dùng onUpdate.

  cta-button:
    description: >
      Nút kêu gọi: nền gradient dọc từ {colors.gold-hi} xuống {colors.gold-lo}, chữ đen,
      Hanken Grotesk 900, bo 8px, padding 28px trên dưới và 72px hai bên.
      Một lượt quét sáng chéo đi qua nút, tối đa hai lần mỗi khung.
    forbidden: bo tròn 999px, bóng vàng lan rộng, nút viền rỗng

  logo-lockup:
    description: >
      File assets/brand/decodefx-lockup-h-gold.png, tỉ lệ 1400×463. Luôn trên nền tối.
      Bề ngang tối thiểu 360px, ở khung kết dùng 560px. Không đổi màu, không kéo méo, không xoay.

  candle-chart:
    description: >
      Chưa xây. Khung nào cần chart mà chưa có bộ vẽ thì dùng ảnh chụp thật trong assets/.
      Nếu xây thì nến tăng {colors.up}, nến giảm {colors.down}, bấc {colors.text-mute},
      và tuyệt đối không tô vàng vào thân nến vì vàng là màu nhận diện.
---
