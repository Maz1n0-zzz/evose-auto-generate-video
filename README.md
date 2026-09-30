# Evose — Video tin tức AI tự động

Đưa một link bài báo, nhận về video dọc 9:16 (1080×1920) có giọng đọc tiếng Việt,
phụ đề, nhạc nền, hiệu ứng âm thanh và khung thương hiệu Evose.

Từ 30/09/2026 đây là **quy trình duy nhất**. Pipeline template cũ (`npm run pipeline`,
`/create-template-video`, bộ `templates/evose-*`) đã xoá.

Video mẫu đã duyệt: [`docs/vi-du-video/ai-my-canh-tranh-gia/`](docs/vi-du-video/ai-my-canh-tranh-gia/).

---

## Cài đặt (làm một lần)

Cần Node 20 trở lên, ffmpeg và Claude Code.

```bash
git clone <repo evose-auto-generate-video>
cd AI-auto-generate-video
npm install
npx hyperframes skills update faceless-explainer
cp .env.example .env.local
```

Mở `.env.local`, điền bốn dòng. Hỏi Mazino để lấy key và voice id.

```
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_MODEL_ID=eleven_v3
```

Kiểm máy đã đủ đồ:

```bash
node -v && ffmpeg -version | head -1 && npm test
```

---

## Làm một video

Mở Claude Code trong thư mục dự án, gõ:

```
/create-video https://link-bai-bao
```

Hoặc đưa file chữ thay cho link: `/create-video bai-viet.txt`.

Claude tự làm hết, mất khoảng 20–40 phút:

1. Đọc bài, viết lời đọc (`SCRIPT.md`).
2. ElevenLabs đọc cả bài một lần, lấy mốc thời gian từng chữ.
3. Chia khung hình bám theo lời (`STORYBOARD.md`), chọn nhạc và hiệu ứng âm thanh.
4. Dựng từng khung song song, tự chụp ảnh kiểm.
5. Ghép, render, phủ logo Evose, đo tỉ lệ hình đứng yên.
6. Một agent khác chấm độc lập, sửa tối đa hai vòng.

File giao nằm ở:

```
output/<tên-bài>-<ngày>/renders/final.mp4
```

Cùng thư mục có `contact-sheet.jpg` để xem nhanh toàn bộ video trong một ảnh.

---

## Các lệnh máy làm

Skill tự gọi các lệnh này. Chỉ cần gõ tay khi muốn chạy lại một bước.

| Lệnh | Việc |
|---|---|
| `npm run video:new -- "<tựa>"` | Tạo thư mục `output/<slug>-<ngày>/` từ `template/` |
| `npm run video:voice -- <dir>` | Đọc `SCRIPT.md` bằng ElevenLabs, ghi mốc từng chữ |
| `npm run video:music -- <dir>` | Nhạc nền ElevenLabs Music theo dòng `music:` của storyboard |
| `npm run video:sfx -- <dir>` | Hiệu ứng âm thanh `tên@giây` lấy từ `assets/sfx/` |
| `npm run video:packets -- <dir>` | Chia gói việc cho các worker dựng khung |
| `npm run video:build -- <dir>` | Phụ đề tách theo tiếng Việt, ghép, chuyển cảnh, render, phủ logo, đo hình đứng yên |

Thêm `--no-render` vào `video:build` để chỉ ghép và kiểm, không render.

### Chạy lại một phần

- **Sửa hình một khung.** Sửa `compositions/frames/NN.html` rồi chạy lại `video:build`.
- **Sửa lời.** Xoá `assets/voice/` rồi chạy lại từ `video:voice`. Cả bài đọc một lần để giữ
  ngữ điệu liền mạch, nên không đọc bù riêng một câu.
- **Đổi nhạc.** Xoá `assets/bgm/` rồi chạy `video:music`.

---

## Luật viết lời đọc

- Viết số ra chữ: "tám phẩy bốn phần trăm", không viết "8,4%". Chữ trên hình thì giữ "8,4%".
- Thẻ cảm xúc `[curious]` `[excited]` `[serious]` `[warm]`: tối đa một thẻ mỗi khung.
  Máy tự đọc lại nếu lỡ đọc to thẻ.
- Không bịa số ngoài bài gốc.
- Câu kết cố định: "Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."

Luật đầy đủ nằm trong [`.claude/skills/create-video/SKILL.md`](.claude/skills/create-video/SKILL.md).

---

## Nhận diện thương hiệu

`evose-brand-kit/` chứa logo, mascot và lớp overlay. `video:build` tự phủ
`overlays/overlay-frame-light.png` lên mọi khung: logo Evose ở đỉnh, icon mạng xã hội ở chân.

Vùng an toàn cho nội dung:

| Vùng | Toạ độ y |
|---|---|
| Header logo | 0–270 |
| Nội dung chính | 290–1520 |
| Phụ đề | 1530–1680 |
| Footer mạng xã hội | 1690–1920 |

Khung mở và khung kết dùng mẫu cố định trong `template/brand/`.

---

## Kiểm tra

```bash
npm test
npm run typecheck
```

---

## Ghi chú

- Chi phí mỗi video: một lượt giọng ElevenLabs (khoảng 2.000–3.000 ký tự) và một bản nhạc.
- `remotion/` chứa chart động dùng riêng, không nằm trong quy trình video tin tức.
- Pipeline cũ lấy lại ở lịch sử git nếu cần. Backup cục bộ nằm trong `output/_backup-*`.

<div align="center"><sub>MIT · <a href="https://evose.ai/">evose.ai</a></sub></div>
