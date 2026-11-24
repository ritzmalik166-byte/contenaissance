'use client';

import { useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion, ScrollTrigger } from '@/lib/user/gsap';
import RocketSprite from './RocketSprite';
import { getUniverse } from '@/lib/user/universe';
import {
  docTop,
  pinTriggerOf,
  isMobileViewport,
  applyHolo,
  lerpHolo,
  holoMid,
  holoSpark,
} from '@/lib/user/journey';

/* =====================================================
   JOURNEY ACTORS — characters that physically carry the
   viewer from one section to the next.

   Rocket → About → Showreel:
     1. Rocket launch: the space camera tilts up and
        follows it.
     2. The pilot ejects: a full 3D astronaut (rendered in
        the shared universe, components/three/Astronaut.js)
        tumbles down and floats beside the About copy.
     3. As the Showreel arrives the astronaut turns, raises
        the wrist projector, and a light beam materialises
        a holographic panel — the real showreel video.
     4. Showreel.jsx (pinned) expands that panel into the
        full-bleed film; the astronaut drifts off behind it.
===================================================== */

const clamp01 = gsap.utils.clamp(0, 1);
const ease = gsap.parseEase('power2.inOut');
const easeOut = gsap.parseEase('power3.out');

// Astronaut poses in screen space: x, y in NDC (-1..1),
// h = height as a fraction of the viewport, r* in radians.
const POSES = {
  desktop: {
    start: (rx) => ({ vis: 1, x: rx, y: 1.3, h: 0.14, rx: -2.4, ry: 3.2, rz: 5.5, arm: 0, glow: 0 }),
    land: { x: 0.8, y: -0.36, h: 0.46, rx: 0.12, ry: -0.6, rz: 0.14 },
    rest: { y: -0.02 },
    present: { x: -0.52, y: -0.22, h: 0.6, rx: 0.06, ry: 0.62, rz: -0.06, arm: 1 },
    exit: { x: -1.5, y: -0.55, h: 0.8, rz: 0.3, arm: 0.4, glow: 0 },
  },
  mobile: {
    start: (rx) => ({ vis: 1, x: rx, y: 1.3, h: 0.1, rx: -2.4, ry: 3.2, rz: 5.5, arm: 0, glow: 0 }),
    land: { x: 0.7, y: -0.6, h: 0.22, rx: 0.12, ry: -0.6, rz: 0.14 },
    rest: { y: -0.66 },
    present: { x: -0.3, y: -0.56, h: 0.36, rx: 0.06, ry: 0.55, rz: -0.06, arm: 1 },
    exit: { x: -1.6, y: -0.8, h: 0.5, rz: 0.3, arm: 0.4, glow: 0 },
  },
};

