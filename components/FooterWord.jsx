'use client';

import { useRef } from 'react';
import { gsap, useGSAP, isTouch } from '@/lib/gsap';

const WORD = 'CONTENAISSANCE';

export default function FooterWord() {
  const root = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      const el = root.current;
      const chars = gsap.utils.toArray('.fword__ch', el);
      const fills = chars.map((c) => c.querySelector('.fword__fill'));

      gsap.from(chars, {
        yPercent: 110,
        rotateX: -80,
        opacity: 0,
        duration: 1.4,
        ease: 'expo.out',
        stagger: { each: 0.045, from: 'center' },
        scrollTrigger: { trigger: el, start: 'top 95%' },
      });

      if (isTouch()) {
        gsap.to(fills, {
          opacity: 1,
          duration: 0.8,
          ease: 'sine.inOut',
          stagger: { each: 0.12, repeat: -1, yoyo: true },
          scrollTrigger: { trigger: el, start: 'top 90%' },
        });
        return;
      }

      const setters = chars.map((c, i) => ({
        y: gsap.quickTo(c, 'yPercent', { duration: 0.6, ease: 'power3.out' }),
        s: gsap.quickTo(c, 'scaleY', { duration: 0.6, ease: 'power3.out' }),
        r: gsap.quickTo(c, 'rotateX', { duration: 0.6, ease: 'power3.out' }),
        f: gsap.quickTo(fills[i], 'opacity', { duration: 0.35, ease: 'power2.out' }),
      }));
      let centers = [];
      const measure = () => {
        centers = chars.map((c) => {
          const r = c.getBoundingClientRect();
          return r.left + r.width / 2;
        });
      };

      const move = contextSafe((e) => {
        if (!centers.length) measure();
        const box = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - box.left}px`);
        el.style.setProperty('--my', `${e.clientY - box.top}px`);
        const radius = box.width * 0.14;
        centers.forEach((cx, i) => {
          const d = Math.abs(e.clientX - cx);
          const t = Math.max(0, 1 - d / radius);
          const k = t * t * (3 - 2 * t);
          setters[i].y(-k * 16);
          setters[i].s(1 + k * 0.22);
          setters[i].r(((e.clientX - cx) / radius) * -18 * k);
          setters[i].f(Math.min(1, k * 1.6));
        });
      });

      const enter = () => {
        measure();
        el.classList.add('is-hot');
      };

      const leave = contextSafe(() => {
        el.classList.remove('is-hot');
        centers = [];
        gsap.to(chars, { yPercent: 0, scaleY: 1, rotateX: 0, duration: 1.2, ease: 'elastic.out(1, 0.35)', stagger: 0.02, overwrite: true });
        gsap.to(fills, { opacity: 0, duration: 0.6, ease: 'power2.out', overwrite: true });
      });

      const ripple = contextSafe((e) => {
        const origin = chars.indexOf(e.target.closest('.fword__ch'));
        gsap
          .timeline()
          .to(chars, {
            yPercent: -42,
            rotateX: 360,
            duration: 0.5,
            ease: 'power3.out',
            stagger: { each: 0.035, from: origin < 0 ? 'center' : origin },
            overwrite: true,
          })
          .to(chars, {
            yPercent: 0,
            duration: 0.9,
            ease: 'bounce.out',
            stagger: { each: 0.035, from: origin < 0 ? 'center' : origin },
          }, 0.25)
          .set(chars, { rotateX: 0 });
        gsap.fromTo(fills, { opacity: 1 }, { opacity: 0, duration: 1.4, delay: 0.4, stagger: { each: 0.035, from: origin < 0 ? 'center' : origin } });
      });

      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      el.addEventListener('click', ripple);
      window.addEventListener('resize', measure);
      return () => {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        el.removeEventListener('click', ripple);
        window.removeEventListener('resize', measure);
      };
    },
    { scope: root }
  );

  return (
    <div ref={root} className="fword" aria-label="Contenaissance" role="img" data-cursor="Tap">
      <span className="fword__spot" aria-hidden="true" />
      <div className="fword__row" aria-hidden="true">
        {[...WORD].map((ch, i) => (
          <span className="fword__ch" key={i}>
            <span className="fword__stroke">{ch}</span>
            <span className="fword__fill">{ch}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
