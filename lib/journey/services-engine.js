import * as THREE from 'three';
import { Sky } from './sky';
import { SolarSystem, SYSTEM } from './services-system';
import { clamp, lerp, seg, smooth, smoother, setTextureUpload, disposeTextures } from './util';

/* =====================================================
   SERVICES JOURNEY ENGINE
   Same contract as the home engine (lib/journey/engine.js):
   - chapters are [data-ch] sections; sticky ones have a
     100vh stage, and [data-in]/[data-out] beats fade from
     the chapter's scroll progress
   - [data-anchor] elements are pinned to 3D points
   - 'jstep' / 'jactive' events tell React what is current
   - the HUD (data-hud) gets chapter / phase text
   Unlike home, the camera here runs on ONE timeline over
   the whole page scroll (holds at each world, flights in
   between), so there is never a frozen stretch between
   chapters: overview → dive → six worlds → pull back.
===================================================== */

const UP = new THREE.Vector3(0, 1, 0);
const pad2 = (i) => String(i).padStart(2, '0');

export function createServicesJourney({ canvas, root, mobile, reduced, names = [] }) {
  /* ---------------- renderer ---------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch {
    return null;
  }
  const maxBuf = renderer.capabilities.maxTextureSize || 8192;
  const DPR_CAP = mobile ? 2 : 2.5;
  const minDpr = 1;
  const targetDpr = () => {
    const fit = maxBuf / Math.max(window.innerWidth, window.innerHeight, 1);
    return Math.max(1, Math.min(window.devicePixelRatio || 1, DPR_CAP, fit));
  };
  let maxDpr = targetDpr();
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);
  setTextureUpload((t) => renderer.initTexture(t));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);

  /* ---------------- world ---------------- */
  const sky = new Sky({ mobile });
  sky.state.stars = 1;
  sky.state.milky = 0.55;
  sky.state.dome = 0;
  const sys = new SolarSystem({ mobile });
  scene.add(sky.group, sys.group);

  /* ---------------- sections ---------------- */
  let sections = [];
  let vh = window.innerHeight;
  let timeline = [];
  const measure = () => {
    vh = window.innerHeight;
    const y = window.scrollY;
    sections = [...root.querySelectorAll('[data-ch]')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        el,
        name: el.dataset.ch,
        top: r.top + y,
        h: el.offsetHeight,
        sticky: el.offsetHeight > vh * 1.05,
        beats: [...el.querySelectorAll('[data-in]')].map((b) => ({ el: b, a: parseFloat(b.dataset.in), b: parseFloat(b.dataset.out ?? '9'), f: parseFloat(b.dataset.f ?? '0.06'), last: -1 })),
        anchors: [...el.querySelectorAll('[data-anchor]')].map((a) => ({ el: a, key: a.dataset.anchor, lx: -1, ly: -1, lv: -1, lr: -1 })),
        progress: [...el.querySelectorAll('[data-progress]')],
        step: -2,
      };
    });
    buildTimeline();
  };

  let cw = window.innerWidth;
  let chh = window.innerHeight;
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    cw = w;
    chh = h;
    const t = targetDpr();
    if (Math.abs(t - maxDpr) > 0.01) {
      maxDpr = t;
      dpr = t;
      renderer.setPixelRatio(dpr);
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 56 : w / h < 1.2 ? 48 : 40;
    camera.updateProjectionMatrix();
    measure();
  };
  resize();
  const ro = new ResizeObserver(() => measure());
  ro.observe(root);
  const cro = new ResizeObserver(() => {
    if (canvas.clientWidth !== cw || canvas.clientHeight !== chh) resize();
  });
  cro.observe(canvas);
  window.addEventListener('resize', resize);

  // hovering a world's showcase turns the planet a little and swells the light
  const onHover = (e) => (sys.hover = e.detail ?? -1);
  window.addEventListener('sv:hover', onHover);

  /* ---------------- camera poses ----------------
     a pose = where the camera is, what it looks at, how far the
     subject is pushed off-centre (sx/sy, fraction of the screen,
     via setViewOffset so there is no perspective skew) and how
     much of the disc / orbit rings / sun glow is shown */
  const narrow = () => cw < 761;
  const makePose = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), sx: 0, sy: 0, disc: 1, rings: 0, glow: 1, planets: 1, milky: 0.55, focus: -1 });
  const PA = makePose();
  const PB = makePose();
  const tmp = new THREE.Vector3();

  const POSES = {
    overview(u, o) {
      const phi = -0.32 + u * 0.3;
      if (narrow()) {
        // phones: the system sits in the upper half, the hero copy below it
        o.pos.set(0, 300, 600).applyAxisAngle(UP, phi);
        o.sx = 0;
        o.sy = 0.2;
      } else {
        o.pos.set(0, 150, 420).applyAxisAngle(UP, phi);
        o.sx = 0.21;
        o.sy = -0.06;
      }
      o.look.set(0, -4, 0);
      o.disc = 1;
      o.rings = 1;
      o.glow = 1;
      o.planets = 1;
      o.milky = 0.55;
      o.focus = -1;
      return o;
    },
    planet(i, u, o) {
      const P = sys.planetPos(i);
      const r = SYSTEM[i].r;
      const side = i % 2 === 0 ? 1 : -1; // even: world on the right, copy on the left
      // look from the sun's side, swung round so a crescent of night shows
      tmp.copy(P).multiplyScalar(-1).setY(0).normalize();
      tmp.applyAxisAngle(UP, side * ((SYSTEM[i].swing ?? 0.85) + u * 0.16));
      const d = r * (SYSTEM[i].dist ?? 3.15) * (narrow() ? 1.24 : 1);
      o.pos.copy(P).addScaledVector(tmp, d);
      o.pos.y += r * (0.32 - u * 0.12);
      o.look.copy(P);
      o.sx = narrow() ? 0 : side * 0.27;
      o.sy = narrow() ? 0.2 : 0;
      o.disc = 0.32;
      o.rings = 0.12;
      o.glow = 0.7;
      o.planets = 1;
      o.milky = 0.5;
      o.focus = i;
      return o;
    },
    process(u, o) {
      o.pos.set(0, 250, 480).applyAxisAngle(UP, 0.35 + u * 0.18);
      o.look.set(0, -10, 0);
      o.sx = 0;
      o.sy = narrow() ? 0 : -0.34;
      o.disc = 0.75;
      o.rings = 0.6;
      o.glow = 0.8;
      // the worlds fade into their orbits as we pull back
      o.planets = 0;
      o.milky = 0.35;
      o.focus = -1;
      return o;
    },
    finale(u, o) {
      o.pos.set(0, 640, 330).applyAxisAngle(UP, 0.53 + u * 0.1);
      o.look.set(0, 0, 0);
      o.sx = 0;
      o.sy = narrow() ? 0.02 : 0.04;
      o.disc = 0.55;
      o.rings = 1;
      o.glow = 0.55;
      o.planets = 0;
      o.milky = 0.08;
      o.focus = -1;
      return o;
    },
  };

  /* ---------------- the page timeline ----------------
     holds: [y0, y1] showing one pose (u runs 0..1 for drift)
     flights: [y0, y1] blending the end of one hold into the next */
  function buildTimeline() {
    const by = (n) => sections.find((s) => s.name === n);
    const span = (s) => Math.max(1, s.h - vh);
    const holds = [];
    const intro = by('intro');
    if (intro) holds.push({ y0: -Infinity, y1: intro.top + span(intro) * 0.36, pose: (u, o) => POSES.overview(u, o), z0: intro.top });
    for (let i = 0; i < SYSTEM.length; i++) {
      const w = by(`world-${i}`);
      if (w) holds.push({ y0: w.top + span(w) * 0.1, y1: w.top + span(w), pose: (u, o) => POSES.planet(i, u, o) });
    }
    const pr = by('process');
    if (pr) holds.push({ y0: pr.top + span(pr) * 0.04, y1: pr.top + span(pr), pose: (u, o) => POSES.process(u, o) });
    const fi = by('finale');
    if (fi) holds.push({ y0: fi.top + span(fi) * 0.3, y1: Infinity, pose: (u, o) => POSES.finale(u, o), z1: fi.top + span(fi) });
    timeline = holds;
  }

  // evaluate the timeline at scroll y into PA (the current camera pose)
  const holdU = (h, y) => {
    const a = Number.isFinite(h.y0) ? h.y0 : h.z0;
    const b = Number.isFinite(h.y1) ? h.y1 : h.z1;
    return b > a ? clamp((y - a) / (b - a)) : 0;
  };
  function evalPose(y) {
    if (!timeline.length) return POSES.overview(0, PA);
    for (let k = 0; k < timeline.length; k++) {
      const h = timeline[k];
      if (y < h.y0) {
        // flying from the previous hold into this one
        const prev = timeline[k - 1];
        if (!prev) return h.pose(0, PA);
        const t = clamp((y - prev.y1) / Math.max(1, h.y0 - prev.y1));
        prev.pose(1, PA);
        h.pose(0, PB);
        return fly(PA, PB, t);
      }
      if (y <= h.y1) return h.pose(holdU(h, y), PA);
    }
    const last = timeline[timeline.length - 1];
    return last.pose(1, PA);
  }

  // a flight: ease out of A, arc up and over (so we never cut through a world
  // or the sun), ease into B; the target leads the camera slightly
  function fly(A, B, t) {
    const e = smoother(t);
    const el = smooth(clamp(t * 1.15));
    const dist = A.pos.distanceTo(B.pos);
    const lift = Math.min(70, dist * 0.28) * Math.sin(Math.PI * e);
    A.pos.lerp(B.pos, e);
    A.pos.y += lift;
    A.look.lerp(B.look, el);
    A.sx = lerp(A.sx, B.sx, e);
    A.sy = lerp(A.sy, B.sy, e);
    // the disc fills in mid-flight so the motion reads
    const mid = Math.sin(Math.PI * e);
    A.disc = Math.max(lerp(A.disc, B.disc, e), mid * 0.85);
    A.rings = lerp(A.rings, B.rings, e);
    A.glow = lerp(A.glow, B.glow, e);
    A.planets = lerp(A.planets, B.planets, e);
    A.milky = lerp(A.milky, B.milky, e);
    A.focus = -1; // in flight every world is back in view
    return A;
  }

  /* ---------------- HUD ---------------- */
  const hud = {
    chapter: root.querySelector('[data-hud="chapter"]'),
    name: root.querySelector('[data-hud="name"]'),
    bar: root.querySelector('[data-hud="bar"]'),
    phase: root.querySelector('[data-hud="phase"]'),
    alt: root.querySelector('[data-hud="alt"]'),
    box: root.querySelector('.j-hud'),
  };
  const lastHud = {};
  const hudText = (key, v) => {
    if (hud[key] && lastHud[key] !== v) {
      hud[key].textContent = v;
      lastHud[key] = v;
    }
  };
  const NAMES = {
    intro: ['01', 'The universe'],
    process: ['08', 'Mission plan'],
    finale: ['09', 'Launch'],
    footer: ['09', 'Contenaissance'],
  };
  names.forEach((n, i) => (NAMES[`world-${i}`] = [pad2(i + 2), n]));

  /* ---------------- loop ---------------- */
  const anchorPos = {};
  const anchorRad = {};
  const pt = { x: 0, y: 0, v: 0 };
  const project = (v, out) => {
    tmp.copy(v).project(camera);
    out.x = (tmp.x * 0.5 + 0.5) * cw;
    out.y = (-tmp.y * 0.5 + 0.5) * chh;
    out.v = tmp.z < 1 ? 1 : 0;
    return out;
  };
  let time = 0;
  let last = performance.now();
  let frames = 0;
  let avg = 16;
  let raf = 0;
  let disposed = false;
  let lastSection = null;
  let readyAt = -1;
  let introE = 0;
  const veilEl = root.querySelector('[data-veil]');

  function frame(now) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += reduced ? dt * 0.3 : dt;
    avg += (dt * 1000 - avg) * 0.05;
    if (++frames % 90 === 0) {
      if (avg > 23 && dpr > minDpr) dpr = Math.max(minDpr, dpr - 0.15);
      else if (avg < 14.5 && dpr < maxDpr) dpr = Math.min(maxDpr, dpr + 0.1);
      if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
    }

    const y = window.__lenis ? window.__lenis.animatedScroll : window.scrollY;
    const total = Math.max(1, document.documentElement.scrollHeight - vh);
    const gp = clamp(y / total);

    let cur = sections[0];
    for (const s of sections) if (s.top <= y + vh * 0.5) cur = s;
    if (!cur) return;
    const p = cur.sticky ? clamp((y - cur.top) / Math.max(1, cur.h - vh)) : clamp((y - cur.top + vh) / (cur.h + vh));

    /* camera from the page timeline */
    sys.layout(gp);
    const pose = evalPose(y);
    // after the loader-less intro: ease in from a little further out
    if (introE < 1) pose.pos.addScaledVector(tmp.copy(pose.pos).sub(pose.look).normalize(), (1 - introE) * 140);
    camera.position.copy(pose.pos);
    camera.up.copy(UP);
    camera.lookAt(pose.look);
    camera.setViewOffset(cw, chh, -pose.sx * cw, pose.sy * chh, cw, chh);

    sky.state.milky = pose.milky;
    sky.update(camera, time, dpr);
    sys.update(time, camera, dpr, pose);

    if (veilEl) {
      veilEl.style.backgroundColor = '#000';
      veilEl.style.opacity = (1 - introE).toFixed(3);
    }

    /* chapter events */
    if (cur !== lastSection) {
      lastSection?.el.dispatchEvent(new CustomEvent('jactive', { detail: false }));
      cur.el.dispatchEvent(new CustomEvent('jactive', { detail: true }));
      lastSection = cur;
    }

    /* anchors (planet labels in the overview) */
    for (let i = 0; i < SYSTEM.length; i++) {
      anchorPos[`p-${i}`] = sys.planetPos(i);
      anchorRad[`p-${i}`] = SYSTEM[i].r * (SYSTEM[i].ring ? 1.5 : 1);
    }

    /* beats for the current chapter and its neighbours */
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
      if (s.progress.length) {
        const v = sp.toFixed(4);
        for (const el of s.progress) if (el.dataset.lp !== v) {
          el.style.setProperty('--p', v);
          el.dataset.lp = v;
        }
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
      // the label sits just outside the world's edge: pass the on-screen radius
      if (anchorRad[a.key]) {
        const d = camera.position.distanceTo(v);
        const rpx = Math.round((anchorRad[a.key] / d) * (chh / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))));
        if (rpx !== a.lr) {
          a.el.style.setProperty('--r', `${rpx}px`);
          a.lr = rpx;
        }
      }
      if (pt.v !== a.lv) {
        a.el.style.visibility = pt.v ? 'visible' : 'hidden';
        a.lv = pt.v;
      }
    }

    /* steps: world chapters report 'arrived', the process reports its stage */
    let step;
    let phase = '';
    if (cur.name.startsWith('world-')) {
      step = p > 0.1 ? 1 : 0;
      phase = p > 0.1 ? (p > 0.94 ? 'Departing' : 'In orbit') : 'Approach';
    } else if (cur.name === 'process') {
      step = clamp(Math.floor(seg(p, 0.08, 0.86) * 5), 0, 4);
      phase = `Stage ${pad2(step + 1)} / 05`;
    } else if (cur.name === 'intro') {
      phase = p < 0.36 ? 'Overview' : 'Descent';
    } else {
      phase = 'Flight plan';
    }
    if (step !== undefined && step !== cur.step) {
      cur.step = step;
      cur.el.dispatchEvent(new CustomEvent('jstep', { detail: step }));
    }

    /* HUD */
    const nm = NAMES[cur.name] || ['', ''];
    hudText('chapter', nm[0]);
    hudText('name', nm[1]);
    hudText('phase', phase);
    hudText('alt', '');
    if (hud.box) {
      const foot = sections.find((s) => s.name === 'footer');
      const hide = (foot && foot.top < y + vh) || cur.name === 'finale' || cur.name === 'process' ? '0' : '';
      if (hud.box.style.opacity !== hide) {
        hud.box.style.transition = hide ? 'opacity 0.3s' : '';
        hud.box.style.opacity = hide;
      }
    }
    if (hud.bar) hud.bar.style.transform = `scaleY(${gp.toFixed(4)})`;

    renderer.render(scene, camera);

    if (readyAt < 0 && (sys.ready || time > 2.5)) {
      readyAt = time;
      requestAnimationFrame(() => window.dispatchEvent(new Event('services:ready')));
    }
    introE = readyAt < 0 ? 0 : reduced ? 1 : 1 - Math.pow(1 - clamp((time - readyAt) / 2.2), 3);
  }

  // Lenis (in Shell) drives the frame when present; otherwise our own loop
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

  // warm the shader cache once everything is visible
  setTimeout(() => {
    if (disposed) return;
    if (renderer.compileAsync) renderer.compileAsync(scene, camera).catch(() => {});
    else renderer.compile(scene, camera);
  }, 300);

  if (window.location.search.includes('debug')) window.__services = { scene, renderer, sys, camera, info: () => ({ dpr, avg, calls: renderer.info.render.calls }) };

  return {
    measure,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.__journeyFrame = null;
      ro.disconnect();
      cro.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('sv:hover', onHover);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) [].concat(o.material).forEach((m) => {
          m.map?.dispose?.();
          m.dispose();
        });
      });
      disposeTextures();
      renderer.dispose();
    },
  };
}
