#!/usr/bin/env bash
# ============================================================
# download-music.sh
# Download background music từ YouTube link cho video Evose.
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_MP3="$SCRIPT_DIR/background.mp3"

# Link mặc định (theo Q9 user yêu cầu)
MUSIC_URL="${1:-https://www.youtube.com/watch?v=4hVVsVjgTkU}"

echo "🎵 Evose Background Music Downloader"
echo "  URL:    $MUSIC_URL"
echo "  Output: $OUT_MP3"
echo ""

# Check yt-dlp
if ! command -v yt-dlp &> /dev/null; then
  echo "📦 Installing yt-dlp..."
  if command -v brew &> /dev/null; then
    brew install yt-dlp
  else
    pip3 install --user yt-dlp || pip install --user yt-dlp
    export PATH="$HOME/.local/bin:$PATH"
  fi
fi

if ! command -v yt-dlp &> /dev/null; then
  echo "❌ yt-dlp install failed. Try manually: brew install yt-dlp"
  exit 1
fi

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ ffmpeg not found. Run: brew install ffmpeg"
  exit 1
fi

# Download audio only, convert to mp3
echo "⬇️  Downloading audio..."
yt-dlp \
  -x \
  --audio-format mp3 \
  --audio-quality 0 \
  --no-playlist \
  -o "$OUT_MP3" \
  "$MUSIC_URL"

if [[ -f "$OUT_MP3" ]]; then
  SIZE=$(du -h "$OUT_MP3" | cut -f1)
  DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT_MP3" 2>/dev/null | head -c 6)
  echo ""
  echo "✅ Downloaded: $OUT_MP3"
  echo "   Size: $SIZE"
  echo "   Duration: ${DURATION}s"
  echo ""
  echo "🎬 Bây giờ bạn có thể chạy:"
  echo "   ./evose-brand-kit/evose-finalize.sh output/<slug>/"
else
  echo "❌ Download failed"
  exit 1
fi
