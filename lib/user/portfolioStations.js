'use client';

/* Scroll → "station" keyframes for the portfolio's fixed WebGL world
   (PortfolioCanvas). Each section is a
   station; the camera dwells at station i while the section is on
   screen (drifting forward by `drift`) and travels to i + 1 during
   the hand-off. Pinned sections are measured by their pin-spacer so
   the pinned scroll distance counts as dwell time. */

// Outer box of a section: the pin-spacer when ScrollTrigger pinned it.
export const boxOf = (el) => (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el);

// Document-space top of an element, ignoring CSS transforms.
const docTop = (el) => {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
  return y;
};

// Builds [scroll, stationPos] keyframes from the live layout.
export function measure(stations, drift = 0.2) {
  const vh = window.innerHeight;
  const keys = [];
  stations.forEach((s, i) => {
    if (!s.el) return;
    // Layout offsets, not bounding rects: sections carry 3D hand-off
    // transforms (PfHandoff) that must not skew the keyframes.
    const box = boxOf(s.el);
    const top = docTop(box);
    const holdEnd = Math.max(top, top + box.offsetHeight - vh);
    keys.push([top, i]);
    keys.push([holdEnd, i + drift]);
  });
  // keep monotonic (overlapping pins may use pinSpacing:false)
  for (let k = 1; k < keys.length; k++) {
    if (keys[k][0] < keys[k - 1][0]) keys[k][0] = keys[k - 1][0];
  }
  return keys;
}

// Station position for scroll y.
export function sample(keys, y) {
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
