import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Sky, DOME } from './sky';
import { Earth, R as ER } from './earth';
import { Clouds } from './clouds';
import { Pad, PLATFORM_H, ROCKET_H, makeEngines, updateEngines } from './pad';
import { Cosmos } from './cosmos';
import { LogoParticles } from './logo';
import { clamp, lerp, seg, smooth, smoother, band, dwell, easeInOut, setTextureUpload, disposeTextures } from './util';


const PAD = new THREE.Vector3(0, -260, -470);
const MODULE_H = [10, 22, 33, 44, 54].map((h) => h + PLATFORM_H);
// camera sweep around the rocket, kept on the side away from the tower (+x)
const TH1 = 0.3;
const TH_STEP = 0.66;

// mode changes that are hard cuts get a short dip to black
// camera hand-off between sticky chapters: `out` = progress from which the
// outgoing chapter's camera is stretched to the switch point, `in` = progress
// up to which the incoming one's is stretched back from it. HOLD = the pause
// left at the switch, in viewport heights.
// worlds → galaxy: the moon's exit runs right up to the cut, and the galaxy
// fly-in starts right after it, so there is no blank stretch in between
const HANDOFF = { clouds: { out: 0.7 }, pad: { in: 0.3 }, worlds: { out: 0.94, hold: 0 }, galaxy: { in: 0.06, hold: 0 },
  // phones: the logo points start gathering right at the hand-off from the
  // journal instead of half a screen later (that gap read as a blank screen)
  logo: { in: 0.2, hold: 0, mobileOnly: true },
  // tools → trinity: the ring keeps forming up to the switch and the three
  // rings start splitting right after it (was a full screen of frozen scroll)
  tools: { out: 0.8, hold: 0 }, trinity: { in: 0.12, hold: 0 } };
// services chapter: stops 0..5, then the exit runs to WORLDS_SPAN
const WORLDS_SPAN = 5.6;
const HOLD = 0.2;
const CONTINUOUS = new Set(['earth>clouds', 'clouds>pad', 'pad>launch', 'launch>showreel', 'tools>trinity', 'clients>blog', 'blog>logo', 'logo>footer']);

const C = (h) => new THREE.Color(h);
const pad2 = (i) => String(i).padStart(2, '0');
const COL = {
  cloudDay: [C('#fff7ec'), C('#97a6bf'), C('#f1d6aa')],
  cloudGold: [C('#ffd9a8'), C('#7b7896'), C('#e9a865')],
  cloudDusk: [C('#6f6b85'), C('#1c1f2c'), C('#151a2a')],
  fogDusk: C('#0b0d15'),
  white: C('#e9f0f8'),
  black: C('#000000'),
};

