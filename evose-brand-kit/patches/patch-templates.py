#!/usr/bin/env python3
"""
patch-templates.py — Evose Brand Patch v3 (Pro)
================================================
Phase 1: Header+Footer thống nhất (overlay layer) + safe zone + nền brand
Phase 2: Hiệu ứng text mượt + per-template fixes
Phase 3: Outro mới với FOLLOW button animation
Phase 4: Nhạc nền + audio ducking

Usage: python3 patch-templates.py /path/to/AI-auto-generate-video
"""

import sys
import re
import json
from pathlib import Path

# ============================================================
# EVOSE BRAND CONFIG
# ============================================================
EVOSE = {
    "name": "Evose",
    "name_upper": "EVOSE",
    "tagline": "AI NEWS",
    "url_display": "evose.ai",
    "url_full": "https://evose.ai/",
    "app_url": "app.evose.ai",
    "outro_cta": "Truy cập evose.ai để tạo ra trợ lý AI của riêng bạn.",
    # Colors (Q1=B navy, Q2=B allow multi-color)
    "navy": "#0A1532",            # Primary navy (logo color)
    "deep_navy": "#0A1532",       # Background tổng (per user Q1=B)
    "bg_main": "#0A1532",         # Sẽ thay nền hầu hết templates
    "bg_deeper": "#050D1F",       # Pure deeper for gradients
    "white": "#FFFFFF",
    "accent_blue": "#3B82F6",
    "glow_cyan": "#60A5FA",
    "lavender": "#A5B4FC",
    "warm_orange": "#F59E0B",     # cho cảnh báo / số quan trọng
    "warm_red": "#EF4444",        # cho danger
    "success_green": "#10B981",   # cho tích cực
}

# Safe zone (Q13)
SAFE_ZONE = {
    "left": 120,
    "right": 120,
    "top": 280,    # header overlay vùng = ~200px, +80 buffer
    "bottom": 320, # footer overlay vùng = ~200px, +120 buffer (cho caption/UI mobile)
}

# Default variable values across all templates
EVOSE_SLOT_DEFAULTS = {
    "kicker": EVOSE["name_upper"],
    "brand": EVOSE["app_url"],
    "cta": "Theo dõi ngay",
    "brand_name": EVOSE["name_upper"],
    "tagline": EVOSE["tagline"],
    "primary_url": EVOSE["app_url"],
    "channel": EVOSE["name_upper"],
    "source": f'Nguồn: {EVOSE["url_display"]}',
    # Trống các field footer vì có overlay header/footer thống nhất
    "footer_left": "",
    "footer_right": "",
    "side_left": "",
    "side_right": "",
    "caption": "",
    "date": "",
}

# Override riêng cho vignelli (brand = wordmark, not URL)
VIGNELLI_OVERRIDES = {"brand": ""}

def log(msg, level=0):
    prefix = "  " * level + ("✓ " if level > 0 else "")
    print(prefix + msg)

# ============================================================
# JSON variable patcher
# ============================================================
def patch_data_composition_variables(html, var_map):
    pattern = re.compile(r"(data-composition-variables=')([^']+)(')")
    def replacer(m):
        prefix, json_str, suffix = m.group(1), m.group(2), m.group(3)
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            return m.group(0)
        for k, v in var_map.items():
            if k in data:
                data[k] = v
        return prefix + json.dumps(data, ensure_ascii=False) + suffix
    return pattern.sub(replacer, html)

# ============================================================
# Helper: thay branding strings
# ============================================================
def replace_branding_strings(text):
    text = text.replace("https://aicodingvn.vercel.app/", EVOSE["url_full"])
    text = text.replace("https://aicodingvn.vercel.app", EVOSE["url_full"])
    text = text.replace("aicodingvn.vercel.app", EVOSE["url_display"])
    text = text.replace("AICODINGVN.VERCEL.APP", EVOSE["url_display"].upper())
    text = text.replace("AI Coding", EVOSE["name"])
    return text

# ============================================================
# CSS injection: thêm fade-in animation universally
# (Q12=E: Claude chooses per template — but we inject a base
# .evose-fade-in animation that's available everywhere)
# ============================================================
EVOSE_BASE_CSS = """
/* === EVOSE BRAND BASE === */
:root {
    --evose-navy: #0A1532;
    --evose-deep: #050D1F;
    --evose-white: #FFFFFF;
    --evose-accent: #3B82F6;
    --evose-cyan: #60A5FA;
    --evose-lavender: #A5B4FC;
}
@keyframes evoseFadeUp {
    0% { opacity: 0; transform: translateY(36px); }
    100% { opacity: 1; transform: translateY(0); }
}
@keyframes evoseFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
}
@keyframes evoseScaleIn {
    0% { opacity: 0; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
}
.evose-fade-up { animation: evoseFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.evose-fade-in { animation: evoseFadeIn 0.6s ease-out both; }
.evose-scale-in { animation: evoseScaleIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
"""

def inject_evose_base_css(html):
    """Inject base CSS sau opening <style> đầu tiên."""
    if ":root" in html and "--evose-navy" in html:
        return html  # already injected
    pattern = re.compile(r'(<style[^>]*>)', re.IGNORECASE)
    return pattern.sub(r'\1\n' + EVOSE_BASE_CSS + '\n', html, count=1)

def force_entrance_animation(html, selectors):
    """
    Cho các template THIẾU entrance animation (như glitch),
    inject animation vào các content selector chính.
    selectors: list các CSS selector cần thêm fade-up (vd ['.title', '.subtitle']).
    Chỉ thêm nếu selector đó CHƯA có 'animation:' trong rule của nó.
    """
    extra_css = "\n            /* === EVOSE: entrance animations === */\n"
    for i, sel in enumerate(selectors):
        delay = 0.2 + i * 0.25
        extra_css += f"            {sel} {{ animation: evoseFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) {delay:.2f}s both !important; }}\n"
    if "</style>" in html and "EVOSE: entrance animations" not in html:
        html = html.replace("</style>", extra_css + "        </style>", 1)
    return html


# Safe zone constants (Q13 recommend)
SZ_LEFT = 120
SZ_RIGHT = 120
SZ_TOP = 280
SZ_BOTTOM = 320
SZ_CONTENT_W = 1080 - SZ_LEFT - SZ_RIGHT   # = 840
SZ_CONTENT_H = 1920 - SZ_TOP - SZ_BOTTOM   # = 1320

