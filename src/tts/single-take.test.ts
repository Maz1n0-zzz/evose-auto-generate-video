import { describe, it, expect } from "vitest";
import { joinTake, sliceRanges, findSpokenTags, TAKE_SEPARATOR } from "./single-take.js";

describe("joinTake", () => {
  it("nối lời bằng ký tự ngăn và ghi đúng vị trí từng cảnh", () => {
    const { text, spans } = joinTake([
      { id: "s1", text: "Xin chào." },
      { id: "s2", text: "Tạm biệt." },
    ]);

    expect(text).toBe(`Xin chào.${TAKE_SEPARATOR}Tạm biệt.`);
    expect(spans).toEqual([
      { id: "s1", lo: 0, hi: 8 },
      { id: "s2", lo: 11, hi: 19 },
    ]);
  });

  it("vị trí ghi lại phải cắt ra đúng lời gốc", () => {
    // Đây là tính chất quan trọng nhất: lệch một ký tự là cắt vào giữa từ.
    const segs = [
      { id: "a", text: "[excited] Cuối tháng bảy." },
      { id: "b", text: "Giá giảm tám mươi phần trăm." },
      { id: "c", text: "Ai được lợi?" },
    ];
    const { text, spans } = joinTake(segs);
    spans.forEach((s, i) => {
      expect(text.slice(s.lo, s.hi + 1)).toBe(segs[i].text);
    });
  });

  it("một cảnh thì không thêm ký tự ngăn nào", () => {
    const { text, spans } = joinTake([{ id: "s1", text: "Một mình." }]);
    expect(text).toBe("Một mình.");
    expect(spans).toEqual([{ id: "s1", lo: 0, hi: 8 }]);
  });

  it("từ chối cảnh không có lời — cảnh câm phải xử riêng", () => {
    expect(() => joinTake([{ id: "s1", text: "  " }])).toThrow(/không có lời/);
  });

  it("từ chối danh sách rỗng", () => {
    expect(() => joinTake([])).toThrow(/không có cảnh nào/);
  });
});

describe("sliceRanges", () => {
  /** Bảng mốc giả: ký tự thứ i chạy từ giây i tới i+1. */
  const ramp = (n: number) => ({
    start: Array.from({ length: n }, (_, i) => i),
    end: Array.from({ length: n }, (_, i) => i + 1),
  });

  it("chừa một chút lặng hai đầu, không cắt sát chữ", () => {
    const { start, end } = ramp(10);
    const r = sliceRanges([{ id: "s1", lo: 2, hi: 4 }], start, end, 0.12);
    expect(r[0].startSec).toBeCloseTo(1.88, 5); // 2 - 0.12
    expect(r[0].endSec).toBeCloseTo(5.12, 5); // 5 + 0.12
  });

  it("không lùi trước giây 0 khi cảnh đầu cất tiếng ngay", () => {
    const r = sliceRanges([{ id: "s1", lo: 0, hi: 1 }], [0, 1], [1, 2], 0.12);
    expect(r[0].startSec).toBe(0);
  });

  it("GỌT BỎ quãng nghỉ dài model tự chèn giữa hai cảnh", () => {
    const { start, end } = ramp(10);
    // s1 dứt tiếng ở giây 3, s2 cất tiếng ở giây 5 — nghỉ 2 giây.
    const r = sliceRanges(
      [
        { id: "s1", lo: 0, hi: 2 },
        { id: "s2", lo: 5, hi: 8 },
      ],
      start,
      end,
      0.12,
    );
    expect(r[0].endSec).toBeCloseTo(3.12, 5);
    expect(r[1].startSec).toBeCloseTo(4.88, 5);
    // Quãng 1.76 giây ở giữa bị bỏ đi — khoảng cách giữa các cảnh do pipeline
    // quyết chứ không phải model.
    expect(r[1].startSec - r[0].endSec).toBeCloseTo(1.76, 5);
  });

  it("hai cảnh sát nhau thì cắt chính giữa, không giành nhau đoạn tiếng", () => {
    // Nghỉ chỉ 0.1 giây, ngắn hơn hai lần edgePad — chừa đủ hai đầu sẽ chồng.
    const r = sliceRanges(
      [
        { id: "a", lo: 0, hi: 0 },
        { id: "b", lo: 1, hi: 1 },
      ],
      [0, 1.1],
      [1, 2],
      0.12,
    );
    expect(r[0].endSec).toBeCloseTo(1.05, 5);
    expect(r[1].startSec).toBeCloseTo(1.05, 5);
    expect(r[0].endSec).toBeLessThanOrEqual(r[1].startSec);
  });

  it("mọi khoảng đều dương và không cảnh nào lấn sang cảnh sau", () => {
    const { start, end } = ramp(30);
    const r = sliceRanges(
      [
        { id: "a", lo: 0, hi: 4 },
        { id: "b", lo: 7, hi: 12 },
        { id: "c", lo: 15, hi: 22 },
      ],
      start,
      end,
      0.12,
    );
    r.forEach((x) => expect(x.endSec).toBeGreaterThan(x.startSec));
    for (let i = 0; i < r.length - 1; i++) {
      expect(r[i].endSec).toBeLessThanOrEqual(r[i + 1].startSec);
    }
  });

  it("mốc chồng nhau thì không cắt lùi vào lời cảnh sau", () => {
    // end của cảnh trước (5) lớn hơn start của cảnh sau (4).
    const r = sliceRanges(
      [
        { id: "a", lo: 0, hi: 1 },
        { id: "b", lo: 2, hi: 3 },
      ],
      [0, 1, 4, 6],
      [1, 5, 6, 8],
      0.12,
    );
    expect(r[0].endSec).toBe(4);
    expect(r[1].startSec).toBe(4);
  });

  it("báo lỗi rõ ràng khi vị trí trỏ ra ngoài bảng alignment", () => {
    const { start, end } = ramp(5);
    expect(() => sliceRanges([{ id: "s9", lo: 0, hi: 9 }], start, end)).toThrow(
      /cảnh s9 trỏ ra ngoài bảng alignment/,
    );
  });

  it("báo lỗi khi hai bảng mốc lệch độ dài", () => {
    expect(() => sliceRanges([{ id: "a", lo: 0, hi: 0 }], [0, 1], [1])).toThrow(/lệch độ dài/);
  });
});

