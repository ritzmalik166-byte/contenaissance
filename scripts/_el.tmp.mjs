import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [out, w, h, spec] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: w, height: h });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto('http://localhost:5200/', { waitUntil: 'networkidle2', timeout: 120000 });
await new Promise((r) => setTimeout(r, 5000));
let i = 0;
for (const item of spec.split(',')) {
  const [sel, off] = item.split(':');
  const y = await page.evaluate((sel, off) => {
    const el = document.querySelector(sel);
    const box = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    return box.getBoundingClientRect().top + scrollY + parseFloat(off) * innerHeight;
  }, sel, off);
  await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); window.scrollTo(0, y); }, y);
  await new Promise((r) => setTimeout(r, 1600));
  await page.screenshot({ path: `${out}/e${String(i++).padStart(2, '0')}_${sel.replace(/\W/g, '')}_${off}.png` });
}
fs.writeFileSync(`${out}/log.txt`, logs.join('\n'));
await browser.close();