def inject_safe_zone(html, content_selectors):
    """
    Ép content vào safe zone bằng cách override left/right/top/bottom + max-width
    cho các content selector chính của template.
    Đồng thời giảm font-size headline lớn để không tràn.
    """
    css = "\n            /* === EVOSE SAFE ZONE (840x1320) === */\n"
    for sel in content_selectors:
        css += f"""            {sel} {{
                left: {SZ_LEFT}px !important;
                right: {SZ_RIGHT}px !important;
                max-width: {SZ_CONTENT_W}px !important;
            }}\n"""
    if "</style>" in html and "EVOSE SAFE ZONE" not in html:
        html = html.replace("</style>", css + "        </style>", 1)
    return html

def shrink_oversized_fonts(html, max_px):
    """
    Giảm các font-size lớn hơn max_px xuống max_px để tránh tràn safe zone.
    Áp dụng cho headline/number/figure khổng lồ.
    """
    import re as _re
    def repl(m):
        val = int(m.group(1))
        if val > max_px:
            return f"font-size: {max_px}px"
        return m.group(0)
    return _re.sub(r'font-size:\s*(\d{3,})px', repl, html)

def fix_vietnamese_diacritics(html):
    """
    Sửa dấu thanh tiếng Việt bị cắt phần trên (ẳ, ả, ẵ...).
    Nguyên nhân: line-height < 1.0 + overflow hidden cắt dấu.
    Fix: tăng line-height tối thiểu lên 1.05 cho các heading lớn,
    thêm padding-top, bỏ overflow hidden ở text containers.
    """
    import re as _re
    # Tăng line-height quá nhỏ (< 0.95) lên 1.1 cho heading
    def lh_repl(m):
        val = float(m.group(1))
        if val < 0.95:
            return f"line-height: 1.12"
        return m.group(0)
    html = _re.sub(r'line-height:\s*(0\.\d+)', lh_repl, html)
    return html




# ============================================================
# 1. HERO TEMPLATE: frame-liquid-bg-hero
# ============================================================
def patch_hero(filepath):
    log(f"Patching {filepath.relative_to(filepath.parents[3])}", 1)
    html = filepath.read_text(encoding='utf-8')

    # 1. Inject base CSS
    html = inject_evose_base_css(html)

    # 2. Background → Evose navy (Q1=B)
    html = html.replace("background: #020c1a;", f'background: {EVOSE["bg_main"]};')
    html = html.replace("rgba(2, 8, 20,", "rgba(10, 21, 50,")

    # 3. Blob colors → Evose blue palette (subtle)
    html = html.replace("background: #1565c0;", "background: #1E3A8A;")
    html = html.replace("background: #0d47a1;", "background: #1E40AF;")
    html = html.replace("background: #1976d2;", "background: #2563EB;")
    html = html.replace("background: #0097a7;", "background: #3B82F6;")
    # Reduce blob opacity for cleaner look
    html = html.replace("opacity: 0.55;", "opacity: 0.35;")

    # 4. Headline gradient → multi-color cho phép (Q2=B) but tone xuống
    html = re.sub(
        r"background-image: linear-gradient\(\s*125deg,\s*#ff8c00\s*0%,\s*#ff4d6d\s*35%,\s*#e040fb\s*65%,\s*#7c4dff\s*100%\s*\);",
        f'background-image: linear-gradient(125deg, {EVOSE["warm_orange"]} 0%, {EVOSE["warm_red"]} 35%, {EVOSE["lavender"]} 65%, {EVOSE["accent_blue"]} 100%);',
        html
    )
    html = html.replace(
        "drop-shadow(0 0 60px rgba(255, 100, 20, 0.45))",
        "drop-shadow(0 0 60px rgba(245, 158, 11, 0.35))"
    )
    html = html.replace("color: #5ce1e6;", f'color: {EVOSE["lavender"]};')

    # 5. SAFE ZONE: tăng padding left/right cho .main, .chip
    # .main: left: 80px right: 80px → 120/120
    html = re.sub(
        r'\.main\s*\{[^}]*left:\s*80px;[^}]*right:\s*80px;',
        lambda m: m.group(0).replace("left: 80px;", "left: 120px;").replace("right: 80px;", "right: 120px;"),
        html
    )
    # .chip
    html = re.sub(
        r'\.chip\s*\{[^}]*left:\s*70px;[^}]*right:\s*70px;',
        lambda m: m.group(0).replace("left: 70px;", "left: 120px;").replace("right: 70px;", "right: 120px;"),
        html
    )

    # 6. ẨN HOÀN TOÀN header + footer cũ (sẽ thay bằng overlay layer)
    # Đặt .chip và .brand-bar display:none
    cleanup_css = """
            /* === EVOSE: hide built-in header/footer (replaced by overlay) === */
            .chip, .brand-bar { display: none !important; }
"""
    html = html.replace("</style>", cleanup_css + "        </style>", 1)

    # 6b. Fix line-height tiếng Việt + cap headline + safe zone .main
    html = fix_vietnamese_diacritics(html)
    html = shrink_oversized_fonts(html, 150)  # hero headline cap 150px (tránh 4 dòng tràn)
    html = fix_js_fittext(html, 150)
    html = inject_safe_zone(html, [".main"])
    # Giảm letter-spacing headline để số+chữ không dính (5.63Phiên → 5.63 Phiên)
    html = html.replace("letter-spacing: -3px;", "letter-spacing: -1px;")
    # Đảm bảo word-spacing đủ
    html = html.replace(".headline {\n", ".headline {\n                word-spacing: 0.05em;\n", 1) if ".headline {\n" in html else html

    # 7. Update variables (xóa text footer)
    html = patch_data_composition_variables(html, EVOSE_SLOT_DEFAULTS)

    # 8. Cleanup remaining brand
    html = replace_branding_strings(html)

    filepath.write_text(html, encoding='utf-8')
    log(f"Done", 2)

