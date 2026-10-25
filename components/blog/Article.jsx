'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { onSiteReady } from '@/lib/ready';
import Split from '../Split';
import { ArrowRight, ArrowUpRight } from '../Icons';

export default function Article({ post, next, related }) {
  const root = useRef(null);
  const [active, setActive] = useState(post.toc[0]?.id);
  const [copied, setCopied] = useState(false);

  useGSAP(
    (ctx, contextSafe) => {
      const chars = root.current.querySelectorAll('.art__title .split-char');
      gsap.set(chars, { yPercent: 115, rotateX: -70, opacity: 0 });
      gsap.set('.art__fade', { y: 30, opacity: 0 });
      gsap.set('.art__cover', { clipPath: 'inset(18% 12% 18% 12% round 24px)' });
      gsap.set('.art__cover img', { scale: 1.35 });

      const intro = contextSafe(() => {
        gsap
          .timeline({ defaults: { ease: 'power4.out' } })
          .to(chars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.2, stagger: 0.012 })
          .to('.art__fade', { y: 0, opacity: 1, duration: 1, stagger: 0.08 }, 0.3)
          .to('.art__cover', { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.6, ease: 'expo.inOut' }, 0.4)
          .to('.art__cover img', { scale: 1.12, duration: 2, ease: 'expo.out' }, 0.5);
      });
      const off = onSiteReady(intro);

      gsap.to('.art__cover img', {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: { trigger: '.art__cover', start: 'top top', end: 'bottom top', scrub: true },
      });

      gsap.fromTo(
        '.art__toc-progress i',
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.prose', start: 'top 40%', end: 'bottom 60%', scrub: true } }
      );

      root.current.querySelectorAll('.prose h2[id]').forEach((h) => {
        ScrollTrigger.create({
          trigger: h,
          start: 'top 45%',
          onEnter: () => setActive(h.id),
          onEnterBack: () => setActive(h.id),
        });
      });

      gsap.utils.toArray('.prose > h2, .prose > h3, .prose > p, .prose > ul, .prose > ol, .prose > table').forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 92%' },
        });
      });

      gsap
        .timeline({ scrollTrigger: { trigger: '.anext', start: 'top 85%', end: 'top 30%', scrub: 1 } })
        .fromTo('.anext__img', { clipPath: 'inset(30% 40% 30% 40%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' })
        .fromTo('.anext__img img', { scale: 1.5 }, { scale: 1, ease: 'none' }, 0);

      return off;
    },
    { scope: root }
  );

  const share = (net) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post.title);
    if (net === 'copy') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      return;
    }
    const map = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };
    window.open(map[net], '_blank', 'noopener,noreferrer');
  };

  return (
    <article ref={root} className="art">
      <header className="container art__head" style={{ perspective: 900 }}>
        <Link href="/blog" className="art__back art__fade">
          <ArrowRight /> Journal
        </Link>
        <p className="jmeta art__fade">
          <span>{post.date}</span>
          <span>By {post.author}</span>
          <span>{post.readTime} read</span>
        </p>
        <Split as="h1" className="display art__title" by="words" text={post.title} />
        <p className="lead art__fade">{post.excerpt}</p>
      </header>

      <div className="container">
        <div className="art__cover">
          <img src={post.image} alt={post.title} />
        </div>
      </div>

      <div className="container art__body">
        <aside className="art__aside">
          <nav className="art__toc" aria-label="In this article">
            <p className="mono">In this article</p>
            <div className="art__toc-wrap">
              <span className="art__toc-progress">
                <i />
              </span>
              <ol>
                {post.toc.map((t, i) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className={active === t.id ? 'is-active' : ''}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {t.label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
          <div className="art__share">
            <p className="mono">Share</p>
            <div>
              <button onClick={() => share('linkedin')} data-magnetic="0.4">in</button>
              <button onClick={() => share('x')} data-magnetic="0.4">X</button>
              <button onClick={() => share('whatsapp')} data-magnetic="0.4">wa</button>
              <button onClick={() => share('copy')} data-magnetic="0.4">{copied ? '✓' : '⧉'}</button>
            </div>
          </div>
        </aside>

        <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      </div>

      <section className="container anext-wrap">
        <Link href={`/blog/${next.slug}`} className="anext" data-cursor="Next">
          <p className="mono">Next article</p>
          <div className="anext__img">
            <img src={next.image} alt="" loading="lazy" />
          </div>
          <h2 className="display h-md">{next.title}</h2>
          <span className="anext__go">
            Continue reading <ArrowUpRight size={18} />
          </span>
        </Link>
      </section>

      <section className="container arel">
        <div className="arel__head">
          <p className="kicker">Keep exploring</p>
          <Link href="/blog" className="btn btn--ghost">
            All articles <ArrowUpRight />
          </Link>
        </div>
        <div className="arel__grid" data-reveal="up">
          {related.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="jcard" data-tilt="7" data-cursor="Read">
              <div className="jcard__img">
                <img src={p.image} alt="" loading="lazy" />
              </div>
              <p className="jmeta">
                <span>{p.date}</span>
                <span>{p.readTime}</span>
              </p>
              <h3>{p.title}</h3>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
