'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger, isTouch } from '@/lib/user/gsap';
import { setUniverse } from '@/lib/user/universe';
import './Universe.css';

/* Homepage stations, in page order. `sel` finds the section and
   `veil` darkens the universe behind text-heavy sections. Names
   must match the DECOR keys in components/three/UniverseScene.js. */
const STATIONS = [
  { name: 'hero', sel: '.hero', veil: 0 },
  { name: 'stages', sel: '.rocket-sec', veil: 0 },
  { name: 'about', sel: '.about', veil: 0.12 },
  { name: 'reel', sel: '.reel', veil: 0 },
  { name: 'solutions', sel: '.solutions', veil: 0 },
  { name: 'work', sel: '.archive', veil: 0.4 },
  { name: 'web', sel: '.web3d', veil: 0.15 },
  { name: 'voices', sel: '.voices', veil: 0.4 },
  { name: 'journal', sel: '.hjournal', veil: 0.4 },
  { name: 'quote', sel: '.quote', veil: 0 },
  { name: 'contact', sel: '.cta', veil: 0.25 },
];

// Share of a section's own scroll during which the camera keeps
// drifting forward at its station (the rest of the trip happens in
// the hand-off to the next section).
const DRIFT = 0.2;

// Outer box of a section: the pin-spacer when ScrollTrigger pinned it,
// so the pinned scroll distance counts as "time at this station".
const boxOf = (el) => (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el);

// Builds [scroll, stationPos] keyframes from the live layout.
function measure(stations) {
  const vh = window.innerHeight;
  const keys = [];
  stations.forEach((s, i) => {
    if (!s.el) return;
    const r = boxOf(s.el).getBoundingClientRect();
    const top = r.top + window.scrollY;
    const holdEnd = Math.max(top, top + r.height - vh);
    keys.push([top, i]);
    keys.push([holdEnd, i + DRIFT]);
  });
  // keep monotonic (overlapping pins like the hero use pinSpacing:false)
  for (let k = 1; k < keys.length; k++) {
    if (keys[k][0] < keys[k - 1][0]) keys[k][0] = keys[k - 1][0];
  }
  return keys;
}

function sample(keys, y) {
  if (!keys.length) return 0;
  if (y <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [y1, p1] = keys[k];
    if (y <= y1) {
      const [y0, p0] = keys[k - 1];
      return y1 === y0 ? p1 : p0 + ((y - y0) / (y1 - y0)) * (p1 - p0);
    }
  }
  return keys[keys.length - 1][1];
}

export default function UniverseCanvas() {
  const wrap = useRef(null);
  const veil = useRef(null);

  useEffect(() => {
    const container = wrap.current;
    if (!container) return;

    let disposed = false;
    let scene = null;
    let trigger = null;
    let keys = [];

    const stations = STATIONS.map((s) => ({ ...s, el: document.querySelector(s.sel) }));
    const present = stations.filter((s) => s.el);

    const veilAt = (pos) => {
      const i = Math.min(Math.floor(pos), present.length - 1);
      const a = present[i]?.veil ?? 0;
      const b = present[Math.min(i + 1, present.length - 1)]?.veil ?? a;
      return a + (b - a) * (pos - i);
    };

    let lastVeil = -1;
    const update = (y) => {
      const pos = sample(keys, y);
      scene?.setStation(pos);
      // The hero canvas is opaque — nothing to draw until it fades.
      scene?.setActive(y > 4);
      const v = Math.round(veilAt(pos) * 100) / 100;
      if (v !== lastVeil && veil.current) {
        veil.current.style.opacity = v;
        lastVeil = v;
      }
    };

    import('../../three/UniverseScene').then(({ createUniverseScene }) => {
      if (disposed || !wrap.current) return;

      scene = createUniverseScene(wrap.current, {
        stations: present.map((s) => s.name),
        loadTrigger: document.querySelector('.rocket-sec') || undefined,
      });
      setUniverse(scene);

      // refreshPriority -1: measure after every section has created its
      // pins, so pin-spacers already have their final size.
      trigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        refreshPriority: -1,
        onRefresh: () => {
          keys = measure(present);
          update(window.scrollY);
        },
        onUpdate: (self) => update(self.scroll()),
      });
      keys = measure(present);
      update(window.scrollY);
    });

    const onPointer = (e) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const touch = isTouch();
    if (!touch) window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      disposed = true;
      if (!touch) window.removeEventListener('pointermove', onPointer);
      trigger?.kill();
      setUniverse(null);
      scene?.destroy();
      scene = null;
    };
  }, []);

  return (
    <div className="universe" aria-hidden="true">
      <div ref={wrap} className="universe__view" />
      <div ref={veil} className="universe__veil" />
    </div>
  );
}
