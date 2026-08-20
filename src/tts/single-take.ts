/**
 * Đọc MỘT LẦN cả bài rồi cắt theo cảnh.
 *
 * Vì sao phải làm vậy: `eleven_v3` từ chối mọi cơ chế nối ngữ điệu giữa các
 * lần gọi (xem `scripts/probe-elevenlabs-stitching.ts`). Gọi riêng từng cảnh
 * thì mỗi lần model tự chọn lại ngữ điệu mở đầu, nghe lệch rõ ở chỗ chuyển
 * cảnh. Đọc một lần thì cả bài là một mạch liền, không còn chỗ nào để lệch.
 *
 * Làm được là nhờ endpoint `/with-timestamps` trả về mốc thời gian của TỪNG
 * KÝ TỰ, và bảng đó khớp 1:1 với đúng chuỗi gửi đi — kể cả thẻ cảm xúc
 * `[excited]` (chiếm ký tự nhưng gần như không tốn thời gian). Biết chữ nào ở
 * giây nào thì cắt theo cảnh là chuyện ánh xạ thuần, không phải đoán.
 *
 * File này chỉ chứa phần tính toán thuần. Việc gọi API nằm ở
 * `elevenlabs-client.ts`, việc cắt file nằm ở `assets/audio-tools.ts`.
 */

import { findAudioTags } from "../utils/audio-tags.js";

/** Ngăn giữa hai cảnh. Ngắt dòng cho model một chỗ nghỉ tự nhiên, và ký tự
 *  ngăn nằm ngoài mọi khoảng cảnh nên không lọt vào file nào. */
export const TAKE_SEPARATOR = "\n\n";

export interface TakeSegment {
  id: string;
  /** Lời của cảnh, đúng như sẽ gửi cho model (còn nguyên thẻ cảm xúc). */
  text: string;
}

/** Vị trí ký tự của một cảnh trong chuỗi đã nối. `hi` là chỉ số ký tự CUỐI. */
export interface TakeSpan {
  id: string;
  lo: number;
  hi: number;
}

/** Khoảng thời gian cắt cho một cảnh, tính bằng giây trong bản đọc chung. */
export interface TakeRange {
  id: string;
  startSec: number;
  endSec: number;
}

/**
 * Nối lời các cảnh thành một chuỗi và ghi lại vị trí ký tự của từng cảnh.
 *
 * Vị trí lấy trên chuỗi ĐÃ nối, nên tra thẳng vào bảng alignment được.
 */
export function joinTake(segments: readonly TakeSegment[]): {
  text: string;
  spans: TakeSpan[];
} {
  if (segments.length === 0) throw new Error("joinTake: không có cảnh nào");
  const spans: TakeSpan[] = [];
  let text = "";
  for (const seg of segments) {
    if (!seg.text.trim()) throw new Error(`joinTake: cảnh ${seg.id} không có lời`);
    if (text.length > 0) text += TAKE_SEPARATOR;
    const lo = text.length;
    text += seg.text;
    spans.push({ id: seg.id, lo, hi: text.length - 1 });
  }
  return { text, spans };
}

/**
 * Chừa bấy nhiêu giây lặng ở hai đầu mỗi cảnh.
 *
 * Cắt sát chữ thì hụt đuôi từ và mất tiếng thở lấy đà, nghe cụt. Nhưng chừa
 * nhiều quá cũng hỏng: đọc liền một mạch thì model tự chèn quãng nghỉ khá dài
 * giữa các đoạn, mà pipeline SAU ĐÓ còn cộng thêm khoảng nghỉ riêng nữa. Lấy
 * trọn quãng nghỉ của model là video phình ra và nhịp bị ì.
 *
 * Đã đo trên video mẫu: cắt giữa quãng nghỉ làm video dài 110.26s thay vì
 * 96.78s — mỗi chỗ chuyển cảnh đội thêm hơn một giây.
 */
export const EDGE_PAD_SEC = 0.12;

/**
 * Đổi vị trí ký tự thành khoảng thời gian cắt cho từng cảnh.
 *
 * Mỗi cảnh lấy đúng phần có tiếng, cộng `EDGE_PAD_SEC` ở hai đầu. Quãng nghỉ
 * dài model tự chèn giữa hai đoạn bị GỌT BỎ — khoảng cách giữa các cảnh do
 * pipeline quyết, không phải model, nhờ vậy nhịp video giữ nguyên như cũ.
 *
 * Hai cảnh sát nhau quá (quãng nghỉ ngắn hơn hai lần `EDGE_PAD_SEC`) thì cắt
 * chính giữa, để hai cảnh không giành nhau cùng một đoạn tiếng.
 *
 * Vì có gọt nên các khoảng KHÔNG liền nhau — đó là chủ ý, không phải lỗi.
 */
