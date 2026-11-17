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
| `overlays/overlay-frame-ai-engineer.png` | Lớp phủ 1920×1080, chỉ có logo Evose ở x 1711–1856, y 44–80. |
| `overlays/overlay-frame-ai-engineer.html` | Bản gốc của lớp phủ, sửa rồi chụp lại. |
| `logo/` | Logo Evose navy, chép từ `evose-brand-kit/logos`. `video:brand` chép sang `assets/brand/`. |
| `fonts/` | Hanken Grotesk VF và JetBrains Mono, cùng bộ với `brands/mazino/fonts`. |

Không có `voice.json` và `caption-skin.html`. Giọng lấy từ `.env.local`, tức giọng tiếng Việt
đã đo 3,1 chữ mỗi giây. Phụ đề dùng skin mặc định, màu lấy từ `frame.md`.

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
