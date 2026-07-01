#!/usr/bin/env bash
# ============================================================
# evose-finalize.sh
# Post-processing: thêm overlay header+footer + background music
# vào video đã render bởi npm run pipeline.
# ============================================================
# Usage: ./evose-finalize.sh path/to/output/<slug>/
#   Sẽ output ra: <slug>/video-evose.mp4 (final)
# ============================================================
set -e

INPUT_DIR="${1:-}"
if [[ -z "$INPUT_DIR" || ! -d "$INPUT_DIR" ]]; then
  echo "Usage: ./evose-finalize.sh path/to/output/<slug>/"
  echo "  (folder phải chứa video.mp4 và voice.mp3)"
  exit 1
fi

# Path resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$INPUT_DIR/../.." && pwd)"
INPUT_DIR="$(cd "$INPUT_DIR" && pwd)"

VIDEO_IN="$INPUT_DIR/video.mp4"
VOICE_IN="$INPUT_DIR/voice.mp3"
OUTPUT="$INPUT_DIR/video-evose.mp4"

OVERLAY_PNG="$SCRIPT_DIR/overlays/overlay-frame.png"
MUSIC="$SCRIPT_DIR/music/background.mp3"

echo "🎬 Evose Finalize"
echo "  Video in:  $VIDEO_IN"
echo "  Voice in:  $VOICE_IN"
echo "  Overlay:   $OVERLAY_PNG"
echo "  Music:     $MUSIC"
echo "  Output:    $OUTPUT"
echo ""

# Validate inputs
if [[ ! -f "$VIDEO_IN" ]]; then
  echo "❌ video.mp4 not found in $INPUT_DIR"
  exit 1
fi
if [[ ! -f "$VOICE_IN" ]]; then
  echo "❌ voice.mp3 not found in $INPUT_DIR"
  exit 1
fi

# Generate overlay PNG if missing
if [[ ! -f "$OVERLAY_PNG" ]]; then
  echo "⚠️  overlay-frame.png missing — generating now..."
  "$SCRIPT_DIR/overlays/generate-overlay-png.sh"
fi

# Get video duration
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO_IN")
echo "  Duration: ${DURATION}s"
echo ""

HAS_MUSIC=0
if [[ -f "$MUSIC" ]]; then HAS_MUSIC=1; fi

if [[ $HAS_MUSIC -eq 1 ]]; then
  echo "🎵 Mixing with background music + audio ducking (28% volume, ducks when voice present)..."
  ffmpeg -y -loglevel warning \
    -i "$VIDEO_IN" \
    -i "$VOICE_IN" \
    -i "$OVERLAY_PNG" \
    -stream_loop -1 -i "$MUSIC" \
    -filter_complex "
      [0:v][2:v]overlay=0:0:format=auto[vovr];
      [3:a]volume=0.28,aloop=loop=-1:size=2e9[mus_loud];
      [1:a]asplit=2[v_main][v_sidechain];
      [mus_loud][v_sidechain]sidechaincompress=threshold=0.04:ratio=10:attack=80:release=400[mus_ducked];
      [v_main][mus_ducked]amix=inputs=2:duration=longest:dropout_transition=0[aout]
    " \
    -map "[vovr]" -map "[aout]" \
    -c:v libx264 -preset fast -crf 20 \
    -c:a aac -b:a 192k \
    -t "$DURATION" \
    -pix_fmt yuv420p \
    -shortest \
    "$OUTPUT"
else
  echo "🎬 Applying overlay only (no music file found at $MUSIC)..."
  ffmpeg -y -loglevel warning \
    -i "$VIDEO_IN" \
    -i "$OVERLAY_PNG" \
    -i "$VOICE_IN" \
    -filter_complex "[0:v][1:v]overlay=0:0:format=auto[vovr]" \
    -map "[vovr]" -map "2:a" \
    -c:v libx264 -preset fast -crf 20 \
    -c:a aac -b:a 192k \
    -t "$DURATION" \
    -pix_fmt yuv420p \
    "$OUTPUT"
fi

if [[ -f "$OUTPUT" ]]; then
  SIZE=$(du -h "$OUTPUT" | cut -f1)
  echo ""
  echo "✅ Finalized video: $OUTPUT ($SIZE)"
  echo ""
  echo "▶️ Mở video:"
  echo "   open '$OUTPUT'"
else
  echo "❌ Finalize failed"
  exit 1
fi
