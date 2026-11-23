import * as THREE from 'three';
import { createTextureKit, makeRealPlanet, makeAtmosphere } from './spaceMaterials';
import { makeStars, glowTexture } from './spaceCommon';

/**
 * Hero backdrop — clean deep space:
 *   - Earth's night side rising diagonally from the bottom right, with
 *     a golden sunrise blazing on the limb (the rocket's launch point)
 *   - a crescent moon top right
 *   - fine starfield in depth layers (cursor parallax, scroll fly-through)
 *
 * state.progress (0..1) is driven by scroll, state.intro (0..1) by the
 * load-in, setPointer(x, y) by the cursor. getGlow() returns the sunrise
 * point in container px so the DOM exhaust trail can start from it.
 */

// Where the sunrise sits (NDC, -1..1) and how steeply the horizon climbs
// to the right (radians). The trail in Hero.jsx starts from this point.
const LAYOUT = {
  desktop: { gx: 0.15, gy: -0.66, tilt: 0.34, moon: { x: 0.74, y: 0.5, r: 0.15 } },
  mobile: { gx: 0.05, gy: -0.62, tilt: 0.24, moon: { x: 0.62, y: 0.78, r: 0.11 } },
};

export function createHeroScene(container) {
  if (!container) return null;

  let mobile = window.innerWidth < 760;

  /* ---------- renderer / camera ---------- */
  // Transparent: the shared homepage universe (journey/UniverseCanvas —
  // the same Milky Way sky every section uses) shows through, so the
  // hero and the sections after it sit under one continuous sky.
  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const CAM_Z = 9;
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(0, 0, CAM_Z);

  /* ---------- light: a low sun behind the planet, to the left ---------- */
  const sunDir = new THREE.Vector3(-0.75, 0.3, -1.6).normalize();
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.2);
  sun.position.copy(sunDir).multiplyScalar(20);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x1a1410, 0.35));

  const kit = createTextureKit(renderer, { mobile });
  kit.loadWhenNear(container);

  /* ---------- stars streaming past (the far sky is the universe) ----------
     Each layer's stars fly toward the camera and slip down-left, as if
     the rocket were climbing up and away — wrapped so it never ends. */
  const streams = [];
  const stream = (points, { zNear, zFar, x, y, speed }) => {
    const base = Float32Array.from(points.geometry.attributes.position.array);
    streams.push({ points, base, zNear, zFar, x, y, speed });
  };
  const wrap = (v, lo, hi) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));
  const flowStars = (t) => {
    for (const s of streams) {
      const arr = s.points.geometry.attributes.position.array;
      const d = t * s.speed;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = wrap(s.base[i] - d * 0.18, -s.x, s.x);
        arr[i + 1] = wrap(s.base[i + 1] - d * 0.32, -s.y, s.y);
        arr[i + 2] = wrap(s.base[i + 2] + d, -s.zFar, -s.zNear);
      }
      s.points.geometry.attributes.position.needsUpdate = true;
    }
  };

  const nearStars = makeStars(mobile ? 160 : 380, { x: 22, y: 13, z: 14, near: -8 });
  nearStars.material.size = 0.065;
  nearStars.material.fog = false;
  scene.add(nearStars);
  stream(nearStars, { zNear: -8, zFar: 14, x: 22, y: 13, speed: 0.9 });

  // A few brighter stars in depth layers: parallax with the cursor,
  // rush toward the camera on scroll
  const SPARKLE_LAYERS = [
    { count: mobile ? 40 : 90, size: 0.1, depth: [10, 22], spread: [30, 17], par: 0.35, rush: 3, speed: 0.5 },
    { count: mobile ? 16 : 36, size: 0.15, depth: [5, 12], spread: [19, 11], par: 0.8, rush: 5, speed: 0.8 },
    { count: mobile ? 6 : 12, size: 0.22, depth: [1, 6], spread: [12, 7], par: 1.4, rush: 7, speed: 1.1 },
  ];
  const sparkles = SPARKLE_LAYERS.map((cfg, i) => {
    const layer = makeStars(cfg.count, { x: cfg.spread[0], y: cfg.spread[1], z: cfg.depth[1], near: cfg.depth[0] });
    layer.material.size = cfg.size;
    layer.material.fog = false;
    layer.material.color.set(i === 2 ? 0xfff1d0 : 0xffffff);
    scene.add(layer);
    stream(layer, { zNear: cfg.depth[0], zFar: cfg.depth[1], x: cfg.spread[0], y: cfg.spread[1], speed: cfg.speed });
    return { layer, cfg };
  });

  // Slow "still flying" drift while the page rests: Earth falls away
  // behind the rocket and the moon draws closer, easing to a stop over
  // about a minute so nothing ever leaves the frame.
  const driftAt = (t) => 1 - Math.exp(-t / 22);

  /* ---------- crescent moon ---------- */
  const MOON_Z = -10;
  const moon = makeRealPlanet(kit, {
    radius: 1,
    surface: 'moon',
    tint: 0xd9d4cc,
    sunDir,
    segments: mobile ? 48 : 96,
    atmosphere: { color: '#cfd6e6', intensity: 0.25 },
    glowColor: '#cfd6e6',
    glowOpacity: 0.05,
  });
  const moonMat = moon.userData.body.material;
  moonMat.envMap = kit.environment(sunDir);
  moonMat.envMapIntensity = 0.15;
  moonMat.fog = false;
  scene.add(moon);

  /* ---------- Earth on a diagonal horizon ---------- */
  const EARTH_R = 70;
  const HORIZON_Z = -35;
  const horizon = new THREE.Group();
  scene.add(horizon);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, mobile ? 128 : 220, mobile ? 64 : 110),
    new THREE.MeshStandardMaterial({
      color: 0x0a0e14,
      roughness: 1,
      metalness: 0,
      emissive: 0xffc685,
      emissiveIntensity: 2.4,
      emissiveMap: kit.planet('earth_night', mobile ? '1k' : '2k'),
      envMap: kit.environment(sunDir),
      envMapIntensity: 0.25,
      fog: false,
    })
  );
  earth.rotation.x = -1.13; // mid-latitude city lights face the camera
  horizon.add(earth);

  // Sunrise scattering brightest on the limb, thin blue upper atmosphere
  const goldAtmo = makeAtmosphere(EARTH_R, {
    color: '#ffb257',
    sunDir: new THREE.Vector3(0, 0.55, -0.83).normalize(),
    intensity: 2.4,
    thickness: 0.012,
    power: 3.2,
    nightGlow: 0.08,
    segments: 128,
  });
  horizon.add(goldAtmo);
  const blueAtmo = makeAtmosphere(EARTH_R * 1.002, {
    color: '#5f8cff',
    sunDir: new THREE.Vector3(0, 1, 0.2).normalize(),
    intensity: 0.7,
    thickness: 0.01,
    power: 3,
    nightGlow: 0.3,
    segments: 128,
  });
  horizon.add(blueAtmo);
  goldAtmo.userData.materials[0].uniforms.intensity.value = 0.18;
  blueAtmo.userData.materials[0].uniforms.intensity.value = 0.08;

  // Flares sit on the visible limb (computed in layout()), depth-tested
  // so the planet hides their lower half. Sprites don't inherit the
  // group's roll, so their material rotation follows the horizon tilt.
  const LIMB = new THREE.Vector3(0, EARTH_R, 0);
  const flare = (hex, sx, sy, opacity) => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(hex),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    sp.scale.set(sx, sy, 1);
    sp.position.copy(LIMB);
    horizon.add(sp);
    return sp;
  };
  const flareWide = flare('#ffb050', 90, 6, 0.75);
  const flareCore = flare('#fff1d2', 30, 4.4, 1);
  // the launch point: a hot round bloom where the trail meets the planet
  const flarePoint = flare('#fff4dc', 9, 9, 0.9);
  const flareHalo = flare('#ff9c3a', 26, 26, 0.35);

  /* ---------- layout from the viewport ---------- */
  const lay = { hx: 0, hy: 0, tilt: 0, mx: 0, my: 0, mr: 1 };
  const layout = () => {
    const L = mobile ? LAYOUT.mobile : LAYOUT.desktop;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    // horizon: centre the sphere down-right of the sunrise point so the
    // limb nearest the camera sits on it, climbing to the right
    const dist = CAM_Z - HORIZON_Z;
    const halfH = dist * tan;
    const px = L.gx * halfH * camera.aspect;
    const py = L.gy * halfH;
    const Re = EARTH_R - 2.3; // the limb reads a little above the true top (seen from above)
    lay.tilt = L.tilt;
    lay.hx = px + Re * Math.sin(L.tilt);
    lay.hy = py - Re * Math.cos(L.tilt);
    horizon.rotation.z = L.tilt; // city lights roll with it
    [flareWide, flareCore].forEach((f) => (f.material.rotation = L.tilt));

    // The exact silhouette point in the "up-left" direction, seen from
    // the resting camera: the silhouette is a circle around
    // C·(1 - R²/d²) of radius R·√(1 - R²/d²), perpendicular to C.
    const C = new THREE.Vector3(lay.hx, lay.hy, HORIZON_Z - CAM_Z);
    const k = (EARTH_R * EARTH_R) / C.lengthSq();
    const n = C.clone().normalize();
    const m = new THREE.Vector3(-Math.sin(L.tilt), Math.cos(L.tilt), 0);
    const w = m.sub(n.clone().multiplyScalar(m.dot(n))).normalize();
    const P = C.clone().multiplyScalar(1 - k).add(w.multiplyScalar(EARTH_R * Math.sqrt(1 - k)));
    // → horizon-local (undo the group's offset and roll)
    LIMB.copy(P.sub(C)).applyAxisAngle(new THREE.Vector3(0, 0, 1), -L.tilt);
    [flareWide, flareCore, flarePoint, flareHalo].forEach((f) => f.position.copy(LIMB));

    // moon: top right, sized to the viewport height
    const mHalfH = (CAM_Z - MOON_Z) * tan;
    lay.mx = L.moon.x * mHalfH * camera.aspect;
    lay.my = L.moon.y * mHalfH;
    lay.mr = L.moon.r * mHalfH;
  };

  /* ---------- state ---------- */
  const state = { progress: 0, intro: 0, px: 0, py: 0, tx: 0, ty: 0, visible: true };
  const start = performance.now();
  let raf = 0;
  let destroyed = false;

  const onResize = () => {
    if (destroyed) return;
    const rect = container.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (!w || !h) return;
    mobile = window.innerWidth < 760;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    layout();
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  onResize();

  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
  });
  io.observe(container);

  /* ---------- frame ---------- */
  // Earth's resting place at time t: drifts down and away (the sunrise
  // point — and the plume drawn from it in Hero.jsx — follow it)
  const earthAt = (t, out) => {
    const d = driftAt(t);
    return out.set(lay.hx, lay.hy - d * 3.6, HORIZON_Z - d * 18);
  };
  const earthPos = new THREE.Vector3();

  const place = (t, p) => {
    // The camera holds still (no cursor parallax) so the rocket's plume
    // stays welded to the sunrise; it flies forward on scroll.
    camera.position.set(0, -p * 0.8, CAM_Z - p * 14);
    camera.lookAt(0, 0, camera.position.z - 10);

    // horizon rises into place on load, falls away while you rest,
    // sinks on scroll
    const rise = (1 - state.intro) * 3;
    earthAt(t, earthPos);
    horizon.position.set(earthPos.x, earthPos.y - rise - p * 4, earthPos.z);
    earth.rotation.y = -0.15 + t * 0.004;

    // the moon draws slowly closer (bigger, nearer) and leans with the cursor
    const d = driftAt(t);
    moon.position.set(
      lay.mx - state.px * 0.3 - d * 1.3,
      lay.my - state.py * 0.2 + p * 2.5 - d * 0.9,
      MOON_Z + d * 4.5
    );
    moon.scale.setScalar(lay.mr * (0.85 + state.intro * 0.15) * (1 + d * 0.45));
    // a steady, visible spin
    moon.userData.body.rotation.y = 0.6 + t * 0.16 + state.px * 0.15;
  };

  const render = () => {
    if (destroyed) return;
    raf = requestAnimationFrame(render);
    if (!state.visible) return;

    const t = (performance.now() - start) / 1000;
    const p = state.progress;
    const intro = state.intro;

    state.px += (state.tx - state.px) * 0.05;
    state.py += (state.ty - state.py) * 0.05;

    place(t, p);
    flowStars(t);

    nearStars.material.opacity = 0.75 + Math.sin(t * 1.7 + 1.3) * 0.18;
    nearStars.position.x = state.px * -0.25;

    for (let i = 0; i < sparkles.length; i++) {
      const { layer, cfg } = sparkles[i];
      layer.position.set(-state.px * cfg.par, -state.py * cfg.par * 0.6 + p * cfg.par * 1.5, p * cfg.rush);
      layer.material.opacity = (0.5 + intro * 0.5) * (0.82 + Math.sin(t * (1.1 + i * 0.7) + i * 2.1) * 0.18);
    }

    const breathe = Math.sin(t * 0.9) * 0.08;
    flareWide.material.opacity = (0.65 + Math.sin(t * 0.7) * 0.1) * intro;
    flareCore.material.opacity = (0.85 + Math.sin(t * 1.1) * 0.1) * intro;
    flarePoint.material.opacity = (0.9 + breathe) * intro;
    flareHalo.material.opacity = (0.35 + breathe) * intro;

    renderer.render(scene, camera);
  };
  render();

  // sunrise point in container px (resting camera, current drift; the
  // horizon is restored next frame by place())
  const tmp = new THREE.Vector3();
  const restCam = camera.clone();
  const getGlow = () => {
    restCam.copy(camera);
    restCam.position.set(0, 0, CAM_Z);
    restCam.lookAt(0, 0, CAM_Z - 10);
    restCam.updateMatrixWorld();
    earthAt((performance.now() - start) / 1000, horizon.position);
    horizon.updateMatrixWorld(true);
    tmp.copy(LIMB).applyMatrix4(horizon.matrixWorld).project(restCam);
    const r = container.getBoundingClientRect();
    return { x: ((tmp.x + 1) / 2) * r.width, y: ((1 - tmp.y) / 2) * r.height };
  };

  return {
    state,
    resize: onResize,
    getGlow,
    setPointer(x, y) {
      state.tx = x;
      state.ty = y;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          [].concat(o.material).forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });
      kit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
