# AI Engineer: bộ nhận diện bài giảng dài

Hồ sơ cho series YouTube "Trở thành AI Engineer từ con số không". Video **NGANG 1920×1080**,
tiếng Việt, nhìn theo Evose: giấy sáng, lưới chấm, một màu nhấn mỗi cảnh.
Dựng ngày 17/11/2026. Lộ trình series ở `docs/series-ai-engineer/LO-TRINH-SERIES.md`.

## Khác bộ Evose mặc định ở đâu

| | Evose mặc định | AI Engineer |
|---|---|---|
| Khổ | dọc 1080×1920 | ngang 1920×1080 |
| Độ dài một lượt | 80 tới 90 giây | một chương 2 tới 3 phút |
| Lời đọc | cho người lướt TikTok, ít thuật ngữ | bài giảng, được dùng thuật ngữ nhưng phải giải thích lần đầu |
| Câu kêu gọi evose.ai | khung cuối mọi video | chỉ khung cuối của chương cuối mỗi tập |
| Logo | header và footer của lớp phủ dọc | một logo nhỏ góc trên phải |
| Code trên khung | không có | được chiếu, chép từ nguồn thật |

Bộ `mazino` cũng là khổ ngang nhưng nền tối và tiếng Anh. Bộ này lấy cấu trúc của nó,
đổi sang bảng màu và giọng Evose.

## Có gì trong này

| Đường dẫn | Việc |
|---|---|
| `brand/rules.md` | Luật cứng cho mọi khung và luật lời đọc bài giảng. `video:packets` nhét vào `_dispatch.md`. |
| `brand/frame.md` | Hợp đồng bố cục và token màu. Worker đọc qua `<dir>/frame.md`, phụ đề lấy màu từ đây. |
| `brand/open.html` | Khung mở chương. Chỗ chừa xem bên dưới. |
| `brand/close.html` | Khung kết tập, chỉ thay `__ID__` và `__DURATION__`. |
| `brand/code.html` | Khung chiếu code chạy từng dòng. Chép thẳng từ đây, xem mục bên dưới. |
| `overlays/overlay-frame-ai-engineer.png` | Lớp phủ 1920×1080, chỉ có logo Evose ở x 1711–1856, y 44–80. |
| `overlays/overlay-frame-ai-engineer.html` | Bản gốc của lớp phủ, sửa rồi chụp lại. |
| `logo/` | Logo Evose navy, chép từ `evose-brand-kit/logos`. `video:brand` chép sang `assets/brand/`. |
| `fonts/` | Hanken Grotesk VF và JetBrains Mono, cùng bộ với `brands/mazino/fonts`. |

Không có `voice.json` và `caption-skin.html`. Giọng lấy từ `.env.local`, tức giọng tiếng Việt
mặc định. Phụ đề dùng skin mặc định, màu lấy từ `frame.md`.

Tốc độ đọc đo trên chương thử ngày 17/11/2026:

| Số chữ | Thời lượng | Tốc độ |
|---|---|---|
| 494 chữ | 132 giây | 3,7 chữ mỗi giây |

Một chương 2:30 tới 3:00 vì vậy cần khoảng 560 tới 670 chữ lời đọc, chia 11 tới 14 khung. Số cũ 3,1 chữ mỗi giây
làm chương thử ngắn hơn dự kiến.

## Lắp vào một chương

```bash
DIR=$(npm run -s video:new -- "Tap 06 chuong 3 tu xay agent loop")
npm run video:brand -- ai-engineer "$DIR"
```

Rồi trong `STORYBOARD.md` đặt frontmatter `format: 1920x1080` và `lang: vi`.
Thiếu `format` thì `assemble-index.mjs` dựng khung dọc. Thiếu `lang` thì `video:build`
dừng, vì thư mục đã lắp brand bắt buộc khai ngôn ngữ.

Chương không có nhạc riêng. Đừng chạy `video:music` cho chương. Nhạc nền đặt một lần cho cả tập
lúc nối bằng `video:join`.

## Khung mở: chỗ chừa

