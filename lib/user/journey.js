'use client';

import { ScrollTrigger } from './gsap';
import { getUniverse } from './universe';

/* =====================================================
   Shared geometry + helpers for the homepage "journey"
   transitions (JourneyActors.jsx and the sections that
   hand off to / from the actors).
===================================================== */

export const isMobileViewport = () => window.innerWidth < 760;

// Document-space top of a section's outer box (pin-spacer if pinned).
export const docTop = (el) => {
  const box = el?.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  return box ? box.getBoundingClientRect().top + window.scrollY : 0;
};

// The ScrollTrigger that pins `el`, if any.
export const pinTriggerOf = (el) => ScrollTrigger.getAll().find((t) => t.pin === el);

/* =====================================================
   HOLOGRAM PANEL  (About → Showreel)

   The Showreel's real <video> frame doubles as the
   hologram: it is scaled / tilted / cropped (16:9) into
   a floating panel projected from the astronaut's wrist,
   then expands to full-bleed while the Showreel is
   pinned. A fixed `.holo` overlay (in JourneyActors)
   draws the holographic edge, scanlines and HUD on the
   same screen rectangle, and the universe draws the
   light beam from the wrist to the panel's corners.

   A holo state, all in viewport px / degrees:
     { cx, cy, w, h, rx, ry, r, fx, alpha }
     fx    = holographic look (1 = projected, 0 = real)
     alpha = overall visibility
===================================================== */

export const PERSPECTIVE = 1400;

// Panel floating beside the astronaut — where the Showreel pin starts.
export function holoMid() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (isMobileViewport()) {
    const w = vw * 0.88;
    return { cx: vw * 0.5, cy: vh * 0.36, w, h: (w * 9) / 16, rx: 6, ry: -8, r: 10, fx: 1, alpha: 1 };
  }
  const w = Math.min(vw * 0.5, ((vh * 0.56) * 16) / 9);
  return { cx: vw * 0.62, cy: vh * 0.5, w, h: (w * 9) / 16, rx: 5, ry: -16, r: 14, fx: 1, alpha: 1 };
}

// Full-bleed, plain video (end of the expansion).
export function holoFull(frame) {
  const vw = window.innerWidth;
  const h = frame?.offsetHeight || window.innerHeight;
  return { cx: vw / 2, cy: h / 2, w: vw, h, rx: 0, ry: 0, r: 0, fx: 0, alpha: 1 };
}

// Tiny spark at a screen point (start of the materialisation).
export function holoSpark(x, y) {
  return { cx: x, cy: y, w: 28, h: 16, rx: 10, ry: -34, r: 4, fx: 1, alpha: 0 };
}

const mix = (a, b, t) => a + (b - a) * t;
export function lerpHolo(a, b, t) {
  const o = {};
  for (const k in a) o[k] = mix(a[k], b[k], t);
  return o;
}

let overlayEl = null;
const overlay = () => {
  if (!overlayEl || !overlayEl.isConnected) overlayEl = document.querySelector('.holo');
  return overlayEl;
};

/**
 * Applies a holo state to the Showreel frame (+ overlay + beam).
 * `sectionTop` = the Showreel section's current viewport top, so the
 * panel can stay fixed on screen while the section scrolls in.
 */
export function applyHolo(frame, s, sectionTop = 0, { beam = true } = {}) {
  if (!frame) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fw = frame.offsetWidth || vw;
  const fh = frame.offsetHeight || vh;

  // uniform scale that covers the panel, then crop to the panel size
  const sc = Math.max(s.w / fw, s.h / fh, 1e-4);
  const cw = s.w / sc;
  const ch = s.h / sc;
  const it = Math.max(0, (fh - ch) / 2);
  const il = Math.max(0, (fw - cw) / 2);
  const dx = s.cx - fw / 2;
  const dy = s.cy - (sectionTop + fh / 2);

  frame.style.clipPath = `inset(${it.toFixed(2)}px ${il.toFixed(2)}px round ${(s.r / sc).toFixed(2)}px)`;
  frame.style.transform =
    `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) perspective(${PERSPECTIVE}px) ` +
    `rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg) scale(${sc.toFixed(5)})`;
  // a projected image is slightly see-through
  frame.style.opacity = (s.alpha * (1 - 0.14 * s.fx)).toFixed(3);
  frame.style.setProperty('--holo', s.fx.toFixed(3));

  const o = overlay();
  if (o) {
    const vis = s.alpha * s.fx;
    o.style.opacity = vis.toFixed(3);
    o.style.visibility = vis > 0.002 ? 'visible' : 'hidden';
    o.style.width = `${s.w.toFixed(1)}px`;
    o.style.height = `${s.h.toFixed(1)}px`;
    o.style.borderRadius = `${s.r.toFixed(1)}px`;
    o.style.transform =
      `translate3d(${(s.cx - s.w / 2).toFixed(2)}px, ${(s.cy - s.h / 2).toFixed(2)}px, 0) ` +
      `perspective(${PERSPECTIVE}px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg)`;
  }

  if (beam) {
    const u = getUniverse();
    const strength = s.alpha * s.fx;
    if (u && strength > 0.002) {
      const nx = (x) => (x / vw) * 2 - 1;
      const ny = (y) => -((y / vh) * 2 - 1);
      const l = s.cx - s.w / 2;
      const r = s.cx + s.w / 2;
      const t = s.cy - s.h / 2;
      const b = s.cy + s.h / 2;
      u.setBeam([[nx(l), ny(b)], [nx(r), ny(b)], [nx(r), ny(t)], [nx(l), ny(t)]], strength);
    } else {
      u?.setBeam(null);
    }
  }
}
