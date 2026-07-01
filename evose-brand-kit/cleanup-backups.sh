#!/bin/bash
# Don cac thu muc backup cu (.evose-backup-*) de giam dung luong repo.
# Chay tu BAT KY dau: ./evose-brand-kit/cleanup-backups.sh  HOAC  cd evose-brand-kit && ./cleanup-backups.sh
set -e

# Tim repo root: tu thu muc hien tai di len cho den khi thay .evose-backup-* hoac templates/
find_root() {
  local d="$PWD"
  for i in 1 2 3 4; do
    if ls "$d"/.evose-backup-* >/dev/null 2>&1 || [ -d "$d/templates" ]; then
      echo "$d"; return 0
    fi
    d="$(dirname "$d")"
  done
  # Fallback: thu muc cha cua script
  echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
}

ROOT="$(find_root)"
cd "$ROOT"
echo "📁 Repo: $ROOT"

BACKUPS=$(ls -dt .evose-backup-* 2>/dev/null || true)
if [ -z "$BACKUPS" ]; then
  echo "   Khong tim thay backup nao (.evose-backup-*). Khong can don."
  exit 0
fi
COUNT=$(echo "$BACKUPS" | grep -c . || echo 0)
echo "   Tim thay $COUNT backup."
if [ "$COUNT" -le 1 ]; then
  echo "   Chi co 1 backup — giu lai, khong don."
  exit 0
fi

KEEP=$(echo "$BACKUPS" | head -1)
echo "   ✓ Giu backup moi nhat: $KEEP"
SAVED=0
echo "$BACKUPS" | tail -n +2 | while read -r d; do
  if [ -n "$d" ] && [ -d "$d" ]; then
    SZ=$(du -sm "$d" 2>/dev/null | cut -f1)
    rm -rf "$d"
    echo "   ✗ Da xoa: $d (~${SZ}MB)"
  fi
done
echo "✅ Xong! Da don backup cu."
