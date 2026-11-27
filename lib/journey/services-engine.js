import * as THREE from 'three';
import { Sky } from './sky';
import { SolarSystem, SYSTEM } from './services-system';
import { clamp, seg } from './util';
import { createStage, UP, pad2 } from './stage';

/* =====================================================
   SERVICES JOURNEY ENGINE
   The world (a solar system, one planet per service) and
   where the camera is along the page. Everything shared —
   renderer, loop, beats, anchors, HUD, the scroll timeline —
   lives in lib/journey/stage.js.
   Story: overview → dive → six worlds → pull back for the
   mission plan → the orbits close around the call to action.
===================================================== */

export function createServicesJourney({ canvas, root, mobile, reduced, names = [] }) {
  const NAMES = { intro: ['01', 'The universe'], process: ['08', 'Mission plan'], finale: ['09', 'Launch'], footer: ['09', 'Contenaissance'] };
  names.forEach((n, i) => (NAMES[`world-${i}`] = [pad2(i + 2), n]));

  /* a pose: camera + subject offset (sx/sy, fraction of the screen) and how
     much of the disc / orbit rings / sun glow / worlds / milky way shows */
  const makePose = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), sx: 0, sy: 0, disc: 1, rings: 0, glow: 1, planets: 1, milky: 0.55, focus: -1 });
  const S = createStage({ canvas, root, mobile, reduced, readyEvent: 'services:ready', names: NAMES, makePose });
  if (!S) return null;

  const sky = new Sky({ mobile });
  sky.state.stars = 1;
  sky.state.dome = 0;
  const sys = new SolarSystem({ mobile });
  S.scene.add(sky.group, sys.group);

  // hovering a world's showcase turns the planet a little and swells the light
  const onHover = (e) => (sys.hover = e.detail ?? -1);
  window.addEventListener('sv:hover', onHover);

  const tmp = new THREE.Vector3();
  const set = (o, f) => Object.assign(o, f);

  const POSES = {
    overview(u, o) {
      const phi = -0.32 + u * 0.3;
      // phones: the system sits in the upper half, the hero copy below it
      if (S.narrow()) set(o, { sx: 0, sy: 0.2 }).pos.set(0, 300, 600).applyAxisAngle(UP, phi);
      else set(o, { sx: 0.21, sy: -0.06 }).pos.set(0, 150, 420).applyAxisAngle(UP, phi);
      o.look.set(0, -4, 0);
      return set(o, { disc: 1, rings: 1, glow: 1, planets: 1, milky: 0.55, focus: -1 });
    },
    planet(i, u, o) {
      const P = sys.planetPos(i);
      const w = SYSTEM[i];
      const side = i % 2 === 0 ? 1 : -1; // even: world on the right, copy on the left
      // look from the sun's side, swung round so a crescent of night shows
      tmp.copy(P).multiplyScalar(-1).setY(0).normalize();
      tmp.applyAxisAngle(UP, side * ((w.swing ?? 0.85) + u * 0.16));
      o.pos.copy(P).addScaledVector(tmp, w.r * (w.dist ?? 3.15) * (S.narrow() ? 1.24 : 1));
      o.pos.y += w.r * (0.32 - u * 0.12);
      o.look.copy(P);
      return set(o, { sx: S.narrow() ? 0 : side * 0.27, sy: S.narrow() ? 0.2 : 0, disc: 0.32, rings: 0.12, glow: 0.7, planets: 1, milky: 0.5, focus: i });
    },
    process(u, o) {
      o.pos.set(0, 250, 480).applyAxisAngle(UP, 0.35 + u * 0.18);
      o.look.set(0, -10, 0);
      // the worlds fade into their orbits as we pull back
      return set(o, { sx: 0, sy: S.narrow() ? 0 : -0.34, disc: 0.75, rings: 0.6, glow: 0.8, planets: 0, milky: 0.35, focus: -1 });
    },
    finale(u, o) {
      o.pos.set(0, 640, 330).applyAxisAngle(UP, 0.53 + u * 0.1);
      o.look.set(0, 0, 0);
      return set(o, { sx: 0, sy: S.narrow() ? 0.02 : 0.04, disc: 0.55, rings: 1, glow: 0.55, planets: 0, milky: 0.08, focus: -1 });
    },
  };

  const timeline = () => {
    const holds = [];
    const intro = S.by('intro');
    if (intro) holds.push({ y0: -Infinity, z0: intro.top, y1: intro.top + S.span(intro) * 0.36, pose: POSES.overview });
    SYSTEM.forEach((_, i) => {
      const w = S.by(`world-${i}`);
      if (w) holds.push({ y0: w.top + S.span(w) * 0.1, y1: w.top + S.span(w), pose: (u, o) => POSES.planet(i, u, o) });
    });
    const pr = S.by('process');
    if (pr) holds.push({ y0: pr.top + S.span(pr) * 0.04, y1: pr.top + S.span(pr), pose: POSES.process });
    const fi = S.by('finale');
    if (fi) holds.push({ y0: fi.top + S.span(fi) * 0.3, y1: Infinity, z1: fi.top + S.span(fi), pose: POSES.finale });
    S.setTimeline(holds);
  };

  // in flight every world is back in view and the disc fills in, so motion reads
  const fly = (A) => {
    A.focus = -1;
    A.disc = Math.max(A.disc, A.flight * 0.85);
  };

  const radii = {};
  SYSTEM.forEach((w, i) => (radii[`p-${i}`] = w.r * (w.ring ? 1.5 : 1)));

  S.start({
    timeline,
    fly,
    ready: () => sys.ready,
    frame: {
      before: ({ gp }) => sys.layout(gp),
      after: ({ cur, p, time, pose }) => {
        sky.state.milky = pose.milky;
        sky.update(S.camera, time, S.dpr);
        sys.update(time, S.camera, S.dpr, pose);

        const anchors = {};
        SYSTEM.forEach((_, i) => (anchors[`p-${i}`] = sys.planetPos(i)));

        // world chapters report 'arrived'; the process reports its stage
        let step;
        let phase = 'Flight plan';
        if (cur.name.startsWith('world-')) {
          step = p > 0.1 ? 1 : 0;
          phase = p > 0.1 ? (p > 0.94 ? 'Departing' : 'In orbit') : 'Approach';
        } else if (cur.name === 'process') {
          step = clamp(Math.floor(seg(p, 0.08, 0.86) * 5), 0, 4);
          phase = `Stage ${pad2(step + 1)} / 05`;
        } else if (cur.name === 'intro') {
          phase = p < 0.36 ? 'Overview' : 'Descent';
        }
        return { anchors, radii, step, phase, hideHud: cur.name === 'finale' || cur.name === 'process' };
      },
    },
  });

  if (window.location.search.includes('debug')) window.__services = { S, sys, info: S.info };

  return {
    measure: S.remeasure,
    dispose: () => S.dispose(() => window.removeEventListener('sv:hover', onHover)),
  };
}
