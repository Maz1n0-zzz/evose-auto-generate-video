#!/usr/bin/env node
/**
 * capture-screenshot.js — Evose brand kit v5.1 (ADD-ONLY, không đụng code cũ)
 *
 * Chụp 1 URL (bài báo / GitHub repo) thành PNG để nhúng vào
 * frame-screenshot-news / frame-screenshot-scroll.
 *
 * DÙNG:
 *   node scripts/capture-screenshot.js --url "https://..." --out ./assets/shot.png [--mode auto|news|github] [--width 480]
 *
 * MODE:
 *   news   → chụp phần đầu bài, cao ~1400px (vừa khung, không dài lê thê) → dùng cho frame-screenshot-news
 *   github → fullPage (dài) để cuộn → dùng cho frame-screenshot-scroll
 *   auto   → github.com → github; còn lại → news
 *
 * v5.1 fix:
 *   - news: giảm chiều cao clip (1400) để frame không hiển thị vùng trắng đầu trang
 *   - chờ document.fonts.ready + cuộn kích hoạt lazy-load ảnh + chờ lâu hơn
 *   - cảnh báo nếu ảnh gần như toàn trắng (chụp fail) để không nhét ảnh trắng vào video
 */
import path from 'path';
import fs from 'fs';

function arg(name, def){ const i=process.argv.indexOf('--'+name); return i>-1?process.argv[i+1]:def; }

(async () => {
  const url   = arg('url');
  const out   = arg('out', './assets/screenshot.png');
  let   mode  = arg('mode', 'auto');
  const width = parseInt(arg('width', '480'), 10);
  if(!url){ console.error('Thiếu --url'); process.exit(1); }
  if(mode==='auto') mode = /github\.com/i.test(url) ? 'github' : 'news';

  let puppeteer;
  try { puppeteer = (await import('puppeteer')).default; }
  catch(e){ try { puppeteer = (await import('puppeteer-core')).default; } catch(e2){
    console.error('Không tìm thấy puppeteer. Cài: npm i puppeteer'); process.exit(1);
  }}

  const CHROME_PATHS = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable','/usr/bin/google-chrome',
    '/usr/bin/chromium-browser','/usr/bin/chromium',
  ];
  const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
  const launchOpts = { headless:'new', args:['--no-sandbox','--disable-setuid-sandbox','--hide-scrollbars'] };
  if (executablePath) launchOpts.executablePath = executablePath;

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 2, isMobile: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // chờ font + kích hoạt lazy-load ảnh bằng cách cuộn dần rồi về đầu
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} }
      await new Promise(res=>{
        let y=0; const step=()=>{ window.scrollTo(0,y); y+=600;
          if(y< Math.min(document.body.scrollHeight, 16000)) setTimeout(step,80); else { window.scrollTo(0,0); setTimeout(res,400);} };
        step();
      });
    });
    // che cookie/consent phổ biến
    await page.evaluate(()=>{ ['#onetrust-banner-sdk','.cookie','.consent','[id*="cookie"]','[class*="consent"]','[class*="cookie"]'].forEach(s=>{document.querySelectorAll(s).forEach(e=>e.remove());}); });
    await new Promise(r=>setTimeout(r, 1800)); // chờ render ổn định

    const opts = { path: out, type: 'png' };
    if (mode === 'github') { opts.fullPage = true; }
    else { opts.clip = { x:0, y:0, width, height: 1400 }; } // news: gọn hơn (trước 1600)
    await page.screenshot(opts);

    // cảnh báo nếu ảnh gần toàn trắng (best-effort, không chặn)
    let warn = '';
    try {
      const buf = fs.readFileSync(out);
      if (buf.length < 8000) warn = 'CẢNH BÁO: ảnh rất nhỏ, có thể chụp fail (trang trắng).';
    } catch(e){}
    console.log(JSON.stringify({ ok:true, url, out: path.resolve(out), mode, warn }));
  } catch(e){
    console.error('Lỗi chụp:', e.message);
    console.error('Gợi ý: kiểm tra URL, cài Chrome (npm i puppeteer), hoặc trang chặn bot → lưu ảnh thủ công.');
    process.exit(1);
  } finally { await browser.close(); }
})();
