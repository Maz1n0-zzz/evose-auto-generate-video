/** Trần dung lượng renders/final.mp4 theo khổ khung.
 *
 *  Trần 50 MB (cảnh báo sớm ở 45 MB) sinh ra cho khổ DỌC 1080×1920: video ngắn ~90 s
 *  đăng TikTok, Reels, nơi file upload bị giới hạn. Vượt trần thì build chỉ in cảnh báo,
 *  khuyên nâng crf, không dừng.
 *
 *  Khổ ngang là bài giảng YouTube, chương 2–3 phút ghép thành tập 12–18 phút. YouTube nhận
 *  file tới 256 GB, nên trần cố định chỉ đẩy người ta nâng crf và làm bẩn vùng tối ở 1080p.
 *  Chọn KHÔNG đặt trần cho mọi khổ khác 1920 cao: giữ crf 15, dung lượng không phải ràng buộc. */
const PORTRAIT_H = 1920;
export const MAX_FINAL_BYTES = 50 * 1024 * 1024;
export const WARN_FINAL_BYTES = 45 * 1024 * 1024;

export type SizeVerdict = "ok" | "near" | "over" | "uncapped";

export function sizeVerdict(bytes: number, canvasH: number): SizeVerdict {
  if (canvasH !== PORTRAIT_H) return "uncapped";
  if (bytes > MAX_FINAL_BYTES) return "over";
  if (bytes > WARN_FINAL_BYTES) return "near";
  return "ok";
}
