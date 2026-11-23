'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, isTouch } from '@/lib/user/gsap';
import { getPortfolioScene } from '@/lib/user/portfolioScene';
import Split from '../Split';
import { ArrowUpRight } from '../Icons';
import { pfCta } from '@/lib/user/portfolio-content';

/* 10 / Open a new flight plan — Figma 11.png.
   Portfolio-owned (independent of the homepage CTA). The flat
   rings are the fallback; when the WebGL world runs, a tilted 3D
   orbit (hud.js) is locked onto `.pf-cta__orbit` and the arrow
   turns to follow the cursor. */
export default function PfCta() {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.from('.pf-cta__title .split-char', {
        yPercent: 115,
        rotateX: -70,
        transformOrigin: '50% 100% -30px',
        duration: 1.3,
        stagger: 0.02,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.pf-cta__title', start: 'top 82%' },
      });
      gsap.from('.pf-cta__row > *', {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.pf-cta__row', start: 'top 90%' },
      });
      gsap.from('.pf-cta__orbit', {
        scale: 0.7,
        rotateX: 50,
        opacity: 0,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.pf-cta__orbit', start: 'top 95%', end: 'center 60%', scrub: 1 },
      });

      if (isTouch()) return;
      // Arrow aims at the cursor; the button pulls toward it.
      const arrow = root.current.querySelector('.pf-cta__arrow');
      const orbit = root.current.querySelector('.pf-cta__orbit');
      const btn = root.current.querySelector('.pf-cta__btn');
      const rot = gsap.quickTo(arrow, 'rotation', { duration: 0.6, ease: 'power3.out' });
      const bx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const by = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });

      const onMove = (e) => {
        const r = orbit.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        // the SVG arrow points up-right (-45°) at rest
        let deg = (a * 180) / Math.PI + 45;
        deg = ((deg + 540) % 360) - 180;
        rot(deg * 0.6);
      };
      const onBtnMove = (e) => {
        const r = btn.getBoundingClientRect();
        bx((e.clientX - (r.left + r.width / 2)) * 0.25);
        by((e.clientY - (r.top + r.height / 2)) * 0.35);
      };
      const onBtnLeave = () => {
        bx(0);
        by(0);
      };
      const onEnter = () => getPortfolioScene()?.hover('cta');
      const onExit = () => getPortfolioScene()?.hover(null);

      window.addEventListener('pointermove', onMove, { passive: true });
      btn.addEventListener('pointermove', onBtnMove);
      btn.addEventListener('pointerleave', onBtnLeave);
      orbit.addEventListener('pointerenter', onEnter);
      orbit.addEventListener('pointerleave', onExit);
      return () => {
        window.removeEventListener('pointermove', onMove);
        btn.removeEventListener('pointermove', onBtnMove);
        btn.removeEventListener('pointerleave', onBtnLeave);
        orbit.removeEventListener('pointerenter', onEnter);
        orbit.removeEventListener('pointerleave', onExit);
      };
    },
    { scope: root }
  );

  return (
    <section ref={root} className="pf-cta" id="contact">
      <div className="container pf-cta__grid">
        <div>
          <p className="kicker">{pfCta.kicker}</p>
          <Split as="h2" className="pf-cta__title" lines={pfCta.title} />
          <div className="pf-cta__row">
            <Link href={pfCta.href} className="pf-cta__btn" data-cursor="Go">
              <span>{pfCta.button}</span>
              <ArrowUpRight />
            </Link>
            <p>{pfCta.text}</p>
          </div>
        </div>

        <div className="pf-cta__orbit" aria-hidden="true">
          <span className="pf-cta__ring" />
          <span className="pf-cta__ring pf-cta__ring--inner" />
          <span className="pf-cta__spin">
            <i />
          </span>
          <svg className="pf-cta__arrow" viewBox="0 0 60 60" fill="none">
            <path d="M8 52 52 8M20 8h32v32" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </section>
  );
}
