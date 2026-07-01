# Evose Brand Kit v4.2.1 (Pro - Auto Pipeline)

Bộ công cụ áp dụng **4 phase** branding lên repo `AI-auto-generate-video`:

| Phase | Nội dung |
|---|---|
| **1** | Header+Footer overlay thống nhất + Safe zone + Màu nền brand |
| **2** | Hiệu ứng text mượt + per-template fixes (chữ cắt, lệch) |
| **3** | Outro mới: logo Evose center + FOLLOW button CSS animation |
| **4** | Background music + audio ducking |

## 📦 Nội dung

```
evose-brand-kit/
├── README.md                              ← File này
├── BRAND-EVOSE.md                         ← Brand guide
├── apply-evose-brand.sh        ⭐         ← Master script
├── rollback-evose-brand.sh                ← Khôi phục
├── evose-finalize.sh           ⭐         ← FFmpeg overlay + music
├── logos/
│   ├── evose-symbol-white.svg
│   ├── evose-symbol-navy.svg
│   ├── evose-horizontal-white.svg
│   ├── evose-horizontal-navy.svg
│   ├── evose-symbol-navy.png
│   └── evose-horizontal-original.png
├── overlays/
│   ├── overlay-frame.html                 ← Header+Footer HTML
│   └── generate-overlay-png.sh            ← Render → PNG
├── music/
│   ├── download-music.sh                  ← Auto-download nhạc nền
│   └── README.md
└── patches/
    └── patch-templates.py                 ← Python patcher
```

## 🚀 Quick Start (4 lệnh)

### Lệnh 1: Setup brand kit

```bash
cd ~/Projects/AI-auto-generate-video

# Rollback brand kit cũ (nếu đã apply v1/v2)
[[ -d evose-brand-kit ]] && ./evose-brand-kit/rollback-evose-brand.sh
rm -rf evose-brand-kit

# Giải nén kit mới
unzip ~/Downloads/evose-brand-kit-v3.zip
mv evose-brand-kit-v3 evose-brand-kit
```

### Lệnh 2: Apply brand

```bash
./evose-brand-kit/apply-evose-brand.sh
```

Script sẽ:
- Backup files gốc (`.evose-backup-*`)
- Replace logos (3 vị trí)
- Patch 11 templates × 2 files (portrait + landscape)
- Patch SKILL.md (Claude instructions + brand block + outro CTA rule)
- Patch CATALOG.md, template-composer.ts, README files, meta.json
- Rewrite outro template (FOLLOW button animation)
- Generate overlay PNG (Chrome headless)
- Tạo `BRAND-EVOSE.md` ở root

### Lệnh 3: Tải nhạc nền (1 lần duy nhất)

```bash
./evose-brand-kit/music/download-music.sh
```

→ Sẽ cài `yt-dlp` (nếu chưa có) + tải track YouTube Audio Library bạn đã chọn.

### Lệnh 4: Tạo video!

```bash
# Xóa output cũ (có brand AI Coding)
rm -rf output/

# Mở Claude Code, gõ:
/create-template-video <URL_BÀI_BÁO>

# Sau khi pipeline xong, finalize (overlay + music):
./evose-brand-kit/evose-finalize.sh output/<slug>/

# Mở video cuối:
open output/<slug>/video-evose.mp4
```

## 🔄 Rollback

```bash
./evose-brand-kit/rollback-evose-brand.sh
```

## 🛠 Customize

### Đổi text/URL/màu
Sửa dict `EVOSE` ở đầu `patches/patch-templates.py`, sau đó:
```bash
./evose-brand-kit/apply-evose-brand.sh
```

### Đổi nhạc nền
```bash
./evose-brand-kit/music/download-music.sh "https://youtube.com/watch?v=XXXX"
```

### Đổi header/footer overlay
1. Sửa `overlays/overlay-frame.html`
2. Xóa `overlays/overlay-frame.png`
3. Chạy lại: `./overlays/generate-overlay-png.sh`

## 🎯 Tính năng v3

- ✅ **Triệt để**: 11 templates × 2 files + SKILL.md + CATALOG + composer + README
- ✅ **Overlay layer**: Header+footer thống nhất xuyên suốt mọi scene
- ✅ **Safe zone**: 120/120/280/320 padding cho TikTok/Reels/Shorts
- ✅ **Audio ducking**: Nhạc duck khi voice nói, lên khi nghỉ (như radio chuyên nghiệp)
- ✅ **Outro mới**: FOLLOW button CSS animation (cursor click → text đổi FOLLOWING)
- ✅ **Per-template fixes**: Chữ cắt, lệch hàng đã được patch
- ✅ **Idempotent + Rollback**: An toàn chạy nhiều lần

---

Made for **Mazino @ Evose** · v3 · 2026-06-29
