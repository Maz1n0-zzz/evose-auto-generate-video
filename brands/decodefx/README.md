# DecodeFX, bộ nhận diện video

Sàn giao dịch DecodeFX. Video dọc 1080×1920 cho TikTok, Shorts, Reels.
Nguồn: logo vector rút từ header `decodefx.com/vi-VN`, bảng màu đã duyệt ở ảnh
chính sách rebate ngày 03/10/2026. Nạp ngày 05/10/2026.

## Có gì trong này

| Đường dẫn | Việc |
|---|---|
| `tokens.css` | Biến màu, thang chữ, vùng an toàn. Đọc file này trước. Đây là tài liệu tham chiếu, `video:brand` không chép nó vào thư mục video. |
| `brand/frame.md` | Hợp đồng bố cục. Worker đọc nó qua `<dir>/frame.md`. |
| `brand/rules.md` | Luật cứng cho mọi khung. `video:packets` nhét vào `_dispatch.md`. |
| `brand/open.html` | Khung mở, chỗ chừa `__KICKER__` `__HEADLINE__` `__LABEL__` `__SUB__` `__ID__` `__DURATION__`. `__LABEL__` là nhãn nhỏ trong panel, viết hoa chữ đầu. |
| `brand/close.html` | Khung kết, chỗ chừa `__CTA__` `__ID__` `__DURATION__`. |
| `caption-skin.html` | Phụ đề kiểu DecodeFX: chữ trắng viền đen, từ đang đọc chuyển vàng. |
| `overlays/overlay-frame-decodefx.png` | Lớp phủ 1080×1920: watermark 360px ở trên, `decodefx.com` ở dưới. |
| `overlays/overlay-frame-decodefx.html` | Bản gốc của lớp phủ, sửa rồi chụp lại. |
| `logo/` | Lockup ngang, bản `.svg` gốc và `.png` 1400×463 đã cắt sát. |
| `fonts/` | Hanken Grotesk biến thiên và JetBrains Mono hai nét. |
| `voice.json` | Giọng tiếng Việt riêng của DecodeFX. |

## Màu

| Vai | Hex | Lấy từ đâu |
|---|---|---|
| Nền | `#08090B` | trang chủ decodefx.com |
| Panel | `#0E1013` | thẻ số liệu trên trang chủ |
| Panel nổi | `#16181D` | lớp trong của panel lồng |
| Viền | `#23262C` | viền 1px của mọi panel |
| Vàng nhận diện | `#F8CE0F` | khung vàng trong logo vector |
| Vàng sáng | `#FEC91E` | đỉnh gradient nút |
| Vàng tối | `#E2B31B` | đáy gradient nút |
| Chữ phụ | `#B9BCC4` | chữ mô tả trên trang chủ |
| Chữ mờ | `#8C8E9E` | nhãn phụ |
| Nến tăng, nến giảm | `#26D07C`, `#FF4B4B` | chọn mới, tương phản cao trên nền đen |

## Font

Hanken Grotesk biến thiên nét 100 tới 900, phủ đủ dấu tiếng Việt. JetBrains Mono
cho mọi con số và mọi mã giấy phép. Cả hai nằm trong repo, không tải từ CDN.

## Chữ ký thị giác

Dải giải mã: các cột ký tự JetBrains Mono trôi lên 15px mỗi giây ở lớp sâu nhất.
Ký tự xám ở 20% độ đục, khoảng 8% ký tự chuyển vàng ở 62% độ đục như vừa được giải mã.
Vị trí các ký tự vàng sinh một lần bằng seed cố định rồi nằm cứng trong file, nên render
lại bao nhiêu lần cũng ra đúng một kết quả.

Bản đầu đặt 12% và 30% kèm lớp veil tối tới 97%. Đo trên ảnh render thì ký tự vàng chỉ còn
khoảng 1,7% độ sáng, mắt không phân biệt được với ký tự xám. Dải đó là thứ duy nhất tách bộ
này khỏi WTC, nên đã nâng lên mức hiện tại và nới veil xuống tối đa 92%.

Không dựng lưới phối cảnh kiểu sàn, đó là nhận diện của WTC. Không mưa ký tự màu xanh lá.

## Hai khung khác WTC chỗ nào

Khung mở không dùng công thức kicker rồi headline giữa rồi sub của WTC. Nhãn nằm trong một
tab viền mảnh căn trái, headline dùng cỡ lớn nhất của bộ là 150px và tràn sát lề trái, phần
mô tả nằm trong một panel terminal lệch phải 160px để phá trục đối xứng.

Khung kết in đủ năm số hiệu giấy phép trong một panel, không dùng chip tên viết tắt.
Số hiệu kiểm chứng được là tài sản uy tín mạnh nhất của sàn này.

