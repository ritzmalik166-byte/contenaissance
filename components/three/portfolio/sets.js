import * as THREE from 'three';
import {
  random,
  makeGasGiant,
  makeRimShell,
  makeShards,
  makeGalaxy,
  glowSprite,
  makeOrbit,
  makeMediaCard,
  makeEclipse,
  makeObsidianOrb,
  makeObsidianChip,
  makeRingBand,
} from './objects';

/* =====================================================
   One "chamber" per page section. Every chamber is staged
   around the origin and seen from the same resting camera;
   the aperture transition (PortfolioScene) cuts between
   them. Positions use place(fx, fy, depth): screen NDC as
   seen from the resting camera, pushed `depth` units back —
   so compositions match the Figma frames at any aspect.
===================================================== */

const ease = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const s = (ctx, d) => (ctx.DIST + d) / ctx.DIST;

/* ---------------- 0 · HERO — Orbit gate ---------------- */

export function heroSet(ctx, { cards = [] } = {}) {
  const group = new THREE.Group();
  const { images, mobile } = ctx;

  const orbit = new THREE.Group();
  const ring = makeOrbit(1, { opacity: 0.32 });
  const ringInner = makeOrbit(0.9, { opacity: 0.2, dashed: true });
  orbit.add(ring, ringInner);
  group.add(orbit);

  const cardMeshes = cards.map((c, i) => {
    const tex = images.get(c.image);
    const mesh = makeMediaCard(tex, { width: 2.1, height: 1.4 });
    mesh.userData.id = c.id;
    mesh.userData.card = c;
    mesh.userData.theta = Math.PI * 0.95 + (i / cards.length) * Math.PI * 2;
    mesh.userData.hover = 0;
    mesh.userData.launch = 0;
    mesh.userData.imageTex = tex;
    group.add(mesh);
    return mesh;
  });

  // Gold debris that parts around the cursor.
  const shards = makeShards(mobile ? 90 : 240, { x: 14, y: 8, zMin: -18, zMax: 6 });
  group.add(shards);

  // Warm star with a particle swirl (left).
  const star = new THREE.Group();
  const starCore = glowSprite('#fff2d0', 0.9, 1);
  const starHalo = glowSprite('#ffc06a', 2.4, 0.22);
  const swirl = makeGalaxy(mobile ? 500 : 1200, 1.6, { arms: 2, twist: 2, thickness: 0.05, inner: '#fff1cf', outer: '#c9822e', size: 0.55 });
  swirl.rotation.x = 1.15;
  star.add(starHalo, starCore, swirl);
  group.add(star);

  // Glossy obsidian moon (top-right).
  const moon = makeObsidianOrb({ segments: mobile ? 32 : 64, tint: '#c9c3b8', rim: '#efe2c8', rimStrength: 0.5, key: new THREE.Vector3(0.3, 0.4, 0.8) });
  group.add(moon);

  // Banded gas giant (bottom-right) with a warm limb.
  const giant = new THREE.Group();
  const giantSun = new THREE.Vector3(-0.9, 0.55, 0.1);
  const giantBody = makeGasGiant(1, {
    segments: mobile ? 64 : 128,
    sunDir: giantSun,
    colors: ['#120502', '#2c1005', '#5a240b', '#8f4a1c'],
    rimStrength: 0.22,
  });
  const giantRim = makeRimShell(1, { color: '#ffae55', power: 7, intensity: 0.5, sunDir: giantSun });
  giant.add(giantBody, giantRim);
  giant.rotation.z = 0.32;
  group.add(giant);

  // Obsidian chips near the lower orbit.
  const chips = [];
  for (let i = 0; i < (mobile ? 3 : 6); i++) {
    const m = makeObsidianChip(1 + i * 0.37);
    m.userData.spin = new THREE.Vector3(random(-0.6, 0.6), random(-0.6, 0.6), random(-0.4, 0.4));
    m.userData.s = random(0.05, 0.13);
    chips.push(m);
    group.add(m);
  }

  let R = 7;
  let cardBase = 1;
  let intro = 0;
  const tmpQ = new THREE.Quaternion();
  const tmpQ2 = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const tmpV = new THREE.Vector3();

  function layout() {
    const { visW, visH, place } = ctx;
    const portrait = visW < visH;
    R = Math.max(visW * (portrait ? 0.52 : 0.44), 2.6);
    const depth = 0.4;
    const vr = visH * (portrait ? 0.1 : 0.27);
    const tilt = Math.asin(Math.min(0.95, vr / (R * depth)));
    orbit.rotation.set(tilt, 0, -0.05);
    orbit.position.set(0, -visH * (portrait ? 0.2 : 0.02), 0);
    orbit.scale.set(R, R, R * depth);
    orbit.updateMatrix();

    star.position.copy(place(-0.7, 0.16, 1));
    moon.position.copy(place(0.64, 0.4, 1));
    moon.scale.setScalar(visH * 0.04 * s(ctx, 1));
    giant.position.copy(place(1.12, -1.18, 9));
    giant.scale.setScalar(Math.min(visH * 0.5, visW * 0.6) * s(ctx, 9));
    chips.forEach((r, i) => r.position.copy(place(0.25 + i * 0.07, -0.72 - (i % 2) * 0.08, 0.5 + i * 0.3)));
    cardBase = Math.min(1, visW / 17, portrait ? 0.5 : 1);
  }

  function update(st) {
    const { t, dt, local, hoverId, camera, fade, cursorRay, cursorPower, pointer } = st;
    const hero = local.hero || 0;
    intro = Math.min(1, intro + dt / 2.4);
    const iz = ease(intro);

    shards.userData.tick(t, dt, 0.7 + iz * 0.3, cursorRay, cursorPower);
    shards.material.opacity = iz * fade;
    swirl.rotation.y += dt * 0.12;
    swirl.userData.tick(t);
    starHalo.material.opacity = (0.22 + Math.sin(t * 1.3) * 0.04) * fade;
    moon.rotation.y += dt * 0.05;
    moon.userData.tick(t);
    giantBody.userData.tick(t);
    giant.rotation.y += dt * 0.012;
    chips.forEach((r) => {
      r.rotation.x += r.userData.spin.x * dt;
      r.rotation.y += r.userData.spin.y * dt;
      r.scale.setScalar(r.userData.s * iz);
    });

    camera.getWorldQuaternion(tmpQ);
    cardMeshes.forEach((m, i) => {
      const hot = hoverId === m.userData.id ? 1 : 0;
      m.userData.hover = damp(m.userData.hover, hot, 7, dt);
      m.userData.launch = damp(m.userData.launch, 0, 2.5, dt);
      const hv = m.userData.hover;
      m.userData.theta += dt * (0.035 - hv * 0.03);
      const th = m.userData.theta + hero * 1.4 + (1 - iz) * 2.2;
      tmpV.set(Math.cos(th), 0, Math.sin(th)).applyMatrix4(orbit.matrix);
      m.position.copy(tmpV);
      m.position.z += hv * 0.9 + m.userData.launch * 3;
      // face the camera, alive tilt, and lean toward the cursor on hover
      m.quaternion.copy(tmpQ);
      tmpE.set(
        Math.sin(t * 0.5 + i) * 0.08 - pointer.sy * 0.5 * hv,
        Math.cos(t * 0.4 + i) * 0.12 - Math.cos(th) * 0.18 + pointer.sx * 0.6 * hv,
        (i % 2 ? -1 : 1) * 0.07 * (1 - hv)
      );
      m.quaternion.multiply(tmpQ2.setFromEuler(tmpE));
      m.scale.setScalar(cardBase * (0.2 + 0.8 * ease(clamp01(intro * 1.4 - i * 0.12))) * (1 + hv * 0.16 + m.userData.launch * 0.4));
      const mat = m.userData.material;
      mat.uniforms.uHover.value = Math.max(hv, m.userData.launch);
      mat.uniforms.uTime.value = t + i;
      mat.uniforms.uGlint.value.set(0.5 + pointer.sx * 0.5, 0.5 + pointer.sy * 0.5);
      mat.uniforms.uOpacity.value = clamp01(intro * 2 - i * 0.2);
      if (!m.userData.fitted) m.userData.fitted = m.userData.fit();
    });
  }

  return {
    group,
    layout,
    update,
    cards: cardMeshes,
    burst: (p) => shards.userData.burst(p, 1),
  };
}

