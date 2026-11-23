'use client';

/* =====================================================
   Hero → Rocket hand-off.

   The hero's 3D rocket (components/home/journey/RocketFlight.jsx)
   flies into the Rocket section and lands as an exploded
   "hologram" of its stages. Rocket.jsx then assembles the
   real DOM modules out of those exact positions, so both
   files share the exploded layout and the assembly clock.
===================================================== */

// Rocket.jsx writes its pinned timeline time here on every update;
// the 3D overlay reads it each frame to fade each hologram stage as
// its real module locks in.
export const rocketClock = { time: 0 };

// Assembly schedule on the Rocket timeline (seconds of timeline time).
// k: 0 = S1 (bottom) … 4 = S5, 5 = nose cone.
export const ASSEMBLY = {
  start: (k) => k,
  duration: (k) => (k === 5 ? 0.6 : 0.8),
  done: 5.6, // nose cone locked in
};

// Exploded view: stages float apart upward, S1 stays on the nozzle.
// Returned in DOM px (positive = down), so DOM and WebGL agree.
const GAP = 0.16;
export const explodeOffset = (k, moduleH) => -k * moduleH * GAP;
