'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, isTouch } from '@/lib/gsap';
import { webExperiences } from '@/lib/content';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function Web3D() {
  const root = useRef(null);
  const videos = useRef([]);
  const trigger = useRef(null);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);
  const steps = webExperiences.length;

  useGSAP(
    (ctx, contextSafe) => {
      gsap.set('.ring', { rotateX: -6 });
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top 75%' } })
        .from('.web3d__title .split-line > span', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.1 })
        .from('.ring', { rotateX: 55, scale: 0.6, opacity: 0, duration: 1.6, ease: 'expo.out' }, 0.1)
        .from('.web3d__floor', { opacity: 0, duration: 1.4 }, 0.2)
        .from('.wchip', { opacity: 0, x: (i) => (i < 3 ? -40 : 40), duration: 0.9, stagger: 0.06, ease: 'power3.out' }, 0.5)
        .from('.web3d__caption, .web3d__note', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.7);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * (steps - 1) * 0.8}`,
          pin: true,
          scrub: 1,
          snap: { snapTo: 1 / (steps - 1), duration: { min: 0.3, max: 0.8 }, ease: 'power2.inOut', delay: 0.05 },
          invalidateOnRefresh: true,
          onToggle: (self) => setLive(self.isActive),
        },
        onUpdate() {
          setActive(Math.round(this.progress() * (steps - 1)));
        },
      });
      tl.to('.ring', { rotateY: -(360 / steps) * (steps - 1), ease: 'none', duration: 1 })
        .fromTo('.web3d__floor-grid', { backgroundPositionY: '0px' }, { backgroundPositionY: '420px', ease: 'none', duration: 1 }, 0);
      trigger.current = tl.scrollTrigger;

      if (isTouch()) return;
      const tiltX = gsap.quickTo('.web3d__stage', 'rotateX', { duration: 1.2, ease: 'power3.out' });
      const tiltY = gsap.quickTo('.web3d__stage', 'rotateY', { duration: 1.2, ease: 'power3.out' });
      const move = contextSafe((e) => {
        tiltY((e.clientX / window.innerWidth - 0.5) * 10);
        tiltX(-(e.clientY / window.innerHeight - 0.5) * 6);
      });
      root.current.addEventListener('pointermove', move);
      return () => root.current?.removeEventListener('pointermove', move);
    },
    { scope: root }
  );

  useEffect(() => {
    videos.current.forEach((el, i) => {
      if (!el) return;
      if (i === active && live) {
        if (!el.src) el.src = webExperiences[i].video.preview;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [active, live]);

  const goTo = (i) => {
    const st = trigger.current;
    if (!st) return;
    const y = st.start + (st.end - st.start) * (i / (steps - 1));
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const current = webExperiences[active];

  return (
    <section ref={root} className="web3d" id="web">
      <h2 className="web3d__title" aria-label="Visually Stunning 3D Websites">
        <span className="split-line" aria-hidden="true">
          <span>
            Visually Stunning <b>3D</b>
          </span>
        </span>
        <span className="split-line" aria-hidden="true">
          <span>Websites</span>
        </span>
      </h2>

      <div className="web3d__floor" aria-hidden="true">
        <div className="web3d__floor-grid" />
      </div>

      <div className="web3d__viewport">
        <div className="web3d__stage">
          <div className="ring-pos">
          <div className="ring" style={{ '--n': steps }}>
            {webExperiences.map((w, i) => (
              <article
                key={w.title}
                className={`bwin${i === active ? ' is-on' : ''}`}
                style={{ '--i': i }}
                onClick={() => goTo(i)}
                data-cursor={i === active ? undefined : 'View'}
              >
                <div className="bwin__bar">
                  <i />
                  <i />
                  <i />
                  <span>contenaissance.com/work/{slug(w.title)}</span>
                </div>
                <div className="bwin__screen">
                  <video ref={(el) => (videos.current[i] = el)} poster={w.video.poster} muted loop playsInline preload="none" />
                  <span className="bwin__glare" />
                </div>
              </article>
            ))}
          </div>
          </div>
        </div>
      </div>

      {webExperiences.map((w, i) => (
        <button
          key={w.title}
          className={`wchip${i === active ? ' is-on' : ''}`}
          style={{ '--row': i % 3, [i < 3 ? 'left' : 'right']: 'var(--pad)' }}
          onClick={() => goTo(i)}
        >
          <span className="wchip__num">{String(i + 1).padStart(2, '0')}</span>
          <span>
            <strong>{w.title}</strong>
            <small>{w.sub}</small>
          </span>
        </button>
      ))}

      <div className="web3d__caption" aria-live="polite">
        <span className="web3d__count">
          <b>{String(active + 1).padStart(2, '0')}</b> / {String(steps).padStart(2, '0')}
        </span>
        <span className="web3d__name" key={active}>
          {current.title}
        </span>
        <span className="web3d__bar">
          <i style={{ transform: `scaleX(${(active + 1) / steps})` }} />
        </span>
      </div>

      <div className="web3d__note">
        <h3>
          Next Gen Stories <em>AI × 3D × CGI</em>
        </h3>
        <p>
          Crafting immersive visual experiences powered by AI, CGI, and 3D. Stories that engage audiences, inspire
          trust, and drive action.
        </p>
      </div>
    </section>
  );
}
