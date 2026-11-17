---
version: alpha
name: AI Engineer Lecture — Frame (video / frame layer)
description: >
  Bộ nhận diện video NGANG cho series bài giảng YouTube "Trở thành AI Engineer từ con số không".
  Đơn vị là khung 1920×1080. Nguyên tử lấy nguyên của Evose: giấy sáng #f2f2f0, lưới chấm
  #d6d6d1 trôi nhẹ ở lớp sâu nhất, chữ #0a0a0a, một màu nhấn mỗi cảnh (mặc định #2563eb),
  Hanken Grotesk cho nhãn, JetBrains Mono cho số và code. Chuyển động nằm ngoài phạm vi file này.
unit: khung 1920×1080 (16:9)
principle: nguyên tử bất biến · bố cục tự do · mọi con số và mọi dòng code đến từ nguồn thật

colors:
  paper:      "#f2f2f0"
  ink:        "#0a0a0a"
  navy:       "#0A1532"
  accent:     "#2563eb"
  accent-soft: "#dbe6fd"
  dot:        "#d6d6d1"
  text-dim:   "#4b5563"
  text-mute:  "#6b7280"
  panel:      "#ffffff"
  line:       "#d6d6d1"

typography:
  body:         { fontFamily: "Hanken Grotesk", px: 34, weight: 500, lineHeight: 1.36 }
  label:        { fontFamily: "Hanken Grotesk", px: 28, weight: 700, tracking: "0.10em", upper: true }
  micro:        { fontFamily: "JetBrains Mono", px: 22, weight: 400, tracking: "0.16em", upper: true }
  statement:    { fontFamily: "Hanken Grotesk", px: 52, weight: 800, lineHeight: 1.16 }
  title:        { fontFamily: "Hanken Grotesk", px: 72, weight: 900, lineHeight: 1.06, tracking: "-0.01em" }
  headline:     { fontFamily: "Hanken Grotesk", px: 96, weight: 900, lineHeight: 1.04, tracking: "-0.015em" }
  num-hero:     { fontFamily: "JetBrains Mono", px: 120, weight: 700, tnum: true }
  num:          { fontFamily: "JetBrains Mono", px: 44, weight: 700, tnum: true }
  code:         { fontFamily: "JetBrains Mono", px: 30, weight: 400, lineHeight: 1.5 }
  chip:         { fontFamily: "JetBrains Mono", px: 26, weight: 600, tracking: "0.02em" }

spacing:
  edge: "130px"           # le trai phai. Camera phong 3% keo le con 105px
  gap-s: "16px"
  gap-m: "32px"
  gap-l: "56px"
  radius: "10px"
  hairline: "2px"

safe:
  top: 120                # logo Evose cua lop phu nam y 44-80 goc tren phai
  bottom: 860             # captionBandFor(1080) = y 900-1080; phong 3% day 860 xuong 869.6
  left: 130
  right: 1790
  logo-zone: "x 1711-1856, y 44-80 — thuoc lop phu, khong khung nao ve vao day"
  caption-band: "y 900-1080, do build.ts tinh bang captionBandFor(1080)"

layout:
  # Bài giảng hay có hai vế: khái niệm bên trái, minh hoạ (code, sơ đồ, ảnh chụp) bên phải.
  text-col:   { x: 130, w: 720 }
  figure-col: { x: 900, w: 890 }
  full:       { x: 130, w: 1660 }

motifs:
  dot-grid:
    color: "#d6d6d1"
    dot: "1.35px"
    pitch: "26px"
    drift: "chéo, khoảng 26px cho cả khung, ease none"
    note: Lớp sâu nhất, luôn dưới mọi nội dung, không bao giờ đứng yên.
  code-card:
    note: >
      Thẻ trắng #ffffff, viền 2px #0a0a0a, bo 10px, thanh tiêu đề mang tên file bằng JetBrains Mono.
      Dòng đang nói tới có nền #dbe6fd và vạch trái #2563eb, các dòng khác mờ còn 35%.
      Dùng khung có sẵn brand/code.html thay vì tự dựng.
  chip:
    note: >
      Tên công nghệ viết đúng như chính chủ viết (Python, OpenAI, Claude, LangGraph).
      Nền trắng, viền 2px #0a0a0a, bo 8px, chữ JetBrains Mono 26px. Không lấy logo chính chủ.

forbidden:
  - Logo của bên thứ ba
  - Logo Evose vẽ thêm trong khung giữa (lớp phủ đã có)
  - Nội dung trong dải phụ đề y 900-1080 hoặc vùng logo góc trên phải
  - Hai màu nhấn trong cùng một cảnh, gradient nhiều màu
  - Code hay output tự bịa, không có nguồn
---

# AI Engineer Lecture — Frame

Đọc frontmatter ở trên trước, nó là nguồn đúng. `brand/rules.md` đè lên file này khi khác nhau.

Khung là một trang bài giảng trên giấy sáng. Mỗi khung có một ý chính chiếm 40 tới 60% vùng an
toàn, nhãn tiếng Việt ngắn, và một minh hoạ thật (code, sơ đồ, ảnh chụp tài liệu). Thứ bậc đến
từ cỡ chữ và màu nhấn duy nhất, không đến từ nhiều màu.
