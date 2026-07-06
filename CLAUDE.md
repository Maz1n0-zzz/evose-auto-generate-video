# CLAUDE.md — AI Auto Generate Video

## Project overview

Pipeline tự động sinh video dọc 9:16 (1080×1920) cho Evose. Hai layer độc lập:

| Layer | Công cụ | Mục đích |
|-------|---------|---------|
| Static diagrams | drawio-skill (`~/.claude/skills/drawio-skill/`) | Sơ đồ kiến trúc, luồng dữ liệu — xuất PNG/SVG |
| Animated charts | Remotion + React (`remotion/`) | Chart động frame-by-frame trong video |

**Nguyên tắc tách biệt:** drawio (static) và Remotion (motion) là 2 lớp RIÊNG BIỆT — không trộn lẫn.

---

## 🎨 Evose brand (bắt buộc)

```
Background : #ffffff
Ink (text)  : #0a0a0a
Accent/scene: 1 màu duy nhất mỗi scene (mặc định #2563eb)
Font labels : Hanken Grotesk
Font numbers: JetBrains Mono
```

---

## 📊 Chart Selection Rules (Remotion / `remotion/src/charts/`)

### Khi nào dùng chart nào

| Component | Dùng khi | Ví dụ |
|-----------|---------|-------|
| `BarChartMotion` | So sánh 2–6 mục có số liệu rời rạc | Hiệu suất A vs B vs C |
| `LineChartMotion` | Xu hướng theo thời gian (3+ điểm) | Tăng trưởng tháng 1–6 |
| `DonutMotion` | 1 tỉ lệ % nổi bật duy nhất | Tỉ lệ hoàn thành 90% |
| `NumberCounter` | 1 con số hero đếm lên | Đạt 95% tự động hoá |

### Khi KHÔNG dùng Remotion chart

- Scene chỉ có text/quote → dùng HyperFrames template (`frame-build-minimal`, `frame-bold-poster`, ...)
- Chart muốn nhúng vào pipeline HyperFrames → dùng `frame-chart-bars` / `frame-chart-donut` / `frame-chart-line` trong templates/
- Diagram kiến trúc/luồng → dùng drawio-skill

### Props bắt buộc

```tsx
// BarChartMotion
data: Array<{ name: string; value: number; unit?: string }>
duration?: number  // frames (default: fps * 2)
accent?: string    // hex color (default: "#2563eb")

// LineChartMotion
data: Array<{ label: string; value: number }>
duration?: number
accent?: string
width?: number     // default: 840
height?: number    // default: 400

// DonutMotion
percent: number    // 0–100
label?: string
duration?: number
accent?: string
size?: number      // default: 360

// NumberCounter
target: number
suffix?: string    // default: "%"
prefix?: string
duration?: number
color?: string
```

### Quy tắc animation

- Bars: spring animation có stagger 4 frame/bar (tránh tất cả mọc cùng lúc)
- Line: stroke-dashoffset draw-on (start full offset → 0)
- Donut: spring sweep + số đếm fade-in sau 60% duration
- Counter: ease-out cubic (1 - (1-t)³) — cảm giác tự nhiên

---

## 🎬 HyperFrames pipeline (production)

Entry: `npm run pipeline -- <outputDir>/script.json`

- Templates: `templates/` — animated HTML/CSS/JS, Chromium render
- Catalog: `templates/CATALOG.md` (đọc trước khi pick template)
- TTS: OmniVoice (local, không cần API key)
- Output: `output/<slug>/video.mp4`

## ✏️ Static diagrams (drawio-skill)

```bash
# Test syntax sau khi install drawio-skill:
drawio --version   # cần >= 30.x
dot -V             # graphviz (optional)
```

Export flow (theo SKILL.md):
1. Viết Mermaid → `.mmd` file
2. Convert: `drawio -x -f xml -o <name>.drawio <name>.mmd`
3. Preview: `drawio -x -f png -o preview.png <name>.drawio` (KHÔNG dùng `-e` khi preview)
4. Final export: `drawio -x -f png -e <name>.png <name>.drawio` rồi **repair_png.py**
5. SVG: `drawio -x -f svg -e <name>.svg <name>.drawio`

---

## 🔒 Git remotes

- **evose** → `Maz1n0-zzz/evose-auto-generate-video` ← luôn dùng cái này
- **origin** → `huytranvan2010/*` ← KHÔNG có quyền truy cập

Luôn push: `git push evose main`

---

## ⚠️ Không làm

- Không nhét UI component của Remotion vào HyperFrames pipeline
- Không commit secrets/API key
- Không dùng `git push origin` (không có quyền)
- Không dùng template HyperFrames cho Remotion compositions
