'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, isTouch, ScrollTrigger } from '@/lib/user/gsap';
import { getUniverse } from '@/lib/user/universe';
import { webExperiences } from '@/lib/user/content';
import './Web3D.css';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Huge moon sitting low behind the video ring: its lit crest rises just
// under the title and its bulk continues below the cards. It lives in
// the shared universe (UniverseScene setMoon), so it rises with this
// section out of the Archive, drifts as the ring turns, and recedes as
// the section leaves.
const MOON = {
  crest: 0.28, // lit crest, as a fraction of viewport height below the section top
  rise: 0.05, // crest lifts this much over the pinned ring rotation
  spin: 1.4, // extra rotation over the pinned ring rotation
  size: 0.82, // diameter / viewport width (desktop)
  sizeMobile: 1.9,
};

export default function Web3D() {
  const root = useRef(null);
  const videos = useRef([]);
  const trigger = useRef(null);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);
  const steps = webExperiences.length;
  const leftCount = Math.floor(steps / 2);

  useGSAP(
    (ctx, contextSafe) => {
      gsap.set('.ring', { rotateX: -6 });

      // --- the universe moon, placed from this section's live position
      const placeMoon = () => {
        const u = getUniverse();
        if (!u || !root.current) return;
        const r = root.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const top = r.top / vh;
        const bottom = r.bottom / vh;
        if (top >= 1.02 || bottom <= -0.8) {
          u.setMoon({ vis: 0 });
          return;
        }
        const p = trigger.current ? trigger.current.progress : 0;
        // recede (shrink away) as the section scrolls off the top
        const leave = gsap.utils.clamp(0, 1, (1 - bottom) / 1.8);
        u.setMoon({
          vis: 1 - leave * 0.85,
          crestY: top + MOON.crest - p * MOON.rise,
          size: window.innerWidth < 760 ? MOON.sizeMobile : MOON.size,
          spin: p * MOON.spin,
        });
      };
      // (its ScrollTrigger is created after the pin, below)
      // the universe loads asynchronously
      const waitMoon = () => {
        if (!getUniverse()) return;
        placeMoon();
        gsap.ticker.remove(waitMoon);
      };
      gsap.ticker.add(waitMoon);
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
            once: true,
          }
        })
        .from('.web3d__title .split-line > span', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.1 }, 0)
        .from('.ring', { rotateX: 55, scale: 0.6, opacity: 0, duration: 1.6, ease: 'expo.out' }, 0.1)
        .from('.web3d__floor', { opacity: 0, duration: 1.4 }, 0.2)
        .from('.wchip', { opacity: 0, x: (i) => (i < leftCount ? -40 : 40), duration: 0.9, stagger: 0.06, ease: 'power3.out' }, 0.5)
        .from('.web3d__caption, .web3d__note', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.7);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * (steps - 1) * 0.8}`,
          pin: true,
          scrub: 0.35,
          snap: {
            snapTo: 1 / (steps - 1),
            duration: { min: 0.2, max: 0.5 },
            ease: 'power2.inOut',
            delay: 0.01,
          },
          invalidateOnRefresh: true,
          onToggle: (self) => setLive(self.isActive),
        },
        onUpdate() {
          setActive(Math.round(this.progress() * (steps - 1)));
          placeMoon();
        },
      });
      tl.to('.ring', { rotateY: -(360 / steps) * (steps - 1), ease: 'none', duration: 1 })
        .fromTo('.web3d__floor-grid', { backgroundPositionY: '0px' }, { backgroundPositionY: '420px', ease: 'none', duration: 1 }, 0);
      trigger.current = tl.scrollTrigger;

      // Moon placement over the whole life of the section. Triggered on
      // the pin-spacer (exists now) so the pinned distance is included.
      const spacer = root.current.parentElement?.classList.contains('pin-spacer')
        ? root.current.parentElement
        : root.current;
      ScrollTrigger.create({
        trigger: spacer,
        start: 'top bottom',
        end: 'bottom -80%',
        onUpdate: placeMoon,
        onRefresh: placeMoon,
        onLeave: () => getUniverse()?.setMoon({ vis: 0 }),
        onLeaveBack: () => getUniverse()?.setMoon({ vis: 0 }),
      });

      if (isTouch()) return;
      const tiltX = gsap.quickTo('.web3d__stage', 'rotateX', { duration: 1.2, ease: 'power3.out' });
      const tiltY = gsap.quickTo('.web3d__stage', 'rotateY', { duration: 1.2, ease: 'power3.out' });
      const move = contextSafe((e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;

        tiltY(nx * 10);
        tiltX(-ny * 6);
        getUniverse()?.setMoon({ px: nx * 2, py: -ny * 2 });
      });
      root.current.addEventListener('pointermove', move);
      return () => root.current?.removeEventListener('pointermove', move);
    },
    { scope: root }
  );

  useEffect(() => {
    videos.current.forEach((el, i) => {
      if (!el) return;

      if (i === active) {
        const src = webExperiences[i].video.preview;

        // Load video as soon as it becomes active
        if (el.dataset.loaded !== 'true') {
          el.src = src;
          el.dataset.loaded = 'true';
          el.load();
        }

        // Play when the pinned section becomes active
        if (live) {
          el.play().catch(() => { });
        } else {
          el.pause();
        }
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
          <span>{" "}Websites</span>
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
                    <video
                      ref={(el) => (videos.current[i] = el)}
                      poster={w.video.poster}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
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
          style={{
            '--row': i < leftCount ? i : i - leftCount,
            [i < leftCount ? 'left' : 'right']: 'var(--pad)',
          }}
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

      {/* <div className="web3d__note">
        <p>
          Next Gen Stories <em>AI × 3D × CGI</em>
        </p>
        <span>
          Crafting immersive visual experiences powered by AI, CGI, and 3D. Stories that engage audiences, inspire
          trust, and drive action.
        </span>
      </div> */}
    </section>
  );
}
