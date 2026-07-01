# ⚡ EVOSE QUICKSTART v4.2.1 (FINAL)

## 🆕 FIX TRONG v4.2.1 (bản cuối)
- ✅ **Glitch motion-in**: giữ glitch effect GỐC + thêm entrance fade (opacity-only, không xung đột transform)
- ✅ **Particle/blob nền mượt**: sửa `fitClipToDuration` — LOOP clip thay vì freeze frame cuối → nền chuyển động liên tục, không giật/đứng

## ✅ TỔNG HỢP TẤT CẢ FIX (v3.0 → v4.2.1)
- Header/footer overlay Evose thống nhất + ẩn chrome cũ
- Nền navy đồng nhất, nhạc nền + audio ducking
- Pipeline auto tạo video-evose.mp4 (1 lệnh)
- Safe zone 120/120/280/320, text không tràn
- Dấu thanh tiếng Việt không bị cắt
- Số/stat căn giữa, headline thẳng
- Outro: logo center + FOLLOW→FOLLOWING (cursor ấn nút)
- Mất khoảng trắng đã fix
- Glitch motion-in + particle mượt

---

## 🔴 LỖI BẠN GẶP LẦN TRƯỚC
Bạn mở `video.mp4` → KHÔNG có header/footer/nhạc.
→ **Header/footer/nhạc nằm trong `video-evose.mp4`**, KHÔNG phải `video.mp4`!

Phiên bản này (v4.2.1) đã **TỰ ĐỘNG** tạo `video-evose.mp4` ngay trong pipeline.
Bạn KHÔNG cần chạy finalize riêng nữa.

---

## 🚀 CÀI ĐẶT (chạy 1 lần)

```bash
cd ~/Projects/AI-auto-generate-video

# 1. Rollback bản cũ (nếu có)
[ -d evose-brand-kit ] && ./evose-brand-kit/rollback-evose-brand.sh
rm -rf evose-brand-kit

# 2. Giải nén bản mới
cd ~/Downloads && unzip -o evose-brand-kit-v4.2.1.zip
mv evose-brand-kit ~/Projects/AI-auto-generate-video/
cd ~/Projects/AI-auto-generate-video

# 3. Apply
./evose-brand-kit/apply-evose-brand.sh

# 4. Tải nhạc nền (1 lần)
./evose-brand-kit/music/download-music.sh
```

---

## 🎬 TẠO VIDEO (mỗi lần)

```bash
# Xóa output cũ (chỉ lần đầu sau khi apply)
rm -rf output/

# Trong Claude Code:
/create-template-video <URL_BÀI_BÁO>
```

→ Pipeline TỰ ĐỘNG tạo:
- `output/<slug>/video.mp4`        ← raw (KHÔNG dùng)
- `output/<slug>/video-evose.mp4`  ← ✅ **BẢN CUỐI (header+footer+nhạc)**

```bash
# Mở bản CUỐI:
open output/<slug>/video-evose.mp4
```

---

## 🩹 NẾU CÓ VIDEO CŨ MUỐN THÊM OVERLAY (không render lại)

```bash
./evose-brand-kit/evose-finalize.sh output/<slug-cũ>/
```

→ Tạo `video-evose.mp4` từ `video.mp4` có sẵn (nhanh, ~15s).

**VÍ DỤ với video bạn vừa tạo:**
```bash
./evose-brand-kit/evose-finalize.sh output/khoanh-khac-deepseek-tiep-theo-20260629-2253/
open output/khoanh-khac-deepseek-tiep-theo-20260629-2253/video-evose.mp4
```

→ Bạn sẽ thấy NGAY header + footer + nhạc, không cần render lại!

---

## ❓ KIỂM TRA NHANH

| Thấy gì khi mở video-evose.mp4 | Đúng? |
|---|---|
| Header "Evose.ai · Trợ Lý AI..." ở trên | ✅ |
| Footer 6 icon social + app.evose.ai ở dưới | ✅ |
| Nhạc nền nhẹ phía sau voice | ✅ |
| Nền navy đồng nhất | ✅ |

Nếu vẫn KHÔNG có header → bạn đang mở `video.mp4`, hãy mở `video-evose.mp4`!

---
Made for Mazino @ Evose · v4.2.1
