import puppeteer from 'puppeteer-core';

// usage: URL=http://localhost:5200/contact node scripts/probe.mjs ".info > *"
const sel = process.argv[2];
const [vw, vh] = (process.env.VP || '1440x900').split('x').map(Number);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: vw, height: vh });
await page.goto(process.env.URL || 'http://localhost:5200/', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => window.__siteReady === true, { timeout: 40000 });
await new Promise((r) => setTimeout(r, 4000));
const rects = await page.$$eval(sel, (els) =>
  els.map((e) => {
    const r = e.getBoundingClientRect();
    return { cls: e.className, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), transform: getComputedStyle(e).transform, opacity: getComputedStyle(e).opacity };
  })
);
console.table(rects);
await browser.close();
