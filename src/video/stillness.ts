/**
 * Đo tỉ lệ hình đứng yên, theo từng khung storyboard.
 *
 * Lấy mẫu 10 hình/giây, cắt vùng nội dung y 290–1520 (bỏ header logo, phụ đề,
 * footer), thu nhỏ 10 lần, so hai hình liền nhau. Chênh xám trung bình dưới
 * ngưỡng thì tính là đứng yên. Bản v2 bị chê đo được 60%, bản mới duyệt được 17%.
 *
 * Vùng cắt y 290–1520 ở trên là của khung dọc 1080×1920 (Evose, WTC, DecodeFX).
 * Khung ngang 16:9 có dải riêng y 96–880. Tỉ lệ nào khác hai khổ đó thì đo toàn
 * khung, và con số ra lệch về phía đứng yên vì nó gồm cả lề trên và dải phụ đề.
 * Xem `cropFor` và trường `regime`.
 *
 * Mốc "duyệt 17%" chỉ hiệu chuẩn trên khổ DỌC. Đừng đem so với số của khổ khác.
 */

import { capture } from "./lib.js";

const FPS = 10;
const THRESH = 0.35;
export const MAX_STILL_SEC = 1.5;

export interface FrameStillness {
  frame: number;
  stillRatio: number;
  longestStillSec: number;
  pass: boolean;
}

export interface StillnessReport {
  overallStillRatio: number;
  longestStillSec: number;
  frames: FrameStillness[];
  /** Vùng nào đã được đo. Người đọc `stillness.json` phải biết điều này,
   *  vì chỉ `vertical` mới so được với mốc 17% đã duyệt. */
  regime?: CropRegime;
}

export function analyse(diffs: readonly number[], bounds: readonly { frame: number; start: number; end: number }[]): StillnessReport {
  const still = diffs.map((d) => d < THRESH);
  const frames = bounds.map(({ frame, start, end }) => {
    const seg = still.slice(Math.floor(start * FPS), Math.min(Math.floor(end * FPS), still.length));
    let run = 0;
    let best = 0;
    for (const s of seg) {
      run = s ? run + 1 : 0;
      best = Math.max(best, run);
    }
    const longest = best / FPS;
    return {
      frame,
      stillRatio: seg.length ? +(seg.filter(Boolean).length / seg.length).toFixed(3) : 0,
      longestStillSec: +longest.toFixed(2),
      pass: longest <= MAX_STILL_SEC,
    };
  });
  return {
    overallStillRatio: still.length ? +(still.filter(Boolean).length / still.length).toFixed(3) : 0,
    longestStillSec: Math.max(0, ...frames.map((f) => f.longestStillSec)),
    frames,
  };
}

/** Dải nội dung của khung dọc, tính theo tỉ lệ chiều cao thay vì số pixel cứng.
 *  290/1920 và 1230/1920 là đúng hai con số đã duyệt cho 1080×1920. */
const BAND_TOP = 290 / 1920;
const BAND_HEIGHT = 1230 / 1920;
/** Dải nội dung của khung ngang 16:9. `captionBand(1080)` cho foregroundMaxY = 880,
 *  lớp phủ của bộ Mazino phủ từ y 900 xuống, nên vùng đo là y 96 tới 880. */
const WIDE_TOP = 96 / 1080;
const WIDE_HEIGHT = 784 / 1080;
/** Nhận ra khung ở mọi độ phân giải. 0.5625 = 9/16, 1.7778 = 16/9.
 *  Dung sai TƯƠNG ĐỐI 1,5%, không phải sai số tuyệt đối: cùng một con số tuyệt đối
 *  0.02 nới khung dọc tới 3,5% mà chỉ nới khung ngang 1,1%. Mốc 1,5% nhận 1920×1088
 *  (bản 1080p mã hoá, lệch 0,74%) và 1366×768, nhưng loại 4:5 và 16:10. */
const NINE_BY_SIXTEEN = 9 / 16;
const SIXTEEN_BY_NINE = 16 / 9;
const ASPECT_TOL = 0.015;

/** Vùng nào đã được đo. Tên này nói đúng việc nó làm, khác cờ `calibrated` cũ:
 *  cờ kia trả true cho cả khung ngang trong khi ngưỡng THRESH chưa từng được
 *  hiệu chuẩn trên khổ đó, nên nó nói dối về chính nghĩa của mình. */
export type CropRegime = "vertical" | "wide" | "full";

export interface CropPlan {
  crop: string;
  sw: number;
  sh: number;
  /** `vertical` là khổ duy nhất ngưỡng THRESH và mốc 17% được hiệu chuẩn trên.
   *  `wide` đã cắt đúng dải nội dung nhưng con số KHÔNG so thẳng với mốc đó.
   *  `full` còn kể cả lề trên và dải phụ đề, hai vùng vốn đứng yên, nên tỉ lệ
   *  đo được LỆCH VỀ PHÍA đứng yên và `pass` có thể sai. */
  regime: CropRegime;
}

