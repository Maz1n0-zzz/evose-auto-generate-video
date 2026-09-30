import { describe, expect, it } from "vitest";
import { cueTime, planCuts, remapTime, remapWords, wordsOfScene } from "./word-timing.js";

/** Bảng mốc giả: ký tự i nói từ i*0.1 tới i*0.1+0.1. */
function linear(n: number) {
  const s = Array.from({ length: n }, (_, i) => i * 0.1);
  const e = s.map((x) => x + 0.1);
  return { s, e };
}

describe("wordsOfScene", () => {
  it("gán mốc từng chữ, tính từ đầu file giọng của cảnh", () => {
    const text = "Một hai ba";
    const { s, e } = linear(20);
    const words = wordsOfScene(text, 5, s, e, 0.3);
    expect(words.map((w) => w.text)).toEqual(["Một", "hai", "ba"]);
    // "hai" ở ký tự 4 của cảnh → ký tự 9 của bản chung → 0.9s − 0.3s
    expect(words[1].s).toBeCloseTo(0.6);
    expect(words[1].e).toBeCloseTo(0.6 + 0.3);
  });

  it("bỏ thẻ cảm xúc, kể cả khi dính liền chữ", () => {
    const text = "[curious] Vì sao [sighs]thế?";
    const { s, e } = linear(40);
    const words = wordsOfScene(text, 0, s, e, 0);
    expect(words.map((w) => w.text)).toEqual(["Vì", "sao", "thế?"]);
  });

  it("bỏ token chỉ có dấu câu", () => {
    const { s, e } = linear(20);
    expect(wordsOfScene("A — B", 0, s, e, 0).map((w) => w.text)).toEqual(["A", "B"]);
  });
});

describe("planCuts + remapTime", () => {
  it("gọt quãng lặng dài về 0.3s, bỏ qua quãng chạm hai đầu", () => {
    const cuts = planCuts([[0, 0.2], [2.0, 2.9], [5.0, 5.25], [9.9, 10]], 10);
    expect(cuts).toHaveLength(1);
    expect(cuts[0].at).toBeCloseTo(2.15);
    expect(cuts[0].len).toBeCloseTo(0.6);
  });

  it("dời mốc sau chỗ gọt, giữ nguyên mốc trước", () => {
    const cuts = [{ at: 2.15, len: 0.6 }];
    expect(remapTime(1, cuts)).toBe(1);
    expect(remapTime(4, cuts)).toBeCloseTo(3.4);
    // Mốc rơi vào giữa đoạn bị gọt thì dính về mép đầu.
    expect(remapTime(2.5, cuts)).toBeCloseTo(2.15);
  });

  it("remapWords không sửa mảng gốc", () => {
    const w = [{ text: "a", lo: 0, hi: 0, s: 4, e: 4.2 }];
    const out = remapWords(w, [{ at: 1, len: 1 }]);
    expect(out[0].s).toBeCloseTo(3);
    expect(w[0].s).toBe(4);
  });
});

describe("cueTime", () => {
  const text = "[excited] Lý do nằm gọn ở tiền.";
  const { s, e } = linear(60);
  const words = wordsOfScene(text, 0, s, e, 0);

  it("trả mốc bắt đầu của chữ chứa cụm, không phân biệt hoa thường", () => {
    const i = text.indexOf("tiền");
    expect(cueTime("TIỀN", text, words)).toBeCloseTo(i * 0.1);
  });

  it("cụm nằm giữa chữ thì lấy mốc của chữ đó", () => {
    expect(cueTime("gọn ở", text, words)).toBeCloseTo(text.indexOf("gọn") * 0.1);
  });

  it("trả undefined khi cụm không có trong lời", () => {
    expect(cueTime("Anthropic", text, words)).toBeUndefined();
  });
});
