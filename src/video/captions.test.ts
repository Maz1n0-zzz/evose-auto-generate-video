import { describe, expect, it } from "vitest";
import { regroupCaptions, type CaptionWord } from "./captions.js";

/** Dựng chuỗi từ liền nhau, mỗi âm tiết 0.15s, cách nhau 0.05s (gap đặt riêng qua `gaps`). */
function words(text: string, frame = 1, gaps: Record<number, number> = {}): CaptionWord[] {
  let t = 0;
  return text.split(" ").map((w, i) => {
    t += gaps[i] ?? (i === 0 ? 0 : 0.05);
    const out = { text: w, start: +t.toFixed(3), end: +(t + 0.15).toFixed(3), frame };
    t += 0.15;
    return out;
  });
}
const texts = (gs: { text: string }[]) => gs.map((g) => g.text);

describe("regroupCaptions", () => {
  it("keeps every group within the character budget", () => {
    const gs = regroupCaptions(words("Người từng dạy máy tính nhận ra con mèo trong ảnh vừa bán công ty của mình"));
    for (const g of gs) expect(g.text.length).toBeLessThanOrEqual(26);
    expect(gs.map((g) => g.text).join(" ")).toBe(
      "Người từng dạy máy tính nhận ra con mèo trong ảnh vừa bán công ty của mình",
    );
  });

  it("breaks at sentence ends and commas", () => {
    expect(texts(regroupCaptions(words("TechCrunch vừa đưa tin. AMD sẽ mua công ty World Labs của bà")))).toEqual([
      "TechCrunch vừa đưa tin.",
      "AMD sẽ mua công ty",
      "World Labs của bà",
    ]);
  });

  it("prefers breaking before a function word over splitting a compound", () => {
    const gs = texts(regroupCaptions(words("Nên dữ liệu giả lập từ mô hình thế giới sẽ là chìa khoá.")));
    expect(gs[0]).toBe("Nên dữ liệu giả lập");
    expect(gs).toContain("sẽ là chìa khoá.");
  });

  it("merges a lone short word into the previous group", () => {
    expect(texts(regroupCaptions(words("AMD thì chưa có.")))).toEqual(["AMD thì chưa có."]);
    for (const g of regroupCaptions(words("Bà tin rằng AI chỉ đọc chữ thì chưa đủ."))) {
      expect(g.text.length, g.text).toBeGreaterThanOrEqual(6);
    }
  });

  it("never crosses a frame boundary", () => {
    const gs = regroupCaptions([...words("Người mua là AMD", 1), ...words("Bà tên là", 2).map((w) => ({ ...w, start: w.start + 5, end: w.end + 5 }))]);
    expect(gs.map((g) => [g.frame, g.text])).toEqual([
      [1, "Người mua là AMD"],
      [2, "Bà tên là"],
    ]);
  });

  it("ends each group before the next starts and keeps word timings", () => {
    const gs = regroupCaptions(words("TechCrunch vừa đưa tin. AMD sẽ mua"));
    expect(gs[0]!.end).toBeLessThanOrEqual(gs[1]!.start);
    expect(gs[1]!.words[0]).toMatchObject({ text: "AMD", id: "caption-word-1-0" });
    expect(gs[1]!.id).toBe("caption-group-1");
  });
});

describe("regroupCaptions with the dictionary", () => {
  it("does not split common compounds across groups", () => {
    const joined = regroupCaptions(
      words("Người từng dạy máy tính nhận ra con mèo trong ảnh vừa bán công ty của mình. Nvidia đã có sẵn bộ mô hình thế giới riêng."),
    ).map((g) => g.text);
    // Không ranh giới nào nằm giữa một từ ghép: âm cuối cụm trước + âm đầu cụm sau.
    const seams = joined.slice(1).map((g, i) => `${joined[i]!.split(" ").pop()} ${g.split(" ")[0]}`);
    for (const w of ["máy tính", "nhận ra", "công ty", "mô hình", "thế giới"]) {
      expect(seams, w).not.toContain(w);
      expect(joined.some((g) => g.includes(w)), w).toBe(true);
    }
  });
});

describe("regroupCaptions determiners", () => {
  it("does not end a group on a classifier", () => {
    const gs = regroupCaptions(words("Còn AMD mua vì một cái tên quen thuộc, Nvidia. Nvidia đã có sẵn bộ mô hình thế giới riêng."));
    for (const g of gs) expect(g.text, g.text).not.toMatch(/ (một|cái|bộ)$/);
  });
});

describe("regroupCaptions edge cases", () => {
  it("does not glue an orphan onto the previous sentence", () => {
    expect(texts(regroupCaptions(words("Xin chào mọi người. Bạn")))).toEqual(["Xin chào mọi người.", "Bạn"]);
  });

  it("keeps a word longer than the line budget whole, in its own group", () => {
    const long = "https://evose.ai/tao-tro-ly-ai-cua-rieng-ban";
    const gs = texts(regroupCaptions(words(`Truy cập ${long} ngay hôm nay`)));
    expect(gs).toContain(long);
    expect(gs.join(" ")).toBe(`Truy cập ${long} ngay hôm nay`);
  });

  it("does not split a spoken number when the line allows it", () => {
    const gs = texts(regroupCaptions(words("Doanh thu đạt tám phẩy hai tỷ đô la trong năm qua")));
    expect(gs.some((g) => g.includes("tám phẩy hai tỷ"))).toBe(true);
  });

  it("cuts at a long pause", () => {
    const ws = words("Tôi đi học rồi về nhà ăn cơm xong ngủ", 1, { 4: 1.5 });
    expect(texts(regroupCaptions(ws))).toEqual(["Tôi đi học rồi", "về nhà ăn cơm xong ngủ"]);
  });

  it("pads the last group end and clamps earlier ones to the next start", () => {
    const gs = regroupCaptions(words("TechCrunch vừa đưa tin. AMD sẽ mua"));
    const lastWord = gs[1]!.words[gs[1]!.words.length - 1]!;
    expect(gs[1]!.end).toBeCloseTo(lastWord.end + 0.12, 3);
    expect(gs[0]!.end).toBeLessThanOrEqual(gs[1]!.start);
    expect(gs[0]!.end).toBeGreaterThan(gs[0]!.start);
  });

  it("returns nothing for no words and sorts unsorted input", () => {
    expect(regroupCaptions([])).toEqual([]);
    const ws = words("AMD sẽ mua công ty World Labs");
    expect(texts(regroupCaptions([...ws].reverse()))).toEqual(texts(regroupCaptions(ws)));
  });

  it("attaches punctuation-only tokens to the previous word", () => {
    expect(texts(regroupCaptions(words("Xin chào . Thế giới ...")))).toEqual(["Xin chào.", "Thế giới..."]);
  });
});
