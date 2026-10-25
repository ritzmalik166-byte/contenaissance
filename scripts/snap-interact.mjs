import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

// Interaction checks: footer wordmark hover, blog row hover preview, page transition mid-flight.
const out = new URL('../.raw/snaps/', import.meta.url);
mkdirSync(out, { recursive: true });
const base = process.env.URL || 'http://localhost:5200';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: new URL(name, out), type: 'jpeg', quality: 72 }).then(() => console.log(name));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));

await page.goto(`${base}/blog`, { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => window.__siteReady === true, { timeout: 60000 });
await wait(2500);
await shot(page, 'blog-top.jpg');

const scrollTo = (sel, offset = 0) =>
  page.evaluate(
    (sel, offset) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
    },
    sel,
    offset
  );

await scrollTo('.jfeat', -120);
await wait(2600);
await shot(page, 'blog-feat.jpg');

await scrollTo('.jbar', -100);
await wait(2200);
const row = await page.$$('.jrow');
const box = await row[2].boundingBox();
await page.mouse.move(box.x + 300, box.y + box.height / 2, { steps: 8 });
await wait(1200);
await shot(page, 'blog-rowhover.jpg');

await page.mouse.move(10, 10);
await page.click('.jchip:nth-child(3)');
await wait(1400);
await shot(page, 'blog-filter.jpg');

await scrollTo('.fword', -500);
await wait(2500);
const fw = await (await page.$('.fword')).boundingBox();
await page.mouse.move(fw.x + fw.width * 0.1, fw.y + fw.height / 2);
await page.mouse.move(fw.x + fw.width * 0.42, fw.y + fw.height / 2, { steps: 12 });
await wait(800);
await shot(page, 'footer-hover.jpg');

await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true, force: true }));
await wait(800);
const first = await page.$('.jfeat');
await first.click();
await wait(650);
await shot(page, 'transition-mid.jpg');
await page.waitForFunction(() => window.__siteReady === true && location.pathname.startsWith('/blog/'), { timeout: 60000 });
await wait(2600);
await shot(page, 'article-top.jpg');

await scrollTo('.art__body', -120);
await wait(2400);
await shot(page, 'article-body.jpg');

await scrollTo('.anext', -200);
await wait(2400);
await shot(page, 'article-next.jpg');

await browser.close();
