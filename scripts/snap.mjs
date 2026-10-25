import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

// usage: VP=1440x900 URL=http://localhost:5200/ node scripts/snap.mjs "#stages:0.3" ".footer:0"
const points = process.argv.slice(2);
const out = new URL('../.raw/snaps/', import.meta.url);
mkdirSync(out, { recursive: true });

const [vw, vh] = (process.env.VP || '1440x900').split('x').map(Number);
const touch = vw < 1024;
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: vw, height: vh, isMobile: touch, hasTouch: touch });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await page.goto(process.env.URL || 'http://localhost:5200/', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => window.__siteReady === true, { timeout: 40000 });
await new Promise((r) => setTimeout(r, 2500));

for (const pt of points) {
  const [sel, p] = pt.split(':');
  await page.evaluate(
    (sel, p) => {
      let el = document.querySelector(sel);
      if (el.parentElement.classList.contains('pin-spacer')) el = el.parentElement;
      const y = el.getBoundingClientRect().top + window.scrollY + parseFloat(p) * Math.max(0, el.offsetHeight - innerHeight);
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    },
    sel,
    p
  );
  await new Promise((r) => setTimeout(r, 2200));
  const name = `${vw}-${sel.replace(/\W/g, '')}-${p}.jpg`;
  await page.screenshot({ path: new URL(name, out), type: 'jpeg', quality: 70 });
  console.log(name);
}
await browser.close();