/* ---------------- 1 · SHOWREEL — Transmission ---------------- */

export function reelSet(ctx) {
  const group = new THREE.Group();
  const { mobile } = ctx;

  // Gilded ringed giant peeking in from the right edge.
  const ringed = new THREE.Group();
  const sun = new THREE.Vector3(-0.8, 0.4, 0.5);
  const body = makeGasGiant(1, {
    segments: mobile ? 64 : 112,
    sunDir: sun,
    colors: ['#140a05', '#341d0c', '#5e3c18', '#8a6430'],
    rim: '#ffd08a',
    rimStrength: 0.3,
  });
  const ringBand = makeRingBand(1.35, 2.3, { color: '#b8904c', opacity: 0.45 });
  ringBand.rotation.x = Math.PI / 2 - 0.32;
  ringed.add(body, ringBand);
  ringed.rotation.z = -0.35;
  group.add(ringed);

  // Obsidian sphere with an amber limb, lower left.
  const dark = makeObsidianOrb({
    segments: mobile ? 32 : 64,
    tint: '#3a2a1c',
    rim: '#ffb46a',
    rimStrength: 0.55,
    key: new THREE.Vector3(0.8, 0.3, 0.5),
    marble: 0.6,
    spec: 0.3,
  });
  group.add(dark);

  const beam = glowSprite('#ffcf8a', 1, 0);
  group.add(beam);

  const arcs = [makeOrbit(1, { opacity: 0.18 }), makeOrbit(1.18, { opacity: 0.1, dashed: true })];
  arcs.forEach((a) => {
    a.rotation.x = 1.38;
    group.add(a);
  });

  let hover = 0;

  function layout() {
    const { visW, visH, place } = ctx;
    ringed.position.copy(place(1.12, 0.38, 6));
    ringed.scale.setScalar(visH * 0.34 * s(ctx, 6));
    dark.position.copy(place(-1.18, -0.35, 6));
    dark.scale.setScalar(visH * 0.42 * s(ctx, 6));
    beam.position.copy(place(0, 0, 3));
    beam.scale.set(visW * 1.25, visH * 1.1, 1);
    arcs.forEach((a) => {
      a.position.copy(place(0, 0.05, 2));
      a.scale.setScalar(visW * 0.62);
    });
  }

  function update(st) {
    const { t, dt, local, hoverId, fade, enter } = st;
    hover = damp(hover, hoverId === 'reel' ? 1 : 0, 5, dt);
    const reel = local.reel || 0;
    body.userData.tick(t);
    body.rotation.y += dt * 0.05;
    ringBand.rotation.z += dt * 0.01;
    dark.rotation.y += dt * 0.03;
    dark.userData.tick(t);
    dark.userData.material.uniforms.uHot.value = hover * 0.8;
    ringed.position.x = ctx.place(1.12 + (1 - enter) * 0.4 - reel * 0.1, 0.38, 6).x;
    beam.material.opacity = (0.08 + reel * 0.08 + hover * 0.2) * fade;
    arcs.forEach((a, i) => (a.rotation.z += dt * (0.02 + hover * 0.1) * (i ? -1 : 1)));
  }

  return { group, layout, update };
}