export function sliceRanges(
  spans: readonly TakeSpan[],
  charStartSec: readonly number[],
  charEndSec: readonly number[],
  edgePadSec: number = EDGE_PAD_SEC,
): TakeRange[] {
  if (spans.length === 0) throw new Error("sliceRanges: không có cảnh nào");
  if (charStartSec.length !== charEndSec.length) {
    throw new Error("sliceRanges: hai bảng mốc thời gian lệch độ dài");
  }

  const speech = spans.map((s) => {
    if (s.lo < 0 || s.hi >= charStartSec.length) {
      throw new Error(
        `sliceRanges: cảnh ${s.id} trỏ ra ngoài bảng alignment ` +
          `(${s.lo}–${s.hi}, bảng có ${charStartSec.length} ký tự)`,
      );
    }
    return { id: s.id, start: charStartSec[s.lo], end: charEndSec[s.hi] };
  });

  const n = speech.length;
  /** Ranh giới giữa cảnh i-1 và i — nơi hai cảnh không được lấn qua. */
  const divide = (i: number): number => {
    const prevEnd = speech[i - 1].end;
    const curStart = speech[i].start;
    // Bình thường curStart > prevEnd vì có ký tự ngăn ở giữa. Nếu model trả về
    // mốc chồng nhau thì lấy ngay chỗ cảnh sau cất tiếng, đừng lùi lại.
    return curStart > prevEnd ? (prevEnd + curStart) / 2 : curStart;
  };

  return speech.map((s, i) => {
    const wantStart = Math.max(0, s.start - edgePadSec);
    const wantEnd = s.end + edgePadSec;
    return {
      id: s.id,
      startSec: i === 0 ? wantStart : Math.max(wantStart, divide(i)),
      endSec: i === n - 1 ? wantEnd : Math.min(wantEnd, divide(i + 1)),
    };
  });
}

/**
 * Thẻ cảm xúc bị model ĐỌC TO thay vì hiểu là chỉ dẫn diễn xuất.
 *
 * `eleven_v3` xử lý thẻ ở mức bản alpha và thỉnh thoảng trượt: đã gặp
 * `[curious]` phát ra thành tiếng, nghe như "CU Arius", ngay đầu video. Cùng
 * một chuỗi đầu vào chạy bốn lần thì ba lần đúng — tức không tránh được bằng
 * cách viết lời khác, chỉ có thể phát hiện rồi đọc lại.
 */
export interface SpokenTag {
  literal: string;
  index: number;
  /** Thẻ chiếm bao nhiêu giây trong bản đọc. */
  durationSec: number;
  secPerChar: number;
}

/**
 * Ngưỡng giây-trên-mỗi-ký-tự để kết luận một thẻ đã bị đọc to.
 *
 * Số đo thật trên giọng đang dùng:
 *
 *   hiểu đúng — `[curious]` 0.007–0.036 | `[warm]` 0.040 | `[excited]` 0.041
 *               `[thoughtful]` 0.043 | `[sighs]` 0.069  ← cao nhất, vì thẻ này
 *               tạo ra tiếng thở dài THẬT nên tốn thời gian chính đáng
 *   bị đọc to — `[curious]` 0.164 và 0.23 (hai lần gặp thật)
 *
 * Lấy 0.12: cao gấp 1.7 lần mức "hiểu đúng" cao nhất, và thấp hơn 1.4 lần so
 * với lần "bị đọc to" sát ngưỡng nhất. Chỉ dùng tổng thời lượng thì không phân
 * biệt được, vì thẻ tạo tiếng động như `[sighs]`, `[laughs]` cũng tốn thời
 * gian thật — `[sighs]` 0.48s còn dài hơn cả `[curious]` bị đọc to 1.48s chia
 * đều ra từng ký tự.
 *
 * Gặp thẻ lạ mà bị báo nhầm thì đo lại bằng cách cho in ra `secPerChar`, đừng
 * nới ngưỡng theo cảm tính — nới quá là lọt video hỏng.
 */
export const SPOKEN_TAG_SEC_PER_CHAR = 0.12;

/** Dưới mức này thì chắc chắn không phải đọc to — chặn nhiễu ở thẻ ngắn. */
const SPOKEN_TAG_MIN_SEC = 0.4;

/**
 * Tìm những thẻ cảm xúc mà model lỡ đọc thành tiếng.
 *
 * Cách nhận biết: thẻ bị đọc thì mỗi chữ cái trong thẻ tốn thời gian như chữ
 * thường; thẻ được hiểu đúng thì cả thẻ gộp lại chỉ tốn một khoảnh khắc, dài
 * bao nhiêu chữ cũng vậy. Chia thời lượng cho số ký tự là tách được hai nhóm.
 */
export function findSpokenTags(
  text: string,
  charStartSec: readonly number[],
  charEndSec: readonly number[],
): SpokenTag[] {
  const spoken: SpokenTag[] = [];
  for (const tag of findAudioTags(text)) {
    const last = tag.index + tag.literal.length - 1;
    if (tag.index >= charStartSec.length || last >= charEndSec.length) continue;
    const durationSec = charEndSec[last] - charStartSec[tag.index];
    const secPerChar = durationSec / tag.literal.length;
    if (durationSec >= SPOKEN_TAG_MIN_SEC && secPerChar > SPOKEN_TAG_SEC_PER_CHAR) {
      spoken.push({ literal: tag.literal, index: tag.index, durationSec, secPerChar });
    }
  }
  return spoken;
}
