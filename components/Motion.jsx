'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, ScrollTrigger, isTouch, prefersReducedMotion } from '@/lib/gsap';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+*<>';

function scramble(el) {
  const original = el.dataset.text;
  const len = original.length;
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1,
    duration: Math.min(1.4, 0.5 + len * 0.025),
    ease: 'power2.out',
    onUpdate: () => {
      const solved = Math.floor(state.p * len);
      let out = original.slice(0, solved);
      for (let i = solved; i < len; i++) {
        out += original[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete: () => (el.textContent = original),
  });
}

function bindMagnetic(el) {
  const strength = parseFloat(el.dataset.magnetic) || 0.35;
  const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
  const move = (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: true });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    gsap.set(el, { x: 0, y: 0 });
  };
}

function bindTilt(el) {
  const max = parseFloat(el.dataset.tilt) || 10;
  let glare = el.querySelector(':scope > .tilt-glare');
  if (!glare) {
    glare = document.createElement('span');
    glare.className = 'tilt-glare';
    el.appendChild(glare);
  }
  gsap.set(el, { transformPerspective: 1000 });
  const rx = gsap.quickTo(el, 'rotateX', { duration: 0.7, ease: 'power3.out' });
  const ry = gsap.quickTo(el, 'rotateY', { duration: 0.7, ease: 'power3.out' });
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry((px - 0.5) * max * 2);
    rx(-(py - 0.5) * max * 2);
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  };
  const leave = () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1.1, ease: 'elastic.out(1, 0.5)', overwrite: true });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
  };
}

export default function Motion() {
  const bar = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => gsap.set(bar.current, { scaleX: self.progress }),
    });

    let lastHeight = document.body.scrollHeight;
    const refresh = gsap.delayedCall(0.25, () => ScrollTrigger.refresh()).pause();
    const ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - lastHeight) < 2) return;
      lastHeight = h;
      refresh.restart(true);
    });
    ro.observe(document.body);

    return () => {
      st.kill();
      ro.disconnect();
      refresh.kill();
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const cleanups = [];
    let skewTick;

    const id = setTimeout(() => {
      const ctx = gsap.context(() => {
        document.querySelectorAll('.kicker, [data-scramble]').forEach((el) => {
          if (el.children.length || !el.textContent.trim()) return;
          el.dataset.text = el.dataset.text || el.textContent;
          ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => scramble(el) });
        });

        document.querySelectorAll('[data-reveal="media"]').forEach((el) => {
          const inner = el.querySelector('img, video');
          gsap
            .timeline({ scrollTrigger: { trigger: el, start: 'top 88%' } })
            .fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
            .fromTo(inner, { scale: 1.4 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1);
        });

        document.querySelectorAll('[data-reveal="up"]').forEach((el) => {
          gsap.from(el.children, {
            y: 60,
            opacity: 0,
            rotateX: -25,
            transformPerspective: 800,
            transformOrigin: '50% 0%',
            duration: 1.1,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: 'top 85%' },
          });
        });

        document.querySelectorAll('[data-parallax]').forEach((el) => {
          const amt = parseFloat(el.dataset.parallax) || 15;
          gsap.fromTo(el, { yPercent: -amt }, {
            yPercent: amt,
            ease: 'none',
            scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });
      });
      cleanups.push(() => ctx.revert());

      if (!isTouch()) {
        document.querySelectorAll('.btn:not(.cta__btn), .nav__cta, [data-magnetic]').forEach((el) => cleanups.push(bindMagnetic(el)));
        document.querySelectorAll('[data-tilt]').forEach((el) => cleanups.push(bindTilt(el)));
      }

      const skewEls = [...document.querySelectorAll('[data-skew]')];
      if (skewEls.length) {
        const setters = skewEls.map((el) => gsap.quickSetter(el, 'skewY', 'deg'));
        let current = 0;
        skewTick = () => {
          const vel = window.__lenis?.velocity || 0;
          const target = gsap.utils.clamp(-5, 5, vel * 0.18);
          current += (target - current) * 0.12;
          if (Math.abs(current) < 0.01) current = 0;
          setters.forEach((s) => s(current));
        };
        gsap.ticker.add(skewTick);
      }

      ScrollTrigger.refresh();
    }, 80);

    return () => {
      clearTimeout(id);
      if (skewTick) gsap.ticker.remove(skewTick);
      cleanups.forEach((fn) => fn());
      document.querySelectorAll('[data-text]').forEach((el) => (el.textContent = el.dataset.text));
    };
  }, [pathname]);

  return <div ref={bar} className="scroll-progress" aria-hidden="true" />;
}
