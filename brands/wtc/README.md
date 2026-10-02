# WTC — bộ nhận diện video

Wealthy Trading Club. Video dọc 1080×1920 cho TikTok, Shorts, Reels.
Nguồn: Drive brand kit của WTC, nạp ngày 02/10/2026.

## Có gì trong này

| Đường dẫn | Việc |
|---|---|
| `tokens.css` | Toàn bộ biến màu, cỡ chữ, vùng an toàn. Đọc file này trước. |
| `brand/frame.md` | Hợp đồng bố cục. Worker đọc nó qua `<dir>/frame.md`. |
| `brand/rules.md` | Luật cứng cho mọi khung. `video:packets` nhét vào `_dispatch.md`. |
| `brand/open.html` | Khung mở, có chỗ chừa `__HEADLINE__` `__SUB__` `__PAIR__` `__TF__` `__KICKER__`. |
| `brand/close.html` | Khung kết, đã duyệt, chỉ thay `__ID__` và `__DURATION__`. |
| `caption-skin.html` | Phụ đề kiểu WTC: chữ hoa trắng viền đen, từ đang đọc chuyển vàng. |
| `overlays/overlay-frame-wtc.png` | Lớp phủ 1080×1920: watermark trên, Telegram và miễn trừ dưới. |
| `overlays/overlay-frame-wtc.html` | Bản gốc của lớp phủ, sửa rồi chụp lại. |
| `logo/` | 4 lockup × 3 màu (gold, white, black), mỗi cái có `.svg` và `.png` đã cắt sát. |
| `fonts/` | Acumin Pro 7 nét + JetBrains Mono, đã rút gọn còn latin + tiếng Việt. |
| `voice.json` | Giọng ElevenLabs riêng của WTC. **Chưa điền `voiceId`.** |
| `chart/` | Chỗ dành cho bộ vẽ nến. **Chưa xây.** |

## Màu

| Vai | Hex | Lấy từ đâu |
|---|---|---|
| Nền | `#000000` | Avatar-WTC.jpg, 89% khung |
| Vàng nhận diện | `#E8B018` | logo trên avatar |
| Vàng sáng | `#F7D64A` | Gold-WTC-logo.png |
| Vàng tối | `#A8730A` | đáy gradient |
| Cam kêu gọi | `#F8A000` | banner Don't Trade Alone |
| Lưới sàn | `#7A3C00` → `#A05000` | WTC-Video-1 và 2 |
| Nến tăng / giảm | `#26D07C` / `#FF4B4B` | chọn mới, tương phản ≥6:1 trên nền đen |

## Font

Acumin Pro (Adobe), 7 nét đã rút gọn sang woff2, phủ đủ dấu tiếng Việt (kiểm bằng
fontTools: 0/60 ký tự thiếu). JetBrains Mono cho mọi con số.

| Dùng | Family | Nét |
|---|---|---|
| Tuyên bố lớn, in hoa | Acumin Pro Cond | 900 |
| Tiêu đề | Acumin Pro | 900 |
| Chữ đọc, nhãn | Acumin Pro | 400 / 500 / 600 / 700 |
| Số, mã, khung giờ | JetBrains Mono | 400 / 700 |

**Giấy phép:** Acumin Pro là font thương mại của Adobe. File do WTC cung cấp.
Dùng trong sản phẩm giao cho WTC thì theo giấy phép của họ. Không phát hành lại
file font ra ngoài repo này.

## Lắp vào một video

```bash
DIR=$(npm run -s video:new -- "<tựa bài>")
npm run video:brand -- wtc "$DIR"
```

Lệnh thứ hai chép luật, hợp đồng bố cục, lớp phủ, phụ đề, font, logo và giọng vào
đúng chỗ, sinh `brand/fonts.css`, và bỏ font của template không thuộc bộ WTC.

Rồi chép `$DIR/brand/open.html` và `close.html` vào `$DIR/compositions/frames/`
và điền chỗ chừa theo bước 6 của `.claude/skills/create-video/SKILL.md`.

## Ngôn ngữ và giọng

Video WTC là **tiếng Anh**. Hai thứ phải đúng:

1. `STORYBOARD.md` có `lang: en` ở frontmatter. Thiếu nó, `build.ts` tách cụm phụ đề
   bằng từ điển tiếng Việt và cắt sai chỗ.