/* ---------------- 2 · ARCHIVE — Constellation archive ---------------- */

export function archiveSet(ctx) {
  const group = new THREE.Group();
  const { mobile } = ctx;
  // (the smoked-glass moon beside the heading lives in the DOM-locked
  // HUD layer — see PortfolioScene — so it stays with the heading)

  const nebulaA = glowSprite('#8a5a2a', 1, 0.18);
  const nebulaB = glowSprite('#5a3a24', 1, 0.14);
  const cluster = makeGalaxy(mobile ? 400 : 900, 1.4, { arms: 4, twist: 1.6, thickness: 0.2, size: 0.5 });
  cluster.rotation.x = 0.9;
  group.add(nebulaA, nebulaB, cluster);

  let hot = 0;

  function layout() {
    const { visW, visH, place } = ctx;
    nebulaA.position.copy(place(-0.6, -0.3, 10));
    nebulaA.scale.set(visW * 1.1, visH * 1.1, 1);
    nebulaB.position.copy(place(0.7, 0.4, 12));
    nebulaB.scale.set(visW * 0.9, visH * 0.9, 1);
    cluster.position.copy(place(0.78, -0.55, 4));
    cluster.scale.setScalar(visH * 0.12);
  }

  function update(st) {
    const { t, dt, hoverId, pointer } = st;
    hot = damp(hot, hoverId ? 1 : 0, 4, dt);
    cluster.rotation.y += dt * (0.08 + hot * 0.15);
    cluster.rotation.z = damp(cluster.rotation.z, pointer.sx * 0.2, 2, dt);
    cluster.userData.tick(t);
  }

  return { group, layout, update };
}