# ============================================================
# 2. OUTRO TEMPLATE: frame-logo-outro (Q8: bỏ HẾT, chỉ logo + FOLLOW button)
# ============================================================
def patch_logo_outro(filepath, brand_kit_dir=None):
    """
    Outro mới của Evose:
    - Bỏ HẾT: brand-bar top, "EVOSE/AI NEWS/app.evose.ai" box, corners "Theo dõi"/"Hết"
    - GIỮ: chỉ 1 logo Evose horizontal ở center + FOLLOW button animation bên dưới
    - Background: navy brand
    """
    log(f"Patching {filepath.relative_to(filepath.parents[3])}", 1)

    # Tạo nội dung mới hoàn toàn (rewrite outro from scratch)
    new_outro = '''<!doctype html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Evose Outro</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;700;800;900&display=swap" rel="stylesheet" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 1080px; height: 1920px; overflow: hidden; }
        #root {
            position: relative;
            width: 1080px;
            height: 1920px;
            background: radial-gradient(circle at 50% 42%, #0F1F44 0%, ''' + EVOSE["bg_main"] + ''' 58%, ''' + EVOSE["bg_deeper"] + ''' 100%);
            color: #FFFFFF;
            font-family: "Inter Tight", system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 90px;
        }
        @keyframes evFadeUp { 0% { opacity: 0; transform: translateY(40px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes evGlow { from { filter: drop-shadow(0 0 0 transparent); } to { filter: drop-shadow(0 0 60px rgba(59,130,246,0.55)); } }
        @keyframes evCursor {
            0%   { transform: translate(180px, 70px) scale(1); opacity: 0; }
            15%  { transform: translate(180px, 70px) scale(1); opacity: 1; }
            55%  { transform: translate(0, 0) scale(1); opacity: 1; }
            62%  { transform: translate(0, 0) scale(0.82); opacity: 1; }   /* nhấn xuống */
            70%  { transform: translate(0, 0) scale(1); opacity: 1; }      /* nhả ra */
            100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        @keyframes evPress {
            0%, 58% { transform: scale(1); background: #3B82F6; }
            64% { transform: scale(0.94); background: #2563EB; }   /* nút bị ấn lõm */
            72% { transform: scale(1); background: #2563EB; }
            100% { transform: scale(1); background: #2563EB; }
        }
        @keyframes evPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
            50% { box-shadow: 0 0 0 28px rgba(59,130,246,0); }
        }

        /* Ambient blobs */
        .blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.22; z-index: 0; }
        .blob.b1 { width: 280px; height: 280px; top: 320px; left: 120px; background: ''' + EVOSE["accent_blue"] + '''; }
        .blob.b2 { width: 320px; height: 320px; bottom: 360px; right: 120px; background: ''' + EVOSE["lavender"] + '''; }

        /* Logo center — flexbox so KHÔNG lệch */
        .logo-center {
            width: 760px;
            max-width: 76%;
            height: 220px;
            z-index: 5;
            animation: evFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both, evGlow 1.2s ease-out 1.0s both;
        }
        .logo-center img { width: 100%; height: 100%; object-fit: contain; display: block; }

        /* FOLLOW button */
        .follow-area {
            position: relative;
            width: 560px;
            max-width: 70%;
            z-index: 5;
            animation: evFadeUp 0.8s ease-out 1.4s both;
        }
        .follow-btn {
            position: relative;
            width: 100%;
            height: 150px;
            border-radius: 75px;
            background: ''' + EVOSE["accent_blue"] + ''';
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            font-weight: 900;
            letter-spacing: 4px;
            color: #FFFFFF;
            box-shadow: 0 12px 50px rgba(59,130,246,0.4);
            animation: evPress 3s ease-out 1.2s 1 forwards, evPulse 1.6s ease-in-out 4.4s 1;
        }
        .follow-btn .txt {
            position: absolute;
            left: 0; right: 0; text-align: center;
        }
        .follow-btn .txt-follow { animation: evHideAt 0.01s linear 3.4s forwards; }
        .follow-btn .txt-following { opacity: 0; animation: evShowAt 0.01s linear 3.4s forwards; }
        @keyframes evHideAt { to { opacity: 0; } }
        @keyframes evShowAt { to { opacity: 1; } }
        .cursor {
            position: absolute;
            left: 50%; top: 50%;
            width: 46px; height: 58px;
            margin-left: -8px; margin-top: -14px;
            z-index: 6;
            animation: evCursor 3s cubic-bezier(0.34,1.4,0.64,1) 1.2s 1 forwards;
        }
        .cursor svg { width: 100%; height: 100%; }

        /* Tagline (outro CTA) */
        .tagline {
            width: 760px;
            max-width: 76%;
            text-align: center;
            font-size: 38px;
            font-weight: 600;
            line-height: 1.4;
            color: ''' + EVOSE["lavender"] + ''';
            z-index: 5;
            animation: evFadeUp 0.8s ease-out 2.0s both;
        }
    </style>
</head>
<body>
    <div id="root"
        data-composition-id="main" data-start="0" data-duration="6"
        data-width="1080" data-height="1920"
        data-composition-variables='{"brand_name":"''' + EVOSE["name_upper"] + '''","tagline":"''' + EVOSE["outro_cta"] + '''","primary_url":"''' + EVOSE["app_url"] + '''"}'>

        <div class="blob b1"></div>
        <div class="blob b2"></div>

        <div class="logo-center">
            <img src="../assets/evose-horizontal-white.svg" alt="Evose" />
        </div>

        <div class="follow-area">
            <div class="follow-btn">
                <span class="txt txt-follow">FOLLOW</span>
                <span class="txt txt-following">FOLLOWING</span>
            </div>
            <div class="cursor">
                <svg viewBox="0 0 46 58" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3 L3 40 L13 31 L19 48 L25 46 L19 29 L32 29 Z" stroke="#0A1532" stroke-width="2" stroke-linejoin="round"/>
                </svg>
            </div>
        </div>

        <div class="tagline"></div>
    </div>

    <script>
        (function () {
            var v = window.__hyperframes && typeof window.__hyperframes.getVariables === "function" ? window.__hyperframes.getVariables() : {};
            var el = document.querySelector(".tagline");
            if (el && v.tagline) el.textContent = String(v.tagline);
        })();
        window.__timelines = window.__timelines || {};
        window.__timelines["main"] = { pause: function(){}, seek: function(){}, paused: function(){ return true; } };
    </script>
</body>
</html>
'''
    filepath.write_text(new_outro, encoding='utf-8')
    log(f"Done (full rewrite)", 2)


# ============================================================
# 3. GENERIC BODY PATCHER (cho 9 templates body + statement-outro)
# - Background → navy brand
# - Hide built-in footer (overlay sẽ replace)
# - Safe zone padding
# - Color palette → Evose blue
# - Fix per-template issues (chữ cắt, không thẳng hàng,...)
# ============================================================
# Per-template CHROME selectors (header/footer cũ) cần ẩn — overlay sẽ thay
# CHỈ ẩn page-chrome (góc, kênh, nguồn, ngày), GIỮ nội dung chính.
TEMPLATE_HIDE_SELECTORS = {
    "frame-liquid-bg-hero": [".chip", ".brand-bar"],
    "frame-pentagram-stat": [".bottom-bar"],
    "frame-vignelli": [".brand"],                       # .kicker giữ (là label nội dung số)
    "frame-bold-poster": [".kicker", ".footer"],
    "frame-build-minimal": [".corner", ".side-label"],
    "frame-creative-voltage": [".caption"],             # .meta giữ (là eyebrow nội dung)
    "frame-glitch-title": [".chrome", ".overline"],
    "frame-aicoding-list": [],
    "frame-aicoding-comparison": [],
    "frame-statement-outro": [".channel", ".source"],
}

