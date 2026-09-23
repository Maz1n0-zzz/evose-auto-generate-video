# Evose Background Music

Folder này chứa file nhạc nền cho video.

## Cách dùng

### Option A: Auto-download từ YouTube Audio Library (recommended)

```bash
./download-music.sh
```

Sẽ tải track từ link YouTube bạn đã chọn:
https://www.youtube.com/watch?v=4hVVsVjgTkU

→ Output: `background.mp3` (cùng folder)

### Option B: Dùng nhạc của riêng bạn

Đặt file MP3 (license OK cho commercial) vào folder này, đổi tên thành `background.mp3`.

### Option C: Đổi sang track khác từ YouTube Audio Library

```bash
./download-music.sh "https://www.youtube.com/watch?v=<VIDEO_ID>"
```

## Yêu cầu license
- ✓ YouTube Audio Library tracks (free, no copyright)
- ✓ Pixabay Music (CC0)
- ✓ Tracks bạn đã mua license
- ✗ Tránh: bản nhạc thương mại không license rõ ràng

## Volume
Trong `src/render/brand-finalize.ts`, nhạc được mix với:
- Volume cơ bản: **80%**, chốt 2026-09-23 (bản E)
- **Audio ducking**: nhạc hạ ~9 dB khi voice nói, lên lại sau 250ms khi voice nghỉ
- Tham số FFmpeg: `sidechaincompress=threshold=0.03:ratio=12:attack=20:release=250`
