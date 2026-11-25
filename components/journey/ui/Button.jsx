'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap, isTouch } from '@/lib/user/gsap';

/* Magnetic pill button. `gold` is the primary. */
export default function Button({ href, children, cursor = 'GO', variant = 'gold', className = '', onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouch()) return undefined;
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.25);
      y((e.clientY - (r.top + r.height / 2)) * 0.3);
    };
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: true });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);
  const cls = `m-btn m-btn--${variant} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </>
  );
  if (href?.startsWith('#')) {
    const go = (e) => {
      e.preventDefault();
      const t = document.querySelector(href);
      if (window.__lenis) window.__lenis.scrollTo(t, { duration: 1.5 });
      else t?.scrollIntoView({ behavior: 'smooth' });
    };
    return (
      <a ref={ref} href={href} className={cls} data-cursor={cursor} onClick={go}>
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link ref={ref} href={href} className={cls} data-cursor={cursor}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={ref} type="button" className={cls} data-cursor={cursor} onClick={onClick}>
      {inner}
    </button>
  );
}
