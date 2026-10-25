import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const ORIGIN = 'https://www.contenaissance.com';
const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const slugs = [...sitemap.matchAll(/<loc>[^<]*\/blog\/([^<]+)<\/loc>/g)].map((m) => m[1]);

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
});
const page = await browser.newPage();

const posts = [];
for (const slug of slugs) {
  await page.goto(`${ORIGIN}/blog/${slug}`, { waitUntil: 'networkidle2', timeout: 90000 });
  const post = await page.evaluate(() => {
    const KEEP = new Set(['H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'A', 'STRONG', 'EM', 'B', 'I', 'BR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'BLOCKQUOTE']);
    const body = document.querySelector('.ct-blog-content-body');
    const clean = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 8) { child.remove(); continue; }
        if (child.nodeType !== 1) continue;
        clean(child);
        const tag = child.tagName;
        if (!KEEP.has(tag)) { child.replaceWith(...child.childNodes); continue; }
        for (const attr of [...child.attributes]) {
          const keep = (tag === 'A' && attr.name === 'href') || (/^H[2-4]$/.test(tag) && attr.name === 'id');
          if (!keep) child.removeAttribute(attr.name);
        }
        if (tag === 'A') {
          const href = child.getAttribute('href') || '';
          child.setAttribute('href', href.replace(/^https?:\/\/(www\.)?contenaissance\.com/, '') || '/');
        }
        if (/^H[2-4]$/.test(tag)) child.innerHTML = child.textContent.trim();
      }
    };
    const copy = body.cloneNode(true);
    clean(copy);
    copy.querySelectorAll('p, li, strong, b, em, i').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('br')) el.remove();
    });
    copy.querySelectorAll('strong, b').forEach((el) => {
      if (el.parentElement && el.parentElement.tagName === 'P' && el.parentElement.textContent.trim() === el.textContent.trim() && el.textContent.length > 140) {
        el.replaceWith(...el.childNodes);
      }
    });

    const metaText = (label) => {
      const dt = [...document.querySelectorAll('.ct-blog-banner *')].find((n) => n.children.length === 0 && n.textContent.trim() === label);
      return dt?.nextElementSibling?.textContent.trim() || dt?.parentElement?.lastElementChild?.textContent.trim() || '';
    };
    const toc = [...document.querySelectorAll('.ct-blog-toc-link')].map((a) => ({
      id: a.getAttribute('href').slice(1),
      label: a.lastElementChild.textContent.trim(),
    }));
    return {
      title: document.querySelector('h1').textContent.trim(),
      description: document.querySelector('meta[name="description"]')?.content || '',
      excerpt: document.querySelector('.ct-blog-banner p')?.textContent.trim() || '',
      image: document.querySelector('.ct-blog-article-image')?.src || '',
      author: metaText('Author'),
      date: metaText('Published'),
      readTime: metaText('Reading time'),
      toc,
      html: copy.innerHTML.replace(/\s{2,}/g, ' ').replace(/<p>\s*<br>\s*<\/p>/g, '').trim(),
    };
  });
  posts.push({ slug, ...post });
  console.log(`${slug} | ${post.date} | ${post.readTime} | ${post.html.length}`);
}
await browser.close();

const parse = (d) => new Date(d).getTime() || 0;
posts.sort((a, b) => parse(b.date) - parse(a.date));
writeFileSync(new URL('../lib/blog.json', import.meta.url), JSON.stringify(posts, null, 1));
console.log(`saved ${posts.length} posts`);
