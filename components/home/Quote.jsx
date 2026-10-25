'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import Split from '../Split';

export default function Quote() {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.fromTo(
        root.current,
        { clipPath: 'inset(12% 8% 12% 8% round 40px)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 25%', scrub: true },
        }
      );
      gsap.to('.quote__text .w', {
        opacity: 1,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: { trigger: '.quote__text', start: 'top 75%', end: 'bottom 50%', scrub: true },
      });
      gsap.from('.quote__mark', {
        scale: 0,
        rotate: -40,
        duration: 1.2,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: root.current, start: 'top 60%' },
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="quote">
      <div className="container quote__grid">
        <div>
          <p className="kicker">09 / A note from the studio</p>
          <div className="quote__mark">“</div>
        </div>
        <div>
          <Split
            as="p"
            by="words"
            className="quote__text"
            text="The most interesting thing about AI isn’t what it can generate. It’s what it allows us to imagine together."
          />
          <div className="quote__sign">
            <i />
            <span>
              <strong>Contenaissance</strong>
              <span>Our creative point of view</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
