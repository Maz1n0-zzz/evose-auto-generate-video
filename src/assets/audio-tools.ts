import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

function run(cmd: string, args: string[]): Promise<string> {
  return runBoth(cmd, args).then((r) => r.stdout);
}

function runBoth(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let out = "", err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(new Error(`${cmd} failed (exit ${code}): ${err}`));
    });
    proc.on("error", reject);
  });
}

/**
 * Mức to đích cho file giọng, tính bằng LUFS.
 *
 * -16 LUFS là mức quen dùng cho tiếng nói trên mạng xã hội: đủ to để nghe rõ
 * trên loa điện thoại mà vẫn còn chỗ trống phía trên cho nhạc nền và SFX chồng
 * lên mà không vỡ tiếng.
 */
export const TARGET_LUFS = -16;

/** Đỉnh thật không được vượt mức này (dBTP) — chừa chỗ cho khâu nén mp3. */
const PEAK_CEILING_DB = -1;

/** Kéo tối đa bấy nhiêu dB. Chặn để đoạn gần như im lặng — cảnh thu hụt, cảnh
 *  chỉ còn tiếng thở — không bị thổi tiếng ồn nền lên thành tiếng rõ. */
const MAX_GAIN_DB = 12;

/**
 * Cho phép đỉnh vượt trần bấy nhiêu dB trước khi bộ hãm kéo lại.
 *
 * Giọng đọc có đỉnh nhọn hơn hẳn mức trung bình — chênh lệch 18–20 dB là
 * thường. Nếu bắt riêng đỉnh phải nằm dưới trần thì gain bị chặn còn 2–3 dB
 * và không cảnh nào lên nổi mức đích. `eleven_flash_v2_5` dính đúng chỗ này:
 * trả về khoảng -22 LUFS nhưng đỉnh đã ở -4 dBTP.
 *
 * Nên kéo đủ tay rồi hãm riêng phần đỉnh — đúng cách các bộ chuẩn hoá phát
 * thanh vẫn làm. Giới hạn ở 6 dB để bộ hãm chỉ gọt vài đỉnh nhọn chứ không
 * ghì cả câu, tránh giọng nghe thở dốc.
 */
const MAX_LIMITING_DB = 6;

export interface LoudnessInfo {
  /** Độ to trung bình cả file (LUFS). `-Infinity` nếu file câm. */
  integratedLufs: number;
  /** Đỉnh thật (dBTP). `-Infinity` nếu file câm. */
  truePeakDb: number;
}

/** ffmpeg in "-inf" cho file câm; parseFloat sẽ ra NaN nếu không xử riêng. */
function parseLevel(raw: string | undefined): number {
  if (raw === undefined) return NaN;
  const t = raw.trim();
  if (t === "-inf") return -Infinity;
  if (t === "inf") return Infinity;
  return parseFloat(t);
}

/**
 * Đo độ to của một file bằng bộ lọc `loudnorm` của ffmpeg (lượt đo, không ghi
 * ra file). Đây là lượt 1 của cách chuẩn hoá hai lượt.
 */
export async function measureLoudness(path: string): Promise<LoudnessInfo> {
  const { stderr } = await runBoth("ffmpeg", [
    "-hide_banner", "-nostats",
    "-i", path,
    "-af", "loudnorm=print_format=json",
    "-f", "null", "-",
  ]);
  // JSON nằm ở cuối stderr, sau các dòng log — lấy khối ngoặc nhọn cuối cùng.
  const start = stderr.lastIndexOf("{");
  const end = stderr.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`measureLoudness: không đọc được kết quả loudnorm cho ${path}`);
  }
  const parsed = JSON.parse(stderr.slice(start, end + 1)) as Record<string, string>;
  const integratedLufs = parseLevel(parsed.input_i);
  const truePeakDb = parseLevel(parsed.input_tp);
  if (Number.isNaN(integratedLufs)) {
    throw new Error(`measureLoudness: loudnorm trả input_i không hợp lệ cho ${path}`);
  }
  return { integratedLufs, truePeakDb };
}

/**
 * Tính mức chỉnh (dB) để đưa một đoạn về `targetLufs`.
 *
 * Cố ý dùng gain TĨNH chứ không chạy `loudnorm` để ghi đè: việc cần làm là kéo
 * các cảnh về ngang nhau, không phải nén dải động bên trong từng cảnh. Gain
 * tĩnh giữ nguyên nhịp lên xuống của giọng đọc; `loudnorm` sẽ san phẳng nó và
 * làm giọng nghe bẹt.
 *
 * Phần đỉnh vượt trần do bộ hãm (`alimiter`) lo ở khâu ghép, nên ở đây chỉ
 * chặn cho bộ hãm khỏi phải làm quá nặng tay.
 */