# Per-template content selectors cần entrance animation (cho template thiếu)
# Per-template safe-zone content selectors + font cap
# content_selectors: containers cần ép vào safe zone (left/right 120px)
# font_cap: giảm font-size khổng lồ xuống để không tràn (px)
TEMPLATE_SAFEZONE = {
    "frame-pentagram-stat":   {"content": [".content", ".bars", ".center-rule"], "font_cap": 230},
    "frame-build-minimal":    {"content": [".stage", ".hero-wrap", ".desc-wrap"], "font_cap": 150},
    "frame-bold-poster":      {"content": [".poster", ".headline-wrap"], "font_cap": 300},
    "frame-vignelli":         {"content": [".grid", ".content"], "font_cap": 300},
    "frame-creative-voltage": {"content": [".panel-b", ".display"], "font_cap": 140},
    "frame-aicoding-list":    {"content": [".head", ".list"], "font_cap": 999},
    "frame-aicoding-comparison": {"content": [".wrap", ".cards"], "font_cap": 999},
    "frame-glitch-title":     {"content": [".subtitle"], "font_cap": 999},  # KHÔNG đụng .glitch-host (giữ căn giữa gốc)
    "frame-statement-outro":  {"content": [".card"], "font_cap": 999},
}

# CSS override tuỳ chỉnh cho từng template (fix căn lề, padding dấu thanh)
TEMPLATE_CSS_OVERRIDE = {
    "frame-pentagram-stat": """
        /* EVOSE: căn giữa số + label, padding cho dấu thanh */
        .content { text-align: center !important; top: 360px !important; }
        .label { text-align: center !important; }
        .headline { padding-top: 24px !important; line-height: 1.12 !important; display: inline-block !important; }
        .subtitle { text-align: center !important; margin-left: auto !important; margin-right: auto !important; }
        .type-anchor { display: none !important; }  /* số mờ khổng lồ phía sau gây tràn — ẩn */
    """,
    "frame-build-minimal": "",  # sửa trực tiếp qua patch_build_minimal_direct
    "frame-aicoding-comparison": """
        /* EVOSE: chữ label card không bị cắt */
        .side .label, [class*="label"] { word-break: keep-all !important; overflow: visible !important; }
    """,
    "frame-glitch-title": "",  # sửa trực tiếp qua patch_glitch_direct
    "frame-creative-voltage": """
        /* EVOSE: chữ viết tay không bị cắt dấu */
        .script, [class*="script"] { line-height: 1.4 !important; padding: 0.15em 0 !important; overflow: visible !important; }
        /* EVOSE: dời meta (SAM ALTMAN) xuống khỏi header overlay */
        .meta { top: 230px !important; }
    """,
    "frame-bold-poster": """
        /* EVOSE: tắt animation nghiêng của figure */
        .figure { animation: evFigStraight 0.9s cubic-bezier(0.16,1,0.3,1) 0.7s forwards !important; }
        @keyframes evFigStraight { 0% { opacity: 0; transform: translateY(-40px); } 100% { opacity: 1; transform: translateY(0) rotate(0deg); } }
        /* EVOSE: số figure căn giữa ngang + thẳng (không nghiêng) */
        .figure {
            left: 0 !important; right: 0 !important;
            top: 300px !important;
            text-align: center !important;
            transform: translateY(0) rotate(0deg) !important;
            margin: 0 auto !important;
        }
        /* EVOSE: headline thẳng lại (không nghiêng) */
        .head .ln1 { animation: evLineStraight 0.7s cubic-bezier(0.16,1,0.3,1) 1.15s forwards !important; }
        .head .ln2 { animation: evLineStraight 0.7s cubic-bezier(0.16,1,0.3,1) 1.35s forwards !important; }
        .head .ln3 { animation: evLineStraight 0.7s cubic-bezier(0.16,1,0.3,1) 1.55s forwards !important; }
        @keyframes evLineStraight { 0% { opacity: 0; transform: translateY(40px); } 100% { opacity: 1; transform: translateY(0) rotate(0deg); } }
    """,
}

TEMPLATE_ANIM_SELECTORS = {
    "frame-glitch-title": [],  # KHÔNG đè — glitch đã có animation riêng, đè làm mất scene
    "frame-pentagram-stat": [],   # đã có animation gốc
    "frame-vignelli": [],         # đã có
    "frame-bold-poster": [],      # đã có
    "frame-build-minimal": [],    # đã có
    "frame-creative-voltage": [], # đã có
    "frame-aicoding-list": [],    # đã có
    "frame-aicoding-comparison": [],
    "frame-statement-outro": [],
}


def fix_js_fittext(html, max_px):
    """Giảm tham số maxPx trong các JS auto-scale call (fitText, maxPx var) xuống font_cap."""
    import re as _re
    # fitText(el, 300, 80) → fitText(el, 230, 80)
    html = _re.sub(r'fitText\(([^,]+),\s*\d{3,}\s*,', lambda m: f'fitText({m.group(1)}, {max_px},', html)
    # var maxPx = 168  → cap
    def cap(m):
        v = int(m.group(1))
        return f'maxPx = {min(v, max_px)}' if v > max_px else m.group(0)
    html = _re.sub(r'maxPx\s*=\s*(\d{3,})', cap, html)
    html = _re.sub(r'var maxPx = (\d{3,}),', lambda m: f'var maxPx = {min(int(m.group(1)), max_px)},', html)
    return html

def fix_missing_space(html, template_name):
    """Sửa lỗi mất khoảng trắng giữa title và accent (aicoding-list/comparison)."""
    # aicoding-list: appendChild(createTextNode(title)) rồi accent span → thêm space
    if template_name in ("frame-aicoding-list",):
        html = html.replace(
            'titleEl.appendChild(document.createTextNode(title));\n        if (accent) {',
            'titleEl.appendChild(document.createTextNode(title + " "));\n        if (accent) {'
        )
        # Fallback nếu format khác
        html = html.replace(
            'titleEl.appendChild(document.createTextNode(title));',
            'titleEl.appendChild(document.createTextNode(title + (accent ? " " : "")));'
        )
    return html

def apply_css_override(html, template_name):
    css = TEMPLATE_CSS_OVERRIDE.get(template_name)
    marker = f"/* EVOSE-OVERRIDE-{template_name} */"
    if css and "</style>" in html and marker not in html:
        html = html.replace("</style>", marker + "\n" + css + "\n        </style>", 1)
    return html