/**
 * Vùng cắt và cỡ thu nhỏ cho một khung hình.
 *
 * Khung dọc 9:16 bỏ header logo và dải phụ đề cộng footer, chỉ đo phần nội dung.
 * Ở 1080×1920 công thức ra đúng `crop=1080:1230:0:290` như bản cũ, đã đối chiếu
 * băm sha256 trên hai video đã render ngày 22/10/2026 và giống từng byte.
 *
 * Khung ngang 16:9 bỏ lề trên và dải phụ đề cộng lớp phủ, đo y 96 tới 880.
 * Ngưỡng THRESH chưa được hiệu chuẩn lại cho khổ này, nên cờ `calibrated` vẫn
 * là true về mặt "đã cắt đúng vùng nội dung" nhưng mốc 17% của khung dọc KHÔNG
 * đem so thẳng được. Khổ nào khác hai tỉ lệ trên thì đo toàn khung.
 */
export function cropFor(w: number, h: number): CropPlan {
  const full = (): CropPlan => ({
    crop: "crop=iw:ih:0:0",
    sw: Math.max(1, Math.round(w / 10)),
    sh: Math.max(1, Math.round(h / 10)),
    regime: "full",
  });
  const off = (target: number) => Math.abs(w / h / target - 1);
  const band =
    off(NINE_BY_SIXTEEN) <= ASPECT_TOL
      ? { top: BAND_TOP, height: BAND_HEIGHT, sw: 108, sh: 123, regime: "vertical" as const }
      : off(SIXTEEN_BY_NINE) <= ASPECT_TOL
        ? { top: WIDE_TOP, height: WIDE_HEIGHT, sw: 192, sh: 78, regime: "wide" as const }
        : null;
  if (!band) return full();
  const top = Math.round(h * band.top);
  const height = Math.round(h * band.height);
  // Phép xác nhận hai hằng số dải, KHÔNG phải lưới chắn cho dữ liệu quay:
  // ffprobe trả w và h tự nhất quán với nhau, nên phép này không bao giờ bắt
  // được ca rotate=90. Sửa hằng số ở trên mà lệch thì nó đổi sang đo toàn khung
  // thay vì để ffmpeg chết giữa chừng.
  if (top + height > h || height < 1) return full();
  return { crop: `crop=${w}:${height}:0:${top}`, sw: band.sw, sh: band.sh, regime: band.regime };
}

/** Kích thước MÃ HOÁ của luồng hình đầu tiên, không phải kích thước hiển thị.
 *  `stream=width,height` bỏ qua ma trận quay, nên một clip 1920×1080 có
 *  rotate=90 vẫn báo 1920×1080 trong khi bộ lọc nhận 1080×1920. Hiện không
 *  ảnh hưởng vì `measure` chỉ chạy trên bản render thô của HyperFrames. */
export function parseSize(text: string, video = "(không rõ)"): { w: number; h: number } {
  const m = /^(\d+)x(\d+)$/.exec(text.trim());
  if (!m) throw new Error(`ffprobe trả về kích thước không đọc được cho ${video}: ${JSON.stringify(text.trim())}`);
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) throw new Error(`ffprobe báo kích thước bằng không cho ${video}: ${w}x${h}`);
  return { w, h };
}

async function videoSize(video: string): Promise<{ w: number; h: number }> {
  let out: Buffer;
  try {
    out = await capture("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", video,
    ]);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    const code = (e as { code?: unknown })?.code;
    throw new Error(
      code === "ENOENT" || why.includes("ENOENT")
        ? "cần ffprobe trong PATH để đo tỉ lệ hình đứng yên (cài ffmpeg)"
        : `ffprobe không đọc được ${video}: ${why}`,
    );
  }
  return parseSize(out.toString(), video);
}

export async function measure(video: string, durations: readonly { frame: number; duration: number }[]): Promise<StillnessReport> {
  const { w, h } = await videoSize(video);
  const { crop, sw, sh, regime } = cropFor(w, h);
  const raw = await capture("ffmpeg", [
    "-v", "error", "-i", video, "-vf",
    `fps=${FPS},${crop},scale=${sw}:${sh},format=gray`,
    "-f", "rawvideo", "-",
  ]);
  const px = sw * sh;
  const n = Math.floor(raw.length / px);
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) {
    let sum = 0;
    const a = (i - 1) * px;
    const b = i * px;
    for (let j = 0; j < px; j++) sum += Math.abs(raw[b + j] - raw[a + j]);
    diffs.push(sum / px);
  }
  let t = 0;
  const bounds = durations.map((d) => {
    const b = { frame: d.frame, start: t, end: t + d.duration };
    t += d.duration;
    return b;
  });
  return { ...analyse(diffs, bounds), regime };
}
