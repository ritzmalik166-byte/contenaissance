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

        if (reduced) {
          section.style.clipPath = '';
          section.style.opacity = String(Math.min(smooth(0, 0.6, pin), 1 - smooth(0.5, 1, pout)));
          return;
        }

        // Card → full bleed: the cream section starts as a rounded card in
        // the middle of the screen and opens out to the edges (and folds
        // back into a card on the way out). Inset in px of the visible
        // part of the section, so the card stays centred on screen.
        const e = k * k * (3 - 2 * k);
        const visTop = Math.max(0, -r.top);
        const visBot = Math.max(0, r.bottom - vh);
        const ix = (1 - e) * vw * 0.16;
        const iy = (1 - e) * vh * 0.2;
        const rad = (1 - e) * 56;
        section.style.clipPath =
          k >= 0.999
            ? ''
            : k <= 0.001
              ? 'inset(50% 50%)'
              : `inset(${(visTop + iy).toFixed(1)}px ${ix.toFixed(1)}px ${(visBot + iy).toFixed(1)}px round ${rad.toFixed(1)}px)`;
        // the content inside settles from slightly zoomed out as it opens
        section.style.setProperty('--qs', (0.92 + 0.08 * e).toFixed(4));
        section.style.setProperty('--ring', '0');
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

      getUniverse()?.setStarFlare(0);
      // re-render on resize too (the inset is in px)
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
