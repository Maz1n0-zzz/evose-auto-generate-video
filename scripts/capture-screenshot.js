#!/usr/bin/env node
/**
 * capture-screenshot.js — Evose brand kit v5.2 (smart-crop for news mode)
 *
 * Chụp 1 URL (bài báo / GitHub repo) thành PNG để nhúng vào evose-screenshot.
 *
 * DÙNG:
 *   node scripts/capture-screenshot.js --url "https://..." --out ./assets/shot.png [--mode auto|news|full|github] [--width 480]
 *
 * MODE:
 *   news   → smart-crop: ẩn nav/banner/ads → tìm article → clip 9:19.5 (một màn điện thoại).
 *            Dùng cho cảnh trích nguồn có khung soi tiêu đề.
 *   full   → như news nhưng cao tới FULL_MAX_H để cảnh cuộn xuống như đang lướt web.
 *   github → fullPage nguyên trang, không ẩn gì.
 *   auto   → github.com → github; còn lại → news
 *
 * Trình duyệt: tự dò Chrome/Chromium/Brave/Edge. Đặt CHROME_PATH để chỉ định.
 * Lỗi bất kỳ → thoát mã 1 kèm lý do. KHÔNG có chuyện chụp hỏng mà vẫn báo ok.
 */
import path from 'path';
import fs from 'fs';
import os from 'os';
import { computeClip, findChromePath, resolveMode, phoneHeight, FULL_MAX_H } from './capture-helpers.js';

function arg(name, def){ const i=process.argv.indexOf('--'+name); return i>-1?process.argv[i+1]:def; }

(async () => {
  const url   = arg('url');
  const out   = arg('out', './assets/screenshot.png');
  let   mode  = arg('mode', 'auto');
  const width = parseInt(arg('width', '480'), 10);
  if(!url){ console.error('Thiếu --url'); process.exit(1); }
  try { mode = resolveMode(mode, url); }
  catch(e){ console.error(e.message); process.exit(1); }

  let puppeteer;
  try { puppeteer = (await import('puppeteer')).default; }
  catch(e){ try { puppeteer = (await import('puppeteer-core')).default; } catch(e2){
    console.error('Không tìm thấy puppeteer. Cài: npm i puppeteer'); process.exit(1);
  }}

  const executablePath = findChromePath({ env: process.env, home: os.homedir(), exists: fs.existsSync });
  const launchOpts = { headless:'new', args:['--no-sandbox','--disable-setuid-sandbox','--hide-scrollbars'] };
  if (executablePath) launchOpts.executablePath = executablePath;

  let browser;
  try { browser = await puppeteer.launch(launchOpts); }
  catch(e){
    console.error('Không mở được trình duyệt:', e.message);
    console.error(executablePath
      ? `Đã thử: ${executablePath}`
      : 'Không tìm thấy Chrome/Chromium/Brave/Edge. Cài Chrome, hoặc đặt CHROME_PATH=<đường dẫn>.');
    process.exit(1);
  }
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
      ['#onetrust-banner-sdk','.cookie','.consent','[id*="cookie"]','[class*="consent"]','[class*="cookie"]',
       // popup "Đăng nhập bằng Google" (Google One Tap) — VnExpress có
       '#credential_picker_container','#credential_picker_iframe','iframe[src*="accounts.google.com/gsi"]']
        .forEach(s => { document.querySelectorAll(s).forEach(e => e.remove()); });
    });
    await new Promise(r => setTimeout(r, 1000)); // chờ render ổn định

    const opts = { path: out, type: 'png' };
    if (mode === 'github') {
      opts.fullPage = true;
    } else {
      // news / full: smart-crop → focus vào vùng article (tiêu đề + hero + nội dung)
      const targetH = mode === 'full' ? FULL_MAX_H : phoneHeight(width);

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
        // Lớp nổi position:fixed (popup, thanh dính) nằm đè lên giữa ảnh khi
        // chụp vượt khỏi màn hình, nên ẩn hết.
        document.querySelectorAll('body *').forEach(el => {
          const pos = getComputedStyle(el).position;
          if (pos === 'fixed' || pos === 'sticky') el.style.setProperty('display','none','important');
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
      let articleBox = null;
      for (const sel of ARTICLE_SELS) {
        const el = await page.$(sel);
        const box = el && await el.boundingBox();
        if (box && box.height > 200 && box.width > 100) {
          articleBox = box;
          console.error(`[smart-crop] "${sel}" contentY=${Math.round(box.y)}`);
          break;
        }
      }
      if (!articleBox) console.error('[smart-crop] không thấy khối bài, cắt theo tiêu đề');
      opts.clip = computeClip({ titleY, box: articleBox, width, maxH: targetH });
      console.error(`[smart-crop] clipFrom=${opts.clip.y} clipH=${opts.clip.height}`);
    }
    await page.screenshot(opts);

    // Ảnh PNG thật của một trang báo nặng hàng trăm KB. Dưới 8 KB gần như
    // chắc chắn là trang trắng hoặc trang chặn bot → coi là lỗi, không cho qua.
    const size = fs.statSync(out).size;
    if (size < 8000) throw new Error(`ảnh chỉ ${size} byte, nhiều khả năng là trang trắng hoặc trang chặn bot`);
    console.log(JSON.stringify({ ok:true, url, out: path.resolve(out), mode, bytes: size }));
  } catch(e){
    console.error('Lỗi chụp:', e.message);
    console.error('Gợi ý: kiểm tra URL, cài Chrome (npm i puppeteer), hoặc trang chặn bot → lưu ảnh thủ công.');
    process.exit(1);
  } finally { await browser.close(); }
})();
