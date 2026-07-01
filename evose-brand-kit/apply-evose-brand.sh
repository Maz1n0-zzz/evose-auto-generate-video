#!/usr/bin/env bash
# ============================================================
# apply-evose-brand.sh — Evose Brand Patch v3 (Pro)
# ------------------------------------------------------------
# Phase 1: Header+Footer overlay + Safe zone + Màu nền brand
# Phase 2: Hiệu ứng text mượt + per-template fixes
# Phase 3: Outro mới với FOLLOW button animation
# Phase 4: Background music + audio ducking (qua evose-finalize.sh)
# ============================================================
set -e

REPO_ROOT="${1:-$(pwd)}"
BRAND_KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🎨 Evose Brand Kit v3 (Pro — 4 Phases)"
echo "======================================="
echo "  Repo root      : $REPO_ROOT"
echo "  Brand kit dir  : $BRAND_KIT_DIR"
echo ""

# Validate
if [[ ! -d "$REPO_ROOT/templates" ]]; then
  echo "❌ Lỗi: Không tìm thấy 'templates/' trong $REPO_ROOT"
  exit 1
fi
if [[ ! -d "$REPO_ROOT/.claude/skills/create-template-video" ]]; then
  echo "❌ Lỗi: .claude/skills/create-template-video không tồn tại"
  exit 1
fi
if ! command -v python3 &> /dev/null; then
  echo "❌ Lỗi: python3 không có"
  exit 1
fi

echo "✓ Verified repo structure"

# === EVOSE: Tự động khôi phục nhạc nền từ backup (tránh mất nhạc khi nâng cấp) ===
MUSIC_DEST="$BRAND_KIT_DIR/music/background.mp3"
if [ ! -f "$MUSIC_DEST" ]; then
  # Tìm background.mp3 trong các backup cũ
  FOUND_MUSIC=$(find "$REPO_ROOT" -maxdepth 3 -name "background.mp3" -path "*music*" 2>/dev/null | head -1)
  if [ -n "$FOUND_MUSIC" ] && [ -f "$FOUND_MUSIC" ]; then
    cp "$FOUND_MUSIC" "$MUSIC_DEST"
    echo "🎵 Đã khôi phục nhạc nền từ: $FOUND_MUSIC"
  else
    echo "⚠️  CHƯA có nhạc nền! Video sẽ KHÔNG có nhạc."
    echo "    → Chạy: ./evose-brand-kit/music/download-music.sh"
  fi
else
  echo "🎵 Nhạc nền đã sẵn sàng: $MUSIC_DEST"
fi
echo ""

# ============================================================
# STEP 1: Backup
# ============================================================
echo "📦 [1/6] Backup files gốc..."
BACKUP_DIR="$REPO_ROOT/.evose-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -R "$REPO_ROOT/templates" "$BACKUP_DIR/templates"
mkdir -p "$BACKUP_DIR/.claude/skills/create-template-video"
cp "$REPO_ROOT/.claude/skills/create-template-video/SKILL.md" \
   "$BACKUP_DIR/.claude/skills/create-template-video/SKILL.md"
if [[ -f "$REPO_ROOT/src/render/template-composer.ts" ]]; then
  mkdir -p "$BACKUP_DIR/src/render"
  cp "$REPO_ROOT/src/render/template-composer.ts" "$BACKUP_DIR/src/render/template-composer.ts"
fi
[[ -f "$REPO_ROOT/README.md" ]] && cp "$REPO_ROOT/README.md" "$BACKUP_DIR/README.md"
[[ -f "$REPO_ROOT/README.vi.md" ]] && cp "$REPO_ROOT/README.vi.md" "$BACKUP_DIR/README.vi.md"
echo "✓ Backup → $BACKUP_DIR"
echo ""

# ============================================================
# STEP 2: Replace logos
# ============================================================
echo "🖼  [2/6] Replace logo SVG files..."
[[ -d "$REPO_ROOT/templates/frame-liquid-bg-hero/assets" ]] && \
  cp "$BRAND_KIT_DIR/logos/evose-symbol-white.svg" \
     "$REPO_ROOT/templates/frame-liquid-bg-hero/assets/logo.svg" && \
  echo "  ✓ frame-liquid-bg-hero/assets/logo.svg"

