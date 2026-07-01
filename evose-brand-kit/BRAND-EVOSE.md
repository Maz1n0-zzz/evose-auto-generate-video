# Evose Brand Guide v3 — for AI Auto-Generate Video

Single source of truth cho thương hiệu **Evose** trong repo này (v3 with full rewrite).

---

## 🎨 Color Palette

| Token | Hex | Usage |
|---|---|---|
| Evose Navy (background main) | `#0A1532` | Background tổng mọi scene |
| Evose Deep Navy | `#050D1F` | Background gradient mid/dark |
| White | `#FFFFFF` | Text/logo trên dark, headline |
| Accent Blue | `#3B82F6` | CTA, action, follow button |
| Glow Cyan | `#60A5FA` | Subtitle, soft highlight |
| Lavender | `#A5B4FC` | Aurora glow, soft text accent |
| Warm Orange | `#F59E0B` | Cảnh báo, số quan trọng |
| Warm Red | `#EF4444` | Danger, breaking news |
| Success Green | `#10B981` | Tích cực |

---

## 🖼  Logo Files

| File | Purpose | Used in |
|---|---|---|
| `logos/evose-symbol-white.svg` | Symbol-only WHITE | Header overlay, brand-bar dark bg |
| `logos/evose-symbol-navy.svg` | Symbol-only NAVY | Light bg (hiếm) |
| `logos/evose-horizontal-white.svg` | Symbol + "Evose" wordmark WHITE | Outro center logo |
| `logos/evose-horizontal-navy.svg` | Symbol + wordmark NAVY | Light bg |

---

## 📐 Safe Zone (BẮT BUỘC)

Mọi nội dung phải nằm trong vùng:
- **Left**: 120px từ trái
- **Right**: 960px (= 1080 - 120)
- **Top**: 280px từ trên (chừa cho overlay header)
- **Bottom**: 1600px (= 1920 - 320, chừa cho overlay footer + UI mobile)

→ Vùng content thực: **840×1320px** (rộng 840, cao 1320)

Tất cả templates đã được patch để dùng safe zone này.

---

## 🎯 Header + Footer Overlay (kiến trúc v3)

Repo có **overlay layer thống nhất** đè lên mọi scene:

### Header (top 70-180px)
- Logo Evose (symbol white, 80×80)
- "Evose.ai" (40px, bold)
- "Trợ Lý AI Tự Động Hóa Công Việc" (20px, lavender)
- Layout: centered horizontal

### Footer (bottom 90-140px)
- 6 social icons (white, 32px): Facebook, X, YouTube, TikTok, Instagram, Threads
- "app.evose.ai" text bên phải (26px, white)

**Cách hoạt động:**
1. Templates render scene như bình thường (đã patch hide built-in header/footer)
2. `evose-finalize.sh` dùng FFmpeg overlay PNG lên video
3. Output: `video-evose.mp4` với header/footer đồng nhất mọi scene

---

## 🎤 Outro CTA (BẮT BUỘC)

Scene cuối (outro) PHẢI có voiceText kết thúc bằng:

> **"Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn."**

Đây là rule trong `.claude/skills/create-template-video/SKILL.md`.

---

## 🎬 Outro Template (v3 rewrite hoàn toàn)

Scene outro đã được rewrite từ đầu với:
- ❌ Bỏ: brand-bar top, "EVOSE/AI NEWS/app.evose.ai" box, corners "Theo dõi"/"Hết"
- ✅ Logo Evose horizontal lớn (center, 720×240)
- ✅ FOLLOW button CSS animation (cursor di chuyển → click → text đổi từ "FOLLOW" → "FOLLOWING")
- ✅ Tagline với câu CTA Evose
- ✅ Particle ambient effects

---

## 🎵 Background Music

### Track mặc định
YouTube Audio Library track (Q9=A): https://www.youtube.com/watch?v=4hVVsVjgTkU

### Cài đặt
```bash
./evose-brand-kit/music/download-music.sh
```

### Volume + Ducking
- Volume cơ bản: **28%** (so với voice)
- **Audio ducking** (Q11=YES): nhạc duck xuống khi voice nói, lên lại khi voice nghỉ
- Tham số FFmpeg: `sidechaincompress=threshold=0.04:ratio=10:attack=80:release=400`

### Đổi track khác
```bash
./evose-brand-kit/music/download-music.sh "https://youtube.com/watch?v=XXXX"
```

---

## ✨ Animation System (Phase 2)

Tất cả templates có sẵn 3 base animations:

| Class | Hiệu ứng | Duration | Easing |
|---|---|---|---|
| `evose-fade-up` | Slide up + fade in | 0.7s | cubic-bezier (premium) |
| `evose-fade-in` | Fade in | 0.6s | ease-out |
| `evose-scale-in` | Scale up + fade in | 0.7s | cubic-bezier |

Templates dùng các animation gốc của chúng (theo thiết kế Pentagram/Vignelli/etc).
Pop animations dưới 0.3s đã được giãn ra thành 0.6s+ để mượt hơn.

---

## 🛠 Workflow mới

```
1. /create-template-video <URL>          ← Claude generate script, render từng template
   ↓ output: output/<slug>/video.mp4 (chưa overlay/music)
   ↓
2. ./evose-brand-kit/evose-finalize.sh output/<slug>/
   ↓ FFmpeg: overlay header+footer + mix nhạc nền với ducking
   ↓
3. open output/<slug>/video-evose.mp4     ← FINAL (có overlay + nhạc)
```

---

## ✂️ Đã loại bỏ hoàn toàn

| Element | Status |
|---|---|
| "AI Coding" mọi chỗ | → `Evose` / `EVOSE` |
| `aicodingvn.vercel.app` | → `app.evose.ai` / `evose.ai` |
| Senior AI Engineer | → `Evose` |
| Filler text (ISC 2026, Hamburg, VFX/GLITCH...) | → cấm trong SKILL.md |
| 9:16 chip, Bản tin chip | → removed |
| Built-in header/footer mọi template | → hidden (replaced by overlay) |
| Outro old design | → full rewrite |

---

## 🔄 Rollback

```bash
./evose-brand-kit/rollback-evose-brand.sh
```

---

Made for **Mazino @ Evose** · v3 · 2026-06-29