export function gainForTarget(info: LoudnessInfo, targetLufs = TARGET_LUFS): number {
  // Câm hoặc gần câm thì không có gì để kéo.
  if (!Number.isFinite(info.integratedLufs)) return 0;

  const wanted = Math.min(targetLufs - info.integratedLufs, MAX_GAIN_DB);
  if (!Number.isFinite(info.truePeakDb)) return wanted;
  const peakRoom = PEAK_CEILING_DB - info.truePeakDb;
  return Math.min(wanted, peakRoom + MAX_LIMITING_DB);
}

/**
 * Chuỗi bộ lọc đưa một đoạn về mức đích: kéo gain rồi hãm đỉnh.
 *
 * Chỉ hãm khi có kéo LÊN — hạ xuống thì đỉnh tự thấp theo, thêm bộ hãm chỉ
 * tốn công. Dưới 0.1 dB thì tai không nghe ra, bỏ hẳn cho gọn chuỗi.
 * Trả về chuỗi kết thúc bằng dấu phẩy để nối tiếp vào chuỗi lọc phía sau.
 */
function levelSteps(gainDb: number): string {
  if (Math.abs(gainDb) < 0.1) return "";
  const volume = `volume=${gainDb.toFixed(2)}dB,`;
  if (gainDb <= 0) return volume;
  // `limit` của alimiter tính theo biên độ tuyến tính, không phải dB.
  // `level=0` tắt phần tự động chỉnh mức của nó — ta tự quyết mức rồi.
  const limit = Math.pow(10, PEAK_CEILING_DB / 20).toFixed(4);
  return `${volume}alimiter=limit=${limit}:level=0,`;
}

export async function getDurationSec(path: string): Promise<number> {
  // For MP3 files, ffprobe's format=duration estimates duration from bitrate×filesize
  // and is often wrong for TTS-generated files (e.g. OmniVoice 24kHz MPEG-2 L3 can
  // be off by 30%+). Count actual encoded packets instead: each MP3 frame contains
  // 1152 samples (MPEG-1, sr≥32kHz) or 576 samples (MPEG-2/2.5, sr<32kHz).
  if (path.toLowerCase().endsWith(".mp3")) {
    try {
      const raw = await run("ffprobe", [
        "-v", "error",
        "-count_packets",
        "-select_streams", "a:0",
        "-show_entries", "stream=nb_read_packets,sample_rate",
        "-of", "json",
        path,
      ]);
      const data = JSON.parse(raw);
      const stream = data?.streams?.[0];
      const packets = parseInt(stream?.nb_read_packets ?? "", 10);
      const sampleRate = parseInt(stream?.sample_rate ?? "", 10);
      if (packets > 0 && sampleRate > 0) {
        // MPEG-1 L3 (32/44.1/48 kHz): 1152 samples/frame
        // MPEG-2/2.5 L3 (≤24 kHz): 576 samples/frame
        const samplesPerFrame = sampleRate >= 32000 ? 1152 : 576;
        return (packets * samplesPerFrame) / sampleRate;
      }
    } catch {
      // fall through to format duration below
    }
  }

  const out = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path,
  ]);
  const d = parseFloat(out.trim());
  if (isNaN(d)) throw new Error(`ffprobe returned non-numeric duration for ${path}: ${out}`);
  return d;
}

/**
 * Concatenate audio files with `gapSec` silence between each, producing a single
 * output mp3.
 *
 * Uses ffmpeg's CONCAT FILTER (not concat demuxer) with explicit sample-rate /
 * channel normalization to avoid clicks/pops at boundaries. Each input is also
 * given a tiny 8 ms fade-in/fade-out which inaudibly smooths any DC offset
 * discontinuity at the boundary — this eliminates the "pét" clicking sound.
 *
 * Mỗi cảnh còn được kéo về cùng một mức to (`TARGET_LUFS`) trước khi nối. Mỗi
 * cảnh là một lần gọi TTS riêng nên độ to giữa các cảnh vênh nhau, nghe rõ ở
 * chỗ chuyển cảnh — chuyện này KHÁC với chuyện lệch ngữ điệu và phải xử riêng.
 */