[[ -d "$REPO_ROOT/templates/frame-logo-outro/assets" ]] && \
  cp "$BRAND_KIT_DIR/logos/evose-symbol-white.svg" \
     "$REPO_ROOT/templates/frame-logo-outro/assets/logo.svg" && \
  echo "  ✓ frame-logo-outro/assets/logo.svg"

mkdir -p "$REPO_ROOT/templates/frame-logo-outro/assets"
cp "$BRAND_KIT_DIR/logos/evose-horizontal-white.svg" \
   "$REPO_ROOT/templates/frame-logo-outro/assets/evose-horizontal-white.svg"
echo "  ✓ frame-logo-outro/assets/evose-horizontal-white.svg"
echo ""

# ============================================================
# STEP 3: Patch templates + SKILL + CATALOG + composer + README
# ============================================================
echo "✏️  [3/6] Patch all files..."
echo ""
python3 "$BRAND_KIT_DIR/patches/patch-templates.py" "$REPO_ROOT"
echo ""
echo "⚙️  Tích hợp overlay+music vào pipeline (auto)..."
python3 "$BRAND_KIT_DIR/patches/patch-pipeline.py" "$REPO_ROOT"
echo ""

# ============================================================
# STEP 4: Copy evose-brand-kit folder vào repo + setup
# ============================================================
echo "📁 [4/6] Setup evose-brand-kit folder trong repo..."
# Brand kit folder is already at $BRAND_KIT_DIR (which should be inside $REPO_ROOT)
# Verify it's accessible
if [[ "$BRAND_KIT_DIR" != "$REPO_ROOT/evose-brand-kit" ]]; then
  echo "⚠️  Brand kit not at expected location. Copying..."
  cp -R "$BRAND_KIT_DIR" "$REPO_ROOT/evose-brand-kit"
fi
echo "  ✓ evose-brand-kit folder accessible at: $REPO_ROOT/evose-brand-kit"
echo ""

# ============================================================
# STEP 5: Generate overlay PNG
# ============================================================
echo "📸 [5/6] Generate overlay PNG (using Chrome headless)..."
if [[ -f "$BRAND_KIT_DIR/overlays/overlay-frame.png" ]]; then
  echo "  ⚠️  overlay-frame.png already exists — skipping"
else
  if "$BRAND_KIT_DIR/overlays/generate-overlay-png.sh"; then
    echo "  ✓ overlay-frame.png generated"
  else
    echo "  ⚠️  PNG generation failed. Bạn cần chạy thủ công:"
    echo "      $BRAND_KIT_DIR/overlays/generate-overlay-png.sh"
  fi
fi
echo ""

# ============================================================
# STEP 6: Done + next steps
# ============================================================
echo "📝 [6/6] Copy BRAND-EVOSE.md to repo root..."
cp "$BRAND_KIT_DIR/BRAND-EVOSE.md" "$REPO_ROOT/BRAND-EVOSE.md"
echo "  ✓ $REPO_ROOT/BRAND-EVOSE.md"
echo ""

echo "============================================================"
echo "  ✅ EVOSE BRAND v3 ĐÃ ÁP DỤNG!"
echo "============================================================"
echo ""
echo "📁 Backup: $BACKUP_DIR"
echo ""
echo "📋 BƯỚC TIẾP THEO (làm theo thứ tự):"
echo ""
echo "  ① Tải nhạc nền (1 lần duy nhất):"
echo "     ./evose-brand-kit/music/download-music.sh"
echo ""
echo "  ② Xóa output cũ (script.json cũ vẫn có 'AI Coding'):"
echo "     rm -rf output/"
echo ""
echo "  ③ Mở Claude Code, tạo video mới:"
echo "     /create-template-video <URL_BÀI_BÁO>"
echo ""
echo "  ④ Xem video cuối (overlay+music ĐÃ tự động thêm):"
echo "     open output/<slug>/video-evose.mp4"
echo ""
echo "  ⚠️  LƯU Ý: mở video-evose.mp4 (KHÔNG phải video.mp4)"
echo "      video.mp4 = chưa có header/footer/nhạc"
echo "      video-evose.mp4 = BẢN HOÀN CHỈNH"
echo ""
