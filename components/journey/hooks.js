'use client';

import { useEffect, useState } from 'react';

/** active step of a chapter, reported by the WebGL engine ('jstep' event) */
export function useJStep(ref, initial = 0) {
  const [step, setStep] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const on = (e) => setStep(e.detail);
    el.addEventListener('jstep', on);
    return () => el.removeEventListener('jstep', on);
  }, [ref]);
  return step;
}

/** true while the engine reports this chapter as the current one */
export function useJActive(ref) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const f = (e) => setOn(e.detail);
    el.addEventListener('jactive', f);
    return () => el.removeEventListener('jactive', f);
  }, [ref]);
  return on;
}

/** smooth-scroll to a progress point (0..1) inside a sticky chapter */
export function scrollToProgress(el, p) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const range = el.offsetHeight - window.innerHeight;
  const y = top + range * p;
  if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.6 });
  else window.scrollTo({ top: y, behavior: 'smooth' });
}

/** enter reveals for [data-reveal] descendants of ordinary (non-sticky) sections */
export function useReveal(root) {
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}
