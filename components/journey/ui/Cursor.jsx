'use client';

import { useEffect, useRef } from 'react';
import { gsap, isTouch } from '@/lib/user/gsap';

/* Desktop only: a small dot, a gold ring on anything interactive, and a
   tiny label where an element declares one with data-cursor. */
export default function Cursor() {
  const root = useRef(null);
  const dot = useRef(null);
  const ring = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (isTouch()) return undefined;
    const el = root.current;
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.08, ease: 'power3' });
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.08, ease: 'power3' });
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.4, ease: 'power3' });
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.4, ease: 'power3' });
    let current = null;
    const move = (e) => {
      el.classList.add('is-active');
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      const hit = e.target?.closest?.('[data-cursor], a, button, [role="button"]');
      if (hit === current) return;
      current = hit;
      const text = hit?.dataset?.cursor || '';
      el.classList.toggle('is-hover', Boolean(hit));
      el.classList.toggle('is-label', Boolean(text));
      if (text) label.current.textContent = text;
    };
    const leave = () => el.classList.remove('is-active');
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div ref={root} className="m-cursor" aria-hidden="true">
      <div ref={ring} className="m-cursor__ring">
        <span ref={label} />
      </div>
      <div ref={dot} className="m-cursor__dot" />
    </div>
  );
}