/* ---------------- 3 · MARQUEE — Eclipse horizon ---------------- */

export function eclipseSet(ctx) {
  const group = new THREE.Group();
  const { mobile } = ctx;

  const horizon = new THREE.Group();
  const body = makeObsidianOrb({
    segments: mobile ? 64 : 128,
    tint: '#4a3828',
    rim: '#e9a54a',
    rimStrength: 0,
    key: new THREE.Vector3(0, 1, -0.2),
    marble: 0.4,
    spec: 0,
  });
  const limb = makeRimShell(1, { color: '#e9a54a', power: 14, intensity: 2.4, scale: 1.004, sunDir: new THREE.Vector3(0, 1, -0.4) });
  horizon.add(body, limb);
  group.add(horizon);

  const eclipse = makeEclipse(1);
  group.add(eclipse);

  const orbit = makeOrbit(1, { opacity: 0.22 });
  orbit.rotation.set(1.42, 0, 0.12);
  group.add(orbit);

  let power = 0;

  function layout() {
    const { visW, visH, place } = ctx;
    const hd = 60;
    const R = visW * 1.2 * s(ctx, hd) * 0.5;
    const top = place(0, 0.38, hd);
    horizon.position.set(top.x, top.y - R, top.z);
    horizon.scale.setScalar(R);
    eclipse.position.copy(place(0.5, -0.08, 3));
    eclipse.scale.setScalar(visH * 0.24 * s(ctx, 3));
    orbit.position.copy(place(0.15, -0.35, 2));
    orbit.scale.setScalar(visW * 0.52);
  }

  function update(st) {
    const { t, dt, local, enter, pointer } = st;
    const m = local.marquee || 0;
    const centred = 1 - Math.min(1, Math.abs(m - 0.5) * 2);
    power = damp(power, enter * (0.65 + centred * 0.7), 3, dt);
    eclipse.userData.tick(t, power);
    // the eclipse leans after the cursor like a heavy lens
    eclipse.rotation.y = damp(eclipse.rotation.y, pointer.sx * 0.35, 2, dt);
    eclipse.rotation.x = damp(eclipse.rotation.x, -pointer.sy * 0.25, 2, dt);
    limb.userData.material.uniforms.uIntensity.value = 1.8 + centred * 1.6;
    body.userData.tick(t);
    horizon.rotation.y += dt * 0.004;
    orbit.rotation.z += dt * 0.02;
  }

  return { group, layout, update };
}

/* ---------------- 4 · STAGES — Launch constellation ---------------- */

