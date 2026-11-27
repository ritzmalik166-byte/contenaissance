import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [url, out, n] = [process.argv[2], process.argv[3], Number(process.argv[4]||10)];
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }).catch(()=>{});
await new Promise(r=>setTimeout(r,6000));
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (let i=0;i<=n;i++){ const y=Math.round(total*i/n);
  for (let s=0;s<6;s++){ await page.mouse.wheel({deltaY:(y-(await page.evaluate(()=>scrollY)))/6}); await new Promise(r=>setTimeout(r,250)); }
  await page.evaluate(y=>scrollTo(0,y),y); await new Promise(r=>setTimeout(r,1500));
  await page.screenshot({ path: `${out}/s${String(i).padStart(2,'0')}.png` }); }
const txt = await page.evaluate(()=>document.body.innerText);
fs.writeFileSync(`${out}/text.txt`, `total ${total}\n`+txt);
await browser.close();
