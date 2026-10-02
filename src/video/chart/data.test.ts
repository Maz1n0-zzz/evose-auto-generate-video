/**
 * Test cho phần nạp dữ liệu nến. Viết TRƯỚC phần dựng.
 *
 * Dữ liệu hỏng mà lọt qua thì chart vẫn vẽ ra, vẫn đẹp, và nói sai giá BTC.
 * Đây là chỗ duy nhất chặn được, nên nó phải chặt.
 */

import { describe, expect, it } from "vitest";
import { baseZone, findIndexByDate, parseDataset, toCandles } from "./data.js";

const good = {
  symbol: "BTCUSDT",
  interval: "1d",
  source: "binance:api/v3/klines",
  fetchedAt: "2026-10-02T12:00:00.000Z",
  candles: [
    [Date.UTC(2025, 6, 1), 100, 110, 95, 108],
    [Date.UTC(2025, 6, 2), 108, 120, 106, 118],
    [Date.UTC(2025, 6, 3), 118, 125, 112, 114],
    [Date.UTC(2025, 6, 4), 114, 116, 100, 102],
  ],
};

const clone = () => JSON.parse(JSON.stringify(good)) as typeof good;

describe("parseDataset", () => {
  it("nhận bộ dữ liệu hợp lệ", () => {
    const d = parseDataset(good, "test.json");
    expect(d.symbol).toBe("BTCUSDT");
    expect(d.candles).toHaveLength(4);
  });

  it("từ chối khi mốc thời gian không tăng dần", () => {
    const bad = clone();
    [bad.candles[1], bad.candles[2]] = [bad.candles[2], bad.candles[1]];
    expect(() => parseDataset(bad, "test.json")).toThrow(/tăng dần|thứ tự/i);
  });

  it("từ chối khi hai nến trùng mốc thời gian", () => {
    const bad = clone();
    bad.candles[2][0] = bad.candles[1][0];
    expect(() => parseDataset(bad, "test.json")).toThrow(/tăng dần|thứ tự|trùng/i);
  });

  it("từ chối khi giá cao nhất thấp hơn giá thấp nhất", () => {
    const bad = clone();
    bad.candles[1][2] = 50;
    expect(() => parseDataset(bad, "test.json")).toThrow(/cao nhất|high/i);
  });

  it("từ chối khi giá mở nằm ngoài khoảng cao thấp", () => {
    const bad = clone();
    bad.candles[1][1] = 999;
    expect(() => parseDataset(bad, "test.json")).toThrow(/ngoài|mở|đóng/i);
  });

  it("từ chối khi giá đóng nằm ngoài khoảng cao thấp", () => {
    const bad = clone();
    bad.candles[1][4] = 1;
    expect(() => parseDataset(bad, "test.json")).toThrow(/ngoài|mở|đóng/i);
  });

  it("từ chối giá âm hoặc bằng không", () => {
    const bad = clone();
    bad.candles[2][3] = 0;
    expect(() => parseDataset(bad, "test.json")).toThrow();
  });

  it("từ chối giá không phải số hữu hạn", () => {
    const bad = clone() as unknown as { candles: unknown[][] };
    bad.candles[1][2] = Number.NaN;
    expect(() => parseDataset(bad, "test.json")).toThrow();
  });

  it("từ chối bộ dữ liệu dưới hai nến", () => {
    const bad = clone();
    bad.candles = [bad.candles[0]];
    expect(() => parseDataset(bad, "test.json")).toThrow(/ít nhất|2 nến/i);
  });

  it("thông báo lỗi nêu rõ tên file và chỉ số nến hỏng", () => {
    const bad = clone();
    bad.candles[2][2] = 1;
    expect(() => parseDataset(bad, "btcusdt-1d.json")).toThrow(/btcusdt-1d\.json/);
    expect(() => parseDataset(bad, "btcusdt-1d.json")).toThrow(/\b2\b/);
  });

  it("từ chối khi thiếu trường bắt buộc", () => {
    const bad = clone() as Partial<typeof good>;
    delete bad.symbol;
    expect(() => parseDataset(bad, "test.json")).toThrow();
  });
});

describe("toCandles", () => {
  it("đổi mảng số sang đối tượng, giữ nguyên giá trị", () => {
    const c = toCandles(parseDataset(good, "t.json"));
    expect(c[0]).toEqual({ t: Date.UTC(2025, 6, 1), o: 100, h: 110, l: 95, c: 108 });
    expect(c).toHaveLength(4);
  });
});

describe("findIndexByDate", () => {
  const c = toCandles(parseDataset(good, "t.json"));

  it("tìm đúng nến theo ngày UTC", () => {
    expect(findIndexByDate(c, "2025-07-03")).toBe(2);
  });

  it("ném lỗi khi ngày không có trong bộ dữ liệu", () => {
    expect(() => findIndexByDate(c, "2024-01-01")).toThrow(/không có|2024-01-01/i);
  });

  it("ném lỗi khi chuỗi ngày sai định dạng", () => {
    expect(() => findIndexByDate(c, "03/07/2025")).toThrow(/định dạng|YYYY-MM-DD/i);
  });
});

describe("baseZone", () => {
  const c = toCandles(parseDataset(good, "t.json"));

  it("lấy giá vùng từ chính các nến nền, không nhận số gõ tay", () => {
    const z = baseZone(c, 0, 1);
    expect(z.low).toBe(95);
    expect(z.high).toBe(120);
  });

  it("bao gồm cả nến cuối của khoảng", () => {
    expect(baseZone(c, 0, 2).high).toBe(125);
  });

  it("ném lỗi khi khoảng nền không hợp lệ", () => {
    expect(() => baseZone(c, 3, 1)).toThrow();
    expect(() => baseZone(c, 0, 99)).toThrow();
  });
});
