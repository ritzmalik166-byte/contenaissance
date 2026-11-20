'use client';

/* Tiny registry so homepage sections can talk to the shared
   universe canvas (components/home/journey/UniverseCanvas.jsx)
   without prop drilling. Every call is optional-chained by the
   caller, so sections keep working when the universe is absent
   (other pages, reduced motion, before the scene has loaded). */

let current = null;

export const setUniverse = (u) => {
  current = u;
};

export const getUniverse = () => current;
