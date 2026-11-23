'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/user/gsap';
import { getPortfolioScene } from '@/lib/user/portfolioScene';
import { pfStages } from '@/lib/user/portfolio-content';
import { ArrowUpRight } from '../Icons';
import Split from '../Split';

export default function PfStages() {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.from('.pf-stages__title .split-char', {
        yPercent: 110,
        opacity: 0,
        duration: 1,
        stagger: 0.02,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.pf-stages__head', start: 'top 80%' },
      });
      gsap.from('.pf-stages__side', {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.pf-stages__head', start: 'top 75%' },
      });

      if (prefersReducedMotion()) return;

      // Stages ignite left → right like a launch sequence.
      gsap.from('.pf-stage', {
        y: 70,
        rotateX: -25,
        opacity: 0,
        transformPerspective: 1200,
        transformOrigin: '50% 0%',
        duration: 1.1,
        stagger: 0.14,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.pf-stages__grid', start: 'top 82%' },
      });

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top 85%',
        end: 'bottom 40%',
        onUpdate: (self) => getPortfolioScene()?.setLocal('stages', self.progress),
      });
    },
    { scope: root }
  );

  const hover = (id) => getPortfolioScene()?.hover(id);

  return (
    <section ref={root} className="pf-stages" id="pf-stages">
      <div className="container">
        <div className="pf-stages__head">
          <div>
            <p className="kicker">{pfStages.kicker}</p>
            <Split as="h2" className="display pf-stages__title" lines={[pfStages.title.join(' ')]} />
          </div>
          <p className="pf-stages__side">{pfStages.text}</p>
        </div>

        <div className="pf-stages__grid">
          {pfStages.items.map((s) => (
            <article
              key={s.id}
              className="pf-stage"
              data-star={s.id}
              onPointerEnter={() => hover(s.id)}
              onPointerLeave={() => hover(null)}
            >
              <p className="pf-stage__num">{s.id}</p>
              <p className="mono pf-stage__label">{s.label}</p>
              <h3>{s.title}</h3>
              <Link
                href={s.href}
                className="pf-stage__link"
                onFocus={() => hover(s.id)}
                onBlur={() => hover(null)}
              >
                Services <ArrowUpRight size={11} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