Chép `brand/open.html` vào `compositions/frames/01-<tên>.html` rồi thay:

| Chỗ chừa | Giá trị | Giới hạn |
|---|---|---|
| `__ID__` | id khung, trùng tên file, vd `01-mo` | |
| `__DURATION__` | duration của Frame 1, giây | |
| `__EPISODE__` | nhãn tập, vd `TẬP 06` | khoảng 10 ký tự |
| `__CHAPTER__` | nhãn chương, vd `CHƯƠNG 3 / 6` | khoảng 14 ký tự |
| `__HEADLINE__` | tên chương | khoảng 40 ký tự, 2 dòng ở 96px |
| `__SUB__` | một câu tóm ý chương | khoảng 90 ký tự, 2 dòng ở 38px |

Tên series in sẵn ở cột phải. Khung mở có con trỏ nhấp nháy và ba vạch nhún nhẹ mỗi 2 giây,
đều đặt bằng `tl.set` hoặc tween hữu hạn nên tua tới giây nào cũng ra cùng một hình.

## Khung kết

Chép `brand/close.html` vào `compositions/frames/NN-ket.html`, thay `__ID__` và `__DURATION__`.
Chỉ dùng ở chương cuối của tập, cùng khung có câu "Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."
Chương giữa tập kết bằng một khung nội dung có câu bắc cầu sang chương sau.

## Khung chiếu code

Khung 1920×1080 chiếu tối đa 14 dòng code. Từng dòng hiện ra theo kiểu gõ phím, dòng đang nói
tới có nền xanh nhạt và vạch trái màu nhấn, các dòng khác mờ còn 35%. Claude tự điền, không giao
worker. `video:brand` không chép file này, nên chép thẳng từ `brands/ai-engineer/brand/code.html`.

```bash
cp brands/ai-engineer/brand/code.html "$DIR/compositions/frames/05-code.html"
```

| Chỗ chừa | Giá trị |
|---|---|
| `__ID__` | id khung, trùng tên file, vd `05-code` |
| `__DURATION__` | duration của khung, giây |
| `__FILE__` | nhãn trên thanh tiêu đề, vd `agent_loop.py · run_agent` |
| `__NUM_A__` tới `__NUM_N__` | số dòng THẬT trong file nguồn của dòng code đó, vd `38` |
| `__LINE_A__` tới `__LINE_N__` | dòng code thứ 1 tới 14, đã escape |
| `__AT_A__` tới `__AT_N__` | giây bắt đầu gõ dòng đó, lấy từ `words.txt` |
| `__FOCUS__` | lịch tô sáng, các cặp `[số dòng, giây]` cách nhau dấu phẩy |

Ví dụ lịch tô sáng: `[2,4.4],[5,7.2],[0,12]`. Từ giây 4,4 dòng 2 sáng, từ giây 7,2 dòng 5 sáng,
từ giây 12 bỏ tô và mọi dòng sáng đều. Một mục kéo dài tới mục kế tiếp. Dòng chưa gõ tới thì
lịch tô sáng không đụng vào nó.

**Số dòng phải khớp file nguồn.** Người học mở file ra dò theo số trên khung, nên đừng đánh lại
từ 1. Đoạn code có quãng bỏ qua thì cứ điền số thật, vd `38`, `39`, rồi `44`. Khung tự vẽ dấu ngắt
khi số nhảy cóc: dòng `44` lùi xuống 26px, phía trên có dấu ba chấm mờ ở cột số cùng một vạch đứt.
Không cần thêm thẻ nào, cũng không có chỗ chừa riêng cho dấu ngắt. Dấu ngắt hiện cùng lúc với dòng
phía dưới nó.

Mỗi dấu ngắt tốn thêm 26px. Đủ 14 dòng thì chỉ chứa được một dấu ngắt. Từ 13 dòng trở xuống thì
chứa được hai. Nhiều quãng hơn thì tách thành hai khung code.