def patch_glitch_direct(html):
    """Glitch: GIỮ NGUYÊN cơ chế căn giữa gốc (#root flex center + inline-block).
    KHÔNG tính px, KHÔNG đụng layout. Chỉ THÊM motion-in (fade) qua opacity — không xung đột transform glitch."""

    # Thêm motion-in: các phần tử fade vào khi xuất hiện.
    # Dùng OPACITY ONLY (không transform) để không phá glitch jitter (transform) và không phá flex center.
    motion_css = """
  /* === EVOSE motion-in (fade, opacity-only — không phá căn giữa, không phá glitch) === */
  @keyframes evGlitchIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes evGlitchUp { from { opacity: 0; clip-path: inset(0 0 100% 0); } to { opacity: 1; clip-path: inset(0 0 0% 0); } }
  .glitch-host { opacity: 0; animation: glitch 4s infinite, evGlitchUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; }
  .overline { opacity: 0; animation: evGlitchIn 0.6s ease-out 0.05s forwards; }
  .subtitle { opacity: 0; animation: evGlitchIn 0.7s ease-out 0.6s forwards; }
"""
    # Chèn motion-in vào trước </style> (không override layout gốc)
    if "EVOSE motion-in" not in html:
        html = html.replace("</style>", motion_css + "</style>", 1)

    # Auto-fit gốc đã có (maxW). Để nguyên — KHÔNG đụng px.
    return html



def patch_creative_voltage_direct(html):
    """frame-creative-voltage: hero là .display với cac dong .ln (font 130px co dinh).
    Chu dai (GOVERNANCE) > 920px → tran → cat. Them auto-fit dung API fitTextFontSize cua HyperFrames.
    Day la FRAME THAT cua video 'AGENT GOVERNANCE FRAMEWORK' (KHONG phai build-minimal)."""

    # Sau khi build cac .ln, them auto-fit: tinh font nho nhat de DONG dai nhat vua 920px.
    old_js = """        lines.forEach(function (t, i) {
          var span = document.createElement("span");
          span.className = "ln" + (i === ai ? " volt" : "");
          span.textContent = String(t);
          span.style.animationDelay = (1.0 + i * 0.18).toFixed(2) + "s";
          disp.appendChild(span);
        });
      }"""
    new_js = """        lines.forEach(function (t, i) {
          var span = document.createElement("span");
          span.className = "ln" + (i === ai ? " volt" : "");
          span.textContent = String(t);
          span.style.animationDelay = (1.0 + i * 0.18).toFixed(2) + "s";
          disp.appendChild(span);
        });
        // === EVOSE auto-fit: GIAM FONT NHE theo so ky tu cua TU dai nhat ===
        // Khong dung scrollWidth (do sai trong render headless -> thu nho qua). Chi dung so ky tu.
        var lns = disp.querySelectorAll(".ln");
        for (var k = 0; k < lns.length; k++) { lns[k].style.whiteSpace = "nowrap"; }
        var BASE = 130;
        var maxLen = 0;
        for (var li = 0; li < lines.length; li++) {
          var L = String(lines[li]).length;
          if (L > maxLen) maxLen = L;
        }
        // <=8 ky tu giu nguyen 130px (goc). Moi ky tu vuot qua 8 giam ~9px.
        // VD: 9kt->121, 10kt(GOVERNANCE)->112, 11kt->103, 12kt->94. Chi nho hon goc 1 chut.
        var dispFont = BASE;
        if (maxLen > 8) { dispFont = BASE - (maxLen - 8) * 9; }
        if (dispFont < 88) dispFont = 88;   // san duoi cao: van TO, dep
        disp.style.fontSize = dispFont + "px";
      }"""
    if old_js in html:
        html = html.replace(old_js, new_js)
    return html


def patch_build_minimal_direct(html):
    """Build-minimal: GIỮ gradient + fix dấu + AUTO-FIT chữ dài dùng API chính thức của HyperFrames.
    QUAN TRỌNG: HyperFrames render bằng puppeteer + virtual clock → async (fonts.ready/rAF) KHÔNG chạy.
    Phải dùng window.__hyperframes.fitTextFontSize (canvas measureText, ĐỒNG BỘ) — API HyperFrames cung cấp sẵn."""

    # 1. .hero line-height đủ để chứa dấu
    html = html.replace("                line-height: 0.98;", "                line-height: 1.32;")

    # 2. .hero .ch: gradient brand + padding chứa dấu
    old_ch = """            .hero .ch {
                display: inline-block;
                opacity: 0;
                transform: translateY(30px);
                animation: chReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                background: linear-gradient(135deg, #0097b2 0%, #7ed957 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                text-shadow: none;
            }"""
    new_ch = """            .hero .ch {
                display: inline-block;
                opacity: 0;
                transform: translateY(30px);
                animation: chReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                background: linear-gradient(135deg, #3B82F6 0%, #A5B4FC 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                line-height: 1.32;
                padding-top: 0.32em;
                padding-bottom: 0.22em;
                overflow: visible;
                text-shadow: none;
            }"""
    html = html.replace(old_ch, new_ch)
    html = html.replace("                overflow: hidden;", "                overflow: visible;", 1)

    # 3. AUTO-FIT: thay đoạn reveal+scale cũ bằng dùng fitTextFontSize (API HyperFrames)
    reveal_re = re.compile(
        r'var chars = Array\.from\(String\(v\.hero\)\);.*?'
        r'hero\.style\.whiteSpace = "";',
        re.DOTALL
    )
    new_reveal = """// === EVOSE auto-fit dùng API HyperFrames (đồng bộ, chạy đúng khi render) ===
                    var heroText = String(v.hero);
                    var BOX = 820;
                    var chosen = 150;
                    if (window.__hyperframes && typeof window.__hyperframes.fitTextFontSize === "function") {
                        // Fit theo TỪNG TỪ dài nhất (mỗi từ phải vừa 1 dòng, không cắt không bẻ)
                        var ws = heroText.split(String.fromCharCode(32));
                        for (var wi2 = 0; wi2 < ws.length; wi2++) {
                            var res = window.__hyperframes.fitTextFontSize(ws[wi2], {
                                baseFontSize: 150, minFontSize: 36, step: 2,
                                fontWeight: 800, fontFamily: "Inter, sans-serif", maxWidth: BOX
                            });
                            if (res && res.fontSize < chosen) chosen = res.fontSize;
                        }
                    }
                    // Render từng ký tự (mỗi TỪ bọc nowrap để không bẻ giữa từ)
                    var wordsArr = heroText.split(String.fromCharCode(32));
                    var ci2 = 0;
                    wordsArr.forEach(function (word, wIdx) {
                        var wrap = document.createElement("span");
                        wrap.className = "word";
                        wrap.style.display = "inline-block";
                        wrap.style.whiteSpace = "nowrap";
                        Array.from(word).forEach(function (c) {
                            var span = document.createElement("span");
                            span.className = "ch";
                            span.textContent = c;
                            span.style.animationDelay = (0.6 + ci2 * 0.06).toFixed(2) + "s";
                            wrap.appendChild(span);
                            ci2++;
                        });
                        hero.appendChild(wrap);
                        if (wIdx < wordsArr.length - 1) hero.appendChild(document.createTextNode(" "));
                    });
                    hero.style.fontSize = chosen + "px";
                    hero.style.maxWidth = BOX + "px";
                    hero.style.whiteSpace = "normal";
                    hero.style.wordBreak = "keep-all";"""
    html2, n = reveal_re.subn(new_reveal, html)
    if n > 0:
        html = html2
    return html

