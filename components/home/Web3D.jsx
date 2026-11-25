'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/user/gsap';
import { getUniverse } from '@/lib/user/universe';
import { webExperiences } from '@/lib/user/content';
import { openVideo } from '../VideoModal';
import './Web3D.css';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/* =====================================================
   WEB3D — a small moon with the website films in orbit

   The moon lives in the shared universe (UniverseScene setMoon); the
   film in front also plays on its face as one camera-facing frame
   (setMoonVideo).

   The films travel one path, driven by scroll:
     s > 0   a straight line in front, from off the right edge
     s ≤ 0   a tilted orbit around the moon (θ = s): front → left,
             curving round behind the moon and back in on the right
   On entering, they fly in one after another in a line, sweep left and
   curve round into the orbit; scrolling on turns the orbit so each
   film comes to the front in turn (01 → 07).
===================================================== */

const MOON = {
  centerY: 0.5, // moon / orbit centre, fraction of the section height
  size: 0.21, // diameter / viewport width (desktop)
  sizeMobile: 0.56,
  spin: 1.2, // extra rotation over the pinned scroll
};
// Moon diameter / viewport width. Phones and small tablets also cap it
// by the height, so a wide-but-short screen (e.g. 540×720) doesn't get
// a moon that crowds out the films and the caption.
const moonSize = (vw, vh) => (vw < 760 ? Math.min(MOON.sizeMobile, (0.32 * vh) / vw) : MOON.size);
const TILT = 0.24; // orbit tilt: the far side rides over the moon, the near side under it
const ENTRY = 2; // scroll units for the fly-in (each film step is 1)

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function Web3D() {
  const root = useRef(null);
  const videos = useRef([]);
  const trigger = useRef(null);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);
  const steps = webExperiences.length;
  const leftCount = Math.floor(steps / 2);
  const total = ENTRY + (steps - 1); // scroll units over the pin

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const wins = q('.bwin');
      const n = wins.length;
      const STEP = (Math.PI * 2) / n;
      // film i's place in the incoming line: film 1 leads, film 0 comes
      // last, so the orbit is complete with film 0 in front, then the
      // films after it come round in order
      const car = (i) => (i + n - 1) % n;
      const S_END = -(n - 1) * STEP; // fly-in done: film 0 in front

      /* ---------- layout ---------- */
      const L = {};
      const measure = () => {
        const vw = window.innerWidth;
        L.mobile = vw < 760;
        L.R = L.mobile ? vw * 0.42 : Math.min(vw * 0.3, 600); // orbit radius (phones: wide, so the side films clear the moon)
        // phones: much steeper, so the front film sits low under the moon and
        // the far films ride high over it — the moon stays clear between
        // (vertical spread capped by the height: ~20% of the screen each way)
        L.tilt = L.mobile ? Math.min(1.0, (window.innerHeight * 0.205) / L.R) : TILT;
        L.w = wins[0]?.offsetWidth || 300;
        L.h = wins[0]?.offsetHeight || 190;
        // the moon's radius on screen (same formula as placeMoon), and the
        // CSS perspective the films are seen through
        L.moonR = (moonSize(vw, window.innerHeight) * vw) / 2;
        L.persp = parseFloat(getComputedStyle(q('.web3d__viewport')[0]).perspective) || 1600;
        // the line starts with the leader just off the right edge
        L.s0 = (vw / 2 + L.w) / L.R;
      };
      measure();

      /* ---------- the path ---------- */
      const S = { v: 0 }; // the leader's path position; set from scroll
      const render = () => {
        const { R } = L;
        wins.forEach((el, i) => {
          const s = S.v + car(i) * STEP;
          let x, z, ry;
          // Phones: the orbit is tight and the films are wide, so turned
          // neighbours would pass through each other in 3D and the browser
          // slices one film through the other. Keep them almost flat there,
          // and give the incoming line distinct depths so none are coplanar.
          const turn = L.mobile ? 0.12 : 1;
          if (s > 0) {
            // the incoming line, in front of the orbit
            x = s * R;
            z = L.mobile ? R - s * 8 : R;
            ry = L.mobile ? 0 : Math.min(s, 1) * -18; // angled into the flight
          } else {
            x = R * Math.sin(s);
            z = R * Math.cos(s);
            ry = Math.sin(s) * 42 * turn; // turned along the curve at the sides, facing us front and back
          }
          const y = L.tilt * z; // near side lower, far side higher
          const zz = z - R * 0.35;
          const front = z / R; // 1 in front … -1 behind the moon
          el.style.transform =
            `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${zz.toFixed(1)}px) ` +
            `rotateY(${ry.toFixed(2)}deg)`;
          // dims going round behind the moon (still seen, so it reads as an
          // orbit), brightens coming back round
          el.style.opacity = ((0.35 + 0.65 * smooth(-0.7, 0.35, front)) * (s > L.s0 ? 0 : 1)).toFixed(3);

          // Behind the moon: the moon is drawn in WebGL under the page, so
          // cut the moon's disc out of the far-side films instead. The
          // perspective origin is the moon's centre, so in the film's own
          // px the moon sits at (w/2 - x, h/2 - y) and its radius shrinks
          // by the film's perspective scale (and cos of its turn, across).
          const mask =
            front < 0.15
              ? (() => {
                  const k = L.persp / (L.persp - zz);
                  const c = Math.max(0.3, Math.cos((ry * Math.PI) / 180));
                  const rx = (L.moonR / k / c).toFixed(1);
                  const rr = (L.moonR / k).toFixed(1);
                  const lx = (L.w / 2 - x / c).toFixed(1);
                  const ly = (L.h / 2 - y).toFixed(1);
                  return `radial-gradient(ellipse ${rx}px ${rr}px at ${lx}px ${ly}px, transparent 97%, #000 100%)`;
                })()
              : 'none';
          el.style.webkitMaskImage = mask;
          el.style.maskImage = mask;
        });
      };

      /* ---------- the moon, placed from this section's live position ---------- */
      const placeMoon = () => {
        const u = getUniverse();
        if (!u || !root.current) return;
        const r = root.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const top = r.top / vh;
        const bottom = r.bottom / vh;
        if (top >= 1.02 || bottom <= -0.8) {
          u.setMoon({ vis: 0 });
          return;
        }
        const p = trigger.current ? trigger.current.progress : 0;
        const size = moonSize(vw, vh);
        // same centre the CSS orbit uses (--cy), so the films circle the moon
        const cy = parseFloat(getComputedStyle(root.current).getPropertyValue('--cy')) / 100 || MOON.centerY;
        const centerY = top + (cy * r.height) / vh;
        // recede (shrink away) as the section scrolls off the top
        const leave = gsap.utils.clamp(0, 1, (1 - bottom) / 1.8);
        u.setMoon({
          vis: 1 - leave * 0.85,
          crestY: centerY - (size * vw) / 2 / vh,
          size,
          spin: p * MOON.spin,
        });
      };
      // the universe loads asynchronously
      const waitMoon = () => {
        if (!getUniverse()) return;
        placeMoon();
        gsap.ticker.remove(waitMoon);
      };
      gsap.ticker.add(waitMoon);

      /* ---------- intro: title and chips ---------- */
      gsap
        .timeline({
          scrollTrigger: { trigger: root.current, start: 'top 90%', once: true },
        })
        .from('.web3d__title .split-line > span', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.1 }, 0)
        .from('.wchip', { opacity: 0, x: (i) => (i < leftCount ? -40 : 40), duration: 0.9, stagger: 0.06, ease: 'power3.out' }, 0.5)
        .from('.web3d__caption', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.7);

      /* ---------- pinned scroll: fly-in, then turn the orbit ---------- */
      // The fly-in scrolls freely (snapping across it would yank the page
      // back to the start); once it's nearly done, snap film to film.
      const entryEnd = ENTRY / total;
      const snapTo = (v) => {
        if (v < entryEnd * 0.8) return v;
        const k = Math.round((v - entryEnd) * total);
        return gsap.utils.clamp(entryEnd, 1, entryEnd + k / total);
      };
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * total * 0.75}`,
          pin: true,
          scrub: 0.6,
          snap: { snapTo, duration: { min: 0.2, max: 0.6 }, ease: 'power2.inOut', delay: 0.05 },
          invalidateOnRefresh: true,
          onToggle: (self) => setLive(self.isActive),
          onRefresh: () => {
            measure();
            render();
          },
        },
        onUpdate() {
          const idx = Math.round((S_END - S.v) / STEP);
          setActive(gsap.utils.clamp(0, steps - 1, idx));
          render();
          placeMoon();
        },
      });
      // fly-in: the line sweeps in from the right and curves into orbit
      tl.fromTo(S, { v: () => L.s0 }, { v: S_END, duration: ENTRY, ease: 'power1.out', immediateRender: true })
        // then each step brings the next film round to the front
        .to(S, { v: S_END - (steps - 1) * STEP, duration: steps - 1, ease: 'none' });
      trigger.current = tl.scrollTrigger;
      render();

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

      // (no cursor tilt / moon drift here: the far-side films are cut
      // exactly around the moon, so the two have to stay locked together)
    },
    { scope: root }
  );

  // Only the film in front plays; it is also shown on the moon (one
  // camera-facing frame — UniverseScene setMoonVideo).
  useEffect(() => {
    videos.current.forEach((el, i) => {
      if (!el) return;
      if (i === active) {
        if (el.dataset.loaded !== 'true') {
          el.src = webExperiences[i].video.preview;
          el.dataset.loaded = 'true';
          el.load();
        }
        if (live) el.play().catch(() => {});
        else el.pause();
      } else {
        el.pause();
      }
    });
    getUniverse()?.setMoonVideo?.(live ? videos.current[active] : null);
  }, [active, live]);

  useEffect(() => () => getUniverse()?.setMoonVideo?.(null), []);

  const goTo = (i) => {
    const st = trigger.current;
    if (!st) return;
    const y = st.start + (st.end - st.start) * ((ENTRY + i) / total);
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const current = webExperiences[active];

  /* Film clicks. Chrome mis-hit-tests the films' nested 3D transforms
     (the click lands on the section/viewport, not the film drawn on top
     — same issue as the Mission Archive), so find the film from its
     on-screen box: the one in front wins, then the nearest visible one. */
  const onStageClick = (e) => {
    if (e.target.closest?.('.wchip, a, button')) return;
    const { clientX: x, clientY: y } = e;
    const hits = [...root.current.querySelectorAll('.bwin')]
      .map((el, i) => ({ el, i, r: el.getBoundingClientRect(), o: parseFloat(el.style.opacity || '1') }))
      .filter(({ r, o }) => o > 0.3 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    if (!hits.length) return;
    const pick = hits.find((h) => h.i === active) ?? hits.sort((a, b) => b.o - a.o)[0];
    openVideo(webExperiences[pick.i].video.src);
  };

  return (
    <section ref={root} className="web3d" id="web" onClick={onStageClick}>
      <h2 className="web3d__title" aria-label="Visually Stunning 3D Websites">
        <span className="split-line" aria-hidden="true">
          <span>
            Visually Stunning <b>3D</b>
          </span>
        </span>
        <span className="split-line" aria-hidden="true">
          <span> Websites</span>
        </span>
      </h2>

      <div className="web3d__viewport">
        <div className="web3d__stage">
          <div className="orbit">
            {webExperiences.map((w, i) => (
              <article
                key={w.title}
                className={`bwin${i === active ? ' is-on' : ''}`}
                // any film opens full-size in the shared video modal (the
                // side chips still turn the orbit); mouse clicks are
                // resolved on the section (onStageClick), keys here
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openVideo(w.video.src))}
                aria-label={`Play ${w.title}`}
                data-cursor="Play"
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
                    preload="none"
                  />
                  <span className="bwin__glare" />
                </div>
              </article>
            ))}
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
    </section>
  );
}
