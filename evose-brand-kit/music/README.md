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
Trong `evose-finalize.sh`, nhạc được mix với:
- Volume cơ bản: **28%** (so với voice)
- **Audio ducking**: tự động giảm xuống khi voice đang nói, lên lại khi voice nghỉ
- Threshold: 0.04, Ratio: 10:1, Attack: 80ms, Release: 400ms
