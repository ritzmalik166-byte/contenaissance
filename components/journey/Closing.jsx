'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LegalPolicyModal } from '@/components/LegalPolicyModal';
import { Kicker } from './ui/Text';
import { site, footerNav } from '@/lib/journey/data';

const fmtDate = (d) => {
  if (typeof d === 'string' && /[a-z]/i.test(d)) return d;
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

/* ---------------------------------------------------------------
   FIELD NOTES — the blog, editorial. Real posts.
--------------------------------------------------------------- */
export function Blog({ posts = [] }) {
  if (!posts.length) return null;
  return (
    <section id="blog" className="m-sec m-blog" data-ch="blog" aria-labelledby="blog-title">
      <div className="m-wrap">
        <header className="m-blog__head">
          <div>
            <Kicker>Journal</Kicker>
            <h2 id="blog-title" className="j-display j-display--lg" data-reveal>
              Field notes.
            </h2>
          </div>
          <Link href="/blog" className="m-link" data-cursor="READ" data-reveal>
            All articles
          </Link>
        </header>
        <div className="m-blog__grid">
          {posts.slice(0, 4).map((p, i) => (
            <article key={p.slug} className={`m-post${i === 0 ? ' m-post--lead' : ''}`} data-reveal style={{ '--i': i }}>
              <Link href={`/blog/${p.slug}`} className="m-post__link" data-cursor="READ">
                <span className="m-post__media">
                  <img src={p.image} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="m-post__text">
                  <span className="m-post__meta">
                    {fmtDate(p.date)}
                    {p.readTime ? ` · ${p.readTime}` : ''}
                  </span>
                  <span className="m-post__title">{p.title}</span>
                  {p.excerpt && <span className="m-post__excerpt">{p.excerpt}</span>}
                  <span className="m-post__cta">Read article →</span>
                </span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const BLURB = 'Ritz GenAI Storytelling Studios — AI films, content and brand experiences that help bold ideas find a world they can live in.';

const SOCIAL = {
  twitter: { label: 'X', icon: 'M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L2.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18.1h1.7L7.4 3.8H5.6l12.2 16.3Z' },
  instagram: { label: 'Instagram', icon: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2ZM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z' },
  linkedin: { label: 'LinkedIn', icon: 'M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2ZM7.1 20.5H3.6V9h3.5v11.5ZM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z' },
  youtube: { label: 'YouTube', icon: 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z' },
  facebook: { label: 'Facebook', icon: 'M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z' },
};

export function Footer() {
  const [policy, setPolicy] = useState(null);
  return (
    <footer className="m-sec m-footer" data-ch="footer">
      <div className="m-wrap">
        <p className="m-footer__end" aria-hidden="true">
          Transmission complete
        </p>
        <div className="m-footer__grid">
          <div className="m-footer__brand">
            <Link href="/" aria-label="Contenaissance, home">
              <img src="/images/logo.png" alt="Contenaissance — Ritz GenAI Storytelling Studios" width="274" height="133" loading="lazy" />
            </Link>
            <p>{BLURB}</p>
            <ul className="m-footer__social">
              {Object.entries(SOCIAL).map(([k, { label, icon }]) => (
                <li key={k}>
                  <a href={site.social[k]} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d={icon} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <nav aria-label="Footer">
            <Kicker gold={false}>Navigate</Kicker>
            <ul>
              {footerNav.map((n) => (
                <li key={n.label}>
                  <Link href={n.href}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <Kicker gold={false}>Contact</Kicker>
            <ul>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <a href={site.phoneHref}>{site.phone}</a>
              </li>
              <li className="m-footer__addr">{site.address}</li>
            </ul>
          </div>
        </div>
        <div className="m-footer__bar">
          <span>Contenaissance © {new Date().getFullYear()}. All rights reserved.</span>
          <span className="m-footer__legal">
            <button type="button" onClick={() => setPolicy('privacy')}>
              Privacy Policy
            </button>
            <button type="button" onClick={() => setPolicy('cookies')}>
              Cookies Policy
            </button>
          </span>
        </div>
      </div>
      <LegalPolicyModal policyId={policy} onClose={() => setPolicy(null)} />
    </footer>
  );
}
