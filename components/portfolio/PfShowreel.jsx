'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion, isTouch } from '@/lib/user/gsap';
import { getPortfolioScene } from '@/lib/user/portfolioScene';
import { SHOWREEL_SRC } from '@/lib/user/portfolio-content';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';
import { Play } from '../Icons';

export default function PfShowreel() {
  const root = useRef(null);
  const watch = () => openVideo(SHOWREEL_SRC);

  useGSAP(
    (ctx, contextSafe) => {
      gsap.from('.pf-reel__kicker', {
        y: 40,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 80%' },
      });

      if (prefersReducedMotion()) return;

      const mm = gsap.matchMedia();

      // Desktop: the transmission screen swings in from deep space,
      // tilted like a projection, and locks flat while pinned.
      mm.add('(min-width: 761px)', () => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top 85%',
              end: 'top top',
              scrub: true,
            },
          })
          .fromTo(
            '.pf-reel__frame',
            { rotateX: 38, rotateY: -8, scale: 0.7, z: -400, yPercent: 12, opacity: 0.2 },
            { rotateX: 0, rotateY: 0, scale: 1, z: 0, yPercent: 0, opacity: 1, ease: 'power2.out' }
          );

        ScrollTrigger.create({
          trigger: root.current,
          start: 'top top',
          end: '+=60%',
          pin: true,
          onUpdate: (self) => getPortfolioScene()?.setLocal('reel', self.progress),
        });
      });

      mm.add('(max-width: 760px)', () => {
        gsap.from('.pf-reel__frame', {
          scale: 0.86,
          opacity: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.pf-reel__frame', start: 'top 85%' },
        });
      });

      if (isTouch()) return () => mm.revert();

      // Magnetic play disc that drifts toward the cursor inside the frame.
      const frame = root.current.querySelector('.pf-reel__frame');
      const play = root.current.querySelector('.pf-reel__play');
      const px = gsap.quickTo(play, 'x', { duration: 0.6, ease: 'power3.out' });
      const py = gsap.quickTo(play, 'y', { duration: 0.6, ease: 'power3.out' });
      const move = contextSafe((e) => {
        const r = frame.getBoundingClientRect();
        px((e.clientX - (r.left + r.width / 2)) * 0.18);
        py((e.clientY - (r.top + r.height / 2)) * 0.18);
      });
      const enter = () => getPortfolioScene()?.hover('reel');
      const leave = () => {
        px(0);
        py(0);
        getPortfolioScene()?.hover(null);
      };
      frame.addEventListener('pointermove', move);
      frame.addEventListener('pointerenter', enter);
      frame.addEventListener('pointerleave', leave);

      return () => {
        frame.removeEventListener('pointermove', move);
        frame.removeEventListener('pointerenter', enter);
        frame.removeEventListener('pointerleave', leave);
        mm.revert();
      };
    },
    { scope: root }
  );

  return (
    <section ref={root} className="pf-reel" id="showreel">
      <div className="container">
        <h2 className="pf-reel__kicker">01 / Transmission incoming</h2>

        <div className="pf-reel__stage">
          <div className="pf-reel__frame" data-cursor="Play">
            <LazyVideo src={SHOWREEL_SRC} poster="/posters/mzha.jpg" eager />
            <span className="pf-reel__shade" aria-hidden="true" />

            <div className="pf-reel__ui">
              <div className="pf-reel__ui-top">
                <span>Contenaissance / Showreel</span>
                <button type="button" onClick={watch}>
                  [ Full screen ↗ ]
                </button>
              </div>
              <div className="pf-reel__ui-bottom">
                <span>A glimpse of the possible.</span>
              </div>
            </div>

            <button type="button" className="pf-reel__play" onClick={watch} aria-label="Play showreel">
              <Play />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
