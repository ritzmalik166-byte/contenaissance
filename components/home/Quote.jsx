'use client';

import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, prefersReducedMotion } from '@/lib/user/gsap';
import { getUniverse } from '@/lib/user/universe';
import Split from '../Split';

export default function Quote() {
  const root = useRef(null);

  useGSAP(
    () => {
      /* Journey: the camera flies at a bright star (universe "quote"
         station); it flares, then the cream section blooms out of it as
         a growing circle. On the way out the cream folds back into the
         star and space returns for the CTA. */
      const section = root.current;
      const reduced = prefersReducedMotion();
      const smooth = (a, b, x) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      let k = 1;

      const renderBloom = () => {
        const r = section.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // entry: top travels from the viewport bottom to 15% from the top
        const pin = 1 - (r.top - vh * 0.15) / (vh * 0.85);
        // exit: bottom travels from 70% of the viewport to the top
        const pout = 1 - r.bottom / (vh * 0.7);
        const kin = smooth(0.18, 1, pin);
        const kout = 1 - smooth(0, 1, pout);
        k = Math.min(kin, kout);
        // cream filling the whole screen → the universe can rest
        getUniverse()?.setOccluded('quote', k >= 0.999 && r.top <= 0.5 && r.bottom >= vh - 0.5);

        // flare peaks just before the bloom opens, and again as it folds
        const flare = Math.max(
          smooth(0, 0.18, pin) * (1 - smooth(0.25, 0.5, pin)),
          // (softer on the way out — the camera passes close to the star)
          0.5 * smooth(0.55, 0.9, pout) * (1 - smooth(0.95, 1.1, pout))
        );
        getUniverse()?.setStarFlare(reduced ? 0 : flare);

        if (reduced) {
          section.style.clipPath = '';
          section.style.opacity = String(Math.min(smooth(0, 0.6, pin), 1 - smooth(0.5, 1, pout)));
          return;
        }

        // bloom centre = the star on screen (section-local px)
        const s = getUniverse()?.getAnchorNDC('star');
        let x = r.width / 2;
        let y = vh / 2 - r.top;
        if (s && s.z < 1 && Math.abs(s.x) < 1.4 && Math.abs(s.y) < 1.4) {
          x = ((s.x + 1) / 2) * vw - r.left;
          y = ((1 - s.y) / 2) * vh - r.top;
        }
        const far = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));
        const R = k * far;
        section.style.clipPath = k >= 0.999 ? '' : `circle(${R.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`;
        section.style.setProperty('--bx', `${x.toFixed(1)}px`);
        section.style.setProperty('--by', `${y.toFixed(1)}px`);
        section.style.setProperty('--br', `${R.toFixed(1)}px`);
        section.style.setProperty('--ring', (k > 0.001 && k < 0.999 ? 1 : 0).toString());
      };

      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: renderBloom,
        onRefresh: renderBloom,
        onLeave: renderBloom,
        onLeaveBack: renderBloom,
      });
      renderBloom();

      // the star drifts with the camera easing — keep the bloom on it
      const follow = () => {
        if (k > 0 && k < 1) renderBloom();
      };
      gsap.ticker.add(follow);
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

      return () => {
        gsap.ticker.remove(follow);
        getUniverse()?.setStarFlare(0);
      };
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
            <div className="quote__sign-mark">
              <img
                src="/logo.webp"
                alt="Contenaissance Logo"
                width="48"
                height="48"
              />
            </div>

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
