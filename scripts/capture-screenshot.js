#!/usr/bin/env node
/**
 * capture-screenshot.js — Evose brand kit v5.2 (smart-crop for news mode)
 *
 * Chụp 1 URL (bài báo / GitHub repo) thành PNG để nhúng vào
 * frame-screenshot-news / frame-screenshot-scroll.
 *
 * DÙNG:
 *   node scripts/capture-screenshot.js --url "https://..." --out ./assets/shot.png [--mode auto|news|github] [--width 480]
 *
 * MODE:
 *   news   → smart-crop: ẩn nav/banner/ads → tìm article → clip 9:19.5 (phone ratio)
 *   github → fullPage (dài) để cuộn → dùng cho frame-screenshot-scroll
 *   auto   → github.com → github; còn lại → news
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

    // ẩn cookie/consent (tất cả mode)
    await page.evaluate(() => {
      ['#onetrust-banner-sdk','.cookie','.consent','[id*="cookie"]','[class*="consent"]','[class*="cookie"]']
        .forEach(s => { document.querySelectorAll(s).forEach(e => e.remove()); });
    });
    await new Promise(r => setTimeout(r, 1000)); // chờ render ổn định

    const opts = { path: out, type: 'png' };
    if (mode === 'github') {
      opts.fullPage = true;
    } else {
      // news mode: smart-crop → focus vào vùng article (tiêu đề + hero + nội dung)
      const ASPECT = 19.5 / 9;
      const targetH = Math.round(width * ASPECT); // ~1040px cho width=480

      // 1. Ẩn phần tử gây nhiễu: nav, header, banner, ads, subscribe
      await page.evaluate(() => {
        ['header','nav',
         '[class*="subscribe"]','[class*="subscription"]',
         '[class*="newsletter"]','[class*="banner"]',
         '[class*="popup"]','[class*="sticky"]',
         '[id*="ad"]','[class*="advert"]','[class*="advertisement"]',
         '[class*="paywall"]'
        ].forEach(s => {
          try { document.querySelectorAll(s).forEach(el => el.style.setProperty('display','none','important')); }
          catch(e) {}
        });
      });

      // 2. Xoá outline highlight + blur focus
      await page.addStyleTag({ content: '* { outline: none !important; scroll-behavior: auto !important; }' });
      await page.evaluate(() => { try { if (document.activeElement) document.activeElement.blur(); } catch(e) {} });

      // 3. Chờ ảnh trong bài load xong (tối đa 3s)
      await page.evaluate(async () => {
        await new Promise(res => {
          const imgs = Array.from(document.querySelectorAll('img'));
          const pending = imgs.filter(img => !img.complete);
          if (!pending.length) { res(); return; }
          let done = 0;
          const finish = () => { if (++done >= pending.length) res(); };
          pending.forEach(img => {
            img.addEventListener('load', finish, {once:true});
            img.addEventListener('error', finish, {once:true});
          });
          setTimeout(res, 3000);
        });
      });

      // 4. Tìm y của tiêu đề bài báo (h1) để crop từ đó
      const titleY = await page.evaluate(() => {
        const sels = [
          'h1',
          '[class*="entry-title"]',
          '[class*="post-title"]',
          '[class*="article-title"]',
          '[class*="article__title"]',
          '[class*="headline"]',
        ];
        for (const s of sels) {
          const el = document.querySelector(s);
          if (el) {
            const r = el.getBoundingClientRect();
            if (r.height > 10 && r.top < 1200) {
              return Math.max(0, Math.round(r.top) - 16); // 16px padding trên tiêu đề
            }
          }
        }
        return null;
      });
      if (titleY !== null) console.error(`[smart-crop] h1 found at y=${titleY}`);

      // 5. Tìm vùng article content để tính chiều cao
      const ARTICLE_SELS = [
        'article',
        '[class*="entry-content"]',
        '[class*="post-content"]',
        '[class*="article-content"]',
        '[class*="article-body"]',
        'main',
        '.content',
      ];
      let clip = null;
      for (const sel of ARTICLE_SELS) {
        const el = await page.$(sel);
        if (el) {
          const box = await el.boundingBox();
          if (box && box.height > 200 && box.width > 100) {
            // Ưu tiên dùng y của h1 nếu tìm thấy và hợp lý
            const startY = (titleY !== null && titleY < box.y) ? titleY : Math.max(0, Math.round(box.y));
            const endY = Math.round(box.y + box.height);
            const h = Math.min(targetH, endY - startY);
            clip = { x: 0, y: startY, width, height: h > 0 ? h : targetH };
            console.error(`[smart-crop] "${sel}" contentY=${Math.round(box.y)} → clipFrom=${startY} clipH=${clip.height}`);
            break;
          }
        }
      }
      if (!clip) {
        const fallbackY = titleY !== null ? titleY : 120;
        console.error(`[smart-crop] fallback y=${fallbackY}`);
        clip = { x: 0, y: fallbackY, width, height: targetH };
      }
      opts.clip = clip;
    }
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