export default function JourneyActors() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const rocket = document.querySelector('.rocket-sec');
      const about = document.querySelector('.about');
      const reel = document.querySelector('.reel');
      const frame = reel?.querySelector('.reel__frame');
      if (!rocket || !about || !reel || !frame) return;

      const holoEl = root.current.querySelector('.holo');
      const vw = () => window.innerWidth;
      const vh = () => window.innerHeight;
      const P = () => (isMobileViewport() ? POSES.mobile : POSES.desktop);

      /* ---------- astronaut state → universe ---------- */
      const A = { ...POSES.desktop.start(0), vis: 0, tap: 0 };
      // Timelines can update in any order when the page jumps (anchor
      // links, refresh mid-page), so visibility is also derived from the
      // scroll position: once the drift-away phase is over, it's gone.
      let drift = null;
      const push = () => {
        const gone = drift?.scrollTrigger && drift.scrollTrigger.progress >= 1;
        getUniverse()?.setAstronaut(gone ? { ...A, vis: 0 } : A);
      };

      // The universe loads asynchronously — hand it the current pose
      // as soon as it exists.
      const waitForUniverse = () => {
        if (!getUniverse()) return;
        push();
        gsap.ticker.remove(waitForUniverse);
      };
      gsap.ticker.add(waitForUniverse);

      // Scroll position of the rocket launch inside its pin
      const launchScroll = () => {
        const st = pinTriggerOf(rocket);
        const at = parseFloat(rocket.dataset.launch) || 0.74;
        return st ? st.start + (st.end - st.start) * at : docTop(rocket);
      };
      const rocketNDCX = () => {
        const r = rocket.querySelector('.rocket')?.getBoundingClientRect();
        return r ? ((r.left + r.width / 2) / vw()) * 2 - 1 : -0.4;
      };

      /* ---------- 1. launch → eject → float in About ---------- */
      const lift = { v: 0 };
      let lastEject = 0;
      const pushLift = () => getUniverse()?.setLift(lift.v);

      const eject = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate() {
          push();
          // wave hello as it settles beside the About copy (forward only)
          const p = this.progress();
          if (p >= 0.84 && lastEject < 0.84) getUniverse()?.playAstronaut('wave');
          lastEject = p;
        },
        scrollTrigger: {
          trigger: about,
          start: launchScroll,
          end: 'top 55%', // About is short — leave room before the hologram
          scrub: 1,
          invalidateOnRefresh: true,
          refreshPriority: -1, // after the rocket pin is measured
        },
      });

      eject
        // camera follows the rocket up…
        .fromTo(lift, { v: 0 }, { v: 1, duration: 0.45, ease: 'power2.out', onUpdate: pushLift }, 0)
        // …then drifts back down with the falling pilot
        .to(lift, { v: 0, duration: 0.4, ease: 'power2.inOut', onUpdate: pushLift }, 0.55)
        // the pilot ejects once the rocket has left the screen
        .fromTo(A, { vis: 0 }, { vis: 1, duration: 0.02 }, 0.5)
        .fromTo(
          A,
          { x: rocketNDCX, y: () => P().start(0).y, h: () => P().start(0).h, rx: -2.4, ry: 3.2, rz: 5.5 },
          {
            x: () => P().land.x,
            y: () => P().land.y,
            h: () => P().land.h,
            rx: () => P().land.rx,
            ry: () => P().land.ry,
            rz: () => P().land.rz,
            duration: 0.38,
            ease: 'power3.out',
          },
          0.5
        )
        .to(A, { y: () => P().rest.y, duration: 0.12, ease: 'sine.inOut' }, 0.88);

      /* ---------- 2. present the hologram ---------- */
      gsap.set(frame, { opacity: 0 });
      applyHolo(frame, { ...holoMid(), alpha: 0 }, vh(), { beam: false });

      const present = gsap.timeline({
        defaults: { ease: 'none', immediateRender: false },
        onUpdate: push,
        scrollTrigger: {
          trigger: reel,
          start: 'top 80%',
          end: 'top top',
          scrub: true, // no lag: the panel must stay locked to the section
          invalidateOnRefresh: true,
          refreshPriority: -1,
          onUpdate: (self) => renderPanel(self.progress),
          onRefresh: (self) => renderPanel(self.progress),
        },
      });

      present
        .fromTo(
          A,
          { x: () => P().land.x, y: () => P().rest.y, h: () => P().land.h, ry: () => P().land.ry, rz: () => P().land.rz },
          {
            x: () => P().present.x,
            y: () => P().present.y,
            h: () => P().present.h,
            ry: () => P().present.ry,
            rz: () => P().present.rz,
            duration: 0.5,
            ease: 'power2.inOut',
          },
          0
        )
        // raise the projector arm…
        .fromTo(A, { arm: 0 }, { arm: 1, duration: 0.2, ease: 'power2.inOut' }, 0.15)
        // …the other hand reaches over and taps it on…
        .fromTo(A, { tap: 0 }, { tap: 1, duration: 0.12, ease: 'power2.out' }, 0.32)
        .fromTo(A, { glow: 0 }, { glow: 1, duration: 0.06 }, 0.44)
        // …and drops away as the hologram sparks
        .to(A, { tap: 0, duration: 0.14, ease: 'power2.inOut' }, 0.52);

      // The panel: a spark at the wrist lens flickers on (0.55),
      // unfolds into a small panel, then grows to its floating size.
      const SPARK_AT = 0.55;
      let flicker = false;
      function renderPanel(p) {
        const top = reel.getBoundingClientRect().top;
        // Once the Showreel is pinned, its own timeline owns the frame.
        if (top <= 0.5 && p >= 1) return;
        const hp = clamp01((p - SPARK_AT) / (1 - SPARK_AT));
        const mid = holoMid();

        if (hp <= 0) {
          applyHolo(frame, { ...mid, alpha: 0 }, top);
        } else {
          const w = getUniverse()?.getWristNDC() || { x: -0.3, y: -0.1 };
          const wx = ((w.x + 1) / 2) * vw();
          const wy = ((1 - w.y) / 2) * vh();
          const spark = holoSpark(wx, wy - 12);
          const small = {
            ...mid,
            cx: wx + (mid.cx - wx) * 0.3,
            cy: wy - 40 + (mid.cy - wy) * 0.3,
            w: mid.w * 0.2,
            h: mid.h * 0.2,
            ry: -30,
          };
          const s = hp < 0.22
            ? lerpHolo(spark, small, easeOut(hp / 0.22))
            : lerpHolo(small, mid, ease((hp - 0.22) / 0.78));
          applyHolo(frame, s, top);
        }

        const f = hp > 0 && hp < 0.35;
        if (f !== flicker) {
          flicker = f;
          holoEl.classList.toggle('is-flicker', f);
        }
      }

      /* ---------- 3. drift away while the film takes over ---------- */
      drift = gsap.timeline({
        defaults: { ease: 'none', immediateRender: false },
        onUpdate: push,
        scrollTrigger: {
          trigger: reel,
          start: 'top top',
          end: () => `+=${vh() * 1.1}`,
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: -1,
        },
      })
        .fromTo(
          A,
          {
            x: () => P().present.x,
            y: () => P().present.y,
            h: () => P().present.h,
            rz: () => P().present.rz,
            arm: 1,
            glow: 1,
          },
          {
            x: () => P().exit.x,
            y: () => P().exit.y,
            h: () => P().exit.h,
            rz: () => P().exit.rz,
            arm: () => P().exit.arm,
            glow: 0,
            duration: 1,
            ease: 'power2.in',
          },
          0
        )
        .set(A, { vis: 0 }, 1);

      /* ---------- 4. hyperspace: Web3D → Testimonials ---------- */
      // Streaks + FOV kick in the universe, peaking as the Testimonials
      // heading crosses mid-screen (it resolves out of the blur there).
      const web = document.querySelector('.web3d');
      const voices = document.querySelector('.voices');
      if (web && voices) {
        const warp = { v: 0 };
        const pushWarp = () => getUniverse()?.setWarp(warp.v);
        gsap
          .timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: voices,
              start: () => {
                const st = pinTriggerOf(web);
                return st ? st.end - vh() * 0.15 : docTop(voices) - vh();
              },
              end: 'top 30%',
              scrub: true,
              invalidateOnRefresh: true,
              refreshPriority: -1,
            },
          })
          .fromTo(warp, { v: 0 }, { v: 1, duration: 0.55, ease: 'power2.in', onUpdate: pushWarp })
          .to(warp, { v: 0, duration: 0.45, ease: 'power3.out', onUpdate: pushWarp });
      }

      /* ---------- 5. the rocket comes home: docks into the CTA orbit ---------- */
      const cta = document.querySelector('.cta');
      const orbit = cta?.querySelector('.cta__orbit');
      const arrow = orbit?.querySelector('.cta__arrow');
      const pulseRing = orbit?.querySelector('.cta__dock-pulse');
      const rocketEl = root.current.querySelector('.actor-rocket');
      const flameEl = rocketEl?.querySelector('.rsprite__flame');
      if (cta && orbit && rocketEl) {
        const ROCKET_H = 300; // base px height of .actor-rocket
        const smooth = (a, b, x) => {
          const t = clamp01((x - a) / (b - a));
          return t * t * (3 - 2 * t);
        };
        let docked = false;

        const dock = () => {
          const r = cta.getBoundingClientRect();
          const H = vh();
          // 0 when the CTA's top is 85% down the viewport (the Quote has
          // mostly folded away), 1 when its centre reaches 58%
          const endTop = H * 0.58 - r.height / 2;
          const d = clamp01((H * 0.85 - r.top) / Math.max(1, H * 0.85 - endTop));
          if (d <= 0 || r.bottom < -40) {
            gsap.set(rocketEl, { autoAlpha: 0 });
            if (arrow) arrow.style.opacity = '';
            docked = false;
            return;
          }
          const o = orbit.getBoundingClientRect();
          const ex = o.left + o.width / 2;
          const ey = o.top + o.height / 2;
          // swoop in from the upper left, curve up into the orbit
          const sx = -vw() * 0.12;
          const sy = H * 0.12;
          const cx = ex - vw() * 0.28;
          const cy = ey + H * 0.38;
          const t = 1 - Math.pow(1 - d, 1.6);
          const u = 1 - t;
          const x = u * u * sx + 2 * u * t * cx + t * t * ex;
          const y = u * u * sy + 2 * u * t * cy + t * t * ey;
          const tx = 2 * u * (cx - sx) + 2 * t * (ex - cx);
          const ty = 2 * u * (cy - sy) + 2 * t * (ey - cy);
          const heading = (Math.atan2(tx, -ty) * 180) / Math.PI;
          // ends pointing up-right — it becomes the CTA's ↗ arrow
          const rot = heading + (45 - heading) * smooth(0.75, 1, d);
          const size = H * 0.1 + (o.width * 0.62 - H * 0.1) * smooth(0, 1, d);
          gsap.set(rocketEl, {
            autoAlpha: 1,
            x: x - (ROCKET_H * (184 / 330)) / 2,
            y: y - ROCKET_H / 2,
            rotation: rot,
            scale: size / ROCKET_H,
          });
          if (flameEl) flameEl.style.transform = `scale(1, ${(1 - smooth(0.82, 1, d) * 0.92).toFixed(3)})`;
          if (arrow) arrow.style.opacity = String(1 - smooth(0.7, 0.95, d));

          // touchdown: gold pulse on the orbit + a light flash in space
          if (d >= 0.99 && !docked) {
            docked = true;
            getUniverse()?.pulse(0.4);
            if (pulseRing) {
              gsap.fromTo(pulseRing, { scale: 0.35, opacity: 0.9 }, { scale: 1.25, opacity: 0, duration: 1.1, ease: 'power2.out' });
            }
          } else if (d < 0.9) {
            docked = false;
          }
        };

        ScrollTrigger.create({
          trigger: cta,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: dock,
          onRefresh: dock,
          onLeave: () => gsap.set(rocketEl, { autoAlpha: 0 }),
          onLeaveBack: dock,
        });
      }

      return () => {
        gsap.ticker.remove(waitForUniverse);
        getUniverse()?.setAstronaut({ vis: 0 });
        getUniverse()?.setBeam(null);
        getUniverse()?.setWarp(0);
      };
    },
    { scope: root }
  );

  return (
    <div ref={root} className="actors" aria-hidden="true">
      {/* holographic edge / HUD drawn over the Showreel panel */}
      <div className="holo">
        <div className="holo__tint" />
        <div className="holo__scan" />
        <div className="holo__sweep" />
        <i className="holo__c holo__c--tl" />
        <i className="holo__c holo__c--tr" />
        <i className="holo__c holo__c--bl" />
        <i className="holo__c holo__c--br" />
        <span className="holo__label">
          <b /> Incoming transmission
        </span>
        <span className="holo__meta">CH-03 · Showreel · Live</span>
      </div>

      {/* the section-01 rocket, returning to dock in the CTA orbit */}
      <div className="actor-rocket">
        <RocketSprite />
      </div>
    </div>
  );
}
