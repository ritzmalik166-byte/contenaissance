'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, isTouch } from '@/lib/gsap';
import Split from './Split';
import { ArrowUpRight } from './Icons';

export default function Cta() {
  const root = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      gsap.from('.cta__title .split-char', {
        yPercent: 115,
        rotateX: -60,
        duration: 1.2,
        stagger: 0.02,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.cta__title', start: 'top 82%' },
      });
      gsap.from('.cta__orbit', {
        scale: 0.6,
        rotate: -90,
        opacity: 0,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.cta__orbit', start: 'top 95%', end: 'center 55%', scrub: 1 },
      });
      gsap.from('.cta__row > *', {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.cta__row', start: 'top 90%' },
      });

      if (isTouch()) return;

      const btn = root.current.querySelector('.cta__btn');
      const bx = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3' });
      const by = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3' });
      const arrow = root.current.querySelector('.cta__arrow');

      const move = contextSafe((e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < 140) {
          bx(dx * 0.3);
          by(dy * 0.3);
        } else {
          bx(0);
          by(0);
        }
        const a = arrow.getBoundingClientRect();
        const ang = Math.atan2(e.clientY - (a.top + a.height / 2), e.clientX - (a.left + a.width / 2));
        arrow.style.transform = `rotate(${(ang * 180) / Math.PI + 45}deg)`;
      });
      window.addEventListener('pointermove', move);
      return () => window.removeEventListener('pointermove', move);
    },
    { scope: root }
  );

  return (
    <section ref={root} className="cta" id="contact">
      <div className="container cta__grid">
        <div>
          <p className="kicker">10 / Open a new flight plan</p>
          <Split as="h2" className="display cta__title" lines={['What’s your', 'next big story?']} />
          <div className="cta__row">
            <Link href="/contact" className="btn btn--gold cta__btn">
              Let’s make it happen <ArrowUpRight />
            </Link>
            <p>Bring the spark. We’ll help you find a world it can live in.</p>
          </div>
        </div>

        <div className="cta__orbit" aria-hidden="true">
          <span className="cta__orbit-ring" />
          <span className="cta__orbit-ring cta__orbit-ring--inner" />
          <span className="cta__orbit-spin">
            <i />
          </span>
          <svg className="cta__arrow" viewBox="0 0 60 60" fill="none">
            <path d="M8 52 52 8M20 8h32v32" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </section>
  );
}