export function createJourney({ canvas, root, mobile, reduced, projects, tools, onProgress }) {
  /* ---------------- renderer ---------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch {
    return null;
  }
  // Render at the screen's real pixel density — including browser zoom (devicePixelRatio)
  // and pinch zoom (visualViewport.scale) — so the rocket's logos stay sharp when zoomed.
  // Capped by the GPU's max buffer size; the adaptive loop below never drops under `minDpr`.
  const maxBuf = renderer.capabilities.maxTextureSize || 8192;
  const DPR_CAP = mobile ? 2.5 : 3;
  const minDpr = mobile ? 1 : 1.25;
  let maxDpr = 1;
  const targetDpr = () => {
    const zoom = window.visualViewport?.scale || 1;
    const fit = maxBuf / Math.max(window.innerWidth, window.innerHeight, 1);
    return Math.max(1, Math.min((window.devicePixelRatio || 1) * zoom, DPR_CAP, fit));
  };
  maxDpr = targetDpr();
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 1);
  setTextureUpload((t) => renderer.initTexture(t));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x121726, 0);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 4000);

  /* ---------------- world ---------------- */
  const sky = new Sky({ mobile });
  const earth = new Earth({ mobile });
  const clouds = new Clouds({ mobile });
  const pad = new Pad({ mobile, renderer });
  const cosmos = new Cosmos({ mobile, projects, tools });
  const logo = new LogoParticles({ mobile });

  pad.group.position.copy(PAD);
  pad.lights.position.copy(PAD);

  // space lighting (always present; intensity per chapter)
  const sun = new THREE.DirectionalLight(0xfff4e6, 0);
  sun.position.set(-1, 0.33, 0.58);
  const fill = new THREE.AmbientLight(0x223048, 0);

  // the rocket again, small, for the orbital shot
  const orbit = new THREE.Group();
  const orbitBody = new THREE.Group();
  const orbitEngines = makeEngines(1);
  orbit.add(orbitBody, orbitEngines);
  orbit.scale.setScalar(0.32 / ROCKET_H);

  // environment reflections for the rocket only (assigned per material,
  // so other materials never recompile)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pad.onRocket = (model) => {
    model.traverse((o) => {
      if (o.isMesh) {
        o.material.envMap = env;
        o.material.needsUpdate = true;
      }
    });
    orbitBody.add(model.clone());
    renderer.compileAsync?.(scene, camera).catch(() => { });
  };

  scene.add(sky.group, earth.group, clouds.group, pad.group, pad.lights, cosmos.worlds, cosmos.galaxy, cosmos.net, logo.group, orbit, sun, fill);

  /* ---------------- sections ---------------- */
  let sections = [];
  let vh = window.innerHeight;
  let vw = window.innerWidth;
  const measure = () => {
    vh = window.innerHeight;
    vw = window.innerWidth;
    const y = window.scrollY;
    sections = [...root.querySelectorAll('[data-ch]')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        el,
        name: el.dataset.ch,
        mode: el.dataset.mode || el.dataset.ch,
        top: r.top + y,
        h: el.offsetHeight,
        sticky: el.offsetHeight > vh * 1.05,
        beats: [...el.querySelectorAll('[data-in]')].map((b) => ({ el: b, a: parseFloat(b.dataset.in), b: parseFloat(b.dataset.out ?? '9'), f: parseFloat(b.dataset.f ?? '0.06'), last: -1 })),
        anchors: [...el.querySelectorAll('[data-anchor]')].map((a) => ({ el: a, key: a.dataset.anchor, lx: -1, ly: -1, lv: -1 })),
        step: -1,
      };
    });
  };
  // canvas size in CSS px — sized by CSS (100vw × 100lvh), which on mobile
  // is taller than innerHeight while the URL bar shows. Rendering at
  // innerHeight and letting CSS stretch it squashed the Earth into an egg.
  let cw = window.innerWidth;
  let chh = window.innerHeight;
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    cw = w;
    chh = h;
    // zoom changed? jump straight to the new sharp resolution
    const t = targetDpr();
    if (Math.abs(t - maxDpr) > 0.01) {
      maxDpr = t;
      dpr = t;
      renderer.setPixelRatio(dpr);
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : w / h < 1.2 ? 48 : 40;
    camera.updateProjectionMatrix();
    measure();
  };
  resize();
  const ro = new ResizeObserver(() => measure());
  ro.observe(root);
  // the canvas can change size without a window resize (mobile URL bar, lvh)
  const cro = new ResizeObserver(() => {
    if (canvas.clientWidth !== cw || canvas.clientHeight !== chh) resize();
  });
  cro.observe(canvas);
  window.addEventListener('resize', resize);
  // pinch zoom fires no window resize; browser zoom changes devicePixelRatio
  window.visualViewport?.addEventListener('resize', resize);
  let dprMq;
  const watchDpr = () => {
    dprMq?.removeEventListener('change', onDpr);
    dprMq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprMq.addEventListener('change', onDpr);
  };
  function onDpr() {
    resize();
    watchDpr();
  }
  watchDpr();

  /* ---------------- per-frame helpers ---------------- */
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const nV = new THREE.Vector3();
  const northV = new THREE.Vector3();
  const veil = { color: new THREE.Color(0, 0, 0), a: 0 };
  const veilEl = root.querySelector('[data-veil]');
  const hud = {
    chapter: root.querySelector('[data-hud="chapter"]'),
    name: root.querySelector('[data-hud="name"]'),
    bar: root.querySelector('[data-hud="bar"]'),
    alt: root.querySelector('[data-hud="alt"]'),
    count: root.querySelector('[data-hud="count"]'),
    phase: root.querySelector('[data-hud="phase"]'),
    lphase: root.querySelector('[data-hud="lphase"]'),
    box: root.querySelector('.j-hud'),
  };
  const anchorPos = {};
  let shakeAmp = 0;
  let dip = 0;
  let lastMode = '';
  let lastSection = null;
  // ready = Earth's maps decoded and a frame drawn; then the intro eases in
  let readyAt = -1;
  let introE = 0;
  const earthReady = () => ['dayMap', 'nightMap', 'cloudMap'].every((m) => earth.globeU[m].value.image?.width);
  let lastHud = {};

  const hudText = (key, v) => {
    if (hud[key] && lastHud[key] !== v) {
      hud[key].textContent = v;
      lastHud[key] = v;
    }
  };

  const show = (o) => {
    sky.group.visible = true;
    earth.group.visible = !!o.earth;
    clouds.group.visible = !!o.clouds;
    // clouds.update() derives visibility from opacity, so chapters without
    // clouds must zero it — otherwise landing mid-page (e.g. back from
    // /portfolio with restored scroll) shows the initial day-coloured deck
    if (!o.clouds) clouds.opacity = 0;
    pad.group.visible = !!o.pad;
    pad.setLightsOn(o.pad ? 1 : 0);
    cosmos.worlds.visible = !!o.worlds;
    cosmos.galaxy.visible = !!o.galaxy;
    cosmos.net.visible = !!o.net;
    logo.group.visible = !!o.logo;
    orbit.visible = !!o.orbit;
    sun.intensity = o.sun ?? 0;
    fill.intensity = o.fill ?? 0;
  };

  /* ---------------- directors ---------------- */
  const padLocal = (x, y, z, out) => out.set(PAD.x + x, PAD.y + y, PAD.z + z);
  // cylinder pose around the rocket axis
  const around = (theta, r, y, out) => padLocal(Math.sin(theta) * r, y, Math.cos(theta) * r, out);

  // phones only: shrink the AI-tools formation so the ring (34 units wide
  // each side, plus ~6 for a label) fits the narrow view at the ring's
  // distance (~95). Tablets and desktop keep the full-size ring.
  const netFit = () => {
    if (cw > 600) return 1;
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const halfW = 95 * Math.tan(hHalf);
    return clamp((halfW * 0.92) / 40, 0.4, 1);
  };

  const D = {
    earth(p) {
      show({ earth: 1 });
      sky.state.stars = 1;
      sky.state.milky = 0.85;
      sky.state.dome = 0;
      scene.fog.density = 0;
      clouds.opacity = 0;
      const n = nV.copy(earth.home).normalize();
      const north = northV.copy(up).addScaledVector(n, -up.dot(n)).normalize();
      const e = smooth(p);
      // entrance: after the loader the globe glides in from further out
      // start far enough out that the whole globe fits the screen *width*:
      // on portrait phones the horizontal FOV is narrow, so the fixed 2.9
      // radii cropped the sides. Globe spans ~82% of the width at most.
      const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
      const alt0 = Math.max(2.9, 1 / Math.sin(hHalf * 0.82) - 1);
      const alt = 0.008 + alt0 * Math.pow(1 - e, 2.35) + (1 - introE) * 2.2;
      cam.copy(n).multiplyScalar(ER * (1 + alt));
      // drift a little sideways early on, so the globe turns under us
      if (!mobile) cam.x += (1 - e) * 3.2;
      const k = smooth(seg(p, 0.38, 0.95));
      look.set(mobile ? 0 : -ER * 0.55 * (1 - e), mobile ? -ER * 0.35 * (1 - e) : 0, 0).lerp(tmp.copy(earth.home).addScaledVector(north, ER * 0.55).addScaledVector(n, ER * 0.035), k);
      camera.up.copy(up).applyAxisAngle(n, -0.12 * k);
      // the planet keeps turning (slow enough that the dive still lands over India)
      earth.spin = reduced ? 0 : time * 0.01;
      veil.color.copy(COL.white);
      veil.a = smooth(seg(p, 0.86, 1));
      return { alt: Math.round(alt * 6371), phase: p < 0.3 ? 'Orbit' : p < 0.8 ? 'Descent' : 'Atmosphere' };
    },

    clouds(p) {
      show({ clouds: 1, pad: p > 0.55 });
      sky.state.dome = 1;
      sky.state.milky = 0;
      sky.state.stars = 0;
      const g1 = smooth(seg(p, 0.05, 0.55));
      const g2 = smooth(seg(p, 0.58, 0.92));
      if (g2 <= 0) sky.setDome(DOME.day, DOME.golden, g1);
      else sky.setDome(DOME.golden, DOME.dusk, g2);
      sky.domeU.uSunDir.value.set(-0.5, 0.2 - p * 0.17, -1);
      const cd = g2 > 0 ? COL.cloudGold.map((c, i) => c.clone().lerp(COL.cloudDusk[i], g2)) : COL.cloudDay.map((c, i) => c.clone().lerp(COL.cloudGold[i], g1));
      clouds.setColors(cd[0], cd[1], cd[2]);
      clouds.opacity = 1;
      scene.fog.color.copy(COL.fogDusk);
      scene.fog.density = 0.0012 + g2 * 0.0018;
      const d = smooth(seg(p, 0.12, 0.88));
      cam.set(Math.sin(p * 2.2) * 8, lerp(42, -72, d), lerp(70, -380, p));
      const down = smooth(seg(p, 0.62, 1));
      look.set(cam.x * 0.5, cam.y - 8 - 30 * down, cam.z - 120);
      look.lerp(padLocal(0, 40, 0, tmp), smooth(seg(p, 0.74, 1)));
      camera.up.copy(up).applyAxisAngle(tmp2.set(0, 0, 1), Math.sin(p * 3.1) * 0.05);
      pad.state.lights = smooth(seg(p, 0.7, 0.95));
      pad.state.tower = 0;
      pad.state.flood = 0;
      Object.assign(pad.state, { vent: 0, ignite: 0, smoke: 0, lift: 0, shake: 0 });
      veil.color.copy(COL.white);
      veil.a = 1 - smooth(seg(p, 0, 0.14));
      return { alt: Math.round(lerp(12, 1.2, p) * 10) / 10, phase: p < 0.5 ? 'Atmosphere' : 'Below the clouds', km: true };
    },

    pad(p) {
      show({ pad: 1, clouds: 1 });
      sky.state.dome = 1;
      sky.state.milky = 0;
      sky.state.stars = 0.35;
      sky.setDome(DOME.dusk, DOME.dusk, 0);
      sky.domeU.uSunDir.value.set(-0.5, 0.03, -1);
      clouds.setColors(...COL.cloudDusk);
      clouds.opacity = 0.9;
      scene.fog.color.copy(COL.fogDusk);
      const reveal = smooth(seg(p, 0, 0.3));
      scene.fog.density = lerp(0.0042, 0.0016, reveal);
      Object.assign(pad.state, {
        lights: 1,
        tower: smooth(seg(p, 0.05, 0.15)),
        flood: seg(p, 0.13, 0.3),
        vent: smooth(seg(p, 0.3, 0.45)),
        ignite: 0,
        smoke: 0,
        lift: 0,
        shake: 0,
      });
      // descent: spiral down from under the clouds
      const th0 = Math.asin(6.48 / 90);
      const th1 = TH1;

      let th = lerp(th0, th1, reveal);
      let r = lerp(90, 120, reveal);
      let y = lerp(188, 50, reveal);
      let ly = lerp(40, 34, reveal);
      // orbit the rocket, module by module
      const o = seg(p, 0.3, 1);
      const s = dwell(o * 4, 0.3);
      if (o > 0) {
        const k = smooth(seg(o, 0, 0.12));
        th = lerp(th, th1 - s * TH_STEP, k);
        r = lerp(r, mobile ? 92 : 66, k);
        const i0 = Math.floor(s);
        const mh = lerp(MODULE_H[i0], MODULE_H[Math.min(4, i0 + 1)], s - i0);
        y = lerp(y, mh + 4, k);
        ly = lerp(ly, mh, k);
      }
      around(th, r, y, cam);
      padLocal(0, ly, 0, look);
      // the rocket stays centred on desktop (no sideways offset), so the
      // hand-off into the launch chapter has no jump
      if (mobile && o > 0) look.y -= 8;
      camera.up.copy(up);
      veil.a = 0;
      const step = Math.round(o * 4);
      // (the transmission card is fixed on screen now — no 3D anchor)
      return { step: o > 0 ? step : -1, alt: 0, phase: p < 0.3 ? 'Approach' : 'Transmissions' };
    },

    launch(p) {
      const orbitPhase = p >= 0.79;
      if (orbitPhase) return D.orbit(seg(p, 0.79, 1), true);
      show({ pad: 1, clouds: 1 });
      const above = smooth(seg(p, 0.6, 0.77));
      sky.state.dome = 1;
      sky.state.milky = 0;
      sky.state.stars = 0.35 + smooth(seg(p, 0.7, 0.79)) * 0.65;
      if (p < 0.76) sky.setDome(DOME.dusk, DOME.golden, above);
      else sky.setDome(DOME.golden, DOME.high, smooth(seg(p, 0.76, 0.79)));
      sky.domeU.uSunDir.value.set(-0.5, lerp(0.03, 0.1, above), -1);
      clouds.setColors(...COL.cloudDusk.map((c, i) => c.clone().lerp(COL.cloudGold[i], above)));
      clouds.opacity = 0.9;
      scene.fog.color.copy(COL.fogDusk);
      scene.fog.density = lerp(0.0016, 0.0008, smooth(seg(p, 0.5, 0.72)));

      const t = seg(p, 0.4, 0.8);
      const lift = 380 * Math.pow(t, 2.6);
      Object.assign(pad.state, {
        lights: 1,
        tower: 1,
        flood: 1,
        vent: 1 - smooth(seg(p, 0.22, 0.34)),
        ignite: smooth(seg(p, 0.12, 0.26)) * 0.35 + smooth(seg(p, 0.26, 0.4)) * 0.65,
        smoke: seg(p, 0.16, 0.62),
        lift,
        shake: reduced ? 0 : band(p, 0.24, 0.32, 0.46, 0.58),
      });
      shakeAmp = reduced ? 0 : band(p, 0.27, 0.35, 0.52, 0.64) * 0.55;

      // from the end of the transmissions to a low, wide hero angle
      const thEnd = TH1 - 4 * TH_STEP;
      const intro = smooth(seg(p, 0, 0.12));
      const th = lerp(thEnd, thEnd - 0.3, intro);
      const r = lerp(mobile ? 92 : 66, mobile ? 150 : 118, intro);
      const y = lerp(MODULE_H[4] + 4, 9, intro);
      around(th, r, y, cam);
      const rocketY = PLATFORM_H + lift + ROCKET_H * 0.5;
      const ly = lerp(MODULE_H[4], 40, intro);
      padLocal(0, Math.max(ly, lerp(ly, rocketY, smooth(seg(p, 0.38, 0.5)))), 0, look);
      // chase: rise with the rocket, below and beside it
      const chase = smooth(seg(p, 0.5, 0.64));
      if (chase > 0) {
        around(th - 0.25, lerp(r, 95, chase), lerp(y, PLATFORM_H + lift - 18, chase), tmp);
        cam.lerp(tmp, chase);
        padLocal(0, rocketY + 10, 0, tmp);
        look.lerp(tmp, chase);
      }
      camera.up.copy(up);
      veil.color.copy(COL.white);
      veil.a = band(p, 0.73, 0.785, 0.79, 0.84) * 0.96;
      const count = p < 0.4 ? `T − ${String(Math.max(0, Math.ceil(10 - p * 25))).padStart(2, '0')}` : `T + ${String(Math.floor((p - 0.4) * 300)).padStart(2, '0')}`;
      const phase = p < 0.12 ? 'Systems check' : p < 0.26 ? 'Engine start' : p < 0.4 ? 'Thrust' : p < 0.55 ? 'Liftoff' : 'Ascent';
      return { count, phase, alt: Math.round(lift * 1.8 * 0.08 * 10) / 10 };
    },

    /** o: 0..1 in the launch chapter's tail, then continues through the showreel */
    orbit(o, fromLaunch = false) {
      show({ earth: 1, orbit: 1, sun: 3.2, fill: 0.2 });
      sky.state.dome = 0;
      sky.state.milky = 0.85;
      sky.state.stars = 1;
      scene.fog.density = 0;
      clouds.opacity = 0;
      const n = nV.copy(earth.home).normalize();
      const north = northV.copy(up).addScaledVector(n, -up.dot(n)).normalize();
      const q = fromLaunch ? o : 1 + o;
      // rocket climbs away along the north tangent and outward
      const rp = new THREE.Vector3().copy(n).multiplyScalar(ER * (1.02 + 0.26 * Math.pow(q, 1.4))).addScaledVector(north, ER * (0.05 + 0.5 * Math.pow(q, 1.5)));
      const rp2 = new THREE.Vector3().copy(n).multiplyScalar(ER * (1.02 + 0.26 * Math.pow(q + 0.01, 1.4))).addScaledVector(north, ER * (0.05 + 0.5 * Math.pow(q + 0.01, 1.5)));
      orbit.position.copy(rp);
      orbit.quaternion.setFromUnitVectors(up, rp2.sub(rp).normalize());
      updateEngines(orbitEngines, 1, performance.now() / 1000);
      // camera behind and below, pulling away so the planet shrinks
      cam.copy(n).multiplyScalar(ER * (1.14 + 0.7 * q)).addScaledVector(north, -ER * lerp(0.16, 0.34, Math.min(1, q)));
      cam.x += ER * 0.12;
      look.copy(rp).lerp(tmp.set(0, 0, 0), 0.25 * Math.min(1, q));
      camera.up.copy(up);
      veil.color.copy(COL.white);
      veil.a = fromLaunch ? 1 - smooth(seg(o, 0, 0.16)) : 0;
      return { alt: Math.round(120 + q * 300), phase: fromLaunch ? 'Orbit insertion' : 'Low Earth orbit', count: fromLaunch ? `T + ${String(Math.floor(120 + o * 380)).padStart(3, '0')}` : null };
    },

    worlds(p) {
      show({ worlds: 1, sun: 3.2, fill: 0.25 });
      sky.state.dome = 0;
      sky.state.milky = 1;
      sky.state.stars = 1;
      scene.fog.density = 0;

      // six stops (0..5) + a short exit: after the moon's dwell the camera
      // drifts forward and pans away, so the moon slides off-screen. The exit
      // is kept short (and stretched up to the cut via HANDOFF) — flying a full
      // gap past the moon left a long stretch of empty, blank-looking space.
      const sr = p * WORLDS_SPAN;
      const s = sr < 5 ? dwell(sr, 0.3) : 5;
      const exit = smooth(seg(sr, 5.3, WORLDS_SPAN));

      // fly forward past the moon exactly like the camera flies past every
      // other planet (camera sits 44 / 56 units in front of each stop; it ends
      // ~10 beyond the moon at the cut). A sideways pan pushed the moon to the
      // screen edge, where perspective stretched it out of round.
      cosmos.worldsCamera(s + exit * ((mobile ? 54 : 66) / 170), cam, look);

      camera.up.copy(up);
      veil.a = 0;

      const step = clamp(Math.round(s), 0, 5);
      cosmos.updateWorlds(time, step);

      return { step, phase: exit > 0.05 ? 'Leaving the worlds' : `Planet ${pad2(step + 1)} / 06` };
    },

    galaxy(p) {
      show({ galaxy: 1 });
      sky.state.dome = 0;
      sky.state.milky = 0.6;
      sky.state.stars = 1;
      scene.fog.density = 0;
      const n = cosmos.frames.length;
      const sr = -1 + p * n;
      // the fly-in arrives at the first card early (by sr = -0.3), so it gets
      // the same lead-in hold that dwell() gives every other card
      const s = sr < 0 ? -1 + smoother(seg(sr + 1, 0, 0.7)) : dwell(sr, 0.3);
      cosmos.galaxyCamera(s, cam, look);
      camera.up.copy(up);
      veil.a = 0;
      const step = clamp(Math.round(sr), 0, n - 1);
      cosmos.updateGalaxy(time, camera, sr < -0.5 ? -1 : step, dpr);
      anchorPos.frame = cosmos.frameAnchor(step, new THREE.Vector3());
      return { step: sr < -0.5 ? -1 : step, phase: sr < -0.5 ? 'Entering the galaxy' : `Project ${pad2(step + 1)} / ${pad2(n)}` };
    },

    tools(p) {
      show({ net: 1 });
      sky.state.dome = 0;
      sky.state.milky = 0.7;
      sky.state.stars = 1;
      scene.fog.density = 0;
      const k = smooth(seg(p, 0, 0.75));
      // ends at z -45, exactly where the trinity camera starts (it used to end
      // at -55, so the camera jumped back 10 units at the hand-off)
      cam.set(Math.sin(p * 2.4) * 10 * (1 - k), Math.cos(p * 1.7) * 4 * (1 - k), lerp(45, -45, k));
      look.set(0, 0, lerp(-140, -150, k));
      camera.up.copy(up);
      cosmos.netScale = netFit();
      cosmos.updateNetwork(time, p, 0);
      veil.a = 0;
      return { phase: p < 0.5 ? 'Mapping the AI toolkit' : 'Tools in formation' };
    },

    trinity(p) {
      show({ net: 1 });
      sky.state.dome = 0;
      sky.state.milky = lerp(0.7, 0.35, p);
      sky.state.stars = 1;
      scene.fog.density = 0;
      cam.set(0, 0, lerp(-45, -68, smooth(p)));
      look.set(0, 0, -150);
      camera.up.copy(up).applyAxisAngle(tmp.set(0, 0, 1), Math.sin(p * Math.PI) * 0.04);
      cosmos.netScale = netFit();
      cosmos.updateNetwork(time, 1, p);
      for (let r = 0; r < 3; r++) anchorPos[`ring-${r}`] = cosmos.ringAnchor(r, new THREE.Vector3());
      anchorPos.core = new THREE.Vector3(0, 0, -150);
      veil.a = 0;
      return { phase: p < 0.5 ? 'Three forces aligning' : 'One creative core' };
    },

    deep(p, name) {
      show({});
      clouds.opacity = 0;

      sky.state.dome = 0;
      sky.state.milky = 0.85;
      sky.state.stars = 1;

      scene.fog.color.copy(COL.black);
      scene.fog.density = 0;
      const base = name === 'blog' ? 1.4 : 0.6;
      const yaw = base + p * 0.5;
      cam.set(0, 0, 0);
      look.set(Math.sin(yaw) * 10, Math.sin(p * 1.3) * 1.5 + (name === 'blog' ? -2 : 1), -Math.cos(yaw) * 10);
      camera.up.copy(up);
      veil.a = 0;
      const step = name === 'clients' ? clamp(Math.floor(p * 5), 0, 4) : -1;
      return { step, phase: name === 'clients' ? `Brand ${pad2(step + 1)} / 05` : 'Latest dispatches' };
    },

    logo(p, name) {
      show({ logo: 1 });
      const q = name === 'footer' ? 1 : p;
      sky.state.dome = 0;
      sky.state.milky = 0.85 * (1 - smooth(seg(q, 0.05, 0.45)));
      sky.state.stars = 1 - smooth(seg(q, 0.15, 0.55)) * 0.85;
      scene.fog.density = 0;
      // the mark stays centred — no lift on scroll; the footer simply comes in and the mark fades
      const lift = 0;
      const dist = mobile ? 44 : 32;
      cam.set(0, -lift, lerp(dist + 20, dist, smooth(seg(q, 0, 0.6))));
      look.set(0, -lift, 0);
      camera.up.copy(up);
      // fade the mark out over the last ~40vh of footer scroll so it never sits on the footer
      let fade = 1;
      const foot = sections.find((s) => s.name === 'footer');
      if (foot) {
        const y = window.__lenis ? window.__lenis.animatedScroll : window.scrollY;
        // the mark is centred, so clear it as soon as the footer enters:
        // fully shown while the footer's top is below the screen, gone by the time it reaches ~60%
        fade = smooth(clamp((foot.top - y - vh * 0.6) / (vh * 0.4)));
      }
      logo.update(time, q, dpr, fade);
      veil.a = 0;
      return { phase: q < 0.3 ? 'Collapse' : q < 0.95 ? 'Formation' : 'Transmission complete' };
    },
  };
  D.blog = (p) => D.deep(p, 'blog');
  D.clients = (p) => D.deep(p, 'clients');
  D.footer = (p) => D.logo(p, 'footer');
  D.showreel = (p) => D.orbit(p, false);

  /* ---------------- loop ---------------- */
  let time = 0;
  let last = performance.now();
  let frames = 0;
  let avg = 16;
  let raf = 0;
  let disposed = false;
  const NAMES = {
    earth: ['01', 'Earth'],
    clouds: ['02', 'Atmosphere'],
    pad: ['03', 'Launch complex'],
    launch: ['04', 'Launch'],
    showreel: ['05', 'Orbit'],
    worlds: ['06', 'Service worlds'],
    galaxy: ['07', 'Portfolio galaxy'],
    tools: ['08', 'AI constellation'],
    trinity: ['09', 'Human × AI × Story'],
    clients: ['10', 'Client signals'],
    blog: ['11', 'Field notes'],
    logo: ['12', 'Contenaissance'],
    footer: ['12', 'Contenaissance'],
  };

  const project = (v, out) => {
    tmp.copy(v).project(camera);
    // project against the canvas box (it may be taller than innerHeight)
    out.x = (tmp.x * 0.5 + 0.5) * cw;
    out.y = (-tmp.y * 0.5 + 0.5) * chh;
    out.v = tmp.z < 1 ? 1 : 0;
    return out;
  };
  const pt = { x: 0, y: 0, v: 0 };

  function frame(now) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += reduced ? dt * 0.3 : dt;
    avg += (dt * 1000 - avg) * 0.05;

    // adaptive resolution
    if (++frames % 90 === 0) {
      if (avg > 23 && dpr > minDpr) dpr = Math.max(Math.min(minDpr, maxDpr), dpr - 0.15);
      else if (avg < 14.5 && dpr < maxDpr) dpr = Math.min(maxDpr, dpr + 0.1);
      if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
    }

    const y = window.__lenis ? window.__lenis.animatedScroll : window.scrollY;
    // current section = last one whose top has passed the middle of the screen
    let cur = sections[0];
    for (const s of sections) if (s.top <= y + vh * 0.5) cur = s;
    if (!cur) return;
    const p = cur.sticky ? clamp((y - cur.top) / Math.max(1, cur.h - vh)) : clamp((y - cur.top + vh) / (cur.h + vh));
    // Sticky chapters clamp p at their edges, but the hand-off to the next one
    // happens half a screen later — a full screen of scroll where the camera
    // froze (clouds → pad). For those chapters the camera's progress is
    // stretched over that gap so only a short deliberate hold remains.
    let cp = p;
    const ho = HANDOFF[cur.name];
    if (ho && cur.sticky && !(ho.mobileOnly && !mobile)) {
      const span = cur.h - vh;
      const e = vh * (0.5 - (ho.hold ?? HOLD) * 0.5);
      if (ho.out !== undefined) {
        const y0 = cur.top + ho.out * span;
        if (y > y0) cp = lerp(ho.out, 1, clamp((y - y0) / (span + e - ho.out * span)));
      }
      if (ho.in !== undefined) {
        const y1 = cur.top + ho.in * span;
        if (y < y1) cp = lerp(0, ho.in, clamp((y - cur.top + e) / (y1 - cur.top + e)));
      }
    }
    const director = D[cur.name] || D[cur.mode] || D.deep;
    const info = director(cp, cur.name) || {};

    // tell chapters when they become current (videos only play in the current one)
    if (cur !== lastSection) {
      lastSection?.el.dispatchEvent(new CustomEvent('jactive', { detail: false }));
      cur.el.dispatchEvent(new CustomEvent('jactive', { detail: true }));
      lastSection = cur;
    }

    // cut detection
    const key = `${lastMode}>${cur.name}`;
    if (lastMode && cur.name !== lastMode && !CONTINUOUS.has(key) && !CONTINUOUS.has(`${cur.name}>${lastMode}`)) dip = 1;
    lastMode = cur.name;
    dip = Math.max(0, dip - dt * 2.4);

    // camera
    camera.position.copy(cam);
    if (shakeAmp > 0 && cur.name === 'launch') {
      camera.position.x += (Math.random() - 0.5) * shakeAmp;
      camera.position.y += (Math.random() - 0.5) * shakeAmp;
    }
    shakeAmp = 0;
    camera.lookAt(look);

    // parts
    sky.update(camera, time, dpr);
    earth.update(time, camera.position.length());
    clouds.update();
    if (pad.group.visible) pad.update(time);

    // veil (DOM, so it also covers the HTML layer edges)
    const va = Math.max(veil.a, dip * 0.9);
    if (veilEl) {
      const c = dip * 0.9 > veil.a ? COL.black : veil.color;
      veilEl.style.opacity = va.toFixed(3);
      veilEl.style.backgroundColor = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
    }

    // beats, anchors, steps for the current section and its neighbours
    for (const s of sections) {
      const near = s === cur || Math.abs(s.top - y) < vh * 1.5 || Math.abs(s.top + s.h - y - vh) < vh * 1.5;
      if (!near) continue;
      const sp = s === cur ? p : s.top > y ? 0 : 1;
      for (const b of s.beats) {
        const fin = b.a < 0 ? 1 : smooth(seg(sp, b.a, b.a + b.f));
        const fout = b.b > 1 ? 1 : 1 - smooth(seg(sp, b.b - b.f, b.b));
        const a = Math.round(fin * fout * 1000) / 1000;
        if (a === b.last) continue;
        b.last = a;
        const dir = fin < 1 ? 1 : -1;
        b.el.style.opacity = a;
        b.el.style.transform = a >= 1 ? 'none' : `translate3d(0, ${((1 - a) * 28 * dir).toFixed(1)}px, 0)`;
        b.el.style.visibility = a <= 0.002 ? 'hidden' : 'visible';
      }
    }
    for (const a of cur.anchors) {
      const v = anchorPos[a.key];
      if (!v) continue;
      project(v, pt);
      const x = Math.round(pt.x * 10) / 10;
      const yy = Math.round(pt.y * 10) / 10;
      if (x !== a.lx || yy !== a.ly) {
        a.el.style.transform = `translate3d(${x}px, ${yy}px, 0)`;
        a.lx = x;
        a.ly = yy;
      }
      if (pt.v !== a.lv) {
        a.el.style.visibility = pt.v ? 'visible' : 'hidden';
        a.lv = pt.v;
      }
    }
    if (info.step !== undefined && info.step !== cur.step) {
      cur.step = info.step;
      cur.el.dispatchEvent(new CustomEvent('jstep', { detail: info.step }));
    }

    // HUD
    const nm = NAMES[cur.name] || ['', ''];
    hudText('chapter', nm[0]);
    hudText('name', nm[1]);
    if (info.phase) hudText('phase', info.phase);
    hudText('alt', info.alt !== undefined ? ` · ALT ${info.alt} km` : '');
    if (info.count) hudText('count', info.count);
    if (info.count) hudText('lphase', info.phase);
    if (hud.box) {
      // hide as soon as any part of the footer (its first block is the
      // "Stay in orbit" banner) is on screen — not only once it's the current
      // chapter, which happens half a screen later
      const foot = sections.find((s) => s.name === 'footer');
      const footInView = foot && foot.top < y + vh;
      const hide = footInView || cur.name === 'footer' || cur.name === 'blog' ? '0' : '';
      if (hud.box.style.opacity !== hide) {
        // fade out quickly (no delay) so it's gone before the banner reaches
        // it; fade back in with the stylesheet's slower transition
        hud.box.style.transition = hide ? 'opacity 0.3s' : '';
        hud.box.style.opacity = hide;
      }
    }
    if (hud.bar) {
      const total = document.documentElement.scrollHeight - vh;
      const gp = clamp(y / Math.max(1, total));
      hud.bar.style.transform = `scaleY(${gp.toFixed(4)})`;
    }
    onProgress?.(cur.name, p);

    renderer.render(scene, camera);

    if (readyAt < 0 && earthReady()) {
      readyAt = time;
      requestAnimationFrame(() => window.dispatchEvent(new Event('journey:ready')));
    }
    introE = readyAt < 0 ? 0 : reduced ? 1 : 1 - Math.pow(1 - clamp((time - readyAt - 0.35) / 2.6), 3);
  }

  // Lenis drives the frame when present (so scroll and render share a tick);
  // otherwise (reduced motion, Lenis disabled) we run our own loop
  const own = (now) => {
    raf = requestAnimationFrame(own);
    if (window.__lenis && window.__journeyFrameSeen > now - 100) return;
    frame(now);
  };
  window.__journeyFrame = (now) => {
    window.__journeyFrameSeen = now;
    frame(now);
  };
  raf = requestAnimationFrame(own);

  // warm the shader cache with every part visible once
  const warm = () => {
    const vis = [earth.group, clouds.group, pad.group, cosmos.worlds, cosmos.galaxy, cosmos.net, logo.group, orbit].map((g) => g.visible);
    [earth.group, clouds.group, pad.group, cosmos.worlds, cosmos.galaxy, cosmos.net, logo.group, orbit].forEach((g) => (g.visible = true));
    const done = () => [earth.group, clouds.group, pad.group, cosmos.worlds, cosmos.galaxy, cosmos.net, logo.group, orbit].forEach((g, i) => (g.visible = vis[i]));
    if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(done, done);
    else {
      renderer.compile(scene, camera);
      done();
    }
  };
  setTimeout(warm, 300);

  if (window.location.search.includes("debug")) window.__journey = { scene, renderer, sky, earth, clouds, pad, cosmos, logo, info: () => ({ dpr, avg, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }) };

  return {
    measure,
    renderer,
    dispose() {
      disposed = true;
      clearTimeout(pad.loadTimer);
      cancelAnimationFrame(raf);
      window.__journeyFrame = null;
      ro.disconnect();
      cro.disconnect();
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      dprMq?.removeEventListener('change', onDpr);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) [].concat(o.material).forEach((m) => m.dispose());
      });
      env.dispose();
      pmrem.dispose();
      disposeTextures();
      renderer.dispose();
    },
  };
}