## Lắp vào một video

```bash
DIR=$(npm run -s video:new -- "<tựa bài>")
npm run video:brand -- decodefx "$DIR"
```

Rồi chép `$DIR/brand/open.html` và `close.html` vào `$DIR/compositions/frames/`
và điền chỗ chừa theo bước 6 của `.claude/skills/create-video/SKILL.md`.

## Ngôn ngữ và giọng

Video DecodeFX là **tiếng Việt**. `STORYBOARD.md` phải có `lang: vi` ở frontmatter.
`voice.json` mang giọng riêng và đè `ELEVENLABS_VOICE_ID` trong `.env.local` cho đúng
thư mục video này.

**Tốc độ đọc đo thật ngày 05/10/2026: 2,61 chữ mỗi giây** ở speed 1.06, model `eleven_v3`.
Phép đo: 185 chữ ra 70,95 giây, thư mục `decodefx-tvc-gioi-thieu-san-20261005-1420`.
Chậm hơn giọng Evose cũ 16%, nên nhân nhẩm bằng con số 3,1 là hụt mất khoảng mười giây.

| Muốn video dài | Viết khoảng |
|---|---|
| 60 giây | 157 chữ |
| 70 giây | 183 chữ |
| 80 giây | 209 chữ |

Đổi giọng thì đo lại bằng một video rồi sửa bảng này, đừng nhân nhẩm.

## Số liệu được phép dùng

Chỉ sáu nhóm này, lấy từ `decodefx.com/vi-VN` ngày 05/10/2026. Không thêm số nào khác.

| Mục | Giá trị |
|---|---|
| Spread | từ 0.0 pip |
| Đòn bẩy | tới 2000 |
| Sản phẩm | hơn 1.000 |
| Giấy phép | 5 |
| Số hiệu | ASIC 246796 · FSC Mauritius GB25204877 · VFSC 700415 · FSA St. Vincent 25431BC 2019 · FSCA FSP 55001 |
| Nền tảng | DecodeFX App, MT5, MT4, Web |

Dòng "2222+ năm niềm tin" trên trang chủ **không được dùng**. Gần như chắc chắn là lỗi
của website, đưa vào video là mất uy tín ngay.

## Vì sao không có câu cảnh báo rủi ro

Bộ WTC bắt buộc có dòng miễn trừ ở khung cuối. Bộ này cố ý không có. Mazino chốt ngày
05/10/2026, sau khi đã nghe rủi ro là một số nền tảng quảng cáo có thể gắn cờ video quảng
bá sàn đòn bẩy cao mà không kèm cảnh báo. Đây là quyết định của chủ sản phẩm, không phải
thiếu sót. Đừng tự thêm lại, và nếu cần đổi thì hỏi Mazino.

## Đã kiểm

- Logo rút từ SVG gốc trong header, cắt sát theo kênh alpha, render 1400×463 và nhìn tận mắt.
- Hai khung render thật bằng Chrome headless 1080×1920, tua timeline rồi mới chụp, ghép lớp
  phủ lên và nhìn tận mắt. Khung mở chụp ở giây 6,8 là lúc camera phóng gần hết, chỗ lề dễ vỡ nhất.
- Lề đo bằng máy trên ảnh render: khung mở còn 67px, khung kết còn 99px, đều trên ngưỡng 64px.
- Nội dung nằm trong y 250 tới 1500 ở cả hai khung: khung mở y 485 tới 1191, khung kết y 347 tới 1402.
- `npm run video:brand -- decodefx` chạy thật trên thư mục mới, 11 nhóm file vào đúng chỗ.
- Giọng `BlZK9tHPU6XXjwOSIiYA` đi qua kiểm định dạng của `video:brand`.
- Ba agent soát độc lập ngày 05/10/2026: thị giác, 6 trụ anti-slop, và kỹ thuật timeline.

## Chưa có, và việc để riêng

- **Bộ vẽ nến.** `brand/frame.md` mô tả hợp đồng `candle-chart`, phần dựng chưa viết.
  Khung nào cần chart thì dùng ảnh chụp thật.
- **Khung giữa.** Mới có khung mở và khung kết. Các khung nội dung do worker dựng ở chặng 3.
- **Nội dung kêu gọi.** `__CTA__` ở khung kết đang để chỗ chừa. Bản thử dùng tạm "MỞ TÀI KHOẢN".
- **GSAP tải từ CDN, hai bản khác nhau.** Khung dùng 3.12.5, lớp phụ đề dùng 3.14.2, cả hai
  lấy từ jsDelivr. Cả repo đang như vậy, gồm template, WTC và Redsun. Mazino chốt để riêng
  ngày 05/10/2026 vì sửa thì phải chạy lại thử cả ba bộ, trong đó hai bộ đã giao video thật.
