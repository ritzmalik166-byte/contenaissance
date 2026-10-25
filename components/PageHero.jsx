'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { onSiteReady } from '@/lib/ready';
import Split from './Split';
import LazyVideo from './LazyVideo';

export default function PageHero({ kicker, lines, text, video }) {
  const root = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      gsap.set('.split-char', { yPercent: 115, rotateX: -70 });
      gsap.set('.page-hero__fade', { y: 30, opacity: 0 });

      const intro = contextSafe(() => {
        gsap.to('.split-char', { yPercent: 0, rotateX: 0, duration: 1.3, stagger: 0.018, ease: 'power4.out' });
        gsap.to('.page-hero__fade', { y: 0, opacity: 1, duration: 1, stagger: 0.12, delay: 0.4, ease: 'power3.out' });
      });
      const off = onSiteReady(intro);

      gsap.to('.page-hero__inner', {
        yPercent: -30,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.page-hero__bg', {
        scale: 1.15,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });

      return off;
    },
    { scope: root }
  );

  return (
    <section ref={root} className="page-hero">
      {video && (
        <div className="page-hero__bg">
          <LazyVideo src={video.preview} poster={video.poster} eager />
        </div>
      )}
      <div className="container page-hero__inner" style={{ perspective: 900 }}>
        <p className="kicker page-hero__fade">{kicker}</p>
        <Split as="h1" className="display h-xl" lines={lines} />
        {text && <p className="lead page-hero__fade">{text}</p>}
      </div>
    </section>
  );
}
