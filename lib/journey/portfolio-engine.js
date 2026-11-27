import * as THREE from 'three';
import { Sky } from './sky';
import { DeepSpace, Z } from './portfolio-space';
import { seg, smooth } from './util';
import { createStage, pad2 } from './stage';

/* =====================================================
   PORTFOLIO JOURNEY ENGINE
   Chapter 03 · The Missions. The camera flies straight
   down -z through deep space: the guiding star and its
   constellations → three featured missions, each plotted
   as its own star → the archive (a quiet stretch so the
   grid reads) → a launch beam rising for the next mission.
   Shared runtime: lib/journey/stage.js.
===================================================== */

export function createPortfolioJourney({ canvas, root, mobile, reduced, constellations = [], missionCodes = [] }) {
  const NAMES = { hero: ['01', 'The missions'], archive: ['05', 'Mission archive'], finale: ['06', 'Next mission'], footer: ['06', 'Contenaissance'] };
  missionCodes.forEach((c, k) => (NAMES[`mission-${k}`] = [pad2(k + 2), `Mission ${c}`]));

  // pose fields: how much of each part of the world shows
  const makePose = () => ({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    sx: 0,
    sy: 0,
    nebula: 1,
    constellation: 0,
    hero: 1,
    missions: 1,
    course: 1,
    beam: 0,
    milky: 0.35,
    liftMax: 12, // a straight run: barely any arc between holds
  });
  const S = createStage({ canvas, root, mobile, reduced, readyEvent: 'portfolio:ready', names: NAMES, makePose });
  if (!S) return null;

  const sky = new Sky({ mobile });
  sky.state.stars = 1;
  sky.state.dome = 0;
  const space = new DeepSpace({ mobile, constellations });
  S.scene.add(sky.group, space.group);

  const set = (o, f) => Object.assign(o, f);

  const POSES = {
    hero(u, o) {
      o.pos.set(0, 0, 60 - u * 40);
      o.look.set(0, 10, -400);
      return set(o, { sy: S.narrow() ? 0.04 : 0, nebula: 0.95, constellation: 1, hero: 1, missions: 0.7, course: 0.7, beam: 0, milky: 0.35 });
    },
    mission(k, u, o) {
      const z = Z.missions[k];
      const textSide = k % 2 === 0 ? 1 : -1;
      // drift slowly toward the mission's star while the card is read
      o.pos.set(-textSide * 6 + textSide * u * 8, 2, z + 110 - u * 70);
      o.look.set(textSide * 4, 6, z - 260);
      return set(o, { sy: 0, nebula: 0.8, constellation: 0, hero: 0, missions: 1, course: 0.8, beam: 0, milky: 0.3 });
    },
    archive(u, o) {
      o.pos.set(0, 0, Z.archive + 150 - u * 260);
      o.look.set(0, -6, Z.archive - 320);
      // quiet space: the grid has to read on top of it
      return set(o, { sy: 0, nebula: 0.4, constellation: 0, hero: 0, missions: 0, course: 0.35, beam: 0, milky: 0.25 });
    },
    finale(u, o) {
      o.pos.set(0, 22, Z.beam + (S.narrow() ? 380 : 320));
      o.look.set(0, 22, Z.beam);
      return set(o, { sy: 0, nebula: 0.5, constellation: 0, hero: 0, missions: 0, course: 0, beam: smooth(seg(u, 0, 0.55)), milky: 0.2 });
    },
  };

  const timeline = () => {
    const holds = [];
    const hero = S.by('hero');
    if (hero) holds.push({ y0: -Infinity, z0: hero.top, y1: hero.top + S.span(hero) * 0.42, pose: POSES.hero });
    Z.missions.forEach((_, k) => {
      const m = S.by(`mission-${k}`);
      if (m) holds.push({ y0: m.top + S.span(m) * 0.06, y1: m.top + S.span(m), pose: (u, o) => POSES.mission(k, u, o) });
    });
    const ar = S.by('archive');
    // the archive is an ordinary (non-sticky) section: hold for as long as it fills the screen
    if (ar) holds.push({ y0: ar.top - S.vh * 0.3, y1: Math.max(ar.top, ar.top + ar.h - S.vh), pose: POSES.archive });
    const fi = S.by('finale');
    if (fi) holds.push({ y0: fi.top + S.span(fi) * 0.04, y1: Infinity, z1: fi.top + S.span(fi), pose: POSES.finale });
    S.setTimeline(holds);
    // phones: bring the constellations into the narrow view
    space.fit(S.narrow() ? 0.42 : 1);
  };

  S.start({
    timeline,
    ready: () => space.ready,
    frame: {
      after: ({ cur, p, time, pose }) => {
        sky.state.milky = pose.milky;
        sky.update(S.camera, time, S.dpr);
        space.update(time, S.camera, pose);

        const anchors = {};
        constellations.forEach((_, i) => (anchors[`c-${i}`] = space.constellationLabel(i)));

        let step;
        let phase = '';
        if (cur.name === 'hero') phase = p < 0.42 ? 'Locating the archive' : 'Plotting course';
        else if (cur.name.startsWith('mission-')) {
          step = p > 0.06 ? 1 : 0;
          phase = p > 0.06 ? 'On target' : 'Approach';
        } else if (cur.name === 'archive') phase = 'Archive index';
        else if (cur.name === 'finale') phase = 'Awaiting launch';
        return { anchors, step, phase, hideHud: cur.name === 'archive' || cur.name === 'finale' };
      },
    },
  });

  if (window.location.search.includes('debug')) window.__portfolio = { S, space, info: S.info };

  return { measure: S.remeasure, dispose: () => S.dispose() };
}
