'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
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
          <h2 className="kicker">08 / A note from the studio</h2>
          <div className="quote__mark">“</div>
        </div>
        <div>
          <Split
            as="p"
            by="words"
            className="quote__text"
            text="At Contenaissance, we blend human creativity and AI innovation to create extraordinary brand films, campaigns and digital experiences."
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
