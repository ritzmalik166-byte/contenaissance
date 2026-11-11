
'use client';

import { useEffect } from 'react';
import { gsap } from '@/lib/user/gsap';

export function useVelocityMarquee(
  ref,
  { speed = 0.5, direction = -1, skew = true } = {}
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let x = 0;
    let dir = direction;
    let half = el.scrollWidth / 2;
    let isPaused = false;

    const setX = gsap.quickSetter(el, 'x', 'px');

    const setSkew = skew
      ? gsap.quickTo(el, 'skewX', {
          duration: 0.5,
          ease: 'power3',
        })
      : null;

    // Pause when hovering over any testimonial card
    const onMouseEnter = () => {
      isPaused = true;
    };

    const onMouseLeave = () => {
      isPaused = false;
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);

    const onResize = () => {
      half = el.scrollWidth / 2;
    };

    window.addEventListener('resize', onResize);

    const tick = (_, dt) => {
      // Stop movement while hovering
      if (isPaused) {
        setSkew?.(0);
        return;
      }

      const v = window.__lenis?.velocity || 0;

      if (Math.abs(v) > 0.4) {
        dir = v > 0 ? direction : -direction;
      }

      const boost = 1 + Math.min(Math.abs(v) * 0.25, 8);

      x += dir * speed * boost * (dt / 16.67);

      if (x <= -half) x += half;
      if (x > 0) x -= half;

      setX(x);
      setSkew?.(gsap.utils.clamp(-8, 8, -v * 0.4));
    };

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);

      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);

      window.removeEventListener('resize', onResize);
    };
  }, [ref, speed, direction, skew]);
}