describe("joinTake + sliceRanges đi cùng nhau", () => {
  it("mỗi cảnh nhận đúng phần thời gian của lời mình", () => {
    const segs = [
      { id: "s1", text: "Một hai." },
      { id: "s2", text: "Ba bốn." },
    ];
    const { text, spans } = joinTake(segs);
    // Mốc giả: mỗi ký tự 0.1 giây, đều tăm tắp.
    const start = Array.from({ length: text.length }, (_, i) => i * 0.1);
    const end = start.map((s) => s + 0.1);

    const r = sliceRanges(spans, start, end, 0.05);
    expect(r.map((x) => x.id)).toEqual(["s1", "s2"]);
    expect(r[0].startSec).toBe(0);
    // Điểm cắt phải rơi vào quãng ký tự ngăn, không đụng chữ của cảnh nào.
    expect(r[0].endSec).toBeGreaterThan(end[spans[0].hi] - 0.001);
    expect(r[0].endSec).toBeLessThan(start[spans[1].lo]);
    expect(r[1].startSec).toBeLessThan(start[spans[1].lo] + 0.001);
  });
});

describe("findSpokenTags", () => {
  /** Dựng bảng mốc cho `text`, trong đó thẻ ở `tagIndex` chiếm `tagSec` giây
   *  còn mọi ký tự khác chạy đều 0.05s. */
  function timeline(text: string, tagLiteral: string, tagSec: number) {
    const i = text.indexOf(tagLiteral);
    const start: number[] = [];
    const end: number[] = [];
    let t = 0;
    for (let k = 0; k < text.length; k++) {
      const inTag = k >= i && k < i + tagLiteral.length;
      const step = inTag ? tagSec / tagLiteral.length : 0.05;
      start.push(t);
      t += step;
      end.push(t);
    }
    return { start, end };
  }

  it("bắt được thẻ bị đọc to", () => {
    // Đúng ca đã gặp thật: [curious] chiếm 2.1s ở đầu video, nghe ra "CU Arius".
    const text = "[curious] Vì sao lại thế?";
    const { start, end } = timeline(text, "[curious]", 2.1);
    const spoken = findSpokenTags(text, start, end);
    expect(spoken).toHaveLength(1);
    expect(spoken[0].literal).toBe("[curious]");
    expect(spoken[0].durationSec).toBeCloseTo(2.1, 5);
  });

  it("KHÔNG báo nhầm thẻ được hiểu đúng", () => {
    const text = "[curious] Vì sao lại thế?";
    const { start, end } = timeline(text, "[curious]", 0.12);
    expect(findSpokenTags(text, start, end)).toEqual([]);
  });

  it("KHÔNG báo nhầm thẻ tạo ra tiếng động thật", () => {
    // [sighs] tốn 0.48s vì nó thở dài thật — tổng thời lượng cao nhưng chia
    // cho số ký tự vẫn thấp. Đây là ca mà thước đo bằng tổng thời lượng sai.
    const text = "[sighs] Thế là nhiều công ty rời đi.";
    const { start, end } = timeline(text, "[sighs]", 0.48);
    expect(findSpokenTags(text, start, end)).toEqual([]);
  });

  it("bắt được nhiều thẻ hỏng trong cùng một bản đọc", () => {
    const text = "[curious] Một. [thoughtful] Hai.";
    const a = timeline(text, "[curious]", 2.1);
    // Cho luôn [thoughtful] cũng dài — dựng lại mốc thủ công cho cả hai.
    const start: number[] = [], end: number[] = [];
    let t = 0;
    for (let k = 0; k < text.length; k++) {
      const inA = k >= 0 && k < 9;
      const inB = k >= text.indexOf("[thoughtful]") && k < text.indexOf("[thoughtful]") + 12;
      const step = inA ? 2.1 / 9 : inB ? 2.4 / 12 : 0.05;
      start.push(t); t += step; end.push(t);
    }
    expect(a.start.length).toBe(text.length);
    expect(findSpokenTags(text, start, end).map((s) => s.literal)).toEqual([
      "[curious]",
      "[thoughtful]",
    ]);
  });

  it("lời không có thẻ thì không có gì để báo", () => {
    const text = "Không có thẻ nào ở đây.";
    const { start, end } = timeline(text, "khong-ton-tai", 1);
    expect(findSpokenTags(text, start, end)).toEqual([]);
  });

  it("bảng mốc ngắn hơn lời thì bỏ qua, không nổ", () => {
    const text = "[curious] Vì sao?";
    expect(findSpokenTags(text, [0, 1], [1, 2])).toEqual([]);
  });
});
