#!/usr/bin/env python3
"""
patch-pipeline.py — Tích hợp overlay + music vào template-pipeline.ts
Sau khi tạo video.mp4, tự động tạo video-evose.mp4 (overlay header/footer + nhạc).
→ 1 lệnh /create-template-video ra video hoàn chỉnh, KHÔNG cần finalize riêng.
"""
import sys
from pathlib import Path

# ============================================================
# patch_video_tools — fix freeze frame → loop (particle mượt)
# ============================================================
def patch_video_tools(repo_root):
    from pathlib import Path as _P
    vt = _P(repo_root) / "src" / "render" / "video-tools.ts"
    if not vt.exists():
        print("  ⚠️ video-tools.ts not found")
        return
    text = vt.read_text(encoding='utf-8')
    if "EVOSE: loop instead of freeze" in text:
        print("  ⚠️ video-tools.ts already patched")
        return

    # Thay fitClipToDuration: khi target > inDur, LOOP clip thay vì freeze frame cuối
    old = '''  const inDur = await getDurationSec(inPath);
  const target = Math.max(0.1, targetSec);
  const args = ["-y", "-i", inPath];
  if (target > inDur + 0.02) {
    const ext = target - inDur;
    args.push("-vf", `tpad=stop_mode=clone:stop_duration=${ext.toFixed(3)}`);
  }
  args.push("-t", target.toFixed(3), ...ENCODE(fps), outPath);
  await run("ffmpeg", args);'''

    new = '''  const inDur = await getDurationSec(inPath);
  const target = Math.max(0.1, targetSec);
  // EVOSE: loop instead of freeze — particle/blob animations keep moving
  // instead of holding a frozen last frame when narration is longer than the clip.
  if (target > inDur + 0.02) {
    const loops = Math.ceil(target / Math.max(0.1, inDur)) + 1;
    const args = ["-y", "-stream_loop", String(loops), "-i", inPath,
      "-t", target.toFixed(3), ...ENCODE(fps), outPath];
    await run("ffmpeg", args);
  } else {
    const args = ["-y", "-i", inPath, "-t", target.toFixed(3), ...ENCODE(fps), outPath];
    await run("ffmpeg", args);
  }'''

    if old in text:
        text = text.replace(old, new)
        vt.write_text(text, encoding='utf-8')
        print("  ✓ video-tools.ts patched (loop instead of freeze)")
    else:
        print("  ⚠️ fitClipToDuration body not matched — manual check needed")