export function stagesSet(ctx) {
  const group = new THREE.Group();
  const arc = makeOrbit(1, { opacity: 0.12 });
  arc.rotation.x = Math.PI / 2;
  group.add(arc);
  const flare = glowSprite('#ffd27a', 1, 0.12);
  group.add(flare);

  function layout() {
    const { visW, visH, place } = ctx;
    arc.position.copy(place(0.98, 0.95, 2));
    arc.scale.setScalar(visH * 0.62);
    flare.position.copy(place(-0.4, -0.6, 8));
    flare.scale.set(visW * 0.9, visH * 0.7, 1);
  }

  function update(st) {
    const { dt, local, fade, hoverId } = st;
    arc.rotation.z += dt * (0.01 + (hoverId ? 0.04 : 0));
    flare.material.opacity = (0.06 + (local.stages || 0) * 0.08 + (hoverId ? 0.06 : 0)) * fade;
  }

  return { group, layout, update };
}

/* ---------------- 5 · QUOTE — Studio note ---------------- */

export function quoteSet(ctx) {
  const group = new THREE.Group();
  const { mobile } = ctx;

  const galaxy = makeGalaxy(mobile ? 1600 : 4200, 1, { arms: 3, twist: 2.4, thickness: 0.07, size: 0.75 });
  galaxy.rotation.x = 1.05;
  galaxy.rotation.z = -0.25;
  const core = glowSprite('#fff1d4', 1, 0.9);
  const coreHalo = glowSprite('#e9a54a', 1, 0.35);
  const gal = new THREE.Group();
  gal.add(galaxy, coreHalo, core);
  group.add(gal);

  const moon = makeObsidianOrb({ segments: mobile ? 32 : 64, tint: '#c4beb4', rim: '#e6d9c0', rimStrength: 0.5 });
  const ember = makeObsidianOrb({
    segments: mobile ? 32 : 64,
    tint: '#7a2a14',
    rim: '#ff5a2a',
    rimStrength: 1.2,
    key: new THREE.Vector3(-0.7, 0.5, 0.5),
    marble: 0.3,
    ember: '#ff4a1a',
    emberStrength: 0.9,
    spec: 0.35,
  });
  group.add(moon, ember);

  let flare = 0;

  function layout() {
    const { visW, visH, place } = ctx;
    const portrait = visW < visH;
    gal.position.copy(place(0.4, -0.35, 4));
    gal.scale.setScalar(visH * 0.32);
    core.scale.setScalar(0.35);
    coreHalo.scale.setScalar(1.3);
    moon.position.copy(place(portrait ? -0.6 : -0.78, portrait ? 0.84 : 0.6, 2));
    moon.scale.setScalar(visH * 0.045);
    ember.position.copy(place(0.82, -0.62, 2));
    ember.scale.setScalar(visH * 0.07);
  }

  function update(st) {
    const { t, dt, local, fade, pointer } = st;
    const q = local.quote || 0;
    galaxy.rotation.y += dt * 0.05;
    galaxy.userData.tick(t);
    gal.rotation.z = damp(gal.rotation.z, pointer.sx * 0.12, 1.5, dt);
    flare = damp(flare, ease(clamp01((q - 0.6) / 0.4)), 3, dt);
    core.material.opacity = (0.75 + flare * 0.25 + Math.sin(t * 2) * 0.04) * fade;
    core.scale.setScalar(0.35 + flare * 0.25);
    coreHalo.material.opacity = (0.3 + flare * 0.35) * fade;
    moon.rotation.y += dt * 0.05;
    moon.userData.tick(t);
    ember.rotation.y += dt * 0.04;
    ember.userData.tick(t);
  }

  return { group, layout, update };
}

/* ---------------- 6 · CTA — Flight plan ---------------- */

export function ctaSet(ctx) {
  const group = new THREE.Group();
  const warm = glowSprite('#c98a3a', 1, 0.14);
  group.add(warm);

  function layout() {
    const { visW, visH, place } = ctx;
    warm.position.copy(place(0.3, 1, 8));
    warm.scale.set(visW * 1.2, visH, 1);
  }

  function update() {}

  return { group, layout, update };
}
