---
# Evose Brand Design System (DESIGN.md format — google-labs-code/design.md)
colors:
  primary:
    navy: { value: "#0A1532", description: "Nền chính mọi scene" }
    deepNavy: { value: "#050D1F", description: "Gradient tối" }
  accent:
    blue: { value: "#3B82F6", description: "CTA, follow button, nhấn mạnh" }
    cyan: { value: "#60A5FA", description: "Highlight, số liệu" }
    lavender: { value: "#A5B4FC", description: "Subtitle, glow nhẹ" }
  semantic:
    success: { value: "#10B981" }
    warning: { value: "#F59E0B" }
    danger: { value: "#EF4444" }
  text:
    onDark: { value: "#EAF2FF", description: "Text chính trên nền tối" }
typography:
  heading: { family: "Inter Tight / Be Vietnam Pro", weight: "800-900" }
  body: { family: "Inter", weight: "400-600" }
  rules:
    - "VIETNAMESE DIACRITICS: KHÔNG dùng -webkit-background-clip:text cho chữ HOA có dấu (Ô Ê Ệ Ỗ Ả) — clip cắt dấu. Dùng màu solid hoặc -webkit-text-fill-color."
    - "line-height tối thiểu 1.3 cho heading tiếng Việt"
    - "letter-spacing không âm quá -2px (tránh dính chữ/mất space)"
spacing:
  safeZone: { left: 120, right: 120, top: 280, bottom: 320, contentArea: "840x1320" }
layout:
  aspect: "9:16 (1080x1920)"
  overlay: "Header Evose.ai + Footer 6 social icons + app.evose.ai (thống nhất mọi scene)"
---

# Evose Visual Identity

UI evoke: **hiện đại, công nghệ, đáng tin cậy** — nền navy sâu, accent xanh điện, glow nhẹ.

## Nguyên tắc cốt lõi
1. **Nền navy `#0A1532`** đồng nhất mọi scene (brand consistency)
2. **Safe zone bắt buộc**: nội dung trong vùng 840×1320, chừa header/footer overlay
3. **Tiếng Việt**: luôn test dấu thanh — KHÔNG clip-text cho chữ hoa có dấu
4. **Outro**: logo center + FOLLOW→FOLLOWING + CTA "Truy cập evose.ai..."
5. **Animation**: entrance fade-up mượt (0.7s cubic-bezier), particle nền chạy liên tục (loop, không freeze)

## Lỗi đã biết & cách tránh (cho template mới)
- ❌ `-webkit-background-clip: text` + chữ hoa tiếng Việt → cắt dấu → dùng màu solid
- ❌ `line-height < 1.0` cho heading → cắt dấu trên
- ❌ Nối chuỗi title+accent không space → "BịThiệt" → luôn thêm " "
- ❌ `tpad=clone` freeze frame → particle đứng → dùng loop
