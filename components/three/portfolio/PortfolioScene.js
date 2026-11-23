import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
  CURSOR_LIGHT,
  CURSOR_POWER,
  makeStudioEnvironment,
  createImageCache,
  makeBackdrop,
  makeBokehDust,
  makeIris,
  makeShockwave,
  makeObsidianOrb,
  disposeObject,
  disposeGlowCache,
  setFade,
} from './objects';
import { heroSet, reelSet, archiveSet, eclipseSet, stagesSet, quoteSet, ctaSet } from './sets';
import { createConstellation, createCtaOrbit, screenToHud, hudUnitsPerPx } from './hud';

/* =====================================================
   PORTFOLIO SCENE — "Gilded Atelier".

   Not a journey through space: every section is its own
   chamber, staged around the same origin and seen from one
   resting camera. Between sections the camera performs an
   APERTURE CUT — it dolly-zooms forward (push-in while the
   field of view widens), rolls slightly, the lens racks out
   of focus and a gold-edged iris closes; at the moment of
   tightest closure the next chamber is swapped in, then the
   iris opens as the camera settles. The DOM (all copy,
   cards, buttons) always stays on top and untouched.

   Inputs (from PortfolioCanvas): fractional section index
   via setProgress, per-section scrub values via setLocal,
   cursor via setPointer, hover ids via hover().
===================================================== */

// Long lens: a narrow field of view keeps spheres round at the frame
// edges; the camera sits further back so framing matches Figma.
const DIST = 16;
const DRIFT = 0.2; // must match PortfolioCanvas
const DOLLY = 9;
const FOV_PUNCH = 22;

const LOOK = { marquee: [0, -0.8] };

const FACTORIES = {
  hero: heroSet,
  reel: reelSet,
  archive: archiveSet,
  marquee: eclipseSet,
  stages: stagesSet,
  quote: quoteSet,
  cta: ctaSet,
};

// Backdrop light pools per chamber (uv position, radius, strength) —
// sampled from the Figma frames.
const PALETTES = {
  hero: { base: '#090605', a: [0.16, 0.72, 0.42, 0.55], ca: '#6b3e12', b: [0.96, 0.08, 0.5, 0.7], cb: '#7a3510' },
  reel: { base: '#080605', a: [1.02, 0.78, 0.4, 0.55], cb: '#3a1c0a', ca: '#6a4116', b: [-0.05, 0.3, 0.35, 0.35] },
  archive: { base: '#0a0806', a: [0.62, 0.92, 0.5, 0.28], ca: '#3a2410', b: [0.85, 0.15, 0.4, 0.3], cb: '#3a2410' },
  marquee: { base: '#0a0706', a: [0.5, 1.0, 0.6, 0.6], ca: '#5a3814', b: [0.75, 0.35, 0.3, 0.3], cb: '#4a2c10' },
  stages: { base: '#0a0807', a: [0.85, 0.9, 0.4, 0.22], ca: '#2e1e0e', b: [0.2, 0.1, 0.4, 0.18], cb: '#24170b' },
  quote: { base: '#090706', a: [0.68, 0.32, 0.4, 0.5], ca: '#4a2c12', b: [0.9, 0.12, 0.25, 0.35], cb: '#4a1608' },
  cta: { base: '#090706', a: [0.62, 1.0, 0.5, 0.4], ca: '#3e2a12', b: [0.15, 0.1, 0.4, 0.15], cb: '#24170b' },
};

const VignetteGrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.04 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAmount;
    varying vec2 vUv;
    float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb += (rnd(vUv * 900.0 + uTime) - 0.5) * uAmount;
      gl_FragColor = c;
    }
  `,
};

// Radial zoom blur + chromatic split, driven by the aperture cut.
const LensShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 }, uCA: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount, uCA;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      vec3 acc = vec3(0.0);
      float tot = 0.0;
      for (int i = 0; i < 12; i++) {
        float t = float(i) / 11.0;
        float sc = 1.0 - uAmount * t;
        float w = 1.0 - t * 0.6;
        acc.r += texture2D(tDiffuse, 0.5 + dir * sc * (1.0 + uCA)).r * w;
        acc.g += texture2D(tDiffuse, 0.5 + dir * sc).g * w;
        acc.b += texture2D(tDiffuse, 0.5 + dir * sc * (1.0 - uCA)).b * w;
        tot += w;
      }
      gl_FragColor = vec4(acc / tot, 1.0);
    }
  `,
};

