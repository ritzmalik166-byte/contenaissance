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

const SOCIAL = { instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', twitter: 'X', facebook: 'Facebook' };

export function Footer() {
  const [policy, setPolicy] = useState(null);
  return (
    <footer className="m-sec m-footer" data-ch="footer">
      <div className="m-wrap">
        <p className="m-footer__end" aria-hidden="true">
          Transmission complete
        </p>
        <div className="m-footer__grid">
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
          <div>
            <Kicker gold={false}>Follow</Kicker>
            <ul>
              {Object.entries(SOCIAL).map(([k, label]) => (
                <li key={k}>
                  <a href={site.social[k]} target="_blank" rel="noopener noreferrer">
                    {label}
                  </a>
                </li>
              ))}
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
            <a href="/textures/space/CREDITS.md">Imagery: NASA, ESA, ESO, Solar System Scope</a>
          </span>
        </div>
      </div>
      <LegalPolicyModal policyId={policy} onClose={() => setPolicy(null)} />
    </footer>
  );
}
