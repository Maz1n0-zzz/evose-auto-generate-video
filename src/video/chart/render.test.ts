/**
 * Test cho bộ vẽ chart nến. Viết TRƯỚC phần dựng.
 *
 * Lý do viết trước: trục giá hiện số thật trên màn hình. Bộ vẽ sai tỉ lệ nghĩa là
 * video nói sai giá BTC cho người xem. Đây là loại lỗi không ai nhìn ảnh mà bắt được.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  type Candle,
  type ChartInput,
  makeScale,
  priceTicks,
  renderChart,
} from "./render.js";

/** Nến giả có hình dạng biết trước: giá đi từ 100 lên 200 theo bậc thang. */
function ramp(n: number, from = 100, step = 10): Candle[] {
  return Array.from({ length: n }, (_, i) => ({
    t: Date.UTC(2025, 6, 1 + i),
    o: from + i * step,
    h: from + i * step + step * 0.6,
    l: from + i * step - step * 0.4,
    c: from + i * step + step * 0.3,
  }));
}

const PANEL = { x: 64, y: 300, w: 952, h: 1060, priceAxisW: 136, timeAxisH: 56 };

function input(over: Partial<ChartInput> = {}): ChartInput {
  return {
    candles: ramp(20),
    view: { from: 0, to: 20 },
    panel: PANEL,
    symbol: "BTCUSDT",
    interval: "1D",
    ...over,
  };
}

describe("makeScale", () => {
  it("ánh xạ biên giá thấp nhất xuống đáy vùng vẽ và cao nhất lên đỉnh", () => {
    const s = makeScale(ramp(20), { from: 0, to: 20 }, PANEL);
    expect(s.yOf(s.lo)).toBeCloseTo(s.plot.y + s.plot.h, 6);
    expect(s.yOf(s.hi)).toBeCloseTo(s.plot.y, 6);
  });

  it("giá cao hơn thì pixel nhỏ hơn, không bao giờ ngược", () => {
    const s = makeScale(ramp(20), { from: 0, to: 20 }, PANEL);
    for (let p = s.lo; p < s.hi; p += (s.hi - s.lo) / 50) {
      expect(s.yOf(p + 1)).toBeLessThan(s.yOf(p));
    }
  });

  it("khoảng cách giữa hai nến liền nhau luôn bằng pitch", () => {
    const s = makeScale(ramp(20), { from: 0, to: 20 }, PANEL);
    for (let i = 1; i < 20; i++) expect(s.xOf(i) - s.xOf(i - 1)).toBeCloseTo(s.pitch, 9);
  });

  it("mọi nến nằm trong vùng vẽ, không tràn sang trục giá", () => {
    const s = makeScale(ramp(20), { from: 0, to: 20 }, PANEL);
    expect(s.xOf(0) - s.bodyW / 2).toBeGreaterThanOrEqual(s.plot.x);
    expect(s.xOf(19) + s.bodyW / 2).toBeLessThanOrEqual(s.plot.x + s.plot.w);
  });

  it("chỉ tính biên giá trong khung nhìn, không tính nến ngoài khung", () => {
    const c = ramp(40);
    const all = makeScale(c, { from: 0, to: 40 }, PANEL);
    const part = makeScale(c, { from: 0, to: 10 }, PANEL);
    expect(part.hi).toBeLessThan(all.hi);
  });

  it("ghi đè được biên giá để camera zoom có kiểm soát", () => {
    const s = makeScale(ramp(20), { from: 0, to: 20, priceLo: 120, priceHi: 180 }, PANEL);
    expect(s.lo).toBe(120);
    expect(s.hi).toBe(180);
  });

  it("thân nến không bao giờ mỏng dưới 2px dù nhồi bao nhiêu nến", () => {
    const s = makeScale(ramp(400), { from: 0, to: 400 }, PANEL);
    expect(s.bodyW).toBeGreaterThanOrEqual(2);
  });

  it("khung nhìn rỗng thì ném lỗi nói rõ, không trả về NaN", () => {
    expect(() => makeScale(ramp(10), { from: 5, to: 5 }, PANEL)).toThrow(/rỗng|không có nến/i);
  });

  it("giá phẳng tuyệt đối vẫn ra tỉ lệ dùng được, không chia cho 0", () => {
    const flat: Candle[] = Array.from({ length: 5 }, (_, i) => ({ t: i, o: 50, h: 50, l: 50, c: 50 }));
    const s = makeScale(flat, { from: 0, to: 5 }, PANEL);
    expect(Number.isFinite(s.yOf(50))).toBe(true);
    expect(s.hi).toBeGreaterThan(s.lo);
  });
});

