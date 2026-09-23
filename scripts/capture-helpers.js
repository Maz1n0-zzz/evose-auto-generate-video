/**
 * capture-helpers.js — phần tính thuần của capture-screenshot.js, tách ra để test.
 */
import path from 'path';

/** Chiều cao màn hình điện thoại (9:19.5) cho mode news, tính theo bề ngang chụp. */
export const phoneHeight = (width) => Math.round(width * 19.5 / 9);

/**
 * Trần chiều cao (px CSS) cho mode full. Cả trang báo có thể dài 15.000px;
 * dồn hết vào một cảnh 8 giây thì cuộn nhanh tới mức không đọc được chữ nào.
 * 2400px ≈ hai màn rưỡi điện thoại: đủ thấy tiêu đề, ảnh và vài đoạn đầu.
 */
export const FULL_MAX_H = 2400;

const MODES = ['news', 'full', 'github'];

/** @returns {'news'|'full'|'github'} */
export function resolveMode(mode, url) {
  if (mode === 'auto') return /github\.com/i.test(url) ? 'github' : 'news';
  if (!MODES.includes(mode)) {
    throw new Error(`mode "${mode}" không hợp lệ. Dùng: auto | ${MODES.join(' | ')}`);
  }
  return mode;
}

/**
 * Vùng cắt bắt đầu từ tiêu đề bài (hoặc đầu khối bài), cao tối đa `maxH`,
 * không vượt quá cuối khối bài.
 * @param {{ titleY: number|null, box: {y:number,height:number}|null, width: number, maxH: number }} p
 */
export function computeClip({ titleY, box, width, maxH }) {
  if (!box) return { x: 0, y: titleY ?? 120, width, height: maxH };
  const startY = (titleY !== null && titleY < box.y) ? titleY : Math.max(0, Math.round(box.y));
  const h = Math.min(maxH, Math.round(box.y + box.height) - startY);
  return { x: 0, y: startY, width, height: h > 0 ? h : maxH };
}

/**
 * Trình duyệt họ Chromium đầu tiên có trên máy. puppeteer-core không tự tải
 * Chrome, nên không tìm thấy thì phải báo rõ chứ không để nó ném lỗi khó hiểu.
 * @param {{ env: Record<string,string|undefined>, home: string, exists: (p:string)=>boolean }} p
 * @returns {string|null}
 */
export function findChromePath({ env, home, exists }) {
  if (env.CHROME_PATH) return env.CHROME_PATH;
  const macApps = [
    'Google Chrome.app/Contents/MacOS/Google Chrome',
    'Chromium.app/Contents/MacOS/Chromium',
    'Brave Browser.app/Contents/MacOS/Brave Browser',
    'Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  const candidates = [
    ...macApps.map((a) => path.join('/Applications', a)),
    ...macApps.map((a) => path.join(home, 'Applications', a)),
    '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser', '/usr/bin/chromium',
  ];
  return candidates.find((p) => exists(p)) ?? null;
}
