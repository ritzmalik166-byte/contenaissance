'use client';

import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/user/gsap';
import { getPortfolioScene } from '@/lib/user/portfolioScene';
import { pfQuote } from '@/lib/user/portfolio-content';
import Split from '../Split';

export default function PfQuote() {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.from(['.pf-quote .kicker', '.pf-quote__mark'], {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 75%' },
      });

      if (prefersReducedMotion()) return;

      // Words surface one by one as the camera drifts toward the galaxy.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top 70%',
            end: 'bottom 75%',
            scrub: true,
            onUpdate: (self) => getPortfolioScene()?.setLocal('quote', self.progress),
          },
        })
        .fromTo(
          '.pf-quote__text .split-char',
          { opacity: 0.12, filter: 'blur(4px)', y: 14 },
          { opacity: 1, filter: 'blur(0px)', y: 0, stagger: 0.08, ease: 'none' }
        )
        .from('.pf-quote__sign', { opacity: 0, y: 20, ease: 'none' }, '>-0.2');
    },
    { scope: root }
  );

  return (
    <section ref={root} className="pf-quote" id="pf-quote">
      <div className="container pf-quote__grid">
        <div>
          <h2 className="kicker">{pfQuote.kicker}</h2>
          <div className="pf-quote__mark" aria-hidden="true">
            “
          </div>
        </div>
        <div>
          <Split as="p" by="words" className="pf-quote__text" text={pfQuote.text} />
          <div className="pf-quote__sign">
            <span className="pf-quote__ring" aria-hidden="true" />
            <span>
              <strong>{pfQuote.name}</strong>
              <span className="pf-quote__role">{pfQuote.role}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
