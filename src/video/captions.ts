/**
 * Tách phụ đề cho tiếng Việt, thay cách tách của captions.mjs.
 *
 * captions.mjs viết cho tiếng Anh: nó đếm mỗi âm tiết là một từ và cắt 2–4 "từ"
 * một cụm, nên "máy tính", "cuộc thi" bị chẻ đôi và cụm đổi mỗi 0,6 giây.
 * Ở đây cụm đo bằng số ký tự, cắt ở dấu câu, chỗ ngừng hơi, hoặc trước hư từ,
 * và tránh cắt giữa một từ có trong từ điển Viet74K (@vntk/dictionary, MIT).
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
  frame: number;
}

export interface CaptionGroup {
  id: string;
  frame: number;
  start: number;
  end: number;
  text: string;
  words: { id: string; text: string; start: number; end: number }[];
}

/** Một dòng phụ đề chứa khoảng 30 ký tự ở cỡ chữ hiện tại (max-width 78%, ~47px). */
const MAX_CHARS = 30;
/** Độ dài cụm dễ đọc nhất: khoảng một giây lời. */
const TARGET_CHARS = 18;
/** Âm tiết lẻ ngắn hơn ngưỡng này thì gộp vào cụm bên cạnh. */
const ORPHAN_CHARS = 6;
const PAUSE_SEC = 0.15;
const TAIL_PAD = 0.12;
/** Cắt ở chỗ không có dấu hiệu gì (dễ chẻ đôi từ ghép) tốn chừng này. */
const BLIND_BREAK_COST = 3;

const SENTENCE_END = /[.?!…]$/;
const CLAUSE_END = /[,;:]$/;
/** Hư từ mở đầu một vế: cắt TRƯỚC chúng ít khi chẻ đôi một từ ghép. */
const FUNCTION_WORDS = new Set([
  "của", "là", "để", "và", "thì", "mà", "với", "nên", "vì", "còn", "những", "cho",
  "từ", "sẽ", "đã", "đang", "rằng", "khi", "nhưng", "hay", "hoặc", "được", "bị",
  "ở", "trong", "tại", "giờ", "như", "này",
]);

/** Cắt giữa một từ có trong từ điển ("máy | tính") bị phạt thêm chừng này. */
const SPLIT_WORD_COST = 6;
const MAX_WORD_SYLLABLES = 4;

let dictionary: Set<string> | undefined;
function lexicon(): Set<string> {
  if (!dictionary) {
    const pkg = createRequire(import.meta.url).resolve("@vntk/dictionary/package.json");
    let text: string;
    try {
      text = readFileSync(join(dirname(pkg), "data", "Viet74K.txt"), "utf8");
    } catch (e) {
      throw new Error(`không đọc được từ điển @vntk/dictionary (chạy npm install): ${e instanceof Error ? e.message : e}`);
    }
    dictionary = new Set(text.toLowerCase().split("\n").map((l) => l.trim()).filter((l) => l.includes(" ")));
  }
  return dictionary;
}

