#!/usr/bin/env bash
# generate-overlay-png.sh
# Render overlay-frame.html → overlay-frame.png (1080x1920, transparent bg)
# Yêu cầu: Google Chrome (đã có trong repo setup)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML_PATH="$SCRIPT_DIR/overlay-frame.html"
PNG_OUT="$SCRIPT_DIR/overlay-frame.png"

echo "📸 Generating Evose overlay PNG..."
echo "  HTML: $HTML_PATH"
echo "  PNG:  $PNG_OUT"

# Detect Chrome
CHROME=""
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         "$(which google-chrome 2>/dev/null)" \
         "$(which chromium 2>/dev/null)" \
         "$(which chrome 2>/dev/null)"; do
  if [[ -x "$c" ]]; then CHROME="$c"; break; fi
done

if [[ -z "$CHROME" ]]; then
  echo "❌ Google Chrome not found. Install from https://www.google.com/chrome/"
  exit 1
fi

echo "  Chrome: $CHROME"

# Render với transparent background
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --default-background-color=00000000 \
  --window-size=1080,1920 \
  --screenshot="$PNG_OUT" \
  "file://$HTML_PATH"

if [[ -f "$PNG_OUT" ]]; then
  SIZE=$(du -h "$PNG_OUT" | cut -f1)
  echo "✓ Generated: $PNG_OUT ($SIZE)"
else
  echo "❌ Failed to generate overlay PNG"
  exit 1
fi