2. `voice.json` có `voiceId` thật. Nó đè `ELEVENLABS_VOICE_ID` trong `.env.local`
   cho đúng thư mục video này, nên Evose giữ giọng Việt còn WTC dùng giọng Anh,
   không phải đổi `.env` qua lại. Để `REPLACE_ME` thì `video:voice` chặn ngay,
   không gọi API.

## Ba chỗ dễ gãy (đã có chốt chặn)

Cả ba từng là lỗi âm thầm: video vẫn render ra, vẫn có logo, nhưng mang font hoặc
giọng của Evose. Giờ cả ba đều dừng hẳn kèm lời nhắc sửa.

1. **Phải có một file font nét 400.** `build.ts` tìm chuỗi `font-weight: 400; font-style: normal;`
   trong `captions.html` để vá. Chuỗi đó do `captions.mjs` sinh ra từ file font nét 400.
   `video:brand` kiểm trước khi chép, thiếu là chặn.

2. **Lắp brand thì phải lắp đủ.** Có `brand/rules.md` nghĩa là thư mục đã mang nhận diện riêng,
   nên `brand/fonts.css` và `brand/overlay.png` bắt buộc phải có và không được rỗng.
   `video:build` kiểm ngay đầu, thiếu là chặn.

3. **Phải khai `lang:` trong frontmatter STORYBOARD.md.** Thư mục đã lắp brand mà không khai
   là chặn. Khai sai mã ngôn ngữ cũng chặn. Trước đây thiếu thì mặc định tiếng Việt,
   và lời tiếng Anh bị tách cụm bằng từ điển Viet74K, sai mà không ai biết.

Ngoài ra `rules.md` phải bọc khối `@font-face` giữa `<!-- fonts:start -->` và
`<!-- fonts:end -->`. `video:brand` chỉ rút trong vùng đó, nên một khối nêu làm ví dụ
phản diện ở chỗ khác không bị lấy nhầm vào `fonts.css`.

**`semanticColors` chọn màu theo tên khoá.** Trong `brand/frame.md`, khoá `ground`
thành nền và `outline` thành chữ, nên phụ đề ra chữ trắng trên nền đen.
Đổi tên hai khoá đó là phụ đề đảo màu. Khoá `amber` cố ý KHÔNG nằm trong `colors:`
vì nó bão hoà cao hơn vàng và sẽ bị nhận nhầm làm màu nhấn chính.

## Đã kiểm

- Logo dựng từ SVG gốc, cắt sát, ba màu. Nhìn tận mắt, không phải chỉ tính toán.
- Khung mở và khung kết render thật bằng Chrome headless 1080×1920, chụp lại, soi dấu
  tiếng Việt và vùng an toàn. Sàn lưới cam phải sửa hình học ba lần mới đúng.
- Lớp phủ chồng lên khung, không đè nội dung, không trùng thông tin với khung kết.
- `npm run video:brand -- wtc` chạy thật trên thư mục mới: 11 nhóm file vào đúng chỗ,
  `fonts.css` ra 9 khối và mọi đường dẫn font đều trỏ file có thật.
- Ba chốt chặn ở trên thử gãy thật từng cái, cả ba đều dừng kèm lời nhắc sửa.
- Giọng riêng thử hai chiều: `REPLACE_ME` bị chặn trước khi gọi API, ID thật đi tới ElevenLabs.
- 25 test cho `brand.ts`, tổng 141/141 qua. Thử đục 5 lỗ vào code (bỏ kiểm số lượng lớp phủ,
  bỏ kiểm nét 400, bỏ dọn file cũ, ghi trước khi kiểm, rút font cả file) — test bắt được cả năm.

## Chưa có

- **Bộ vẽ nến.** `brand/frame.md` mô tả hợp đồng `candle-chart` và `annotation-layer`,
  phần dựng chưa viết. Khung nào cần chart mà chưa có bộ vẽ thì dùng ảnh chụp thật.
- **Hồ sơ độ dài short.** `create-video` đang cố định 250–300 chữ, 9–12 khung, 80–90 giây.
  Short 30 giây cần hồ sơ riêng.
- **Chế độ không lời đọc.** Xương sống thời gian hiện lấy từ `words.txt` của ElevenLabs.