const bare = (w: CaptionWord): string => w.text.toLowerCase().replace(/[.,;:?!…"“”()]+$/u, "");

/** Chỗ cắt trước ws[i] có nằm giữa một từ ghép trong từ điển không. */
function splitsDictionaryWord(ws: CaptionWord[], i: number): boolean {
  const dict = lexicon();
  for (let a = Math.max(0, i - MAX_WORD_SYLLABLES + 1); a < i; a++) {
    for (let b = i + 1; b <= Math.min(ws.length, a + MAX_WORD_SYLLABLES); b++) {
      const span = ws.slice(a, b);
      // Dấu câu bên trong thì không còn là một từ.
      if (span.slice(0, -1).some((w) => /[.,;:?!…]$/.test(w.text))) continue;
      if (dict.has(span.map(bare).join(" "))) return true;
    }
  }
  return false;
}

/** Lượng từ, định từ: luôn đi cùng danh từ sau nó, cắt ngay sau chúng là hỏng cụm. */
const DETERMINERS = new Set(["một", "cái", "con", "chiếc", "bộ", "những", "các", "mỗi", "vài", "mọi"]);
const DETERMINER_COST = 4;

/** Chữ số đọc thành lời: cắt giữa "hai mươi | tư" làm người xem đọc sai số. */
const NUMERALS = new Set([
  "không", "một", "mốt", "hai", "ba", "bốn", "tư", "năm", "lăm", "sáu", "bảy", "tám", "chín",
  "mười", "mươi", "trăm", "nghìn", "ngàn", "triệu", "tỷ", "phẩy", "linh", "lẻ",
]);
const NUMBER_SPLIT_COST = 4;

const isFn = (w: CaptionWord): boolean => FUNCTION_WORDS.has(bare(w));

const r3 = (x: number): number => Number(x.toFixed(3));
const chars = (ws: CaptionWord[]): number => ws.map((w) => w.text).join(" ").length;

/** Điểm của việc cắt ngay sau `left`, trước `right`. Cao hơn = chỗ cắt tự nhiên hơn. */
function breakScore(left: CaptionWord, right: CaptionWord): number {
  // Làm tròn để sai số dấu phẩy động không quyết định chỗ cắt.
  const gap = Math.round((right.start - left.end) * 100) / 100;
  let s = gap;
  if (SENTENCE_END.test(left.text)) s += 4;
  else if (CLAUSE_END.test(left.text)) s += 3;
  if (gap >= PAUSE_SEC) s += 2;
  // Chuỗi hư từ liền nhau ("sẽ là"): chỉ cắt trước chữ đầu tiên.
  if (isFn(right) && !isFn(left)) s += 1.5;
  // Tên riêng viết hoa ("World Labs", "Nvidia") mở một cụm mới.
  if (/^\p{Lu}/u.test(right.text)) s += 1;
  return s;
}

function groupCost(ws: CaptionWord[]): number {
  const len = chars(ws);
  if (len > MAX_CHARS && ws.length > 1) return Infinity;
  const short = len < ORPHAN_CHARS ? 6 : 0;
  return ((len - TARGET_CHARS) / 7) ** 2 + short;
}

/** Chia một câu thành các cụm, tối thiểu tổng (độ lệch độ dài + độ tệ của chỗ cắt). */
function splitSentence(ws: CaptionWord[]): CaptionWord[][] {
  const n = ws.length;
  const best: number[] = [0, ...Array<number>(n).fill(Infinity)];
  const from: number[] = Array<number>(n + 1).fill(0);
  for (let j = 1; j <= n; j++) {
    for (let i = j - 1; i >= 0; i--) {
      const g = groupCost(ws.slice(i, j));
      if (g === Infinity) break;
      const cut =
        i === 0
          ? 0
          : Math.max(0, BLIND_BREAK_COST - breakScore(ws[i - 1]!, ws[i]!)) +
            (splitsDictionaryWord(ws, i) ? SPLIT_WORD_COST : 0) +
            (DETERMINERS.has(bare(ws[i - 1]!)) ? DETERMINER_COST : 0) +
            (NUMERALS.has(bare(ws[i - 1]!)) && NUMERALS.has(bare(ws[i]!)) ? NUMBER_SPLIT_COST : 0);
      const total = best[i]! + cut + g;
      if (total < best[j]!) {
        best[j] = total;
        from[j] = i;
      }
    }
  }
  const out: CaptionWord[][] = [];
  for (let j = n; j > 0; j = from[j]!) out.unshift(ws.slice(from[j]!, j));
  // Gộp âm tiết lẻ trong phạm vi câu: không dán "Bạn" của câu sau vào câu trước.
  return mergeOrphans(out);
}

function splitFrame(ws: CaptionWord[]): CaptionWord[][] {
  const sentences: CaptionWord[][] = [];
  let cur: CaptionWord[] = [];
  for (const w of ws) {
    cur = [...cur, w];
    if (SENTENCE_END.test(w.text)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);
  return sentences.flatMap(splitSentence);
}

/** Gộp cụm chỉ có một âm tiết ngắn vào cụm trước (hoặc sau, nếu nó đứng đầu), trong một câu. */
function mergeOrphans(groups: CaptionWord[][]): CaptionWord[][] {
  const out: CaptionWord[][] = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    const orphan = g.length === 1 && g[0]!.text.length < ORPHAN_CHARS;
    if (orphan && prev && chars([...prev, ...g]) <= MAX_CHARS) {
      out[out.length - 1] = [...prev, ...g];
    } else {
      out.push(g);
    }
  }
  const first = out[0];
  const second = out[1];
  if (first && second && first.length === 1 && first[0]!.text.length < ORPHAN_CHARS && chars([...first, ...second]) <= MAX_CHARS) {
    return [[...first, ...second], ...out.slice(2)];
  }
  return out;
}

/** Token chỉ có dấu câu (".", "...") dán vào chữ đứng trước nó. */
function attachPunctuation(words: CaptionWord[]): CaptionWord[] {
  const out: CaptionWord[] = [];
  for (const w of words) {
    const prev = out[out.length - 1];
    if (/^[.,;:?!…]+$/u.test(w.text)) {
      if (prev) out[out.length - 1] = { ...prev, text: prev.text + w.text, end: Math.max(prev.end, w.end) };
      continue;
    }
    out.push(w);
  }
  return out;
}

/**
 * Một từ dài hơn MAX_CHARS (URL, mã) vẫn thành một cụm riêng và có thể xuống dòng:
 * không cắt giữa một từ.
 */
export function regroupCaptions(words: CaptionWord[]): CaptionGroup[] {
  const sorted = attachPunctuation([...words].sort((a, b) => a.start - b.start));
  const byFrame = new Map<number, CaptionWord[]>();
  for (const w of sorted) byFrame.set(w.frame, [...(byFrame.get(w.frame) ?? []), w]);
  const groups = [...byFrame.values()].flatMap(splitFrame);
  return groups.map((g, gi) => {
    const next = groups[gi + 1];
    const first = g[0]!;
    const last = g[g.length - 1]!;
    let end = r3(last.end + TAIL_PAD);
    if (next && next[0]!.start < end) end = r3(Math.max(next[0]!.start, first.start + 0.05));
    return {
      id: `caption-group-${gi}`,
      frame: first.frame,
      start: r3(first.start),
      end,
      text: g.map((w) => w.text).join(" "),
      words: g.map((w, wi) => ({ id: `caption-word-${gi}-${wi}`, text: w.text, start: r3(w.start), end: r3(w.end) })),
    };
  });
}
