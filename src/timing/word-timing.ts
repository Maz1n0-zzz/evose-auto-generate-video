/**
 * Mốc thời gian theo TỪNG CHỮ của lời đọc, và các phép đổi dựa trên nó.
 *
 * Nguồn là bảng mốc ký tự mà ElevenLabs `/with-timestamps` trả về cho bản đọc
 * chung. Không cần whisper: bảng này khớp 1:1 với chuỗi gửi đi, nên chữ nào ở
 * giây nào là phép tra thuần, không phải đoán.
 *
 * Ba thứ dùng mốc chữ:
 *   1. `at` trong motion — phần tử hiện đúng lúc giọng nhắc tới nó.
 *   2. Phụ đề in vào hình, tô chữ đang đọc.
 *   3. Tiếng động (pop/tick) rơi đúng nhịp phần tử xuất hiện.
 *
 * File này chỉ có phép tính thuần, không đụng file hay ffmpeg.
 */

import { findAudioTags } from "../utils/audio-tags.js";

export interface Word {
  /** Chữ như trên màn hình (không còn thẻ cảm xúc). */
  text: string;
  /** Vị trí ký tự trong lời của CẢNH (tính cả thẻ, đúng như gửi cho TTS). */
  lo: number;
  hi: number;
  /** Giây, tính từ đầu file giọng của cảnh. */
  s: number;
  e: number;
}

/** Một đoạn bị gọt khỏi file giọng: bắt đầu ở `at` (giây, bản gốc), dài `len`. */
export interface Cut {
  at: number;
  len: number;
}

/**
 * Tách lời một cảnh thành từng chữ và gán mốc thời gian.
 *
 * @param sceneText  lời của cảnh đúng như trong bản đọc chung (còn thẻ nếu có)
 * @param offset     vị trí ký tự đầu của cảnh trong chuỗi đã nối
 * @param clipStart  giây bắt đầu của file giọng cảnh trong bản đọc chung
 */
export function wordsOfScene(
  sceneText: string,
  offset: number,
  charStartSec: readonly number[],
  charEndSec: readonly number[],
  clipStart: number,
): Word[] {
  const tagRanges = findAudioTags(sceneText).map((t) => [t.index, t.index + t.literal.length - 1]);
  const inTag = (i: number) => tagRanges.some(([a, b]) => i >= a && i <= b);
  const words: Word[] = [];
  for (const m of sceneText.matchAll(/\S+/g)) {
    const lo = m.index!;
    const hi = lo + m[0].length - 1;
    // Bỏ phần thẻ dính trong token, giữ phần chữ thật.
    let a = lo;
    let b = hi;
    while (a <= b && inTag(a)) a++;
    while (b >= a && inTag(b)) b--;
    if (a > b) continue;
    const text = sceneText.slice(a, b + 1);
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    words.push({
      text,
      lo: a,
      hi: b,
      s: Math.max(0, charStartSec[offset + a] - clipStart),
      e: Math.max(0, charEndSec[offset + b] - clipStart),
    });
  }
  return words;
}

/** Đổi một mốc của file gốc sang file đã gọt khoảng lặng. */
export function remapTime(t: number, cuts: readonly Cut[]): number {
  let shift = 0;
  for (const c of cuts) {
    if (t >= c.at + c.len) shift += c.len;
    else if (t > c.at) shift += t - c.at;
  }
  return t - shift;
}

export function remapWords(words: readonly Word[], cuts: readonly Cut[]): Word[] {
  if (cuts.length === 0) return words.map((w) => ({ ...w }));
  return words.map((w) => ({ ...w, s: remapTime(w.s, cuts), e: remapTime(w.e, cuts) }));
}

/**
 * Quãng lặng dài hơn `maxPause` thì gọt phần giữa, chỉ giữ `maxPause`.
 *
 * Lấy từ cách GitDiagram cắt bản dọc: mọi quãng nghỉ trên 0.3 giây thu về
 * 0.3 giây, giữ nửa đầu và nửa cuối để hơi thở vẫn tự nhiên. Chữ không bao
 * giờ bị tua nhanh, chỉ khoảng lặng bị rút ngắn.
 *
 * `silences` là các quãng [start, end] do ffmpeg silencedetect báo. Quãng
 * chạm hai đầu file bị bỏ qua — đầu và đuôi đã được gọt ở bước cắt cảnh.
 */
export function planCuts(
  silences: readonly [number, number][],
  durationSec: number,
  maxPause = 0.3,
  edge = 0.05,
): Cut[] {
  const cuts: Cut[] = [];
  for (const [a, b] of silences) {
    if (a <= edge || b >= durationSec - edge) continue;
    const len = b - a - maxPause;
    if (len <= 0.02) continue;
    cuts.push({ at: a + maxPause / 2, len });
  }
  return cuts;
}

function norm(s: string): string {
  return s.normalize("NFC").toLowerCase();
}

/**
 * Tìm giây mà giọng đọc bắt đầu nói cụm `phrase` trong cảnh.
 *
 * So không phân biệt hoa thường. Trả `undefined` nếu cụm không có trong lời —
 * bước kiểm script bắt lỗi này TRƯỚC khi tốn tiền gọi TTS.
 */
export function cueTime(phrase: string, sceneText: string, words: readonly Word[]): number | undefined {
  const at = norm(sceneText).indexOf(norm(phrase).trim());
  if (at < 0) return undefined;
  const w = words.find((x) => x.hi >= at);
  return w?.s;
}
