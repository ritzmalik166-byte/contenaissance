'use client';

import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/user/gsap';
import { getPortfolioScene } from '@/lib/user/portfolioScene';
import { pfMarquee } from '@/lib/user/portfolio-content';

const Row = ({ words, outline }) => {
  const text = words.join(' × ');
  // Two identical halves so a -50% loop is seamless.
  return (
    <div className={`pf-marquee__row${outline ? ' pf-marquee__row--outline' : ''}`} aria-hidden="true">
      <div className="pf-marquee__track">
        {[0, 1, 2, 3].map((i) => (
          <span key={i}>
            {text} ×&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
};

export default function PfMarquee() {
  const root = useRef(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tracks = gsap.utils.toArray('.pf-marquee__track', root.current);

      // Opposing loops whose speed follows scroll velocity.
      const loops = tracks.map((track, i) =>
        gsap.fromTo(
          track,
          { xPercent: i ? -50 : 0 },
          { xPercent: i ? 0 : -50, duration: 38, ease: 'none', repeat: -1, paused: reduced }
        )
      );

      gsap.from('.pf-marquee__row', {
        xPercent: (i) => (i ? 12 : -12),
        opacity: 0,
        duration: 1.4,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: 'top 75%' },
      });

      if (reduced) return;

      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          onUpdate: (self) => getPortfolioScene()?.setLocal('marquee', self.progress),
        },
      }).fromTo('.pf-marquee__rows', { yPercent: 18 }, { yPercent: -18, ease: 'none' });

      let boost = 1;
      const tick = () => {
        const vel = Math.abs(window.__lenis?.velocity || 0);
        const target = 1 + Math.min(vel * 0.25, 6);
        boost += (target - boost) * 0.08;
        loops.forEach((l) => l.timeScale(boost));
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: root }
  );

  const label = [...pfMarquee.solid, ...pfMarquee.outline].join(', ');

  return (
    <section ref={root} className="pf-marquee" aria-label={label}>
      <div className="pf-marquee__rows">
        <Row words={pfMarquee.solid} />
        <Row words={pfMarquee.outline} outline />
      </div>
    </section>
  );
}