def patch_generic(filepath, template_name):
    log(f"Patching {filepath.relative_to(filepath.parents[3])}", 1)
    html = filepath.read_text(encoding='utf-8')

    # 1. Inject base CSS
    html = inject_evose_base_css(html)

    # 2. Background đổi sang navy brand (giữ accent của template)
    # Các template có nhiều màu nền khác nhau — chỉ đổi nền "đen/trắng/charcoal" thành navy
    bg_replacements = [
        ("background: #0a0c12;", f'background: {EVOSE["bg_main"]};'),
        ("background: #0b0a09;", f'background: {EVOSE["bg_main"]};'),
        ("background: #08090c;", f'background: {EVOSE["bg_deeper"]};'),
        ("background: #1a1535;", f'background: {EVOSE["bg_main"]};'),
        ("background: #0f1320;", f'background: {EVOSE["bg_deeper"]};'),
        ("background-color: #0a0c12;", f'background-color: {EVOSE["bg_main"]};'),
        # Charcoal vignelli (giữ vì là design choice)
        # Glitch template black bg → navy brand
        ("background: #000;", f'background: {EVOSE["bg_main"]};'),
        ("background: #000000;", f'background: {EVOSE["bg_main"]};'),
        ("background:#000;", f'background:{EVOSE["bg_main"]};'),
        # Glitch + dark variants
        ("background: #0d0e10;", f'background: {EVOSE["bg_main"]};'),
        ("background:#0d0e10;", f'background:{EVOSE["bg_main"]};'),
        ("background: #0a1628;", f'background: {EVOSE["bg_main"]};'),
        ("background:#0a1628;", f'background:{EVOSE["bg_main"]};'),
        ("background: #020c1a;", f'background: {EVOSE["bg_main"]};'),
        ("background:#020c1a;", f'background:{EVOSE["bg_main"]};'),
    ]
    for old, new in bg_replacements:
        html = html.replace(old, new)

    # 3. Sky blue palette → Evose blue
    color_map = {
        "#38bdf8": EVOSE["accent_blue"],
        "#7dd3fc": EVOSE["glow_cyan"],
        "#0ea5e9": "#2563EB",
        "#bae6fd": EVOSE["lavender"],
        "#5ce1e6": EVOSE["lavender"],
        "rgba(56, 189, 248,": "rgba(59, 130, 246,",
        "rgba(56,189,248,": "rgba(59, 130, 246,",
        "rgba(125, 211, 252,": "rgba(96, 165, 250,",
    }
    for old, new in color_map.items():
        html = html.replace(old, new)

    # 4. Hide built-in chrome (header/footer cũ) — per-template CHÍNH XÁC
    _hide_sels = TEMPLATE_HIDE_SELECTORS.get(template_name, [])
    if _hide_sels:
        sel_str = ", ".join(_hide_sels)
        hide_overlay_css = f"""
            /* === EVOSE: hide built-in chrome (replaced by overlay) === */
            {sel_str} {{ display: none !important; visibility: hidden !important; }}
"""
        if "</style>" in html and "EVOSE: hide built-in chrome" not in html:
            html = html.replace("</style>", hide_overlay_css + "        </style>", 1)

    # 5. Safe zone: tăng padding cho content area
    # Standard pattern: left: 80px, right: 80px → 120/120
    html = re.sub(r'(\.\w+\s*\{[^}]*?)left:\s*80px;', r'\1left: 120px;', html)
    html = re.sub(r'(\.\w+\s*\{[^}]*?)right:\s*80px;', r'\1right: 120px;', html)
    html = re.sub(r'(\.\w+\s*\{[^}]*?)left:\s*70px;', r'\1left: 120px;', html)
    html = re.sub(r'(\.\w+\s*\{[^}]*?)right:\s*70px;', r'\1right: 120px;', html)
    # Cũng tăng top padding để tránh đè overlay header (overlay header ở 60-200px)
    # Top content cũ thường 320px → giữ vì 280 < 320 OK
    # Bottom: content area cũ thường có pad-bottom nhỏ, ta giảm content vùng nội dung lên cao 1 chút

    # 6. Add fade-in animation to main content elements (Q12=E)
    # Per-template: add evose-fade-up class
    # (Templates already have their own animations, we don't override - just slow down popping)
    # Slow down extremely fast animations to 0.7s minimum
    html = re.sub(r'animation-duration:\s*0\.[12]\ds', 'animation-duration: 0.6s', html)

    # Force entrance animation cho template thiếu (vd glitch)
    _anim_sels = TEMPLATE_ANIM_SELECTORS.get(template_name, [])
    if _anim_sels:
        html = force_entrance_animation(html, _anim_sels)

    # Safe zone: ép content vào 840px width + cap font khổng lồ
    _sz = TEMPLATE_SAFEZONE.get(template_name)
    if _sz:
        if _sz.get("content"):
            html = inject_safe_zone(html, _sz["content"])
        if _sz.get("font_cap", 999) < 999:
            html = shrink_oversized_fonts(html, _sz["font_cap"])
            html = fix_js_fittext(html, _sz["font_cap"])

    # Fix dấu thanh tiếng Việt bị cắt (line-height quá nhỏ)
    html = fix_vietnamese_diacritics(html)

    # Sửa TRỰC TIẾP file build-minimal gốc (fix dấu triệt để)
    if template_name == "frame-build-minimal":
        html = patch_build_minimal_direct(html)

    # Sửa TRỰC TIẾP frame-creative-voltage (FRAME THẬT của video AGENT GOVERNANCE FRAMEWORK)
    if template_name == "frame-creative-voltage":
        html = patch_creative_voltage_direct(html)

    # Sửa TRỰC TIẾP glitch gốc (auto-fit chữ dài + căn giữa)
    if template_name == "frame-glitch-title":
        html = patch_glitch_direct(html)

    # Per-template CSS override (căn giữa, padding dấu)
    html = apply_css_override(html, template_name)

    # Fix mất khoảng trắng title+accent
    html = fix_missing_space(html, template_name)

    # 7. Template-specific overrides
    if template_name == "frame-vignelli":
        html = patch_data_composition_variables(html, VIGNELLI_OVERRIDES)

    # 8. Per-template FIXES (theo feedback của user)
    if template_name == "frame-glitch-title":
        # Ảnh 2: chữ glitch lệch (cyan/magenta split tách rời) — giảm độ split
        # Tìm text-shadow / filter có split lớn → giảm
        html = re.sub(
            r'text-shadow:\s*-?\d+px\s+0\s+(#[0-9a-fA-F]+|cyan|rgba\([^)]+\)),\s*\d+px\s+0\s+(#[0-9a-fA-F]+|magenta|rgba\([^)]+\))',
            'text-shadow: -2px 0 rgba(96,165,250,0.6), 2px 0 rgba(165,180,252,0.6)',
            html
        )

    if template_name == "frame-creative-voltage":
        # Ảnh 4: chữ "vòng phản hồi" handwritten bị vỡ ký tự (dấu cắt rời)
        # Đảm bảo font Dancing Script được include và line-height đủ
        html = re.sub(
            r'(font-family:\s*[\'"]Dancing Script[\'"][^;]*;)',
            r'\1 line-height: 1.4; padding: 8px 0;',
            html
        )

    if template_name == "frame-aicoding-comparison":
        # Ảnh 5: chữ "Jalapeño" bị cắt ký tự cuối — tăng max-width của side label
        # Cũng giảm font-size nếu cần
        html = re.sub(
            r'(\.side\s+\.label\s*\{[^}]*?)font-size:\s*\d+px;',
            r'\1font-size: 96px; max-width: 100%; word-break: keep-all;',
            html
        )

    # 9. Update variables (xóa text footer fields)
    html = patch_data_composition_variables(html, EVOSE_SLOT_DEFAULTS)

    # 10. Cleanup brand
    html = replace_branding_strings(html)

    filepath.write_text(html, encoding='utf-8')
    log(f"Done", 2)

