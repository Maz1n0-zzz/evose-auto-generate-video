# Chart nến WTC

Bộ vẽ chart cho video WTC. Nến lấy từ dữ liệu thật, không vẽ tay.

## Vì sao có thư mục này

Tám khung của video thử đầu tiên đều do worker tự đặt từng cây nến bằng toạ độ gõ tay.
Chart ra nhìn như vẽ đại, và luật trong `brand/rules.md` nói "chart phải vẽ từ dữ liệu thật"
bị vi phạm suốt mà ba lượt chấm không ai bắt. Thư mục này đóng đường đó lại: worker không
còn cách nào đặt nến bằng tay nữa, nó chỉ đọc file toạ độ do bộ vẽ sinh ra.

## Các file

| File | Việc |
|---|---|
| `data/btcusdt-1d.json` | Nến thật, ghim vào repo để dựng lại video cũ ra đúng ảnh cũ |
| `theme.json` | Màu kiểu TradingView dark hoà với bảng màu WTC |
| `example-scene.json` | File cảnh mẫu, ba khung: vùng cầu rộng, vùng cầu zoom, vùng cung |

Phần TypeScript nằm ở `src/video/chart/` vì `tsconfig.json` chỉ nhận `src/**`.
Thư mục này chỉ chứa dữ liệu, giống `rules.md`, font và overlay.

## Dùng

```bash
# Làm mới dữ liệu khi cần. Không chạy lúc dựng video.
npm run video:chart:fetch -- BTCUSDT 1d 1000 brands/wtc/chart/data/btcusdt-1d.json

# Sinh chart cho một video
npm run video:chart -- output/<thư-mục-video> brands/wtc/chart/<file-cảnh>.json
```

Mỗi khung trong file cảnh ra hai file ở `<thư mục video>/assets/chart/`:

1. `<id>.svg` — nhúng thẳng vào khung HTML.
2. `<id>.coords.json` — toạ độ từng cây nến, từng ô vùng, từng mốc. Worker gắn hiệu ứng
   GSAP vào đây. Mỗi cây nến là một nhóm `id="cdl-000"` nên bám được bằng selector.

## Luật của file cảnh

**Khai bằng ngày, không khai bằng chỉ số.** Chỉ số đổi mỗi lần tải lại dữ liệu.

**Không bao giờ gõ giá.** Biên ô vùng suy ra từ chính các nến nền qua `baseFrom` và `baseTo`.
Mức giá suy ra từ nến của ngày đó qua `date` cộng `at`. Gõ giá tay là cách cũ, và đó là
thứ làm chart trước đây nhìn như vẽ đại.

```json
{
  "id": "demand-wide",
  "fromDate": "2025-06-20",
  "toDate": "2025-09-19",
  "zones": [
    { "baseFrom": "2025-07-04", "baseTo": "2025-07-08", "to": "end",
      "kind": "demand", "label": "DEMAND ZONE" }
  ],
  "markers": [{ "date": "2025-08-25", "at": "low", "label": "FIRST RETURN" }],
  "levels": [{ "date": "2025-09-19", "at": "close", "tag": true, "color": "#E8B018" }]
}
```

Zoom bằng `priceLoDate` và `priceHiDate`, cũng là ngày. Hai trường này phải khai cùng nhau.

## Hai mẫu thật đã quét được trong BTC ngày

Máy quét chứ không phải chọn cho đẹp. Tiêu chí: nền chặt dưới 1,6 lần ATR, cú đi một chiều
ít nhất 3 lần biên độ nền, có lần quay lại không xuyên thủng, và có cú bật sau đó.

| Vế | Nền | Giá nền | Diễn biến |
|---|---|---|---|
| Cầu | 04–08/07/2025 | 107.245 – 109.768 | Bứt phá 3 nến lên 118.870, quay lại 25/08/2025, bật hơn 8.600 |
| Cung | 28–31/05/2026 | 72.512 – 74.591 | Rơi 5 nến xuống 59.131, quay lại 20/08/2026, rơi tiếp gần 4.500 |

## Con số trên màn hình

Trục giá hiện số thật, nên nguồn phải nói ra được. `npm run video:chart` in ra dòng nguồn
và ngày tải sau mỗi lần chạy. Luật WTC cấm số KHÔNG có nguồn, không cấm mọi số.

Nhãn mã luôn kèm năm của khung nhìn. Dữ liệu này cũ hơn một năm, thiếu năm là người xem
tưởng giá hôm nay.

## Chỗ dễ sai

**Khoảng hở phải đo từ MÉP, không từ TÂM.** Nhãn mốc từng bị chính vòng tròn của nó đè lên
chữ, vì `MARKER_GAP` đo từ tâm vòng tròn. Trừ bán kính 11, nửa nét 2 và phần thò của tấm nền
10 thì chỉ còn hở 1px. Giờ `MARKER_GAP` được tính ra từ `MARKER_OUTER + PLATE_PAD_X +
MARKER_CLEAR`, và `plate()` dùng chung `PLATE_PAD_X`, nên hai chỗ không lệch nhau được nữa.
Test đo mép tấm nền so với mép ngoài vòng tròn, không đo từ tâm.

Luật rút ra: thêm bất cứ hình nào có nét vẽ hay tấm nền thì hằng số khoảng cách phải suy ra
từ hình học của nó, đừng gõ một con số rồi tin là đủ.

**Sinh lại SVG thì khung đã nhúng không tự cập nhật.** Worker paste nội dung SVG thẳng vào
file khung. Chạy lại `npm run video:chart` chỉ đổi file trong `assets/chart/`, bản nhúng
trong `compositions/frames/*.html` vẫn là bản cũ. Phải vá lại từng khung, và đừng ghi đè cả
khối vì worker có thêm class và thẻ bọc riêng.


Bộ vẽ ước lượng bề ngang chữ để né nhãn chồng nhau. Acumin Pro lấy 0,56em, JetBrains Mono
lấy 0,6em. Đổi cỡ chữ hay đổi font mà quên sửa hai hằng số này thì nhãn lại dính vào nhau,
và test sẽ không bắt được vì nó dùng chính hai hằng số đó để tính. Phải nhìn ảnh.
