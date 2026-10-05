# DecodeFX — bộ nhận diện video

Sàn giao dịch DecodeFX. Video dọc 1080×1920 cho TikTok, Shorts, Reels.
Nguồn: logo vector rút từ header `decodefx.com/vi-VN`, bảng màu đã duyệt ở ảnh
chính sách rebate ngày 03/10/2026. Nạp ngày 05/10/2026.

## Có gì trong này

| Đường dẫn | Việc |
|---|---|
| `tokens.css` | Toàn bộ biến màu, cỡ chữ, vùng an toàn. Đọc file này trước. |
| `brand/frame.md` | Hợp đồng bố cục. Worker đọc nó qua `<dir>/frame.md`. |
| `brand/rules.md` | Luật cứng cho mọi khung. `video:packets` nhét vào `_dispatch.md`. |
| `brand/open.html` | Khung mở, chỗ chừa `__KICKER__` `__HEADLINE__` `__SUB__` `__ID__` `__DURATION__`. |
| `brand/close.html` | Khung kết, chỗ chừa `__CTA__` `__ID__` `__DURATION__`. |
| `caption-skin.html` | Phụ đề kiểu DecodeFX: chữ trắng viền đen, từ đang đọc chuyển vàng. |
| `overlays/overlay-frame-decodefx.png` | Lớp phủ 1080×1920: watermark trên, `decodefx.com` dưới. |
| `overlays/overlay-frame-decodefx.html` | Bản gốc của lớp phủ, sửa rồi chụp lại. |
| `logo/` | Lockup ngang, bản `.svg` gốc và `.png` 1400×463 đã cắt sát. |
| `fonts/` | Hanken Grotesk biến thiên và JetBrains Mono, chép từ `template/assets/fonts/`. |
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
| Nến tăng / giảm | `#26D07C` / `#FF4B4B` | chọn mới, tương phản cao trên nền đen |

## Font

Hanken Grotesk biến thiên nét 100 đến 900, phủ đủ dấu tiếng Việt. JetBrains Mono
cho mọi con số và mọi mã giấy phép. Cả hai đã có sẵn trong repo, không tải từ CDN.

| Dùng | Family | Nét |
|---|---|---|
| Tuyên bố lớn, in hoa | Hanken Grotesk | 900 |
| Tiêu đề | Hanken Grotesk | 800 |
| Chữ đọc, nhãn | Hanken Grotesk | 400 / 500 / 600 / 700 |
| Số, mã, khung giờ | JetBrains Mono | 400 / 700 |

## Chữ ký thị giác

Dải giải mã: các cột ký tự JetBrains Mono trôi lên chậm ở lớp sâu nhất, phần lớn màu
xám ở 12% độ đục, khoảng 8% ký tự chuyển vàng ở 30% độ đục như vừa được giải mã.
Các vị trí vàng được sinh một lần bằng seed cố định và nằm cứng trong file, nên video
render lại bao nhiêu lần cũng ra đúng một kết quả.

Không dựng lưới phối cảnh kiểu sàn, đó là nhận diện của WTC. Không mưa ký tự màu xanh lá.

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
thư mục video này, nên Evose giữ giọng của Evose còn DecodeFX dùng giọng riêng.

**Tốc độ đọc của giọng này chưa ai đo.** Con số 3,1 chữ mỗi giây là của giọng Evose cũ.
Đo lại bằng một lần `video:voice` rồi ghi số thật vào đây trước khi viết lời đủ dài.

## Số liệu được phép dùng

Chỉ sáu nhóm số này, lấy từ `decodefx.com/vi-VN` ngày 05/10/2026. Không thêm số nào khác.

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

## Đã kiểm

- Logo rút từ SVG gốc trong header, cắt sát theo kênh alpha, render 1400×463 và nhìn tận mắt.
- Khung mở và khung kết render thật bằng Chrome headless 1080×1920, đã tua timeline tới
  giây 3,2 và 5,2 rồi mới chụp, soi dấu tiếng Việt và vùng an toàn.
- Lớp phủ ghép chồng lên cả hai khung, không đè nội dung, không trùng thông tin với khung kết.
- `npm run video:brand -- decodefx` chạy thật trên thư mục mới: 11 nhóm file vào đúng chỗ,
  `fonts.css` ra 3 khối và mọi đường dẫn font đều trỏ file có thật.
- Giọng `BlZK9tHPU6XXjwOSIiYA` đi qua kiểm định dạng của `video:brand`.

## Chưa có

- **Bộ vẽ nến.** `brand/frame.md` mô tả hợp đồng `candle-chart`, phần dựng chưa viết.
  Khung nào cần chart thì dùng ảnh chụp thật.
- **Khung giữa.** Mới có khung mở và khung kết. Các khung nội dung do worker dựng theo
  `frame.md` ở chặng 3.
- **Nội dung kêu gọi.** `__CTA__` ở khung kết đang để chỗ chừa, Mazino chưa chốt là link,
  mã QR hay email liên hệ. Bản thử dùng tạm chữ "MỞ TÀI KHOẢN".
- **Tốc độ đọc thật của giọng mới.** Xem mục Ngôn ngữ và giọng ở trên.