def main():
    repo_root = Path(sys.argv[1]).resolve()
    pipeline = repo_root / "src" / "render" / "template-pipeline.ts"
    if not pipeline.exists():
        print(f"❌ {pipeline} not found")
        sys.exit(1)

    text = pipeline.read_text(encoding='utf-8')

    if "evoseFinalize" in text:
        print("  ⚠️ Pipeline already patched — skipping")
        return

    # 1. Thêm import ở đầu (sau dòng import cuối cùng liên quan video-tools)
    inject_import = '''import { spawn as evoseSpawn } from "node:child_process";
import { existsSync as evoseExists } from "node:fs";
'''
    # Chèn sau dòng đầu tiên có 'import'
    lines = text.split('\n')
    last_import_idx = 0
    for i, ln in enumerate(lines):
        if ln.strip().startswith('import '):
            last_import_idx = i
    lines.insert(last_import_idx + 1, inject_import)
    text = '\n'.join(lines)

    # 2. Thêm hàm evoseFinalize trước hàm chính (trước "export async function" đầu tiên hoặc cuối file)
    evose_func = '''
// ============================================================
// EVOSE BRAND: overlay header/footer + background music (auto)
// ============================================================
async function evoseFinalize(outputDir: string, videoPath: string, voiceMp3: string, durationSec: number): Promise<void> {
  const path = await import("node:path");
  const repoRoot = path.resolve(outputDir, "..", "..");
  const kitDir = path.join(repoRoot, "evose-brand-kit");
  const overlayPng = path.join(kitDir, "overlays", "overlay-frame.png");
  const musicCandidates = [
    path.join(kitDir, "music", "background.mp3"),
    path.join(outputDir, "..", "..", "evose-brand-kit", "music", "background.mp3"),
  ];
  let musicMp3 = musicCandidates[0];
  for (const c of musicCandidates) { if (evoseExists(c)) { musicMp3 = c; break; } }
  const finalOut = path.join(outputDir, "video-evose.mp4");

  const hasOverlay = evoseExists(overlayPng);
  const hasMusic = evoseExists(musicMp3);

  console.log(`\\n[evose] Finalize: overlay=${hasOverlay} music=${hasMusic}`);
  if (!hasMusic) {
    console.log(`[evose] ⚠️ KHONG tim thay nhac nen! Video se khong co nhac. Chay: ./evose-brand-kit/music/download-music.sh`);
  }
  if (!hasOverlay && !hasMusic) {
    console.log("[evose] Skipping finalize (no overlay/music found).");
    return;
  }

  const args: string[] = ["-y", "-loglevel", "warning"];
  args.push("-i", videoPath);
  if (hasOverlay) args.push("-i", overlayPng);
  if (hasMusic) args.push("-stream_loop", "-1", "-i", musicMp3);

  const filters: string[] = [];
  let vmap = "0:v";
  if (hasOverlay) {
    filters.push("[0:v][1:v]overlay=0:0:format=auto[vovr]");
    vmap = "[vovr]";
  }
  let amap = "0:a";
  if (hasMusic) {
    const mi = hasOverlay ? 2 : 1;
    filters.push(
      `[${mi}:a]volume=0.28[mus];` +
      `[0:a]asplit=2[vm][vs];` +
      `[mus][vs]sidechaincompress=threshold=0.04:ratio=10:attack=80:release=400[md];` +
      `[vm][md]amix=inputs=2:duration=first:dropout_transition=0[ao]`
    );
    amap = "[ao]";
  }
  if (filters.length) args.push("-filter_complex", filters.join(";"));
  args.push("-map", vmap, "-map", amap);
  args.push("-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p");
  args.push("-c:a", "aac", "-b:a", "192k");
  args.push("-t", String(durationSec));
  args.push(finalOut);

  await new Promise<void>((resolve, reject) => {
    const proc = evoseSpawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"], shell: false });
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`evose finalize ffmpeg exit ${code}`)));
    proc.on("error", reject);
  });
  console.log(`[evose] OK Final video: ${finalOut}`);
}
'''

    # Chèn func trước "// STEP 8 — done" hoặc trước export function chính
    # Tìm vị trí an toàn: trước dòng có "export async function" cuối hoặc đầu file sau imports
    marker = "export async function"
    idx = text.find(marker)
    if idx > 0:
        text = text[:idx] + evose_func + "\n" + text[idx:]
    else:
        text += evose_func

    # 3. Gọi evoseFinalize sau muxAudioOntoVideo
    call_site = 'await muxAudioOntoVideo(silentVideo, voiceMp3, videoPath);'
    if call_site in text:
        text = text.replace(
            call_site,
            call_site + '\n\n  // EVOSE: auto overlay + music\n  try {\n    await evoseFinalize(outputDir, videoPath, voiceMp3, totalAudioSec);\n  } catch (e) {\n    console.error("[evose] finalize failed (video.mp4 still OK):", e);\n  }'
        )

    # 4. Update final log để trỏ tới video-evose.mp4
    text = text.replace(
        'console.log(`Video:  ${videoPath}`);',
        'console.log(`Video:  ${videoPath}`);\n  console.log(`Video (Evose, FINAL):  ${join(outputDir, "video-evose.mp4")}  ← DÙNG FILE NÀY`);'
    )

    pipeline.write_text(text, encoding='utf-8')
    print("  ✓ template-pipeline.ts patched (auto overlay+music)")

    # Patch video-tools.ts (freeze → loop)
    patch_video_tools(repo_root)

if __name__ == "__main__":
    main()