# ============================================================
# 4. SKILL.md
# ============================================================
def patch_skill_md(filepath):
    log(f"Patching {filepath.relative_to(filepath.parents[3])}", 1)
    text = filepath.read_text(encoding='utf-8')

    text = text.replace('"channel": "AI Coding"', f'"channel": "{EVOSE["name_upper"]}"')

    brand_block = f'''
## 🎯 EVOSE BRAND v3 (BẮT BUỘC TUÂN THỦ)

**LƯU Ý CỰC QUAN TRỌNG: Repo này dùng cho thương hiệu Evose.**

### Header + Footer: KHÔNG ĐIỀN
Repo có **OVERLAY LAYER thống nhất** (header "Evose.ai" + footer social icons) tự động đè
lên mọi scene. Vì vậy:
- ❌ KHÔNG điền `footer_left`, `footer_right`, `side_left`, `side_right`, `caption`, `date`
  → để chuỗi rỗng `""` hoặc bỏ field
- ❌ KHÔNG điền filler text như "ISC 2026", "Hamburg", "VFX/GLITCH", "Edge workstation"
- ✅ Field hiển thị nội dung chính (headline, subtitle, label, number, items) vẫn điền bình thường

### Brand Fields (chỉ những fields KHÔNG bị overlay che)
| Field | Giá trị |
|---|---|
| `metadata.channel` | `"{EVOSE["name_upper"]}"` |
| `inputs.kicker` (hook only, ở khu nội dung chính nếu có) | `"{EVOSE["name_upper"]}"` hoặc bỏ |
| `inputs.brand_name` (outro) | `"{EVOSE["name_upper"]}"` |
| `inputs.tagline` (outro) | `"{EVOSE["outro_cta"]}"` |
| `inputs.primary_url` (outro) | `"{EVOSE["app_url"]}"` |

### Outro CTA — BẮT BUỘC
`voiceText` scene cuối (outro) **PHẢI** kết thúc bằng:
> **"{EVOSE["outro_cta"]}"**

Có thể prefix "Cảm ơn bạn đã theo dõi." nhưng câu CTA Evose phải là câu cuối.

### Safe Zone (bắt buộc)
Vùng nội dung chỉ dùng từ **left: 120px → right: 960px** (rộng 840px) để chừa safe zone cho TikTok/Reels.
Top từ **280px** (tránh overlay header). Bottom đến **1600px** (tránh overlay footer).

### Cấm tuyệt đối trong voiceText và inputs:
- ❌ "AI Coding", "aicodingvn.vercel.app", "Senior AI Engineer", "Bản tin AI"
- ❌ "ISC 2026", "Hamburg", "Edge workstation", "VFX/GLITCH", "CYAN × MAGENTA", "Signal CH-04"
- ❌ Ngày kiểu "12 · 06 · 2026" (fake date)
- ❌ Mọi URL chứa "vercel.app", "udemy", "aicoding"

---
'''

    if "## 🎯 EVOSE BRAND" not in text:
        text = re.sub(r'(# Create Template Video Skill\n)', r'\1' + brand_block, text, count=1)
    else:
        # Replace block cũ nếu có
        text = re.sub(
            r'## 🎯 EVOSE BRAND.*?(?=\n## |\Z)',
            brand_block.strip() + '\n\n',
            text,
            flags=re.DOTALL
        )

    text = replace_branding_strings(text)
    filepath.write_text(text, encoding='utf-8')
    log(f"Done", 2)

# ============================================================
# 5. CATALOG.md
# ============================================================
def patch_catalog_md(filepath):
    log(f"Patching {filepath.relative_to(filepath.parents[1])}", 1)
    text = filepath.read_text(encoding='utf-8')
    text = replace_branding_strings(text)
    # Thêm note về overlay
    overlay_note = '''
> ⚠️ **EVOSE BRAND OVERLAY**: Repo này dùng OVERLAY LAYER thống nhất cho header+footer.
> KHÔNG ĐIỀN các slot footer (`footer_left`, `footer_right`, `side_left`, `side_right`,
> `caption`, `date`) — overlay sẽ tự động thêm "Evose.ai" header + social icons footer
> lên mọi scene.

'''
    if "EVOSE BRAND OVERLAY" not in text:
        text = text.replace("# Template Catalog", "# Template Catalog\n" + overlay_note, 1)
    filepath.write_text(text, encoding='utf-8')
    log(f"Done", 2)

# ============================================================
# 6. template-composer.ts
# ============================================================
def patch_composer_ts(filepath):
    log(f"Patching {filepath.relative_to(filepath.parents[2])}", 1)
    text = filepath.read_text(encoding='utf-8')
    text = replace_branding_strings(text)
    filepath.write_text(text, encoding='utf-8')
    log(f"Done", 2)

# ============================================================
# 7. meta.json
# ============================================================
def patch_meta_json(filepath):
    log(f"Patching {filepath.relative_to(filepath.parents[2])}", 1)
    try:
        data = json.loads(filepath.read_text(encoding='utf-8'))
        if "name" in data and "AI Coding" in data["name"]:
            data["name"] = data["name"].replace("AI Coding", EVOSE["name"])
        filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
        log(f"Done", 2)
    except Exception as e:
        log(f"⚠️ Skipped ({e})", 2)

