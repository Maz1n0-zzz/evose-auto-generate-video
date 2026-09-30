/**
 * Đo tỉ lệ hình đứng yên, theo từng khung storyboard.
 *
 * Lấy mẫu 10 hình/giây, cắt vùng nội dung y 290–1520 (bỏ header logo, phụ đề,
 * footer), thu nhỏ 10 lần, so hai hình liền nhau. Chênh xám trung bình dưới
 * ngưỡng thì tính là đứng yên. Bản v2 bị chê đo được 60%, bản mới duyệt được 17%.
 */

import { capture } from "./lib.js";

const FPS = 10;
const W = 108;
const H = 123;
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

export async function measure(video: string, durations: readonly { frame: number; duration: number }[]): Promise<StillnessReport> {
  const raw = await capture("ffmpeg", [
    "-v", "error", "-i", video, "-vf",
    `fps=${FPS},crop=1080:1230:0:290,scale=${W}:${H},format=gray`,
    "-f", "rawvideo", "-",
  ]);
  const px = W * H;
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
  return analyse(diffs, bounds);
}
