'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/user/gsap';
import { onSiteReady } from '@/lib/user/ready';
import { getPortfolioScene } from '@/lib/user/portfolioScene';
import { pfHero, pfCategories } from '@/lib/user/portfolio-content';
import { openVideo } from '../VideoModal';
import Split from '../Split';

// Jump to the archive with a category preselected (PfArchive listens).
export function showCategory(cat) {
  window.dispatchEvent(new CustomEvent('pf:filter', { detail: cat }));
  const target = document.getElementById('pf-archive');
  if (!target) return;
  if (window.__lenis) window.__lenis.scrollTo(target, { offset: -40, duration: 1.6 });
  else target.scrollIntoView({ behavior: 'smooth' });
}

export default function PfHero() {
  const root = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      const reduced = prefersReducedMotion();

      gsap.set('.pf-hero__title .split-char', { yPercent: 120, rotateX: -70, opacity: 0 });
      gsap.set(['.pf-hero__crumb', '.pf-hero__text', '.pf-hero__cats', '.pf-hero__scroll'], { opacity: 0, y: 24 });

      const offReady = onSiteReady(
        contextSafe(() => {
          gsap
            .timeline({ defaults: { ease: 'power4.out' } })
            .to('.pf-hero__crumb', { opacity: 1, y: 0, duration: 1 })
            .to('.pf-hero__title .split-char', { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.3, stagger: 0.025 }, 0.1)
            .to('.pf-hero__text', { opacity: 1, y: 0, duration: 1.1 }, 0.6)
            .to(['.pf-hero__cats', '.pf-hero__scroll'], { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.8);
        })
      );

      if (reduced) return offReady;

      // Pinned push-through: the copy lifts away while the camera
      // flies through the orbit ring (PortfolioScene reads 'hero').
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=90%',
            pin: true,
            scrub: true,
            onUpdate: (self) => getPortfolioScene()?.setLocal('hero', self.progress),
          },
        })
        .to('.pf-hero__inner', { yPercent: -28, scale: 0.94, opacity: 0, filter: 'blur(6px)', ease: 'power1.in' }, 0)
        .to('.pf-hero__bottom', { y: -30, opacity: 0, ease: 'power1.in' }, 0.3);

      return offReady;
    },
    { scope: root }
  );

  return (
    <section ref={root} className="pf-hero" id="pf-hero">
      <div className="pf-hero__inner container">
        <p className="pf-hero__crumb">
          <Link href="/">Home</Link> / <span aria-current="page">Portfolio</span>
        </p>
        <Split as="h1" className="display pf-hero__title" lines={[pfHero.title]} />
        <p className="pf-hero__text">{pfHero.text}</p>
      </div>

      {/* Static stand-ins for the WebGL orbit cards (reduced motion / no WebGL). */}
      <div className="pf-hero__fallback" aria-hidden="true">
        {pfHero.cards.slice(0, 3).map((c, i) => (
          <img key={c.id} src={c.image} alt="" className={`pf-hero__fcard pf-hero__fcard--${i + 1}`} />
        ))}
      </div>

      {/* Keyboard / screen-reader proxies for the 3D orbit cards. */}
      <ul className="sr-only">
        {pfHero.cards.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => openVideo(c.video.src)}
              onFocus={() => getPortfolioScene()?.hover(c.id)}
              onBlur={() => getPortfolioScene()?.hover(null)}
            >
              Play {c.title}
            </button>
          </li>
        ))}
      </ul>

      <div className="pf-hero__bottom">
        <div className="pf-hero__scroll container" aria-hidden="true">
          <span>Scroll</span>
          <i />
        </div>

        <div className="pf-hero__cats container">
          {pfCategories.slice(0, 4).map((c, i) => (
            <button key={c.id} type="button" className="pf-hero__cat" onClick={() => showCategory(c.id)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
