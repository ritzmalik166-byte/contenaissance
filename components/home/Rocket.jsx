'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/gsap';
import { stages } from '@/lib/content';
import { StageIcon, ArrowRight } from '../Icons';

const finalPanel = {
  num: 'All stages',
  title: 'Fire all four together.',
  body: 'Brand films, digital-first content, AI-powered campaigns and visual identity — one crew, one launch, one story told everywhere.',
};

export default function Rocket() {
  const root = useRef(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const modules = q('.rocket__module').reverse(); // S1 first
      const labels = q('.stage-label').reverse();
      const panels = q('.rocket-panel');
      const bars = q('.rocket-progress i');
      const flame = q('.rocket__flame')[0];

      gsap.set(panels, { pointerEvents: 'none' });
      gsap.set(panels[0], { opacity: 1, pointerEvents: 'auto' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      modules.forEach((m, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        tl.addLabel(`s${i}`, i)
          .from(m, { x: side * 220, y: -60, rotate: side * 28, opacity: 0, duration: 0.8 }, i)
          .to(bars[i], { scaleX: 1, duration: 1, ease: 'none' }, i);
      });

      tl.addLabel('nose', 4)
        .from(q('.rocket__nose'), { y: -260, opacity: 0, duration: 0.6 }, 4)
        .from(q('.rocket__fins'), { scaleX: 0.2, opacity: 0, duration: 0.5 }, 0.2)
        .addLabel('final', 4.7)
        .to(flame, { scaleY: 1, duration: 0.5, ease: 'power2.in' }, 4.8)
        .to(q('.rocket'), { x: '+=3', yoyo: true, repeat: 7, duration: 0.06, ease: 'none' }, 5.1)
        .to(q('.rocket__smoke'), { opacity: 1, scale: 1.6, duration: 0.8 }, 5.2)
        .to(q('.rocket'), { y: () => -window.innerHeight * 1.3, duration: 1.6, ease: 'power2.in' }, 5.6)
        .to(flame, { scaleY: 1.8, duration: 1.2 }, 5.6)
        .to(q('.orbit--1'), { scale: 1.6, opacity: 0, duration: 1.6, ease: 'power2.in' }, 5.6)
        .to(q('.orbit--2'), { scale: 0.5, opacity: 0, duration: 1.6, ease: 'power2.in' }, 5.6)
        .to(q('.rocket__smoke'), { opacity: 0, duration: 0.8 }, 6.4)
        .to({}, { duration: 0.4 });

      const markers = [0.6, 1.6, 2.6, 3.6, 4.7];
      let active = 0;
      const setActive = (idx) => {
        if (idx === active) return;
        gsap.to(panels[active], { opacity: 0, y: -18, pointerEvents: 'none', duration: 0.35, overwrite: true });
        gsap.fromTo(
          panels[idx],
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.5, delay: 0.1, overwrite: true }
        );
        active = idx;
      };

      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * 4}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
        onUpdate() {
          const time = this.time();
          let idx = 0;
          markers.forEach((m, i) => time >= m && (idx = i));
          setActive(idx);
          modules.forEach((m, i) => m.classList.toggle('is-on', time >= i + 0.6));
          labels.forEach((l, i) => l.classList.toggle('is-on', time >= i + 0.6));
        },
      }).add(tl);

      gsap.to(q('.orbit--1'), { rotate: 360, duration: 40, repeat: -1, ease: 'none' });
    },
    { scope: root }
  );

  const stack = [...stages].reverse();

  return (
    <section ref={root} className="rocket-sec" id="stages">
      <div className="rocket-sec__grid grid-bg" />
      <div className="container rocket-sec__inner">
        <div className="rocket-stage">
          <div className="orbit orbit--1">
            <i className="orbit__sat" />
          </div>
          <div className="orbit orbit--2" />

          <div className="rocket">
            <svg className="rocket__nose" viewBox="0 0 104 150" aria-hidden="true">
              <path d="M52 0C80 30 100 80 102 150H2C4 80 24 30 52 0Z" fill="#e7eee9" />
              <circle cx="52" cy="88" r="12" fill="#0f1112" stroke="#f2e21b" strokeWidth="4" />
            </svg>

            {stack.map((s, i) => (
              <div className="rocket__module" key={s.id}>
                <small>{s.id}</small>
                <StageIcon name={s.icon} />
                <div className={`stage-label stage-label--${i % 2 === 0 ? 'right' : 'left'}`}>
                  <span className="stage-label__line" />
                  <span className="stage-label__txt">
                    <small>{s.label}</small>
                    <strong>{s.title}</strong>
                  </span>
                </div>
                {s.id === 'S1' && (
                  <svg className="rocket__fins" viewBox="0 0 180 120" style={{ zIndex: -1, bottom: -10 }} aria-hidden="true">
                    <path d="M40 18 4 120h36Z" fill="#f2e21b" />
                    <path d="M140 18l36 102h-36Z" fill="#f2e21b" />
                  </svg>
                )}
              </div>
            ))}

            <div className="rocket__nozzle" />
            <svg className="rocket__flame" viewBox="0 0 34 70" aria-hidden="true">
              <path d="M2 0h30l-6 38c-3 18-6 30-9 32-3-2-6-14-9-32Z" fill="#ff5a3c" />
              <path d="M9 0h16l-3 26c-2 12-3 18-5 20-2-2-3-8-5-20Z" fill="#c8f04a" />
            </svg>
            <div className="rocket__smoke" />
          </div>
        </div>

        <div className="rocket-copy">
          <div className="rocket-copy__head">
            <p className="kicker">01 / Our AI Stages</p>
            <h2 className="display h-md">
              Not more content.
              <br />
              More possibility.
            </h2>
          </div>

          <div className="rocket-panels">
            {stages.map((s) => (
              <article className="rocket-panel" key={s.id}>
                <p className="rocket-panel__num">{s.label}</p>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
            <article className="rocket-panel rocket-panel--final">
              <p className="rocket-panel__num">{finalPanel.num}</p>
              <h3>{finalPanel.title}</h3>
              <p>{finalPanel.body}</p>
              <Link href="/services" className="btn btn--ghost rocket-panel__button" style={{ marginTop: 22 }}>
                See every stage <ArrowRight />
              </Link>
            </article>
          </div>

          <div className="rocket-progress" aria-hidden="true">
            {stages.map((s) => (
              <span key={s.id}>
                <i />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