const ease = (x) => x * x * (3 - 2 * x);
const smoothstep = (a, b, x) => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export function createPortfolioScene(container, { stations, mobile = false, heroCards = [], onSelect } = {}) {
  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
  renderer.setClearColor(0x070504, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070504, 0.009);
  const envRT = makeStudioEnvironment(renderer);
  scene.environment = envRT.texture;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  scene.add(camera);

  scene.add(new THREE.AmbientLight(0xfff1dc, 0.1));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.2);
  key.position.set(-0.6, 0.6, 0.6).multiplyScalar(40);
  scene.add(key);
  // The cursor is a moving key light.
  const cursorLight = new THREE.PointLight(0xffd9a0, 0, 16, 1.4);
  scene.add(cursorLight);

  const backdrop = makeBackdrop();
  scene.add(backdrop);
  const dust = makeBokehDust(mobile ? 160 : 380, { x: 16, y: 10, zMin: -30, zMax: 6 });
  scene.add(dust);

  const images = createImageCache();

  /* ---------- HUD pass: fixed camera, locked to the DOM ---------- */
  const hud = new THREE.Scene();
  const hudCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  hud.add(hudCam);
  const iris = makeIris();
  hud.add(iris);

  const waves = Array.from({ length: 4 }, () => {
    const w = makeShockwave();
    scene.add(w);
    return { mesh: w, life: 1 };
  });

  /* ---------- chambers ---------- */
  const ctx = {
    images,
    mobile,
    DIST,
    visW: 16,
    visH: 9,
    place(fx, fy, depth = 0) {
      const k = (DIST + depth) / DIST;
      return new THREE.Vector3((fx * ctx.visW * k) / 2, (fy * ctx.visH * k) / 2, -depth);
    },
  };

  const sets = stations.map((name, i) => ({ name, index: i, api: null, group: null, enter: 0 }));

  function buildSet(s) {
    const factory = FACTORIES[s.name];
    if (!factory) return;
    s.api = factory(ctx, { cards: heroCards });
    s.group = s.api.group;
    s.group.visible = false;
    scene.add(s.group);
    s.api.layout();
  }

  /* ---------- DOM-locked constellations & CTA orbit ---------- */
  const viewport = { w: 1, h: 1 };
  const rectOf = (el) => (el ? el.getBoundingClientRect() : null);
  const onScreen = (r) => r && r.bottom > -40 && r.top < viewport.h + 40 && r.height > 0;

  const archiveConst = createConstellation({
    maxNodes: 32,
    maxEdges: 60,
    getNodes() {
      const cards = document.querySelectorAll('.pf-archive .pf-card:not(.is-hidden) .pf-card__media');
      const out = [];
      const mid = viewport.w / 2;
      cards.forEach((media) => {
        const r = media.getBoundingClientRect();
        if (!r.width) return;
        const id = media.closest('[data-star]')?.dataset.star;
        const left = r.left + r.width / 2 < mid;
        out.push({ x: left ? r.left - 34 : r.right + 34, y: r.top - 34, id, group: id });
        out.push({ x: left ? r.right + 16 : r.left - 16, y: r.bottom + 72, id, group: id, size: 0.7 });
      });
      return out.slice(0, 32);
    },
    getEdges(nodes) {
      const e = [];
      for (let i = 0; i < nodes.length; i += 2) {
        if (nodes[i + 1]) e.push([i, i + 1, 0.8]);
        if (nodes[i + 2]) e.push([i, i + 2, 1]);
        if (nodes[i + 3]) e.push([i + 1, i + 2, 0.6]);
      }
      return e;
    },
  });

  const stagesConst = createConstellation({
    maxNodes: 12,
    maxEdges: 16,
    getNodes() {
      const all = [...document.querySelectorAll('.pf-stages .pf-stage')];
      const grid = document.querySelector('.pf-stages__grid');
      if (!all.length || !grid) return [];
      const firstTop = all[0].getBoundingClientRect().top;
      const cols = all.filter((c) => Math.abs(c.getBoundingClientRect().top - firstTop) < 4);
      if (cols.length < 2) return [];
      const g = grid.getBoundingClientRect();
      const out = [{ x: g.left - 30, y: g.top - 40, group: null, size: 0.6 }];
      cols.forEach((col, i) => {
        const r = col.getBoundingClientRect();
        const id = col.dataset.star;
        out.push({ x: r.left + r.width * 0.6, y: g.top - (i % 2 ? 24 : 70), group: id, size: 1.1 });
        out.push({ x: r.left + r.width * 0.97, y: g.top - (i % 2 ? 66 : 30), group: id, size: 0.55 });
      });
      out.push({ x: g.right + 40, y: g.top - 90, group: null, size: 0.8 });
      return out;
    },
    getEdges(nodes) {
      const e = [];
      for (let i = 0; i < nodes.length - 1; i++) e.push([i, i + 1, 1]);
      return e;
    },
  });

  const ctaMoon = makeObsidianOrb({ segments: mobile ? 24 : 48, tint: '#c9c0b0', rim: '#efe0c4', rimStrength: 0.6, key: new THREE.Vector3(0.5, 0.6, 0.6) });
  const ctaOrbit = createCtaOrbit(ctaMoon);
  // Smoked-glass moon locked beside the archive heading (Figma 3.png).
  const archiveMoon = makeObsidianOrb({ segments: mobile ? 32 : 64, tint: '#8fa6a0', rim: '#b9cfc8', rimStrength: 0.6, key: new THREE.Vector3(0.4, 0.5, 0.75) });
  archiveMoon.visible = false;
  hudCam.add(archiveConst.group, stagesConst.group, ctaOrbit.group, archiveMoon);
  hud.add(new THREE.AmbientLight(0xffffff, 0.4));

  /* ---------- post-processing (desktop) ---------- */
  let composer = null;
  let grainPass = null;
  let lensPass = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const hudPass = new RenderPass(hud, hudCam);
    hudPass.clear = false;
    hudPass.clearDepth = true;
    composer.addPass(hudPass);
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.6, 0.76));
    lensPass = new ShaderPass(LensShader);
    lensPass.enabled = false;
    composer.addPass(lensPass);
    composer.addPass(new OutputPass());
    grainPass = new ShaderPass(VignetteGrainShader);
    composer.addPass(grainPass);
  } else {
    renderer.autoClear = false;
  }

  /* ---------- state ---------- */
  const state = {
    pos: 0,
    posS: 0,
    local: {},
    pointer: { x: 0, y: 0, sx: 0, sy: 0, active: false },
    domHover: null,
    rayHover: null,
    filterX: 0,
    filterTarget: 0,
    ctaBoost: 0,
    archiveI: 0,
    stagesI: 0,
    cur: 0,
    palette: null,
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const cursorRay = { o: new THREE.Vector3(), d: new THREE.Vector3() };
  const cursorPoint = new THREE.Vector3(0, 0, 2);
  const cursorTarget = new THREE.Vector3(0, 0, 2);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2);
  let rayDirty = false;

  /* ---------- palette blending ---------- */
  const pal = {
    base: new THREE.Color(),
    a: new THREE.Vector4(),
    ca: new THREE.Color(),
    b: new THREE.Vector4(),
    cb: new THREE.Color(),
  };
  const palTarget = { base: new THREE.Color(), a: new THREE.Vector4(), ca: new THREE.Color(), b: new THREE.Vector4(), cb: new THREE.Color() };
  function setPaletteTarget(name, snap = false) {
    const p = PALETTES[name] || PALETTES.hero;
    palTarget.base.set(p.base);
    palTarget.a.set(...p.a);
    palTarget.ca.set(p.ca);
    palTarget.b.set(...p.b);
    palTarget.cb.set(p.cb);
    if (snap) {
      pal.base.copy(palTarget.base);
      pal.a.copy(palTarget.a);
      pal.ca.copy(palTarget.ca);
      pal.b.copy(palTarget.b);
      pal.cb.copy(palTarget.cb);
    }
  }
  setPaletteTarget(stations[0], true);

  /* ---------- hero card hover video ---------- */
  let hoverVideo = null;

  function stopHoverVideo() {
    if (!hoverVideo) return;
    const { mesh, el, tex } = hoverVideo;
    el.pause();
    el.removeAttribute('src');
    el.load();
    mesh.userData.material.uniforms.map.value = mesh.userData.imageTex;
    mesh.userData.fitted = mesh.userData.fit();
    tex?.dispose();
    hoverVideo = null;
  }

  function startHoverVideo(mesh) {
    if (hoverVideo?.mesh === mesh) return;
    stopHoverVideo();
    const src = mesh.userData.card?.video?.preview;
    if (!src) return;
    const el = document.createElement('video');
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.crossOrigin = 'anonymous';
    el.src = src;
    const entry = { mesh, el, tex: null };
    hoverVideo = entry;
    el.addEventListener(
      'loadeddata',
      () => {
        if (hoverVideo !== entry) return;
        entry.tex = new THREE.VideoTexture(el);
        entry.tex.colorSpace = THREE.SRGBColorSpace;
        mesh.userData.material.uniforms.map.value = entry.tex;
        mesh.userData.fitted = mesh.userData.fit();
      },
      { once: true }
    );
    el.play().catch(() => {});
  }

  /* ---------- resize ---------- */
  let baseFov = 34;
  const buf = new THREE.Vector2();
  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    viewport.w = w;
    viewport.h = h;
    baseFov = w / h < 0.8 ? 50 : 34;
    for (const cam of [camera, hudCam]) {
      cam.aspect = w / h;
      cam.fov = baseFov;
      cam.updateProjectionMatrix();
    }
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    composer?.setPixelRatio(renderer.getPixelRatio());
    renderer.getDrawingBufferSize(buf);
    backdrop.userData.material.uniforms.uRes.value.copy(buf);
    iris.userData.material.uniforms.uRes.value.copy(buf);

    ctx.visH = 2 * DIST * Math.tan(THREE.MathUtils.degToRad(baseFov / 2));
    ctx.visW = ctx.visH * camera.aspect;
    sets.forEach((s) => s.api?.layout());
  }
  resize();

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let elapsed = 0;
  let running = true;
  let active = true;

  const heroOf = () => sets.find((s) => s.name === 'hero');
  const cut = { c: 0, d: 0, i: 0 };

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const t = elapsed;
    const n = stations.length;

    state.posS = damp(state.posS, state.pos, 5, dt);
    const pt = state.pointer;
    pt.sx = damp(pt.sx, pt.x, 3, dt);
    pt.sy = damp(pt.sy, pt.y, 3, dt);
    state.filterX = damp(state.filterX, state.filterTarget, 2.2, dt);

    /* --- where are we: dwell inside a chamber, or mid aperture cut? --- */
    const p = Math.min(Math.max(state.posS, 0), n - 1);
    const i = Math.floor(p);
    const f = p - i;
    let cur = i;
    let c = 0;
    let d = 0;
    let dwell = Math.min(1, f / DRIFT);
    if (i < n - 1 && f > DRIFT) {
      d = (f - DRIFT) / (1 - DRIFT);
      c = d < 0.5 ? ease(d * 2) : ease((1 - d) * 2);
      cur = d < 0.5 ? i : i + 1;
      dwell = d < 0.5 ? 1 : 0;
    }
    cut.c = c;
    cut.d = d;
    cut.i = i;
    if (cur !== state.cur) {
      state.cur = cur;
      setPaletteTarget(stations[cur]);
    }
    const curName = stations[cur];

    /* --- camera: dolly-zoom + roll through the cut --- */
    const heroPush = curName === 'hero' ? 10 * ease(Math.min(1, state.local.hero || 0)) : 0;
    const dir = d < 0.5 ? -1 : 1;
    const z = DIST - dwell * 0.9 - heroPush + dir * c * DOLLY;
    const look = LOOK[curName] || [0, 0];
    const cx = pt.sx * 0.6 + state.filterX;
    const cy = pt.sy * 0.35;
    camera.position.set(cx, cy, z);
    camera.lookAt(look[0] + pt.sx * 0.12 + state.filterX * 0.6, look[1] + pt.sy * 0.08, z - DIST);
    camera.rotateZ(c * 0.2 * (i % 2 ? 1 : -1) + (state.pos - state.posS) * -0.05);
    camera.fov = baseFov + c * FOV_PUNCH;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    /* --- cursor light: ray → plane in front of the chamber --- */
    raycaster.setFromCamera(ndc, camera);
    cursorRay.o.copy(raycaster.ray.origin);
    cursorRay.d.copy(raycaster.ray.direction);
    if (raycaster.ray.intersectPlane(plane, cursorTarget) && z > 3) cursorPoint.lerp(cursorTarget, 1 - Math.exp(-dt * 9));
    CURSOR_LIGHT.value.copy(cursorPoint);
    CURSOR_POWER.value = damp(CURSOR_POWER.value, pt.active ? 1 - c : 0, 3, dt);
    cursorLight.position.copy(cursorPoint);
    cursorLight.intensity = CURSOR_POWER.value * 28;

    /* --- chambers --- */
    const hoverId = state.domHover ?? state.rayHover;
    const fade = 1 - 0.8 * smoothstep(0.5, 1, c);
    for (const s of sets) {
      if (!s.api && Math.abs(p - s.index) < 1.6) buildSet(s);
      if (!s.api) continue;
      const on = s.index === cur;
      s.group.visible = on;
      s.enter = on ? damp(s.enter, 1, 2.2, dt) : 0;
      if (!on) continue;
      if (Math.abs(fade - (s.fade ?? -1)) > 0.002) {
        setFade(s.group, fade);
        s.fade = fade;
      }
      s.api.update({
        t,
        dt,
        local: state.local,
        hoverId,
        camera,
        fade,
        enter: s.enter,
        pointer: pt,
        cursorRay,
        cursorPower: CURSOR_POWER.value,
      });
    }

    /* --- hero cards: raycast hover + hover video --- */
    const hero = heroOf();
    const heroLive = hero?.api && hero.group.visible && c < 0.3;
    if (rayDirty && heroLive) {
      rayDirty = false;
      const hit = raycaster.intersectObjects(hero.api.cards, false)[0];
      state.rayHover = hit?.object.userData.id ?? null;
    } else if (!heroLive) {
      state.rayHover = null;
    }
    const heroHover = hero?.api?.cards.find((m) => m.userData.id === (state.domHover ?? state.rayHover));
    if (heroHover && !mobile) startHoverVideo(heroHover);
    else if (hoverVideo) stopHoverVideo();

    /* --- shockwaves --- */
    for (const w of waves) {
      if (w.life >= 1) {
        w.mesh.visible = false;
        continue;
      }
      w.life = Math.min(1, w.life + dt / 1.3);
      w.mesh.visible = true;
      w.mesh.quaternion.copy(camera.quaternion);
      w.mesh.scale.setScalar(0.5 + w.life * 7);
      w.mesh.userData.material.uniforms.uLife.value = w.life;
    }

    /* --- atelier backdrop + lens dust --- */
    const kp = 1 - Math.exp(-dt * 2.5);
    pal.base.lerp(palTarget.base, kp);
    pal.a.lerp(palTarget.a, kp);
    pal.ca.lerp(palTarget.ca, kp);
    pal.b.lerp(palTarget.b, kp);
    pal.cb.lerp(palTarget.cb, kp);
    const bu = backdrop.userData.material.uniforms;
    bu.uTime.value = t;
    bu.uBase.value.copy(pal.base);
    bu.uPoolA.value.copy(pal.a);
    bu.uColA.value.copy(pal.ca);
    bu.uPoolB.value.copy(pal.b);
    bu.uColB.value.copy(pal.cb);
    bu.uShift.value.set(pt.sx * 1.5 + c * dir * 2, pt.sy * 1.0);
    bu.uDim.value = c * 0.45;

    const du = dust.userData.material.uniforms;
    du.uTime.value = t;
    du.uFocus.value = Math.max(2, z) * (1 - c * 0.75);
    du.uAperture.value = 0.05 + c * 0.55;

    /* --- aperture iris + lens --- */
    const iu = iris.userData.material.uniforms;
    iu.uClose.value = c;
    iu.uSpin.value = c * 1.1 + i * 0.7;
    iu.uTime.value = t;
    iu.uLight.value.set(pt.sx * hudCam.aspect, pt.sy);
    if (lensPass) {
      lensPass.enabled = c > 0.004;
      lensPass.uniforms.uAmount.value = c * 0.14;
      lensPass.uniforms.uCA.value = c * 0.012;
    }

    /* --- DOM-locked HUD --- */
    const w = viewport.w;
    const h = viewport.h;
    const archiveOn = onScreen(rectOf(document.querySelector('.pf-archive'))) ? 1 : 0;
    const stagesOn = onScreen(rectOf(document.querySelector('.pf-stages'))) ? 1 : 0;
    state.archiveI = damp(state.archiveI, archiveOn, 4, dt);
    state.stagesI = damp(state.stagesI, stagesOn, 4, dt);
    archiveConst.group.visible = state.archiveI > 0.01;
    stagesConst.group.visible = state.stagesI > 0.01;
    if (archiveConst.group.visible) archiveConst.update(hudCam, w, h, dt, hoverId, state.archiveI);
    if (stagesConst.group.visible) stagesConst.update(hudCam, w, h, dt, hoverId, state.stagesI);

    const headRect = rectOf(document.querySelector('.pf-archive__head'));
    archiveMoon.visible = onScreen(headRect) && viewport.w > 760;
    if (archiveMoon.visible) {
      screenToHud(hudCam, w, h, headRect.left + headRect.width * 0.6, headRect.top + headRect.height * 0.05 - 30, archiveMoon.position);
      archiveMoon.scale.setScalar(hudUnitsPerPx(hudCam, h) * Math.min(56, w * 0.03));
      archiveMoon.rotation.y += dt * 0.05;
      archiveMoon.rotation.x = damp(archiveMoon.rotation.x, pt.sy * 0.4, 2, dt);
      archiveMoon.userData.tick(t);
      archiveMoon.userData.material.uniforms.uHot.value = damp(archiveMoon.userData.material.uniforms.uHot.value, hoverId ? 0.6 : 0, 4, dt);
    }

    const orbitRect = rectOf(document.querySelector('.pf-cta__orbit'));
    state.ctaBoost = damp(state.ctaBoost, hoverId === 'cta' ? 1 : 0, 4, dt);
    ctaOrbit.update(hudCam, w, h, dt, t, onScreen(orbitRect) ? orbitRect : null, {
      boost: state.ctaBoost,
      px: pt.sx,
      py: pt.sy,
      visible: 1,
    });

    if (composer) {
      grainPass.uniforms.uTime.value = t;
      composer.render(dt);
    } else {
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(hud, hudCam);
    }
  }

  const syncLoop = () => {
    const on = running && active && !document.hidden;
    renderer.setAnimationLoop(on ? frame : null);
    if (on) clock.getDelta();
  };
  const onVisibility = () => syncLoop();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);
  syncLoop();

  /* ---------- API ---------- */
  return {
    setProgress(p) {
      state.pos = p;
    },
    setLocal(name, v) {
      state.local[name] = v;
    },
    setPointer(nx, ny) {
      state.pointer.x = nx;
      state.pointer.y = ny;
      state.pointer.active = true;
      ndc.set(nx, ny);
      rayDirty = true;
    },
    pointerLeave() {
      state.pointer.active = false;
    },
    hover(id) {
      state.domHover = id;
    },
    getRayHover() {
      return state.domHover ? null : state.rayHover;
    },
    // Any click: a gold shockwave from the cursor; the hero shards scatter.
    // Returns true when the click landed on a 3D hero card (opens it).
    click({ onHero = false } = {}) {
      // Spawn exactly under the click (the cursor light itself is damped).
      raycaster.setFromCamera(ndc, camera);
      cursorRay.o.copy(raycaster.ray.origin);
      cursorRay.d.copy(raycaster.ray.direction);
      if (cut.c < 0.5 && camera.position.z > 3 && raycaster.ray.intersectPlane(plane, cursorTarget)) {
        const w = waves.reduce((a, b) => (b.life > a.life ? b : a));
        w.life = 0;
        w.mesh.position.copy(cursorTarget);
      }
      const hero = heroOf();
      if (hero?.api?.group.visible) hero.api.burst(cursorRay);
      if (!onHero || !hero?.api?.group.visible || cut.c > 0.3) return false;
      // Raycast now: the click may arrive before the next frame's hover pass.
      raycaster.setFromCamera(ndc, camera);
      const id = raycaster.intersectObjects(hero.api.cards, false)[0]?.object.userData.id ?? null;
      const card = id && heroCards.find((c) => c.id === id);
      if (!card) return false;
      const mesh = hero.api.cards.find((m) => m.userData.id === id);
      if (mesh) mesh.userData.launch = 1;
      setTimeout(() => onSelect?.(card), 380);
      return true;
    },
    setFilter(cat) {
      const order = ['all', 'brand', 'commercial', 'music', 'social', 'concept'];
      const i = Math.max(0, order.indexOf(cat));
      state.filterTarget = i === 0 ? 0 : (i - 2.5) * 0.35;
    },
    setActive(on) {
      active = on;
      syncLoop();
    },
    resize,
    destroy() {
      running = false;
      renderer.setAnimationLoop(null);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      stopHoverVideo();
      disposeObject(scene); // includes every built chamber
      disposeObject(hud);
      composer?.dispose();
      envRT.dispose();
      images.dispose();
      disposeGlowCache();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    },
  };
}
