'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, isTouch } from '@/lib/gsap';

export default function Cursor() {
  const root = useRef(null);
  const dot = useRef(null);
  const ring = useRef(null);
  const [label, setLabel] = useState('');
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isTouch()) return;

    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.5, ease: 'power3' });

    const move = (e) => {
      setActive(true);
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    };

    const over = (e) => {
      const el = e.target.closest('[data-cursor], [data-cursor-hover], a, button');
      setLabel(el?.dataset.cursor || '');
      setHover(Boolean(el) && !el?.dataset.cursor);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerover', over);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
    };
  }, []);

  return (
    <div ref={root} className={`cursor${active ? ' is-active' : ''}${label ? ' is-label' : ''}${hover ? ' is-hover' : ''}`} aria-hidden="true">
      <div ref={ring} className="cursor__ring">
        {label}
      </div>
      <div ref={dot} className="cursor__dot" />
    </div>
  );
}