describe("priceTicks", () => {
  it("trả về số tròn nằm trong biên", () => {
    const t = priceTicks(107000, 121000);
    expect(t.length).toBeGreaterThanOrEqual(4);
    expect(t.length).toBeLessThanOrEqual(9);
    for (const v of t) {
      expect(v).toBeGreaterThanOrEqual(107000);
      expect(v).toBeLessThanOrEqual(121000);
    }
  });

  it("các mốc cách đều nhau", () => {
    const t = priceTicks(107000, 121000);
    const step = t[1] - t[0];
    for (let i = 2; i < t.length; i++) expect(t[i] - t[i - 1]).toBeCloseTo(step, 6);
  });

  it("bước chia là bội của 1, 2, 2.5 hoặc 5 nhân luỹ thừa 10", () => {
    for (const [lo, hi] of [[0.11, 0.37], [3, 9], [107000, 121000], [1e6, 4e6]] as const) {
      const t = priceTicks(lo, hi);
      const step = t[1] - t[0];
      const mant = step / Math.pow(10, Math.floor(Math.log10(step)));
      expect([1, 2, 2.5, 5, 10].some((m) => Math.abs(m - mant) < 1e-9)).toBe(true);
    }
  });

  it("biên rất hẹp vẫn ra ít nhất hai mốc", () => {
    expect(priceTicks(99.98, 100.02).length).toBeGreaterThanOrEqual(2);
  });
});

