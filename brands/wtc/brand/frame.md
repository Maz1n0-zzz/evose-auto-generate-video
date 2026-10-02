---
version: alpha
name: WTC Gold Floor — Frame (video / frame layer)
description: >
  Bộ nhận diện video dọc cho Wealthy Trading Club. Đơn vị là khung 1080×1920.
  Nguyên tử không đổi: nền đen tuyệt đối, sàn lưới cam phối cảnh, vàng WTC là màu
  nhận diện duy nhất, Acumin Pro Cond Black cho chữ lớn, Acumin Pro cho chữ đọc,
  JetBrains Mono cho mọi con số. Chart nến là công dân hạng nhất của hệ, không
  phải đồ trang trí. Chuyển động nằm ngoài phạm vi file này.
unit: khung 1080×1920 (9:16) là chính; 1920×1080 và 1080×1080 ghi kèm
principle: nguyên tử bất biến · bố cục tự do · mọi con số đến từ dữ liệu, không từ trí nhớ

colors:
  ground:     "#000000"
  outline:    "#FFFFFF"
  panel:      "#0C0C0E"
  panel-2:    "#16161A"
  gold:       "#E8B018"
  gold-hi:    "#F7D64A"
  gold-lo:    "#A8730A"
  grid:       "#7A3C00"
  grid-hot:   "#A05000"
  text-dim:   "#9C9790"
  text-mute:  "#5E5A54"
  up:         "#26D07C"
  down:       "#FF4B4B"

typography:
  body:         { fontFamily: "Acumin Pro", px: 44, weight: 400, lineHeight: 1.35 }
  body-lede:    { fontFamily: "Acumin Pro", px: 52, weight: 500, lineHeight: 1.3 }
  label:        { fontFamily: "Acumin Pro", px: 36, weight: 600, tracking: "0.14em", upper: true }
  micro:        { fontFamily: "Acumin Pro", px: 26, weight: 500, tracking: "0.18em", upper: true }
  statement:    { fontFamily: "Acumin Pro", px: 64, weight: 700, lineHeight: 1.18 }
  title:        { fontFamily: "Acumin Pro", px: 88, weight: 900, lineHeight: 1.05 }
  headline:     { fontFamily: "Acumin Pro Cond", px: 112, weight: 900, lineHeight: 0.98, tracking: "-0.01em", upper: true }
  display:      { fontFamily: "Acumin Pro Cond", px: 150, weight: 900, lineHeight: 0.92, tracking: "-0.015em", upper: true }
  num-hero:     { fontFamily: "JetBrains Mono", px: 128, weight: 700, tnum: true }
  num:          { fontFamily: "JetBrains Mono", px: 54, weight: 700, tnum: true }
  num-tick:     { fontFamily: "JetBrains Mono", px: 24, weight: 400, tnum: true }
  chip:         { fontFamily: "JetBrains Mono", px: 30, weight: 700, tracking: "0.04em" }

spacing:
  edge: "64px"            # lề trái phải, vùng vẽ rộng 952px
  safe-top: "250px"       # dưới watermark
  safe-bottom: "1500px"   # trên dải phụ đề
  grid-cols: 8            # 8 cột × 98px + 7 rãnh × 24px = 952px
  grid-col: "98px"
  grid-gutter: "24px"
  baseline: "8px"         # mọi toạ độ dọc là bội của 8
  gap-sm: "16px"
  gap-md: "32px"
  gap-lg: "64px"

