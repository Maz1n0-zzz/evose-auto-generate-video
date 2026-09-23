import { describe, it, expect } from "vitest";
// @ts-expect-error — module JS thuần dùng chung với scripts/capture-screenshot.js
import { computeClip, findChromePath, resolveMode, FULL_MAX_H } from "../../scripts/capture-helpers.js";

describe("resolveMode", () => {
  it("auto chọn github cho link github.com, còn lại là news", () => {
    expect(resolveMode("auto", "https://github.com/a/b")).toBe("github");
    expect(resolveMode("auto", "https://vnexpress.net/x.html")).toBe("news");
  });

  it("giữ nguyên mode full khi được chỉ định", () => {
    expect(resolveMode("full", "https://vnexpress.net/x.html")).toBe("full");
  });

  it("báo lỗi khi mode lạ thay vì lặng lẽ chụp sai", () => {
    expect(() => resolveMode("scroll", "https://x.vn")).toThrow(/mode/);
  });
});

describe("computeClip", () => {
  const width = 480;

  it("news: cắt từ tiêu đề, cao đúng một màn hình điện thoại", () => {
    const clip = computeClip({ titleY: 300, box: { y: 350, height: 6000 }, width, maxH: 1040 });
    expect(clip).toEqual({ x: 0, y: 300, width, height: 1040 });
  });

  it("full: cắt từ tiêu đề, cao tới trần FULL_MAX_H để còn chỗ cuộn", () => {
    const clip = computeClip({ titleY: 300, box: { y: 350, height: 6000 }, width, maxH: FULL_MAX_H });
    expect(clip.y).toBe(300);
    expect(clip.height).toBe(FULL_MAX_H);
  });

  it("bài ngắn hơn trần thì dừng ở cuối bài", () => {
    const clip = computeClip({ titleY: 300, box: { y: 350, height: 1200 }, width, maxH: FULL_MAX_H });
    expect(clip.height).toBe(350 + 1200 - 300);
  });

  it("tiêu đề nằm dưới đầu khối bài thì cắt từ đầu khối bài", () => {
    const clip = computeClip({ titleY: 900, box: { y: 400, height: 5000 }, width, maxH: 1040 });
    expect(clip.y).toBe(400);
  });

  it("không tìm thấy khối bài thì cắt từ tiêu đề, không có tiêu đề thì từ y=120", () => {
    expect(computeClip({ titleY: 250, box: null, width, maxH: 1040 }).y).toBe(250);
    expect(computeClip({ titleY: null, box: null, width, maxH: 1040 }).y).toBe(120);
  });
});

describe("findChromePath", () => {
  const home = "/Users/x";

  it("biến CHROME_PATH thắng mọi đường dẫn khác", () => {
    const p = findChromePath({ env: { CHROME_PATH: "/opt/chrome" }, home, exists: () => true });
    expect(p).toBe("/opt/chrome");
  });

  it("tìm được Chrome cài trong ~/Applications", () => {
    const target = "/Users/x/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    const p = findChromePath({ env: {}, home, exists: (f: string) => f === target });
    expect(p).toBe(target);
  });

  it("tìm được Brave hoặc Edge khi máy không có Chrome", () => {
    const target = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
    const p = findChromePath({ env: {}, home, exists: (f: string) => f === target });
    expect(p).toBe(target);
  });

  it("trả null khi không có trình duyệt nào", () => {
    expect(findChromePath({ env: {}, home, exists: () => false })).toBeNull();
  });
});
