'use client';

import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/user/gsap';

/* DOM half of the aperture cut. While the WebGL camera dolly-zooms
   between chambers, the page content itself moves in depth: each
   section's content rises out of a tilted plane as it enters, and
   the section tips back and recedes as it leaves. Pinned sections
   (hero, showreel) run their own 3D timelines and are skipped. */

const ENTER = ['.pf-archive > .container', '.pf-marquee__rows', '.pf-stages > .container', '.pf-quote > .container', '.pf-cta > .container'];
const EXIT = ['.pf-archive', '.pf-marquee', '.pf-stages', '.pf-quote'];

export default function PfHandoff() {
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      ENTER.forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        gsap.fromTo(
          el,
          { rotateX: 9, z: -180, opacity: 0.35, transformPerspective: 1400, transformOrigin: '50% 0%' },
          {
            rotateX: 0,
            z: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 45%', scrub: 0.6 },
          }
        );
      });
      EXIT.forEach((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        gsap.fromTo(
          el,
          { rotateX: 0, z: 0, opacity: 1, transformPerspective: 1400, transformOrigin: '50% 100%' },
          {
            rotateX: -7,
            z: -140,
            opacity: 0.25,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: { trigger: el, start: 'bottom 55%', end: 'bottom top', scrub: 0.6 },
          }
        );
      });
      ScrollTrigger.refresh();
    });
    return () => mm.revert();
  });

  return null;
}