components:
  gold-floor:
    description: >
      Sàn lưới phối cảnh — chữ ký thị giác của WTC, có ở mọi khung không phải chart toàn màn.
      Đường lưới {colors.grid} chạy về điểm tụ đặt ở khoảng y 55% khung, đậm dần xuống chân
      khung thành {colors.grid-hot}. Quầng ấm rgba(160,80,0,.55) ở đường chân trời.
      Lưới trôi chậm suốt khung (1 ô mỗi 2–3 giây), không bao giờ đứng yên.
  candle-chart:
    description: >
      Chart nến vẽ từ dữ liệu OHLC thật trong capture/ohlc/*.json. Thân nến {colors.up}
      hoặc {colors.down}, bấc {colors.wick}. Không bo góc. Không đổ bóng. Không viền.
      Trục giá bên phải bằng num-tick, trục thời gian dưới cùng. Chart là hình chính
      thì chiếm 40–60% khung.
  annotation-layer:
    description: >
      Lớp chú thích nằm TRÊN chart, toạ độ tính từ dữ liệu chứ không đặt tay.
      Gồm: đường ngang structure (rgba(255,255,255,.34), nét đứt 8/8), ô vùng cung
      rgba(255,75,75,.14) và vùng cầu rgba(38,208,124,.14), nhãn pill vàng,
      và TỐI ĐA MỘT mũi tên cam {colors.amber} mỗi khung.
  zone-box:
    description: >
      Ô vùng giá — mô-típ xuyên suốt một video. Do bộ vẽ chart sinh ra, không vẽ tay:
      chạy `npm run video:chart` rồi nhúng `assets/chart/<id>.svg`. Ô nằm đúng toạ độ
      hai mức giá thật nên kích thước trên màn hình đổi theo mức zoom từng khung.
      Tính liên tục đến từ việc cả video dùng chung một chart, không phải từ pixel bằng nhau.
      Viền {colors.gold} 3px nét đứt 8/8, bo 0, không đổ bóng, không quầng vàng phía sau.
      Ruột vùng cầu rgba(38,208,124,.12), vùng cung rgba(255,75,75,.12).
  gold-pill:
    description: >
      Nhãn chú thích — nền gradient 180deg {colors.gold-hi} → {colors.gold-lo},
      chữ đen 900, bo 999px, đệm 14px 32px. Dùng cho nhãn trên chart và nút kêu gọi.
      Tối đa hai pill mỗi khung.
  stat-card:
    description: >
      Thẻ số — nền {colors.panel}, viền 1px rgba(232,176,24,.22), bo 18px,
      nhãn micro ở trên, số num-hero ở giữa, đơn vị chip bên phải số.
      Số luôn JetBrains Mono tabular, không bao giờ Acumin.
  ticker-strip:
    description: >
      Dải mã chạy ngang — chip mono trên nền {colors.panel-2}, dấu tăng giảm
      {colors.up}/{colors.down}. Dùng làm lớp nền phụ, không bao giờ là hình chính.
  watermark:
    description: >
      Lockup WTC ngang (bull + ba dòng chữ) góc trên trái, rộng 300px,
      đặt x 64 y 56. Do overlay phủ lên sau khi render, khung KHÔNG tự vẽ lại.
---

# WTC Gold Floor — Frame (video / frame layer)

## Đọc trước

YAML phía trên là nguồn sự thật. Phần chữ dưới đây giải thích ý đồ, khi lệch nhau thì YAML thắng.
`brand/rules.md` đè lên cả hai.

## Tổng quan

WTC ở quy mô khung là **phòng giao dịch ban đêm**: nền đen tuyệt đối, một sàn lưới cam chạy về
phía chân trời, và vàng là thứ duy nhất phát sáng. Không có màu thứ ba. Cảm giác muốn đạt là
đắt tiền và tỉnh táo, không phải sòng bạc.

Giọng chữ có ba vai. **Acumin Pro Cond Black** in hoa gánh mọi câu tuyên bố, cỡ rất lớn, một cụm
mỗi lần. **Acumin Pro** gánh chữ đọc và nhãn. **JetBrains Mono** gánh mọi con số, không có ngoại lệ,
vì số nhảy cỡ khi đếm là lỗi dễ thấy nhất trên video tài chính.

**Đặc điểm ở quy mô khung:**

- **Hai màu cộng một.** Đen + trắng là nền và chữ. Vàng là màu nhận diện. Xanh đỏ chỉ dành cho nến
  và vùng giá, không bao giờ dùng để trang trí.
- **Sàn lưới cam luôn có mặt** trừ khi chart chiếm toàn màn.
- **Thứ bậc bằng cỡ, không bằng màu.** Một phần tử áp đảo 3–6 lần phần tử kế nó.
- **Chart là nội dung, không phải nền.** Chart nào xuất hiện cũng phải có ít nhất một chú thích
  giải thích vì sao nó ở đó.
- **Mọi con số truy được về dữ liệu.** Không có dữ liệu thì để chỗ trống `— giá —`, không bịa.

## Khung và vùng an toàn

- **Chính:** 1080×1920 (9:16). **Ngang:** 1920×1080. **Vuông:** 1080×1080.
- Watermark phủ **y 0–230**. Phụ đề phủ **y 1530–1680** (`build.ts` cố định).
  Chân khung Telegram phủ **y 1700–1920**.
- Nội dung chính nằm trong **y 250–1500**, chừa **64px** mỗi mép trái phải.

## Màu

`ground` là nền. `outline` trắng là chữ. `gold` là màu nhận diện và là màu duy nhất được phép
làm nhãn, viền sáng, pill. `amber` (#F8A000, không nằm trong YAML để không bị nhận nhầm làm accent
chính) chỉ dùng cho MỘT chi tiết kêu gọi mỗi khung: một mũi tên chỉ, hoặc một nút.

`up` và `down` mang nghĩa, không mang thẩm mỹ. Không dùng xanh để làm đẹp một nhãn,
không dùng đỏ để nhấn một chữ.

## Chữ

Hai thang. **Thang đọc** (body 44px, label 36px hoa) gánh nội dung. **Thang tuyên bố**
(headline 112px → display 150px, Cond Black in hoa) gánh câu chốt.

- **Sàn đọc được:** không dòng nào mang nghĩa dưới **32px**.
- **Vừa khổ:** ≤3 chữ → `display`; 4–6 chữ → `headline`; 7 chữ trở lên → `title`.
  Khối chữ rộng tối đa **920px**.
- Chữ lớn luôn in hoa và tracking âm. Chữ đọc không in hoa.

## Chiều sâu

Phẳng, trừ ba thứ:

1. Pill vàng có gradient dọc và đổ bóng ấm `0 10px 30px rgba(232,176,24,.25)`.
2. Thẻ số có viền vàng mờ 1px, không đổ bóng.
3. Sàn lưới tạo chiều sâu bằng phối cảnh, không bằng bóng.

Không glassmorphism. Không blur nền. Không gradient nhiều màu.

## Hình dạng

- Chart và chú thích: **bo 0**.
- Thẻ số và ảnh chụp: **bo 18px**.
- Pill và nút: **bo 999px**.

Ba mức này là toàn bộ từ vựng, không thêm mức thứ tư.

## Kiểu khung

> Công thức: nền · bố cục · tiêu điểm · chrome · nhấn · khoảng trống · cố định/tự do.

### 1 · Mở (nhận diện · lockup + câu tuyên bố)

**Nền** đen + sàn lưới + quầng ấm. **Bố cục** lockup WTC dọc ở trên, `display` in hoa ở giữa,
một dòng `label` vàng ở dưới. **Tiêu điểm** câu tuyên bố 1–3 chữ. **Nhấn** không có.
**Khoảng trống** ~45%. **Cố định** lockup, sàn lưới.

### 2 · Chart đơn (dạy một khái niệm)

**Nền** đen, sàn lưới tắt hoặc rất mờ. **Bố cục** chart chiếm y 420–1180, nhãn mã và khung giờ
`chip` ở trên chart, chú thích rơi dần theo lời. **Tiêu điểm** chart. **Nhấn** một mũi tên cam.
**Khoảng trống** ~25%. **Cố định** nến vẽ từ dữ liệu, chú thích tính từ dữ liệu.

### 3 · Chart + câu chốt (vì sao nó quan trọng)

**Nền** đen. **Bố cục** chart thu còn y 380–980, `headline` in hoa chiếm y 1040–1420.
**Tiêu điểm** câu chốt. **Nhấn** một pill vàng trên chart. **Khoảng trống** ~20%.

### 4 · Đối chiếu (sai và đúng)

**Nền** đen + sàn lưới mờ. **Bố cục** hai chart xếp dọc, mỗi cái cao 480px, nhãn `label`
bên trái mỗi cái. **Tiêu điểm** sự khác nhau giữa hai cái. **Nhấn** một dấu X đỏ và một dấu
tích xanh, cỡ bằng nhau. **Khoảng trống** ~15%.

### 5 · Số (một con số duy nhất)

**Nền** đen + sàn lưới. **Bố cục** `micro` nhãn, `num-hero` mono đếm lên, `body` một dòng giải thích.
**Tiêu điểm** con số. **Nhấn** không có. **Khoảng trống** ~55%.

### 6 · Kết (kêu gọi)

**Nền** đen + sàn lưới + quầng ấm mạnh hơn. **Bố cục** lockup dọc, tagline, pill vàng
"THAM GIA WTC", handle Telegram, dòng miễn trừ. **Tiêu điểm** pill. **Khoảng trống** ~40%.
**Cố định** dòng miễn trừ, không được bỏ.

## Luật bố cục

### Nên

- Giữ sàn lưới ở mọi khung không phải chart toàn màn.
- Một tuyên bố mỗi khung, in hoa, cỡ lớn, canh trái hoặc canh giữa.
- Mọi con số dùng JetBrains Mono tabular.
- Chú thích chart rơi đúng lúc giọng nhắc tới nó.
- Đổi điểm neo giữa các khung: không ba khung liên tiếp cùng canh một kiểu.

### Lấp đầy vùng nội dung (đo được, không ước lượng)

Vùng nội dung là y 250–1500, cao 1250px. Hai ngưỡng, cả hai phải đạt:

1. **Tại mọi thời điểm sau giây 0,5 của khung**, hộp bao của phần sáng phải cao ít nhất
   **688px**, tức 55% chiều cao vùng nội dung.
2. **Gộp toàn bộ khung lại**, không một dải ngang cao 300px nào trong y 250–1500 được
   trống hoàn toàn từ đầu tới cuối cảnh.

Lưới sàn cam KHÔNG tính là nội dung khi đo hai ngưỡng này. Nó là nền.

Cách đo: trích ảnh từng mốc, lọc pixel có độ sáng trên 90, bỏ dải màu cam của lưới sàn,
rồi lấy hộp bao. Khung nào không đạt thì dời bố cục, đừng phóng to chữ để lấp.

**Ngoại lệ cho thẻ mở và thẻ kết.** Hai kiểu khung `Mở` và `Kết` chỉ cần **500px**, không phải 688px.
Bảng kiểu khung ở trên đã cho chúng 45% và 40% khoảng trống, vì chúng là thẻ nhận diện chứ không
phải khung dạy nội dung. Ngưỡng 688px áp cho các kiểu còn lại. Dù vậy khối chữ phải canh theo
quang học: tâm khối nằm trong khoảng y 800–950, đừng dồn hết lên nửa trên.

### Không nên

- Không thêm màu thứ ba ngoài vàng, xanh nến, đỏ nến.
- Không tô vàng vào thân nến hay vùng giá.
- Không in nguyên câu lời đọc lên khung.
- Không chart trang trí: chart nào cũng phải có chú thích giải thích nó.
- Không cam kết lợi nhuận, không "chắc thắng", không "x lần tài khoản".

## Tỉ lệ khung

| Kiểu khung | 9:16 | 16:9 | 1:1 |
| --- | --- | --- | --- |
| Mở | lockup trên, chữ giữa | lockup trái, chữ phải | lockup trên, chữ dưới |
| Chart đơn | chart giữa, cao | chart tràn ngang | chart vuông |
| Chart + chốt | chart trên, chữ dưới | chart trái, chữ phải | chart trên, chữ dưới |
| Đối chiếu | hai chart xếp dọc | hai chart cạnh nhau | hai chart xếp dọc |
| Số | số giữa | số trái, chú thích phải | số giữa |
| Kết | xếp dọc | lockup trái, pill phải | giữa |

Sàn lưới và watermark giữ nguyên ở mọi tỉ lệ. Tính lại cỡ chữ để không dòng nào xuống dưới 32px.

## Thực thể được duyệt

- Tên thương hiệu: **Wealthy Trading Club**, viết tắt **WTC**.
- Tagline đã dùng: `Trade Smarter · Capture Moves · Scale Wealth`.
- Kênh: Telegram `@WealthyTradingClub`.
- Không dùng logo thật của sàn hay hãng khác (Binance, BingX, TradingView…) trừ khi khung
  là ảnh chụp thật có trong `asset_candidates`. Còn lại chỉ dùng chip chữ.

## Số liệu và tuyên bố (luật cứng)

Không bao giờ bịa giá, phần trăm, ngày, số lệnh thắng. Chỗ chưa có dữ liệu thì để
`— giá —`, `{pct}`, `— R:R —`. Nến và chú thích chỉ được vẽ khi có file dữ liệu thật.
Mọi khung nói về kết quả giao dịch phải đi kèm dòng miễn trừ ở khung kết.

## Tự soát trước khi render

- **Nheo mắt** — một phần tử áp đảo 3–6 lần phần tử kế nó.
- **Màu** — chỉ đen, trắng, vàng, cộng xanh đỏ của nến. Không màu thứ tư.
- **Vàng** — không dính vào thân nến hay vùng giá.
- **Sàn lưới** — có mặt, và đang trôi.
- **Chữ** — Cond Black in hoa tracking âm cho tuyên bố, sàn 32px, không tràn 64px mép.
- **Số** — mono tabular hết, không có số nào bằng Acumin.
- **Dấu tiếng Việt** — không bị cắt ngọn ở dòng trên cùng của khối chữ lớn.
- **Vùng an toàn** — không gì nằm ở y<250 hoặc y>1500.
- **Ô vùng giá** — do bộ vẽ chart sinh ra, viền vàng nét đứt, ruột xanh hoặc đỏ nhạt, không bao giờ vàng.
- **Lấp đầy** — hộp bao phần sáng cao ít nhất 688px, và không dải 300px nào trống suốt cảnh.
- **Nguồn** — mọi con số truy được về dữ liệu hoặc bài gốc.

## Khoảng còn trống

- **Chuyển động ngoài phạm vi.** File này chỉ nói bố cục.
- **Chart đã có bộ vẽ.** `src/video/chart/` sinh SVG và bảng toạ độ từ nến thật ghim ở
  `brands/wtc/chart/data/`. Worker đọc `coords.json`, không tự đặt toạ độ nến.
  Hiệu ứng nến hiện dần chưa có sẵn, mỗi cây nến là một nhóm `id="cdl-000"` để worker tự gắn.
- **Acumin Pro là font thương mại của Adobe.** File trong `fonts/` do WTC cung cấp.
  Dùng trong sản phẩm giao cho WTC thì theo giấy phép của họ, không phát hành lại.
