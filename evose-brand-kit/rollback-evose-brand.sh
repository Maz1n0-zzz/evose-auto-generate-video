#!/usr/bin/env bash
# rollback-evose-brand.sh — Khôi phục về trạng thái trước Evose v3
set -e

REPO_ROOT="${1:-$(pwd)}"

if [[ ! -d "$REPO_ROOT/templates" ]]; then
  echo "❌ Không tìm thấy 'templates/' trong $REPO_ROOT"
  exit 1
fi

LATEST_BACKUP=$(ls -dt "$REPO_ROOT"/.evose-backup-* 2>/dev/null | head -1)
if [[ -z "$LATEST_BACKUP" ]]; then
  echo "❌ Không tìm thấy backup (.evose-backup-*)"
  exit 1
fi

echo "🔄 Rolling back from: $LATEST_BACKUP"

[[ -d "$LATEST_BACKUP/templates" ]] && rm -rf "$REPO_ROOT/templates" && cp -R "$LATEST_BACKUP/templates" "$REPO_ROOT/templates" && echo "  ⟲ templates/"
[[ -f "$LATEST_BACKUP/.claude/skills/create-template-video/SKILL.md" ]] && cp "$LATEST_BACKUP/.claude/skills/create-template-video/SKILL.md" "$REPO_ROOT/.claude/skills/create-template-video/SKILL.md" && echo "  ⟲ SKILL.md"
[[ -f "$LATEST_BACKUP/src/render/template-composer.ts" ]] && cp "$LATEST_BACKUP/src/render/template-composer.ts" "$REPO_ROOT/src/render/template-composer.ts" && echo "  ⟲ template-composer.ts"
[[ -f "$LATEST_BACKUP/README.md" ]] && cp "$LATEST_BACKUP/README.md" "$REPO_ROOT/README.md" && echo "  ⟲ README.md"
[[ -f "$LATEST_BACKUP/README.vi.md" ]] && cp "$LATEST_BACKUP/README.vi.md" "$REPO_ROOT/README.vi.md" && echo "  ⟲ README.vi.md"

rm -f "$REPO_ROOT/BRAND-EVOSE.md"

echo ""
echo "✅ Rollback hoàn tất!"
echo "📁 Backup vẫn còn: $LATEST_BACKUP"