**Dòng đầu luôn bắt đầu gõ trước giây 0,3**, kể cả khi `__AT_A__` muộn hơn. Lời đọc thường chạm tới
code sau một nhịp, để thẻ trắng tới lúc đó thì nhìn như khung hỏng. Các dòng sau giữ đúng mốc đã điền.

Chỗ chừa dùng chữ cái A tới N chứ không dùng số. `video:build` bắt chỗ chưa điền bằng mẫu
`__[A-Z_]+__`, mẫu đó không khớp chữ số.

**Ít hơn 14 dòng thì xoá trọn hàng** `<div class="cf-row" ...>...</div>` của các dòng thừa. Đừng
để trống chỗ chừa, `video:build` sẽ dừng vì còn chỗ chưa điền.

**Escape trước khi dán code vào.** Code nằm trong HTML, nên thay theo đúng thứ tự:

1. `&` thành `&amp;` (làm trước, nếu không bước sau bị escape hai lần)
2. `<` thành `&lt;`
3. `>` thành `&gt;`

Dấu nháy không cần escape vì code nằm trong thẻ, không nằm trong thuộc tính. Trong Python:
`html.escape(dong, quote=False)`. Thụt đầu dòng giữ nguyên bằng dấu cách, khung dùng
`white-space: pre`. Đổi tab thành dấu cách trước khi dán.

Code có tên viết hoa kẹp giữa hai cặp gạch dưới, như `__ALL__`, sẽ bị `video:build` tưởng là
chỗ chưa điền. Thay một dấu gạch dưới bằng `&#95;` để chữ hiện ra vẫn đúng.

**Giới hạn đo bằng ảnh chụp ngày 17/11/2026.** Chữ 28px, mỗi ký tự rộng 16,8px, nên một dòng chứa
khoảng 85 ký tự. Dòng dài hơn thì bị cắt ở mép thẻ, hãy xuống dòng như trong nguồn hoặc chọn
đoạn code khác. Đủ 14 dòng ở mức camera phóng 3% thì thẻ nằm trong y 133 tới 843, dưới logo và
trên dải phụ đề.

**Ligature đã tắt.** JetBrains Mono mặc định vẽ `>=` thành một ký hiệu duy nhất. Người học gõ lại
theo hình sẽ gõ sai, nên khung tắt `liga` và `calt`. Đã thấy lỗi này trên ảnh chụp đầu tiên.

**Chuyển động.** Lưới trôi chéo và camera đẩy 3% suốt khung, nên khung không bao giờ đứng yên dù
lời đọc dừng lâu ở một dòng. Mọi selector GSAP gắn với `[data-composition-id="__ID__"]`, hai khung
code trong cùng một video không kéo nhau chạy theo.

## Vùng an toàn, đo bằng máy

| Vùng | Toạ độ | Nguồn |
|---|---|---|
| Dải phụ đề | y 900–1080 | `captionBandFor(1080)` trong `src/video/lib.ts` |
| Logo lớp phủ | x 1711–1856, y 44–80 | bbox kênh alpha của PNG, đo bằng Pillow ngày 17/11/2026 |
| Nội dung | y 120–860, x 130–1790 | camera phóng 3% đẩy 860 xuống 869,6 và kéo 120 lên 107,4 |

## Dựng lại lớp phủ

```bash
cd brands/ai-engineer
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --default-background-color=00000000 --window-size=1920,1080 \
  --screenshot="$PWD/overlays/overlay-frame-ai-engineer.png" \
  "file://$PWD/overlays/overlay-frame-ai-engineer.html"
```

Chrome ẩn có lúc không tự thoát. Chạy xong thì kiểm tiến trình và tắt bản còn sót.

## Chưa kiểm

- Phụ đề trên nền sáng khổ ngang chưa render thật lần nào, vì cần giọng ElevenLabs.
  Lần dựng chương đầu tiên phải nhìn dải y 900–1080 trước khi làm tiếp.
- Mốc hình đứng yên 17% của `stillness.ts` chỉ hiệu chuẩn cho khổ dọc. Số đo khổ ngang
  chỉ để tham khảo.