describe("renderChart — hình dạng SVG", () => {
  it("mỗi nến là một nhóm có id ổn định để GSAP bám vào", () => {
    const { svg } = renderChart(input());
    for (let i = 0; i < 20; i++) expect(svg).toContain(`id="cdl-${String(i).padStart(3, "0")}"`);
  });

  it("không có NaN, undefined hay Infinity lọt vào SVG", () => {
    const { svg } = renderChart(input({ annotations: {
      zones: [{ from: 2, to: 8, low: 110, high: 130, kind: "demand", label: "DEMAND" }],
      levels: [{ price: 150 }],
      markers: [{ i: 12, price: 160, label: "RETURN" }],
    } }));
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("cùng đầu vào thì ra đúng cùng một chuỗi, không phụ thuộc giờ chạy", () => {
    expect(renderChart(input()).svg).toBe(renderChart(input()).svg);
  });

  it("nhãn mã kèm năm của khung nhìn, để không ai tưởng là giá hôm nay", () => {
    const { svg } = renderChart(input());
    expect(svg).toContain("2025");
  });

  it("nến tăng tô màu up, nến giảm tô màu down", () => {
    const c: Candle[] = [
      { t: 0, o: 10, h: 12, l: 9, c: 11 },
      { t: 1, o: 11, h: 11.5, l: 8, c: 9 },
    ];
    const { svg } = renderChart(input({ candles: c, view: { from: 0, to: 2 } }));
    expect(svg).toContain(DEFAULT_THEME.up);
    expect(svg).toContain(DEFAULT_THEME.down);
  });

  it("nến doji vẫn có thân nhìn thấy được", () => {
    const c: Candle[] = [{ t: 0, o: 100, h: 101, l: 99, c: 100 }, { t: 1, o: 100, h: 102, l: 98, c: 101 }];
    const { coords } = renderChart(input({ candles: c, view: { from: 0, to: 2 } }));
    expect(coords.candles[0].bodyH).toBeGreaterThanOrEqual(1.5);
  });
});

describe("renderChart — chú thích bám theo giá thật", () => {
  it("ô vùng nằm đúng toạ độ pixel của hai mức giá khai báo", () => {
    const { coords, scale } = renderChart(input({ annotations: {
      zones: [{ from: 2, to: 8, low: 120, high: 140, kind: "demand" }],
    } }));
    const z = coords.zones[0];
    expect(z.y).toBeCloseTo(scale.yOf(140), 3);
    expect(z.y + z.h).toBeCloseTo(scale.yOf(120), 3);
  });

  it("chỉ số vùng là chỉ số tuyệt đối, giữ nguyên khi đổi khung nhìn", () => {
    const c = ramp(40);
    const z = { from: 20, to: 24, low: 280, high: 320, kind: "demand" as const };
    const wide = renderChart(input({ candles: c, view: { from: 0, to: 40 }, annotations: { zones: [z] } }));
    const near = renderChart(input({ candles: c, view: { from: 16, to: 32 }, annotations: { zones: [z] } }));
    // cùng một vùng giá, khung nhìn hẹp hơn thì ô phải to hơn trên màn hình
    expect(near.coords.zones[0].w).toBeGreaterThan(wide.coords.zones[0].w);
    expect(near.coords.zones[0].h).toBeGreaterThan(wide.coords.zones[0].h);
  });

  it("vùng bắt đầu trước khung nhìn thì cắt ở mép trái, không vẽ ra ngoài", () => {
    const c = ramp(40);
    const { coords, scale } = renderChart(input({
      candles: c, view: { from: 20, to: 40 },
      annotations: { zones: [{ from: 2, to: 30, low: 280, high: 320, kind: "demand" }] },
    }));
    expect(coords.zones[0].x).toBeGreaterThanOrEqual(scale.plot.x);
  });

  it('vùng kéo tới "end" thì chạm mép phải vùng vẽ', () => {
    const { coords, scale } = renderChart(input({ annotations: {
      zones: [{ from: 2, to: "end", low: 120, high: 140, kind: "demand" }],
    } }));
    const z = coords.zones[0];
    expect(z.x + z.w).toBeCloseTo(scale.plot.x + scale.plot.w, 3);
  });

  it("vùng cầu tô xanh, vùng cung tô đỏ", () => {
    const d = renderChart(input({ annotations: { zones: [{ from: 1, to: 5, low: 110, high: 130, kind: "demand" }] } }));
    const s = renderChart(input({ annotations: { zones: [{ from: 1, to: 5, low: 110, high: 130, kind: "supply" }] } }));
    expect(d.svg).toContain(DEFAULT_THEME.demandFill);
    expect(s.svg).toContain(DEFAULT_THEME.supplyFill);
  });
});

describe("renderChart — nhãn không được đè nhau hay lọt ra ngoài", () => {
  it("nhãn mốc gần mép phải thì lật sang trái", () => {
    const c = ramp(20);
    const right = renderChart(input({ candles: c, annotations: { markers: [{ i: 19, price: 290, label: "FIRST RETURN" }] } }));
    const left = renderChart(input({ candles: c, annotations: { markers: [{ i: 1, price: 110, label: "FIRST RETURN" }] } }));
    expect(right.coords.markers[0].labelAnchor).toBe("end");
    expect(left.coords.markers[0].labelAnchor).toBe("start");
  });

  it("mọi nhãn mốc nằm trọn trong bề ngang vùng vẽ", () => {
    const c = ramp(20);
    for (const i of [0, 5, 10, 19]) {
      const { coords, scale } = renderChart(input({ candles: c, annotations: { markers: [{ i, price: 150, label: "FIRST RETURN" }] } }));
      const m = coords.markers[0];
      expect(m.labelX).toBeGreaterThanOrEqual(scale.plot.x);
      expect(m.labelX).toBeLessThanOrEqual(scale.plot.x + scale.plot.w);
    }
  });

  it("nhãn ngày đầu và cuối không bị cắt ở hai mép", () => {
    const { coords, panel } = renderChart(input());
    const first = coords.timeLabels[0];
    const last = coords.timeLabels[coords.timeLabels.length - 1];
    expect(first.x - first.halfW).toBeGreaterThanOrEqual(panel.x);
    expect(last.x + last.halfW).toBeLessThanOrEqual(panel.x + panel.w);
  });

  it("hai nhãn ngày không bao giờ đè lên nhau", () => {
    // Kẹp nhãn đầu vào trong mép từng đẩy nó đâm vào nhãn thứ hai: "20 Jun03 Jul".
    for (const n of [12, 20, 40, 92, 200]) {
      const { coords } = renderChart(input({ candles: ramp(n), view: { from: 0, to: n } }));
      const L = coords.timeLabels;
      for (let i = 1; i < L.length; i++) {
        expect(L[i].x - L[i].halfW).toBeGreaterThanOrEqual(L[i - 1].x + L[i - 1].halfW);
      }
    }
  });

  it("vẫn còn ít nhất ba nhãn ngày sau khi bỏ nhãn chen chúc", () => {
    for (const n of [12, 40, 92, 200]) {
      const { coords } = renderChart(input({ candles: ramp(n), view: { from: 0, to: n } }));
      expect(coords.timeLabels.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("số nhãn ngày vẽ ra bằng đúng số dòng trong bảng toạ độ", () => {
    const { svg, coords } = renderChart(input());
    const drawn = svg.match(/text-anchor="middle"/g) ?? [];
    expect(drawn).toHaveLength(coords.timeLabels.length);
  });

  it("nhãn tên vùng nằm trên ô thì không chạm mép trên vùng vẽ", () => {
    const { coords, scale } = renderChart(input({ view: { from: 0, to: 20, priceLo: 90, priceHi: 400 }, annotations: {
      zones: [{ from: 1, to: 6, low: 380, high: 398, kind: "demand", label: "DEMAND ZONE" }],
    } }));
    expect(coords.zones[0].labelY).toBeGreaterThanOrEqual(scale.plot.y);
  });
});

describe("renderChart — bảng toạ độ cho worker", () => {
  it("có đủ một dòng cho mỗi nến trong khung nhìn", () => {
    const { coords } = renderChart(input({ view: { from: 4, to: 14 } }));
    expect(coords.candles).toHaveLength(10);
    expect(coords.candles[0].i).toBe(4);
  });

  it("toạ độ y trong bảng khớp với tỉ lệ của chính nó", () => {
    const { coords, scale } = renderChart(input());
    const c0 = coords.candles[0];
    expect(c0.yH).toBeCloseTo(scale.yOf(ramp(20)[0].h), 6);
    expect(c0.yL).toBeCloseTo(scale.yOf(ramp(20)[0].l), 6);
  });

  it("ghi lại biên giá đã dùng để lần dựng sau tái lập được y hệt", () => {
    const { coords, scale } = renderChart(input());
    expect(coords.priceLo).toBe(scale.lo);
    expect(coords.priceHi).toBe(scale.hi);
  });
});