export async function concatWithSilence(
  inputPaths: string[],
  gapSec: number,
  outPath: string,
): Promise<void> {
  if (inputPaths.length === 0) throw new Error("concatWithSilence: empty inputPaths");

  // Đo trước toàn bộ, rồi mới ghép — lượt 1 của cách chuẩn hoá hai lượt.
  const gains = await Promise.all(
    inputPaths.map(async (p) => gainForTarget(await measureLoudness(p))),
  );
  if (inputPaths.length === 1) {
    // No concat needed — just normalize the single file
    await run("ffmpeg", [
      "-y", "-i", inputPaths[0],
      "-af", `${levelSteps(gains[0])}aresample=44100`,
      "-ar", "44100", "-ac", "1",
      "-c:a", "libmp3lame", "-b:a", "192k",
      outPath,
    ]);
    return;
  }

  const tmp = await mkdtemp(join(tmpdir(), "concat-"));
  try {
    // Generate WAV silence (lossless, no encoder priming pops)
    const silencePath = join(tmp, "silence.wav");
    await run("ffmpeg", [
      "-y", "-f", "lavfi",
      "-i", `anullsrc=r=44100:cl=mono`,
      "-t", String(gapSec),
      "-ac", "1", "-ar", "44100",
      silencePath,
    ]);

    // Build ffmpeg input args + concat filter graph.
    // We interleave: voice[0] silence voice[1] silence voice[2] ... voice[N-1]
    // Each is fed through a chain that:
    //   1) resamples to 44100 mono (aresample with high-quality)
    //   2) applies a tiny 8ms fade-in + fade-out (inaudible but smooths boundary)
    // Then all are concatenated by the `concat=n=K:v=0:a=1` filter.
    const ffArgs: string[] = ["-y"];
    const filterParts: string[] = [];
    const labels: string[] = [];
    let idx = 0;
    const FADE_SEC = 0.008; // 8ms — inaudible

    const addInput = (path: string, gainDb = 0) => {
      ffArgs.push("-i", path);
      const inLabel = `[${idx}:a]`;
      const outLabel = `a${idx}`;
      // Pre-pad: we cannot know exact duration here without probing every input,
      // so use afade with `t=in/out:st=...` and rely on `acrossfade` style.
      // Simpler robust trick: use afade `st` for in, and `afade=t=out` with
      // start_time=eof-FADE_SEC by providing duration after `-t` is hard.
      // Use `afade=t=in:st=0:d=FADE` then `afade=t=out:st=0:d=FADE` won't work
      // for variable-length inputs. So we use `apad=pad_dur=0` (no-op) +
      // `aresample` then rely on concat filter doing sample-accurate join.
      // The micro-fade is applied via `areverse,afade,areverse` trick to fade out:
      filterParts.push(
        `${inLabel}${levelSteps(gainDb)}` +
        `aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono,` +
        `afade=t=in:st=0:d=${FADE_SEC},` +
        // Trim fade-out: reverse → fade-in → reverse (this fades the END)
        `areverse,afade=t=in:st=0:d=${FADE_SEC},areverse[${outLabel}]`
      );
      labels.push(`[${outLabel}]`);
      idx++;
    };

    inputPaths.forEach((p, i) => {
      addInput(p, gains[i]);
      if (i < inputPaths.length - 1) addInput(silencePath);
    });

    const concatFilter = `${labels.join("")}concat=n=${labels.length}:v=0:a=1[out]`;
    const filterGraph = `${filterParts.join(";")};${concatFilter}`;

    ffArgs.push(
      "-filter_complex", filterGraph,
      "-map", "[out]",
      "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100",
      outPath,
    );

    await run("ffmpeg", ffArgs);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

export interface SfxMixSpec {
  /** Absolute path to SFX mp3/wav file */
  path: string;
  /** Time in seconds (within voice.mp3) when SFX starts */
  startSec: number;
  /** Volume 0–1 */
  volume: number;
}

/**
 * Mix SFX layer onto an existing voice mp3.
 *
 * - Voice stays at full volume
 * - Each SFX is delayed to its `startSec` and scaled by its `volume`
 * - All SFX layers are summed, then mixed with voice (amix duration=first)
 * - Output is mp3 at 192kbps
 *
 * If `sfxList` is empty, just copies voicePath → outPath.
 */
export async function mixSfxOntoVoice(
  voicePath: string,
  sfxList: SfxMixSpec[],
  outPath: string,
): Promise<void> {
  if (sfxList.length === 0) {
    // No SFX — just normalize/copy voice
    await run("ffmpeg", [
      "-y", "-i", voicePath,
      "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100",
      outPath,
    ]);
    return;
  }

  const ffArgs: string[] = ["-y", "-i", voicePath];
  const filterParts: string[] = [];
  const sfxLabels: string[] = [];

  sfxList.forEach((s, i) => {
    ffArgs.push("-i", s.path);
    const inputIdx = i + 1; // voice is index 0
    const outLabel = `s${i}`;
    const delayMs = Math.max(0, Math.round(s.startSec * 1000));
    // Per-SFX chain: resample to 44100 mono → adelay to start time → volume
    filterParts.push(
      `[${inputIdx}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono,` +
      `adelay=${delayMs}|${delayMs},volume=${s.volume}[${outLabel}]`
    );
    sfxLabels.push(`[${outLabel}]`);
  });

  // Mix all SFX layers together
  let mixedSfxLabel: string;
  if (sfxLabels.length === 1) {
    mixedSfxLabel = sfxLabels[0];
  } else {
    filterParts.push(
      `${sfxLabels.join("")}amix=inputs=${sfxLabels.length}:dropout_transition=0:normalize=0[sfxall]`
    );
    mixedSfxLabel = "[sfxall]";
  }

  // Voice path: resample, then mix with SFX layer (voice volume 1.0, SFX already scaled)
  filterParts.push(
    `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono[voice]`
  );
  filterParts.push(
    `[voice]${mixedSfxLabel}amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out]`
  );

  ffArgs.push(
    "-filter_complex", filterParts.join(";"),
    "-map", "[out]",
    "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100",
    outPath,
  );

  await run("ffmpeg", ffArgs);
}

/**
 * Tạo một file mp3 CÂM dài `sec` giây.
 *
 * Dùng cho cảnh không có lời đọc (vd cảnh mở chỉ có nhạc). Làm ra một file
 * giọng THẬT thay vì xử lý cảnh câm như trường hợp đặc biệt, nhờ vậy mọi bước
 * phía sau — ghép giọng, tính mốc thời gian, cắt clip theo giọng — chạy y
 * nguyên, không phải sửa gì.
 */
export async function makeSilence(sec: number, outPath: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const args = ["-y", "-loglevel", "error", "-f", "lavfi",
    "-i", "anullsrc=r=44100:cl=mono", "-t", String(sec),
    "-c:a", "libmp3lame", "-b:a", "128k", outPath];
  await new Promise<void>((res, rej) => {
    const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`makeSilence ffmpeg thoát mã ${c}`))));
    p.on("error", rej);
  });
}

