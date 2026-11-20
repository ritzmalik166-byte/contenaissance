import * as THREE from 'three';
import { glowTexture, makeStars, updateAsteroidBelt } from './spaceCommon';
import {
  createTextureKit,
  makeRealPlanet,
  makePlanetRing,
  makeAsteroidBelt,
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

  const DECOR = {
    stages(g) {
      const neptune = makeRealPlanet(kit, {
        radius: 1.3,
        surface: 'neptune',
        tint: 0xc8d8ee,
        sunDir,
        atmosphere: { color: '#7fb6ff', intensity: 1.25, thickness: 0.07, power: 2.8 },
        glowColor: '#83b9ed',
        glowScale: 3.2,
        glowOpacity: 0.3,
      });
      // top-left: the rocket copy sits on the right
      neptune.position.set(-9.5, 4.6, -16);
      g.add(neptune);
      spinners.push({ obj: neptune, speed: -0.075 });

      const belt = makeAsteroidBelt(kit, {
        count: mobile ? 18 : 40,
        radiusRange: [5, 13],
        arc: Math.PI * 1.4,
        y: -1,
        ySpread: 3.4,
        z: -18,
        zSpread: 8,
      });
      clearCorridor(belt);
      g.add(belt);
      belts.push(belt);
    },

    about(g) {
      const mercury = makeRealPlanet(kit, {
        radius: 0.9,
        surface: 'mercury',
        tint: 0xd8cfc4,
        sunDir,
        atmosphere: { color: '#ffd9a8', intensity: 0.5, thickness: 0.03, power: 4 },
        glowColor: '#e9c58a',
        glowScale: 2.6,
        glowOpacity: 0.18,
      });
      mercury.position.set(-9.5, 4.2, -16);
      g.add(mercury);
      spinners.push({ obj: mercury, speed: 0.05 });
    },

    solutions(g) {
      // Mars — the "atmosphere" the orange Solutions section enters
      const mars = makeRealPlanet(kit, {
        radius: 4.2,
        surface: 'mars',
        tint: 0xe9d2bd,
        sunDir,
        atmosphere: { color: '#f0a868', intensity: 0.9, thickness: 0.05, power: 3.6 },
        glowColor: '#e0a65e',
        glowScale: 3,
        glowOpacity: 0.32,
      });
      mars.position.set(5.5, -1.5, -22);
      g.add(mars);
      spinners.push({ obj: mars, speed: 0.04 });
      anchors.mars = mars;
    },

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
      spinners.push({ obj: saturn.userData.body, speed: 0.06 });

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
    },

    quote(g) {
      // The bright star the Journal → Quote bloom flies into
      const core = halo('#fff6e0', 3.2, 0.95);
      const corona = halo('#ffd27a', 14, 0.35);
      core.position.set(0, 0, -24);
      corona.position.copy(core.position);
      g.add(corona, core);
      anchors.star = core;
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

  /* ---------- state ---------- */
  const state = {
    station: 0, // target (from scroll)
    pos: 0, // smoothed
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    pulse: 0,
    active: true,
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
  const start = performance.now();
  let raf = 0;

  const render = () => {
    if (destroyed) return;
    raf = requestAnimationFrame(render);
    if (!state.active || state.hidden) return;

    const t = (performance.now() - start) / 1000;

    // Scroll is already smoothed by Lenis; a light extra ease keeps
    // jumps (anchor links, refresh) from teleporting the camera.
    state.pos += (state.station - state.pos) * (reducedMotion ? 1 : 0.12);
    if (!reducedMotion) {
      state.px += (state.tx - state.px) * 0.05;
      state.py += (state.ty - state.py) * 0.05;
    }

    const p = state.pos;
    const shake = state.pulse * 0.12;
    camera.position.set(
      pathX(p) + state.px * 0.8 + (Math.random() - 0.5) * shake,
      pathY(p) + state.py * 0.55 + (Math.random() - 0.5) * shake,
      12 + stationZ(p)
    );
    camera.lookAt(
      pathX(p + 0.25) + state.px * 0.25,
      pathY(p + 0.25) + state.py * 0.18,
      camera.position.z - 20
    );

    recycleStars(camera.position.z);

    if (!reducedMotion) {
      for (const s of spinners) s.obj.rotation.y = t * s.speed;
      for (const b of belts) {
        updateAsteroidBelt(b, t);
      }
      nebula.rotation.z = Math.sin(t * 0.025) * 0.015;
      if (anchors.star) {
        const s = 3.2 + Math.sin(t * 2.2) * 0.25;
        anchors.star.scale.setScalar(s);
      }
    }

    state.pulse *= 0.93;
    rim.intensity = RIM_BASE + state.pulse * 16;

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

    setActive(on) {
      state.active = on;
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