# ============================================================
# 8. README files
# ============================================================
def patch_readme(filepath):
    log(f"Patching {filepath.name}", 1)
    text = filepath.read_text(encoding='utf-8')
    text = replace_branding_strings(text)
    filepath.write_text(text, encoding='utf-8')
    log(f"Done", 2)


# ============================================================
# 9. PIPELINE PATCHER: thêm bước overlay + music vào template-pipeline.ts
# ============================================================
EVOSE_PIPELINE_INJECTION = '''
// ============================================================
// EVOSE BRAND v3: overlay frame + background music
// ============================================================
import { existsSync as evoseExistsSync } from "node:fs";
import { join as evoseJoin } from "node:path";

async function evoseApplyOverlayAndMusic(opts: {
    repoRoot: string;
    silentVideo: string;
    voicePath: string;
    finalOutput: string;
    duration: number;
}): Promise<void> {
    const { spawn } = await import("node:child_process");
    const overlayPng = evoseJoin(opts.repoRoot, "evose-brand-kit", "overlays", "overlay-frame.png");
    const musicPath = evoseJoin(opts.repoRoot, "evose-brand-kit", "music", "background.mp3");

    const hasOverlay = evoseExistsSync(overlayPng);
    const hasMusic = evoseExistsSync(musicPath);

    console.log(`[evose] overlay=${hasOverlay} music=${hasMusic}`);

    // Build FFmpeg args
    const ffArgs: string[] = ["-y"];
    // Input 0: silent video
    ffArgs.push("-i", opts.silentVideo);
    // Input 1: voice
    ffArgs.push("-i", opts.voicePath);
    // Input 2: overlay PNG (if exists)
    if (hasOverlay) ffArgs.push("-loop", "1", "-i", overlayPng);
    // Input 3: music (if exists)
    if (hasMusic) ffArgs.push("-stream_loop", "-1", "-i", musicPath);

    const filters: string[] = [];
    let lastVideo = "[0:v]";
    if (hasOverlay) {
        filters.push(`[0:v][2:v]overlay=0:0:format=auto[vovr]`);
        lastVideo = "[vovr]";
    }

    let audioFilter = "";
    if (hasMusic) {
        // Audio ducking: music ducks to 22% when voice present
        audioFilter = `[3:a]volume=0.30,aloop=loop=-1:size=2e9[mus];[1:a][mus]sidechaincompress=threshold=0.05:ratio=8:attack=80:release=400[aout]`;
        filters.push(audioFilter);
    } else {
        filters.push(`[1:a]anull[aout]`);
    }

    ffArgs.push("-filter_complex", filters.join(";"));
    ffArgs.push("-map", lastVideo, "-map", "[aout]");
    ffArgs.push("-c:v", "libx264", "-preset", "fast", "-crf", "20");
    ffArgs.push("-c:a", "aac", "-b:a", "192k");
    ffArgs.push("-t", String(opts.duration));
    ffArgs.push("-pix_fmt", "yuv420p");
    ffArgs.push(opts.finalOutput);

    await new Promise<void>((resolve, reject) => {
        const proc = spawn("ffmpeg", ffArgs, { stdio: ["ignore", "inherit", "inherit"], shell: false });
        proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg overlay/music failed: ${code}`)));
        proc.on("error", reject);
    });
}
'''

# We will NOT auto-edit template-pipeline.ts because it's risky.
# Instead, we provide a STANDALONE bash script `evose-finalize.sh` that does the overlay+music
# as a POST-processing step. User can run it after `npm run pipeline`.
# This is much safer + clearer.

# ============================================================
# MAIN
# ============================================================
def main():
    if len(sys.argv) < 2:
        print("Usage: python3 patch-templates.py /path/to/AI-auto-generate-video")
        sys.exit(1)

    repo_root = Path(sys.argv[1]).resolve()
    templates_dir = repo_root / "templates"
    if not templates_dir.exists():
        print(f"❌ Error: {templates_dir} not found")
        sys.exit(1)

    print(f"📂 Patching repo: {repo_root}")
    print()

    # 1. Hero template
    print("🎨 [1/8] Hero template (frame-liquid-bg-hero)")
    for entry in ["compositions/portrait.html", "index.html"]:
        p = templates_dir / "frame-liquid-bg-hero" / entry
        if p.exists():
            patch_hero(p)

    # 2. Outro (full rewrite)
    print("\n🎨 [2/8] Outro template (frame-logo-outro) — full rewrite")
    p = templates_dir / "frame-logo-outro" / "compositions" / "portrait.html"
    if p.exists():
        patch_logo_outro(p)
    # index.html (16:9) — just patch generically
    p2 = templates_dir / "frame-logo-outro" / "index.html"
    if p2.exists():
        patch_generic(p2, "frame-logo-outro")

    # 3. Body + statement-outro templates
    print("\n🎨 [3/8] Body + statement-outro templates (9 templates × 2 files)")
    body_templates = [
        "frame-pentagram-stat", "frame-aicoding-list", "frame-aicoding-comparison",
        "frame-bold-poster", "frame-build-minimal", "frame-creative-voltage",
        "frame-glitch-title", "frame-statement-outro", "frame-vignelli",
    ]
    for tpl in body_templates:
        for entry in ["compositions/portrait.html", "index.html"]:
            p = templates_dir / tpl / entry
            if p.exists():
                patch_generic(p, tpl)

    # 4. SKILL.md
    print("\n📚 [4/8] SKILL.md")
    skill_path = repo_root / ".claude" / "skills" / "create-template-video" / "SKILL.md"
    if skill_path.exists():
        patch_skill_md(skill_path)

    # 5. CATALOG.md
    print("\n📚 [5/8] templates/CATALOG.md")
    catalog_path = templates_dir / "CATALOG.md"
    if catalog_path.exists():
        patch_catalog_md(catalog_path)

    # 6. template-composer.ts
    print("\n⚙️ [6/8] src/render/template-composer.ts")
    composer_path = repo_root / "src" / "render" / "template-composer.ts"
    if composer_path.exists():
        patch_composer_ts(composer_path)

    # 7. meta.json
    print("\n⚙️ [7/8] meta.json files")
    for tpl in ["frame-aicoding-list", "frame-aicoding-comparison"]:
        meta_path = templates_dir / tpl / "meta.json"
        if meta_path.exists():
            patch_meta_json(meta_path)

    # 8. README files
    print("\n📚 [8/8] README files")
    for readme in ["README.md", "README.vi.md"]:
        readme_path = repo_root / readme
        if readme_path.exists():
            patch_readme(readme_path)

    print()
    print("✅ All Evose brand v3 patches applied!")

if __name__ == "__main__":
    main()