/**
 * Cắt lấy đoạn `[startSec, endSec)` của một file âm thanh.
 *
 * `-ss` đặt SAU `-i` để ffmpeg tua chính xác tới mẫu thay vì nhảy theo khung
 * — cắt bản đọc chung ra từng cảnh thì sai vài chục mili giây là nghe hụt chữ.
 */
export async function cutAudio(
  inPath: string,
  startSec: number,
  endSec: number,
  outPath: string,
): Promise<void> {
  if (!(endSec > startSec)) {
    throw new Error(`cutAudio: khoảng cắt không hợp lệ (${startSec} → ${endSec})`);
  }
  await run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-i", inPath,
    "-ss", startSec.toFixed(3),
    "-to", endSec.toFixed(3),
    "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100", "-ac", "1",
    outPath,
  ]);
}

/**
 * Nối thêm `sec` giây lặng vào CUỐI một file giọng.
 *
 * Dùng khi một cảnh cần đứng hình lâu hơn lời đọc — ví dụ cảnh mở có tựa dài,
 * người xem cần thời gian đọc hết. Kéo dài bằng cách thêm lặng vào chính file
 * giọng (chứ không chỉ kéo dài phần hình) để hình và tiếng của các cảnh sau
 * không bị lệch nhau.
 */
export async function padSilence(inPath: string, sec: number, outPath: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const args = ["-y", "-loglevel", "error", "-i", inPath,
    "-af", `apad=pad_dur=${sec}`, "-c:a", "libmp3lame", "-b:a", "128k", outPath];
  await new Promise<void>((res, rej) => {
    const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`padSilence ffmpeg thoát mã ${c}`))));
    p.on("error", rej);
  });
}
