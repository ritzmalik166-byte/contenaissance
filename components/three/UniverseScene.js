import * as THREE from 'three';
import { glowTexture, makeStars, updateAsteroidBelt } from './spaceCommon';
import { createAstronaut } from './Astronaut';
import {
  createTextureKit,
  makeRealPlanet,
  makePlanetRing,
  makeAsteroidBelt,
  hullMaterial,
  solarPanelMaterial,
} from './spaceMaterials';

/* =====================================================
   UNIVERSE — one shared, fixed WebGL canvas behind the
   whole homepage. Every section is a "station" laid out
   along the -Z axis; scrolling flies the camera from one
   station to the next, so the page reads as one journey
   instead of separate rooms.

   Driven by UniverseCanvas.jsx:
     setStation(pos)  fractional station index (0 = hero)
     setPointer(x,y)  -1..1 parallax
     pulse()          light flash + shake (rocket launch)
     setActive(bool)  skip rendering while covered
===================================================== */

export const STATION_SPACING = 40;

// Station index → z of its "stage" (where the camera parks)
const stationZ = (i) => -i * STATION_SPACING;

export function createUniverseScene(container, { stations = [], loadTrigger } = {}) {
  if (!container) return null;

  let mobile = window.innerWidth < 760 || window.matchMedia('(hover: none)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  const dpr = () => Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6);
  renderer.setPixelRatio(dpr());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const kit = createTextureKit(renderer, { mobile });
  if (loadTrigger) kit.loadWhenNear(loadTrigger);
  else kit.load();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 140);
  camera.position.set(0, 0, 12);
  scene.add(camera); // camera children (backdrop) render too

  /* ---------- lighting ---------- */
  scene.add(new THREE.AmbientLight(0x596070, 1.25));
  const key = new THREE.DirectionalLight(0xffe3b2, 2.1);
  key.position.set(-4, 5, 6);
  scene.add(key);
  const sunDir = key.position.clone().normalize();

  // Rim light rides with the camera so planets near the lens catch it
  const rim = new THREE.PointLight(0xe9b949, 6, 30);
  rim.position.set(3, -1, 2);
  camera.add(rim);
  const RIM_BASE = rim.intensity;

  /* ---------- Milky Way backdrop (follows camera) ---------- */
  const NEB_W = 46;
  const NEB_H = 25;
  const NEB_DIST = 90;
  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(NEB_W, NEB_H),
    new THREE.MeshBasicMaterial({
      map: kit.color(`backgrounds/milkyway_${mobile ? '1k' : '1536'}.webp`),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  nebula.position.z = -NEB_DIST;
  nebula.renderOrder = -10;
  camera.add(nebula);

  const fitNebula = () => {
    const viewH = 2 * NEB_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewW = viewH * camera.aspect;
    nebula.scale.setScalar(Math.max((viewW * 1.25) / NEB_W, (viewH * 1.25) / NEB_H));
  };

  /* ---------- endless starfield (recycled around the camera) ---------- */
  const STAR_DEPTH = 110;
  const stars = makeStars(mobile ? 900 : 2200, { x: 42, y: 26, near: 0, z: STAR_DEPTH });
  stars.material.size = 0.07;
  scene.add(stars);
  const starPos = stars.geometry.attributes.position;

  const recycleStars = (camZ) => {
    const arr = starPos.array;
    const front = camZ - 0.5; // behind the lens
    const back = camZ - STAR_DEPTH;
    let dirty = false;
    for (let i = 2; i < arr.length; i += 3) {
      if (arr[i] > front) {
        arr[i] -= STAR_DEPTH;
        dirty = true;
      } else if (arr[i] < back) {
        arr[i] += STAR_DEPTH;
        dirty = true;
      }
    }
    if (dirty) starPos.needsUpdate = true;
  };

  /* ---------- station decor ---------- */
  // Each entry builds objects relative to its station's stage.
  // Kept to the sides so section copy in the middle stays readable.
  const glowCache = new Map();
  const glow = (hex) => {
    if (!glowCache.has(hex)) glowCache.set(hex, glowTexture(hex));
    return glowCache.get(hex);
  };

  const halo = (hex, scale, opacity = 0.28) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow(hex),
        color: hex,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    s.scale.setScalar(scale);
    return s;
  };

  const spinners = []; // { obj, speed }
  const belts = [];

  // The camera flies through belts between stations — push rocks out
  // of the central corridor so none ever drifts across section copy.
  const clearCorridor = (belt, halfW = 7, halfH = 3.5) => {
    for (const rock of belt.userData.rocks) {
      const p = rock.mesh.position;
      if (Math.abs(p.x) < halfW && Math.abs(p.y) < halfH) {
        p.x = Math.sign(p.x || 1) * (halfW + Math.random() * 4);
      }
    }
  };
  const anchors = {}; // name → Group at the station, for later phases

  // hero, stages, about and reel have no decor: the 3D rocket and the
  // astronaut are the subjects there, so the backdrop stays just stars.
  const DECOR = {
    // solutions: no Mars any more — the Showreel film docks into the
    // Solutions card instead (Showreel.jsx), so no planet is needed.

    work(g) {
      const saturn = makeRealPlanet(kit, {
        radius: 2.1,
        surface: 'saturn',
        tint: 0xf1dfc0,
        sunDir,
        atmosphere: { color: '#f3d29a', intensity: 0.8, thickness: 0.05, power: 3.2 },
        glowColor: '#e9c58a',
        glowScale: 3,
        glowOpacity: 0.22,
      });
      saturn.position.set(-9, 3, -18);
      const ring = makePlanetRing(kit, { inner: 2.6, outer: 4.1, tint: 0xe2c49a, opacity: 0.8 });
      ring.rotation.set(1.2, 0.2, -0.32);
      saturn.add(ring);
      g.add(saturn);
      spinners.push({ obj: saturn.userData.body, speed: 0.32 }); // a visible, steady spin

      const belt = makeAsteroidBelt(kit, {
        count: mobile ? 16 : 34,
        radiusRange: [6, 14],
        arc: Math.PI * 1.2,
        y: -2,
        ySpread: 3,
        z: -20,
        zSpread: 8,
      });
      clearCorridor(belt);
      g.add(belt);
      belts.push(belt);
    },

    web(g) {
      const h = halo('#e9b949', 26, 0.12);
      h.position.set(0, -10, -26);
      g.add(h);
    },

    voices(g) {
      const a = halo('#7f8cff', 30, 0.1);
      a.position.set(-12, 4, -30);
      const b = halo('#c06bff', 24, 0.08);
      b.position.set(12, -5, -32);
      g.add(a, b);
    },

    journal(g) {
      const a = halo('#e9b949', 22, 0.09);
      a.position.set(10, 5, -28);
      g.add(a);

      // a satellite drifting across the Testimonials → Journal leg
      const orbit = new THREE.Group();
      orbit.position.set(6.5, 2.6, -14);
      const sat = new THREE.Group();
      const bus = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.24, 0.6),
        hullMaterial(kit, { color: 0xffc35a, metalness: 1, roughness: 0.75, sunDir })
      );
      sat.add(bus);
      const panelMat = solarPanelMaterial(kit, { sunDir });
      [-1, 1].forEach((side) => {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), panelMat);
        panel.position.x = side * 0.64;
        panel.rotation.y = Math.PI / 2;
        sat.add(panel);
      });
      const blip = halo('#ff5a4a', 0.22, 0.9);
      blip.position.z = 0.34;
      sat.add(blip);
      sat.position.set(2.4, 0, 0);
      orbit.add(sat);
      g.add(orbit);
      anchors.satOrbit = orbit;
      anchors.sat = sat;
      anchors.satBlip = blip;
    },

    quote(g) {
      // The bright star the Journal → Quote bloom flies into
      const core = halo('#fff6e0', 3.2, 0.95);
      const corona = halo('#ffd27a', 14, 0.35);
      core.position.set(0, 0, -24);
      corona.position.copy(core.position);
      g.add(corona, core);
      anchors.star = core;
      anchors.corona = corona;
    },

    contact(g) {
      const earth = makeRealPlanet(kit, {
        radius: 3,
        surface: 'earth_night',
        tint: 0xffffff,
        sunDir,
        atmosphere: { color: '#6fb0ff', intensity: 1.3, thickness: 0.06, power: 2.6 },
        glowColor: '#7fb6ff',
        glowScale: 2.8,
        glowOpacity: 0.26,
      });
      earth.position.set(-3, -3.4, -20);
      g.add(earth);
      spinners.push({ obj: earth, speed: 0.03 });
      anchors.earth = earth;
    },
  };

  stations.forEach((name, i) => {
    const build = DECOR[name];
    if (!build) return;
    const g = new THREE.Group();
    g.position.z = stationZ(i);
    g.name = name;
    build(g);
    scene.add(g);
    anchors[`station:${name}`] = g;
  });

  /* ---------- journey actor: 3D astronaut + holo beam ---------- */
  // Camera-attached so it can be placed in screen space (NDC + height
  // as a fraction of the viewport) regardless of where the camera is
  // on its flight path. Driven by JourneyActors.jsx.
  const ACTOR_DEPTH = 9;
  const astro = createAstronaut(kit, { sunDir });
  const rig = new THREE.Group();
  rig.visible = false;
  rig.add(astro.group);
  camera.add(rig);

  // dedicated studio lighting for the actor (moves with the camera)
  const actorKey = new THREE.DirectionalLight(0xfff1dc, 2.4);
  actorKey.position.set(-4, 5, 4);
  actorKey.target.position.set(0, 0, -ACTOR_DEPTH);
  const actorRim = new THREE.DirectionalLight(0x9fd8ff, 2.2);
  actorRim.position.set(5, 2, -14);
  actorRim.target.position.set(0, 0, -ACTOR_DEPTH);
  const actorFill = new THREE.DirectionalLight(0xe9b949, 0.6);
  actorFill.position.set(2, -4, 2);
  actorFill.target.position.set(0, 0, -ACTOR_DEPTH);
  [actorKey, actorRim, actorFill].forEach((l) => {
    l.visible = false;
    camera.add(l, l.target);
  });

  const actor = {
    vis: 0, x: 0.6, y: 0, h: 0.5, rx: 0, ry: 0, rz: 0, arm: 0, glow: 0,
  };
  const wristNDC = { x: 0, y: 0 };

  // Projector beam: apex at the wrist lens, base on the holo panel's
  // four corners (given in NDC). Vertex alpha fades toward the panel.
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
  beamGeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array([1, 0.22, 0.22, 0.22, 0.22]), 1));
  beamGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x6ff7ff) }, uStrength: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha * uStrength * 0.55);
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.frustumCulled = false;
  beam.visible = false;
  beam.renderOrder = 20;
  camera.add(beam);
  const beamState = { strength: 0, corners: null };

  const vTmp = new THREE.Vector3();
  const frustumAt = (d) => {
    const halfH = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return { halfH, halfW: halfH * camera.aspect };
  };

  // Thruster puffs: pooled soft sprites in camera space, so they stay
  // behind as a trail when the astronaut moves.
  const puffTex = glowTexture('#e8f1ff');
  const puffs = Array.from({ length: mobile ? 18 : 36 }, () => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: puffTex,
        color: 0xdfeaff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    sp.visible = false;
    sp.userData = { life: 0, max: 1, vel: new THREE.Vector3(), size: 0.1 };
    camera.add(sp);
    return sp;
  });
  let puffCursor = 0;
  let puffAcc = 0;
  const emitPuff = (pos, dir, scale) => {
    const sp = puffs[puffCursor];
    puffCursor = (puffCursor + 1) % puffs.length;
    sp.position.copy(pos);
    sp.userData.life = 0;
    sp.userData.max = 0.55 + Math.random() * 0.35;
    sp.userData.size = scale * (0.35 + Math.random() * 0.25);
    sp.userData.vel
      .copy(dir)
      .multiplyScalar(scale * (2.2 + Math.random()))
      .add(new THREE.Vector3((Math.random() - 0.5) * scale, (Math.random() - 0.5) * scale, 0));
    sp.visible = true;
  };
  const updatePuffs = (dt) => {
    for (const sp of puffs) {
      if (!sp.visible) continue;
      const u = sp.userData;
      u.life += dt;
      const k = u.life / u.max;
      if (k >= 1) {
        sp.visible = false;
        continue;
      }
      sp.position.addScaledVector(u.vel, dt);
      u.vel.multiplyScalar(1 - 1.8 * dt);
      sp.scale.setScalar(u.size * (0.4 + k * 1.8));
      sp.material.opacity = (1 - k) * (1 - k) * 0.55;
    }
  };

  const prevActor = { x: actor.x, y: actor.y, ok: false };
  const vPuff = new THREE.Vector3();
  const vDir = new THREE.Vector3();

  const updateActor = (t, dt) => {
    updatePuffs(dt);
    const on = actor.vis > 0.001;
    rig.visible = on;
    actorKey.visible = actorRim.visible = actorFill.visible = on;
    if (!on) {
      beam.visible = false;
      prevActor.ok = false;
      return;
    }

    const { halfH, halfW } = frustumAt(ACTOR_DEPTH);
    rig.position.set(actor.x * halfW, actor.y * halfH, -ACTOR_DEPTH);
    const s = ((actor.h * 2 * halfH) / astro.height) * actor.vis;
    rig.scale.setScalar(Math.max(s, 1e-4));
    const idle = reducedMotion ? 0 : 1;
    rig.rotation.set(
      actor.rx + Math.sin(t * 0.5) * 0.04 * idle,
      actor.ry + Math.sin(t * 0.33) * 0.08 * idle,
      actor.rz + Math.sin(t * 0.41) * 0.03 * idle
    );
    astro.group.position.y = Math.sin(t * 0.8) * 0.04 * idle;

    // screen velocity → secondary motion (lean, trailing limbs)
    const vx = prevActor.ok && dt > 0 ? (actor.x - prevActor.x) / dt : 0;
    const vy = prevActor.ok && dt > 0 ? (actor.y - prevActor.y) / dt : 0;
    prevActor.x = actor.x;
    prevActor.y = actor.y;
    prevActor.ok = true;
    astro.setMotion(vx, vy);

    astro.setPose({ arm: actor.arm, glow: actor.glow, tap: actor.tap ?? 0 });
    astro.update(idle ? t : 0, dt);

    // thrusters fire while it manoeuvres (opposite the motion)
    if (idle && astro.speed > 0.12) {
      puffAcc += dt * Math.min(40, astro.speed * 30);
      const md = astro.motionDir;
      vDir.set(-md.x, -md.y, 0).normalize();
      while (puffAcc >= 1) {
        puffAcc -= 1;
        const n = astro.nozzles[(Math.random() * astro.nozzles.length) | 0];
        n.getWorldPosition(vPuff);
        camera.worldToLocal(vPuff);
        emitPuff(vPuff, vDir, s * 0.6);
      }
    }

    // wrist lens → camera space (for the beam) and NDC (for the DOM panel)
    rig.updateMatrixWorld(true);
    astro.wrist.getWorldPosition(vTmp);
    const wristLocal = camera.worldToLocal(vTmp.clone());
    vTmp.project(camera);
    wristNDC.x = vTmp.x;
    wristNDC.y = vTmp.y;

    if (beamState.corners && beamState.strength > 0.001) {
      const pos = beamGeo.attributes.position;
      pos.setXYZ(0, wristLocal.x, wristLocal.y, wristLocal.z);
      beamState.corners.forEach(([nx, ny], i) => {
        pos.setXYZ(i + 1, nx * halfW, ny * halfH, -ACTOR_DEPTH);
      });
      pos.needsUpdate = true;
      beamMat.uniforms.uStrength.value = beamState.strength * (0.9 + Math.sin(t * 23) * 0.06 * idle);
      beam.visible = true;
    } else {
      beam.visible = false;
    }
  };

  /* ---------- Web3D moon (camera-attached, screen-space) ---------- */
  // Replaces the section's own MoonScene: it lives in the universe, so
  // it rises out of the Archive as the Web3D section scrolls in.
  // Driven by Web3D.jsx via setMoon({ vis, crestY, size, spin, px, py }).
  const MOON_DEPTH = 34;
  const moonRig = new THREE.Group();
  moonRig.visible = false;
  camera.add(moonRig);
  const moon = makeRealPlanet(kit, {
    radius: 1,
    surface: 'moon',
    // dimmed + desaturated like the original Web3D moon (it was drawn at
    // opacity .42, brightness .55) so the video ring stays the hero
    tint: 0x6f6a62,
    sunDir,
    segments: mobile ? 64 : 128,
    atmosphere: { color: '#ffe2a8', intensity: 0.3, thickness: 0.035, power: 3.4 },
    glowColor: '#e9b949',
    glowScale: 2.4,
    glowOpacity: 0.1,
  });
  moon.rotation.z = 0.35;
  moonRig.add(moon);
  const moonState = { vis: 0, crestY: 0.3, size: 0.82, spin: 0, px: 0, py: 0, sx: 0, sy: 0 };

  const updateMoon = (t, dt) => {
    const on = moonState.vis > 0.001;
    moonRig.visible = on;
    if (!on) return;
    const { halfH, halfW } = frustumAt(MOON_DEPTH);
    const R = moonState.size * halfW; // size = diameter / viewport width
    moonState.sx += (moonState.px - moonState.sx) * Math.min(1, dt * 3);
    moonState.sy += (moonState.py - moonState.sy) * Math.min(1, dt * 3);
    const crest = (1 - 2 * moonState.crestY) * halfH; // viewport y → world y
    moonRig.position.set(moonState.sx * 0.6, crest - R + moonState.sy * 0.3, -MOON_DEPTH);
    moonRig.scale.setScalar(R * Math.max(0.001, moonState.vis));
    moon.userData.body.rotation.y = (reducedMotion ? 0 : t * 0.025) + moonState.spin;
  };

  /* ---------- hyperspace warp field ---------- */
  // Streaks around the camera axis that stretch with setWarp(v);
  // the FOV kicks wider at the peak.
  const WARP_N = mobile ? 200 : 520;
  const warpGeo = new THREE.BufferGeometry();
  const warpPos = new Float32Array(WARP_N * 6);
  const warpSeed = Array.from({ length: WARP_N }, () => {
    const a = Math.random() * Math.PI * 2;
    const r = 1.2 + Math.pow(Math.random(), 0.6) * 9;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: -2 - Math.random() * 60, len: 0.6 + Math.random() * 1.4 };
  });
  warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
  const warpMat = new THREE.LineBasicMaterial({
    color: 0xcfe4ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const warpLines = new THREE.LineSegments(warpGeo, warpMat);
  warpLines.frustumCulled = false;
  warpLines.visible = false;
  camera.add(warpLines);
  const warpState = { v: 0, s: 0 };
  const BASE_FOV = 50;

  const updateWarp = (dt) => {
    warpState.s += (warpState.v - warpState.s) * Math.min(1, dt * 8);
    const w = reducedMotion ? 0 : warpState.s;
    const fov = BASE_FOV + w * 18;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
      fitNebula();
    }
    nebula.scale.y = nebula.scale.x * (1 + w * 0.6);
    if (w < 0.01) {
      warpLines.visible = false;
      return;
    }
    warpLines.visible = true;
    warpMat.opacity = Math.min(1, w * 1.4) * 0.85;
    const speed = 30 + w * 140;
    for (let i = 0; i < WARP_N; i++) {
      const s = warpSeed[i];
      s.z += speed * dt;
      if (s.z > -1) s.z -= 60;
      const len = s.len * (0.5 + w * 14);
      const o = i * 6;
      warpPos[o] = s.x;
      warpPos[o + 1] = s.y;
      warpPos[o + 2] = s.z;
      warpPos[o + 3] = s.x;
      warpPos[o + 4] = s.y;
      warpPos[o + 5] = s.z - len;
    }
    warpGeo.attributes.position.needsUpdate = true;
  };

  // generic screen position of a named anchor (mars, star, earth…)
  const anchorV = new THREE.Vector3();
  const anchorNDC = (name) => {
    const a = anchors[name];
    if (!a) return null;
    a.getWorldPosition(anchorV);
    anchorV.project(camera);
    return { x: anchorV.x, y: anchorV.y, z: anchorV.z };
  };
  const flare = { v: 0, s: 0 };

  /* ---------- state ---------- */
  const state = {
    station: 0, // target (from scroll)
    pos: 0, // smoothed
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    pulse: 0,
    lift: 0, // 0..1 camera tilts up to follow the rocket launch
    dive: 0, // 0..1 camera swoops onto Mars
    diveS: 0,
    liftS: 0,
    active: true,
    occluders: new Set(), // opaque sections currently covering the whole viewport
    hidden: document.hidden,
  };

  // Gentle curve so the flight path is never a dead-straight tunnel
  // (narrower swing on portrait screens, where the frustum is thin)
  let swing = 1;
  const pathX = (p) => Math.sin(p * 0.9) * 2.2 * swing;
  const pathY = (p) => (Math.cos(p * 0.7) * 1.1 - 1.1) * swing;

  /* ---------- resize ---------- */
  let destroyed = false;
  const onResize = () => {
    if (destroyed) return;
    mobile = window.innerWidth < 760 || window.matchMedia('(hover: none)').matches;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    swing = THREE.MathUtils.clamp(camera.aspect / 1.6, 0.3, 1);
    fitNebula();
    renderer.setPixelRatio(dpr());
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', onResize);
  onResize();

  const onVisibility = () => {
    state.hidden = document.hidden;
  };
  document.addEventListener('visibilitychange', onVisibility);

  /* ---------- loop ---------- */
  const lookV = new THREE.Vector3();
  const marsV = new THREE.Vector3();
  const diveCam = new THREE.Vector3();
  const marsNDC = { x: 0, y: 0, z: 2 };
  const start = performance.now();
  let lastT = 0;
  let raf = 0;

  const render = () => {
    if (destroyed) return;
    raf = requestAnimationFrame(render);
    if (!state.active || state.hidden || state.occluders.size) return;

    const t = (performance.now() - start) / 1000;
    const dt = Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;

    // Scroll is already smoothed by Lenis; a light extra ease keeps
    // jumps (anchor links, refresh) from teleporting the camera.
    state.pos += (state.station - state.pos) * (reducedMotion ? 1 : 0.12);
    if (!reducedMotion) {
      state.px += (state.tx - state.px) * 0.05;
      state.py += (state.ty - state.py) * 0.05;
    }

    const p = state.pos;
    const shake = state.pulse * 0.12;
    state.liftS += (state.lift - state.liftS) * (reducedMotion ? 1 : 0.1);
    const lift = state.liftS;
    camera.position.set(
      pathX(p) + state.px * 0.8 + (Math.random() - 0.5) * shake,
      pathY(p) + state.py * 0.55 + (Math.random() - 0.5) * shake + lift * 3.5,
      12 + stationZ(p)
    );
    lookV.set(
      pathX(p + 0.25) + state.px * 0.25,
      pathY(p + 0.25) + state.py * 0.18 + lift * 12,
      camera.position.z - 20
    );

    // Dive: swoop the camera down onto Mars (Showreel → Solutions)
    state.diveS += (state.dive - state.diveS) * (reducedMotion ? 1 : 0.1);
    if (state.diveS > 0.001 && anchors.mars) {
      const d = THREE.MathUtils.smootherstep(state.diveS, 0, 1);
      anchors.mars.getWorldPosition(marsV);
      diveCam.set(marsV.x - 1.2 + state.px * 0.3, marsV.y + 0.9 + state.py * 0.2, marsV.z + 9.5);
      camera.position.lerp(diveCam, d);
      lookV.lerp(marsV, d);
    }
    camera.lookAt(lookV);

    recycleStars(camera.position.z);

    // Mars on screen (for the atmosphere bloom in Solutions)
    if (anchors.mars) {
      anchors.mars.getWorldPosition(marsV);
      camera.updateMatrixWorld();
      marsV.project(camera);
      marsNDC.x = marsV.x;
      marsNDC.y = marsV.y;
      marsNDC.z = marsV.z;
    }

    if (!reducedMotion) {
      for (const s of spinners) s.obj.rotation.y = t * s.speed;
      for (const b of belts) {
        updateAsteroidBelt(b, t);
      }
      nebula.rotation.z = Math.sin(t * 0.025) * 0.015;
      if (anchors.satOrbit) {
        anchors.satOrbit.rotation.y = t * 0.22;
        anchors.satOrbit.rotation.z = 0.3;
        anchors.sat.rotation.set(t * 0.1, t * 0.35, 0);
        anchors.satBlip.material.opacity = (t % 1.4) < 0.15 ? 0.95 : 0.1;
      }
    }

    // the Quote star: twinkle + flare before the bloom
    flare.s += (flare.v - flare.s) * Math.min(1, dt * 6);
    if (anchors.star) {
      const tw = reducedMotion ? 0 : Math.sin(t * 2.2) * 0.25;
      anchors.star.scale.setScalar(3.2 + tw + flare.s * 4);
      anchors.corona.scale.setScalar(14 + flare.s * 12);
      // the flight path passes through the star: fade it out up close
      anchors.star.getWorldPosition(anchorV);
      const near = THREE.MathUtils.clamp((anchorV.distanceTo(camera.position) - 5) / 14, 0, 1);
      anchors.corona.material.opacity = (0.35 + flare.s * 0.3) * near;
      anchors.star.material.opacity = 0.95 * near;
    }
    updateMoon(t, dt);
    updateWarp(dt);

    state.pulse *= 0.93;
    rim.intensity = RIM_BASE + state.pulse * 16;

    camera.updateMatrixWorld();
    updateActor(t, dt);

    renderer.render(scene, camera);
  };
  render();

  return {
    state,
    anchors,
    camera,

    setStation(pos) {
      state.station = pos;
    },

    setPointer(x, y) {
      state.tx = x;
      state.ty = y;
    },

    setDive(v) {
      state.dive = v;
    },

    getMarsNDC() {
      return marsNDC;
    },

    // Screen position (NDC, z > 1 = behind camera) of a named anchor
    getAnchorNDC(name) {
      return anchorNDC(name);
    },

    setMoon(p) {
      Object.assign(moonState, p);
    },

    setWarp(v) {
      warpState.v = v;
    },

    setStarFlare(v) {
      flare.v = v;
    },

    setLift(v) {
      state.lift = v;
    },

    // An opaque section (e.g. full Solutions atmosphere, bloomed Quote)
    // covers the viewport: nothing to draw.
    setOccluded(id, on) {
      if (on) state.occluders.add(id);
      else state.occluders.delete(id);
    },

    setActive(on) {
      state.active = on;
    },

    // Journey actor (screen-space): { vis, x, y (NDC), h (viewport
    // fraction), rx, ry, rz, arm 0..1, glow 0..1 }
    setAstronaut(p) {
      Object.assign(actor, p);
    },

    // Holo beam to a DOM panel: corners = 4 × [ndcX, ndcY] or null
    setBeam(corners, strength = 1) {
      beamState.corners = corners;
      beamState.strength = corners ? strength : 0;
    },

    // Time-based astronaut gesture, e.g. 'wave'
    playAstronaut(name) {
      astro.play(name);
    },

    getWristNDC() {
      return wristNDC;
    },

    pulse(amount = 1) {
      state.pulse = Math.max(state.pulse, amount);
    },

    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);

      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          [].concat(o.material).forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });
      glowCache.forEach((tex) => tex.dispose());
      stars.material.map?.dispose();
      kit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
