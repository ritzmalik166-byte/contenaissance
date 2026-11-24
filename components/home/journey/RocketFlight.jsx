'use client';

import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger, isTouch } from '@/lib/user/gsap';
import { onSiteReady } from '@/lib/user/ready';
import { rocketClock } from '@/lib/user/rocketFlight';
import { pinTriggerOf, docTop } from '@/lib/user/journey';
import './RocketFlight.css';

/* =====================================================
   ROCKET FLIGHT — the hero's 3D rocket
   (see components/three/RocketFlightScene.js, launch mode).

   launch 0 → 1   page top → LAUNCH_SPAN of the hero scrolled
   travel 0 → 1   end of launch → Rocket section pinned
   time           Rocket.jsx's assembly clock (lib/user/rocketFlight)

   The 3D rocket sits in the hero's `.hero__stage` box; as you
   scroll it lifts off and leaves through the top of the screen,
   then climbs back in from below and lands on the DOM `.rocket`,
   where the hologram + assembly sequence takes over. Everything
   is measured live, so both layouts stay responsive.
===================================================== */

const clamp01 = gsap.utils.clamp(0, 1);

// Fraction of the hero's height scrolled by the time the rocket has
// left through the top (the hero copy has faded out at 0.5).
const LAUNCH_SPAN = 0.55;

// Rocket parts in DOM px relative to `.rocket` (offsets ignore the
// fly-in transforms Rocket.jsx puts on the modules).
function measure(rocketEl) {
  const noseWrap = rocketEl.querySelector('.rocket__nose-wrap');
  const modules = [...rocketEl.querySelectorAll('.rocket__module')].reverse(); // S1 first
  const nozzle = rocketEl.querySelector('.rocket__nozzle');
  const flame = rocketEl.querySelector('.rocket__flame');
  if (!noseWrap || modules.length < 5 || !nozzle) return null;

  const box = (el) => ({ top: el.offsetTop, h: el.offsetHeight, w: el.offsetWidth });
  const fs = flame ? getComputedStyle(flame) : null;
  return {
    nose: box(noseWrap),
    modules: modules.map(box),
    nozzle: box(nozzle),
    flame: {
      w: parseFloat(fs?.width) || 52,
      h: parseFloat(fs?.height) || 100,
    },
  };
}

export default function RocketFlight() {
  const wrap = useRef(null);

  useGSAP(
    () => {
      const hero = document.querySelector('.hero');
      const stage = hero?.querySelector('.hero__stage');
      const sec = document.querySelector('.rocket-sec');
      const rocketEl = sec?.querySelector('.rocket');
      if (!hero || !stage || !sec || !rocketEl || !wrap.current) return;

      // The DOM nozzle + flame appear the moment the 3D ones touch down.
      const handoff = rocketEl.querySelectorAll('.rocket__nozzle, .rocket__flame');

      let scene = null;
      let disposed = false;
      let parts = null;
      let launch = 0;
      let travel = 0;
      let launchEnd = 1;
      let travelEnd = 2;

      const applyHandoff = () => {
        const t = clamp01((travel - 0.9) / 0.1);
        gsap.set(handoff, { opacity: t * t * (3 - 2 * t) });
      };

      const inputs = () => {
        if (!parts) return null;
        const s = stage.getBoundingClientRect();
        const r = rocketEl.getBoundingClientRect();
        return {
          hero: { cx: s.left + s.width / 2, cy: s.top + s.height / 2, h: s.height },
          dest: { cx: r.left + r.width / 2, top: r.top + parts.nose.top },
          launch,
          travel,
          time: rocketClock.time,
        };
      };

      const sync = (self) => {
        const y = self.scroll();
        launch = clamp01(y / Math.max(1, launchEnd));
        travel = clamp01((y - launchEnd) / Math.max(1, travelEnd - launchEnd));
        applyHandoff();
        scene?.wake();
      };

      // Lift-off ends LAUNCH_SPAN into the hero; the swoop carries on into
      // the Rocket pin and lands at the end of its lead-in (Rocket.jsx
      // dataset.land), where the assembly starts.
      const measureEnds = () => {
        launchEnd = hero.offsetHeight * LAUNCH_SPAN;
        const st = pinTriggerOf(sec);
        const land = parseFloat(sec.dataset.land) || 0;
        const end = st ? st.start + (st.end - st.start) * land : docTop(sec);
        travelEnd = Math.max(launchEnd + 1, end);
      };
      const trigger = ScrollTrigger.create({
        start: 0,
        end: () => pinTriggerOf(sec)?.end ?? docTop(sec) + window.innerHeight,
        refreshPriority: -2, // after the Hero / Rocket pins are measured
        onRefresh: (self) => {
          measureEnds();
          parts = measure(rocketEl);
          scene?.setLayout(parts);
          sync(self);
        },
        onUpdate: sync,
        onLeave: () => scene?.wake(),
        onEnterBack: () => scene?.wake(),
      });
      measureEnds();
      sync(trigger);
      parts = measure(rocketEl);

      let ready = false;
      const startIntro = () => {
        if (!scene || !ready) return;
        if (window.scrollY > 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          scene.state.intro = 1;
          return;
        }
        gsap.to(scene.state, { intro: 1, duration: 2.4, delay: 0.25, ease: 'power3.out' });
      };
      const offReady = onSiteReady(() => {
        ready = true;
        startIntro();
      });

      import('../../three/RocketFlightScene').then(({ createRocketFlight }) => {
        if (disposed || !wrap.current) return;
        try {
          scene = createRocketFlight(wrap.current, { getInputs: inputs, launch: true });
        } catch {
          // No WebGL: the DOM rocket still assembles on its own.
          gsap.set(handoff, { clearProps: 'opacity' });
          return;
        }
        parts = measure(rocketEl);
        scene.setLayout(parts);
        startIntro();
      });

      const onPointer = (e) => {
        scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      };
      const touch = isTouch();
      if (!touch) window.addEventListener('pointermove', onPointer, { passive: true });

      return () => {
        disposed = true;
        offReady();
        trigger.kill();
        if (!touch) window.removeEventListener('pointermove', onPointer);
        gsap.set(handoff, { clearProps: 'opacity' });
        scene?.destroy();
        scene = null;
      };
    },
    { scope: wrap }
  );

  return <div ref={wrap} className="rocket-flight" aria-hidden="true" />;
}
