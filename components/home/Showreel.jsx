'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { v } from '@/lib/content';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';
import { Play } from '../Icons';

const reel = v('mzha');

export default function Showreel() {
  const root = useRef(null);

  useGSAP(
    () => {
      const mobile = window.innerWidth < 760;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=160%',
          pin: true,
          scrub: 1,
        },
      });

      tl.fromTo(
        '.reel__frame',
        {
          clipPath: mobile ? 'inset(34% 6% 30% 6% round 18px)' : 'inset(30% 24% 16% 24% round 28px)',
          rotateX: 22,
          scale: 0.92,
        },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', rotateX: 0, scale: 1, ease: 'power2.inOut', duration: 1 }
      )
        .to('.reel__head span:first-child', { xPercent: -60, opacity: 0, ease: 'power2.in', duration: 0.8 }, 0)
        .to('.reel__head span:last-child', { xPercent: 60, opacity: 0, ease: 'power2.in', duration: 0.8 }, 0)
        .to('.reel__num', { opacity: 0, duration: 0.4 }, 0)
        .fromTo('.reel__frame video', { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .fromTo('.reel__ui', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.7)
        .to({}, { duration: 0.3 });
    },
    { scope: root }
  );

  const watch = () => openVideo(reel.src);

  return (
    <section ref={root} className="reel" id="showreel">
      <p className="kicker reel__num">03 / Transmission incoming</p>
      <h2 className="reel__head" aria-label="Transmission incoming">
        <span>Transmission</span>
        <span>Incoming</span>
      </h2>

      <div className="reel__stage">
        <div className="reel__frame">
          <LazyVideo src={reel.preview} poster={reel.poster} eager />
          <div className="reel__ui">
            <div className="reel__ui-top">
              <span>Contenaissance / Showreel</span>
              <button onClick={watch} data-cursor-hover>
                [ Full screen ↗ ]
              </button>
            </div>
            <div className="reel__ui-bottom">
              <span>A glimpse of the possible.</span>
              <button className="sound-btn is-on" onClick={watch}>
                <span className="sound-btn__bars">
                  <i />
                  <i />
                  <i />
                </span>
                Watch with sound
              </button>
            </div>
          </div>
          <button className="reel__play" onClick={watch} aria-label="Play showreel" data-cursor="Play">
            <Play />
          </button>
        </div>
      </div>
    </section>
  );
}
