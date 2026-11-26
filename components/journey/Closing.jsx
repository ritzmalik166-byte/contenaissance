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
              Field Notes.
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
                    {/* {p.readTime ? ` · ${p.readTime}` : ''} */}
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

const SOCIAL = {
  facebook: { label: 'Facebook', icon: 'M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V1.5H14C10.1 1.5 9.2 4.4 9.2 6.3v2.2H6.9v4.1h2.3v9.9H14v-9.9h3.3l.4-4.1H14Z' },
  instagram: { label: 'Instagram', icon: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2ZM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z' },
  linkedin: { label: 'LinkedIn', icon: 'M5.4 7.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM3.3 9h4.2v12.5H3.3V9Zm6.9 0h4v1.7h.1c.6-1.1 2-2.1 4-2.1 4.3 0 5.1 2.8 5.1 6.5v6.4h-4.2v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3v5.8h-4.2V9Z' },
  twitter: { label: 'X', icon: 'M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L2.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18.1h1.7L7.4 3.8H5.6l12.2 16.3Z' },
  youtube: { label: 'YouTube', icon: 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z' },
};

const GOOGLE_SOURCE = 'https://www.google.com/preferences/source?q=contenaissance.com';

const GoogleG = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
  </svg>
);

const pad2 = (n) => String(n).padStart(2, '0');

export function Footer() {
  const [policy, setPolicy] = useState(null);
  const toTop = () => {
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 2 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <footer className="m-sec m-footer" data-ch="footer">
      {/* Font Awesome 4.7 — the icon font the 3D social tiles were designed with (hoisted to <head> by React) */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" precedence="default" />
      <div className="m-wrap">
        {/* Stay in orbit — first thing after the logo forms */}
        <section className="m-orbit" aria-labelledby="m-orbit-title">
          <div className="m-orbit__rings" aria-hidden="true">
            <i style={{ '--k': 0 }} />
            <i style={{ '--k': 1 }} />
            <i style={{ '--k': 2 }} />
            <b />
          </div>
          <div>
            <p className="m-orbit__kicker">Stay in orbit</p>
            <h2 id="m-orbit-title">Get our stories first on Google</h2>
            <p>Add Contenaissance as a preferred source to see our latest stories in Google Top Stories.</p>
          </div>
          <a className="m-orbit__btn" href={GOOGLE_SOURCE} target="_blank" rel="noopener noreferrer">
            <GoogleG />
            <span>Add as a preferred source on Google</span>
          </a>
        </section>

        <div className="m-footer__grid">
          <div className="m-footer__brand">
            <Link href="/" aria-label="Contenaissance, home">
              <img src="/images/logo.png" alt="Contenaissance — Ritz GenAI Storytelling Studios" width="294" height="143" loading="lazy" />
            </Link>
            <p className="m-footer__tag">
              Human stories.
              <span>Uncharted possibilities.</span>
            </p>
          </div>

          <nav className="m-footer__col" aria-label="Footer">
            <h3 className="m-footer__head">Explore</h3>
            <ul className="m-footer__nav">
              {footerNav.map((n, i) => (
                <li key={n.label}>
                  <Link href={n.href}>
                    <em>{pad2(i + 1)}</em>
                    <span>{n.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="m-footer__col">
            <h3 className="m-footer__head">Reach</h3>
            <ul className="m-footer__reach">
              <li>
                <small>Email</small>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <small>Call</small>
                <a href={site.phoneHref}>{site.phone}</a>
              </li>
            </ul>
          </div>

          <div className="m-footer__col">
            <h3 className="m-footer__head">Follow us</h3>
            <ul className="m-footer__social">
              {Object.entries(SOCIAL).map(([k, { label, icon }]) => (
                <li key={k} className={`is-${k}`}>
                  <a href={site.social[k]} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    {k === 'twitter' ? (
                      <svg className="m-fa-x" viewBox="0 0 24 24" aria-hidden="true">
                        <path d={icon} />
                      </svg>
                    ) : (
                      <i className={`fa fa-${k}`} aria-hidden="true" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="m-footer__bar">
          <span className="m-footer__copy">© {new Date().getFullYear()} Contenaissance. All rights reserved.</span>
          <span className="m-footer__legal">
            <button type="button" onClick={() => setPolicy('privacy')}>
              Privacy Policy
            </button>
            <i aria-hidden="true" />
            <button type="button" onClick={() => setPolicy('cookies')}>
              Cookies Policy
            </button>
          </span>
          <button type="button" className="m-footer__top" onClick={toTop}>
            Back to top<span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
      <LegalPolicyModal policyId={policy} onClose={() => setPolicy(null)} />
    </footer>
  );
}
