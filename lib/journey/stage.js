import * as THREE from 'three';
import { clamp, lerp, seg, smooth, smoother, setTextureUpload, disposeTextures } from './util';

/* =====================================================
   STAGE — the shared runtime of the inner-page journeys
   (services, portfolio). It owns everything that is the
   same from page to page, so a page engine only builds its
   world and says where the camera is:

   - renderer, adaptive resolution, resize, dispose
   - the frame loop (driven by Lenis via window.__journeyFrame,
     with a fallback rAF loop when Lenis is off)
   - chapters: [data-ch] sections; sticky ones have a 100vh
     stage. [data-in]/[data-out] beats fade from the chapter's
     progress, [data-anchor] elements are pinned to 3D points
     (with --r = on-screen radius when one is given),
     [data-progress] elements get --p (0..1)
   - 'jactive' / 'jstep' events for React, the HUD texts
   - the black veil that lifts once the world is ready
   - a camera TIMELINE over the whole page scroll: holds (one
     pose, u = 0..1 drift) joined by flights (an eased arc
     from one pose to the next), so the camera never freezes
     between chapters

   Same contract as the home engine (lib/journey/engine.js).
===================================================== */

export const UP = new THREE.Vector3(0, 1, 0);
export const pad2 = (i) => String(i).padStart(2, '0');

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} o.root
 * @param {boolean} o.mobile
 * @param {boolean} o.reduced
 * @param {string} o.readyEvent   window event fired once the world can be shown
 * @param {object} o.names        HUD names per chapter: { [ch]: ['01', 'Name'] }
 * @param {(fields) => object} o.makePose   a blank pose (pos, look, sx, sy + page fields)
 */
export function createStage({ canvas, root, mobile, reduced, readyEvent, names = {}, makePose }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch {
    return null;
  }
  const maxBuf = renderer.capabilities.maxTextureSize || 8192;
  const DPR_CAP = mobile ? 2 : 2.5;
  const targetDpr = () => Math.max(1, Math.min(window.devicePixelRatio || 1, DPR_CAP, maxBuf / Math.max(window.innerWidth, window.innerHeight, 1)));
  let maxDpr = targetDpr();
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);
  setTextureUpload((t) => renderer.initTexture(t));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
  const tmp = new THREE.Vector3();

  const S = {
    renderer,
    scene,
    camera,
    mobile,
    reduced,
    sections: [],
    vh: window.innerHeight,
    cw: window.innerWidth,
    chh: window.innerHeight,
    dpr,
    time: 0,
    /** phones: copy below the subject instead of beside it */
    narrow: () => S.cw < 761,
    by: (n) => S.sections.find((s) => s.name === n),
    span: (s) => Math.max(1, s.h - S.vh),
  };

  /* ---------------- chapters ---------------- */
  let onMeasure = null;
  const measure = () => {
    S.vh = window.innerHeight;
    const y = window.scrollY;
    S.sections = [...root.querySelectorAll('[data-ch]')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        el,
        name: el.dataset.ch,
        top: r.top + y,
        h: el.offsetHeight,
        sticky: el.offsetHeight > S.vh * 1.05,
        beats: [...el.querySelectorAll('[data-in]')].map((b) => ({ el: b, a: parseFloat(b.dataset.in), b: parseFloat(b.dataset.out ?? '9'), f: parseFloat(b.dataset.f ?? '0.06'), last: -1 })),
        anchors: [...el.querySelectorAll('[data-anchor]')].map((a) => ({ el: a, key: a.dataset.anchor, lx: -1, ly: -1, lv: -1, lr: -1 })),
        progress: [...el.querySelectorAll('[data-progress]')],
        step: -2,
      };
    });
    onMeasure?.(S);
  };
  S.remeasure = measure;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    S.cw = w;
    S.chh = h;
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
  const ro = new ResizeObserver(() => measure());
  ro.observe(root);
  const cro = new ResizeObserver(() => {
    if (canvas.clientWidth !== S.cw || canvas.clientHeight !== S.chh) resize();
  });
  cro.observe(canvas);
  window.addEventListener('resize', resize);

  /* ---------------- camera timeline ---------------- */
  const PA = makePose();
  const PB = makePose();
  let holds = [];
  let onFly = null;
  /** holds: [{ y0, y1, pose(u, out) }] in scroll order; y0 may be -Infinity, y1 Infinity
   *  (then z0 / z1 give the range u is measured over) */
  S.setTimeline = (h) => (holds = h);
  const holdU = (h, y) => {
    const a = Number.isFinite(h.y0) ? h.y0 : h.z0 ?? 0;
    const b = Number.isFinite(h.y1) ? h.y1 : h.z1 ?? a + 1;
    return b > a ? clamp((y - a) / (b - a)) : 0;
  };
  // a flight: ease out of A, arc up and over, ease into B; the look target
  // leads the camera slightly. Every numeric pose field is blended.
  function fly(A, B, t) {
    const e = smoother(t);
    const el = smooth(clamp(t * 1.15));
    const dist = A.pos.distanceTo(B.pos);
    const lift = Math.min(A.liftMax ?? 70, dist * 0.28) * Math.sin(Math.PI * e) * (A.lift ?? 1);
    A.pos.lerp(B.pos, e);
    A.pos.y += lift;
    A.look.lerp(B.look, el);
    for (const k in A) if (typeof A[k] === 'number' && typeof B[k] === 'number') A[k] = lerp(A[k], B[k], e);
    A.flight = Math.sin(Math.PI * e); // 0 at either end, 1 mid-flight
    onFly?.(A, B, t, e);
    return A;
  }
  function evalPose(y) {
    if (!holds.length) return PA;
    for (let k = 0; k < holds.length; k++) {
      const h = holds[k];
      if (y < h.y0) {
        const prev = holds[k - 1];
        if (!prev) {
          h.pose(0, PA);
          PA.flight = 0;
          return PA;
        }
        const t = clamp((y - prev.y1) / Math.max(1, h.y0 - prev.y1));
        prev.pose(1, PA);
        h.pose(0, PB);
        return fly(PA, PB, t);
      }
      if (y <= h.y1) {
        h.pose(holdU(h, y), PA);
        PA.flight = 0;
        return PA;
      }
    }
    holds[holds.length - 1].pose(1, PA);
    PA.flight = 0;
    return PA;
  }

  /* ---------------- DOM layer ---------------- */
  const hud = {
    chapter: root.querySelector('[data-hud="chapter"]'),
    name: root.querySelector('[data-hud="name"]'),
    bar: root.querySelector('[data-hud="bar"]'),
    phase: root.querySelector('[data-hud="phase"]'),
    box: root.querySelector('.j-hud'),
  };
  const lastHud = {};
  const hudText = (key, v) => {
    if (hud[key] && lastHud[key] !== v) {
      hud[key].textContent = v;
      lastHud[key] = v;
    }
  };
  const veilEl = root.querySelector('[data-veil]');
  const pt = { x: 0, y: 0, v: 0 };
  const project = (v, out) => {
    tmp.copy(v).project(camera);
    out.x = (tmp.x * 0.5 + 0.5) * S.cw;
    out.y = (-tmp.y * 0.5 + 0.5) * S.chh;
    out.v = tmp.z < 1 ? 1 : 0;
    return out;
  };
  S.project = project;
  let lastSection = null;

  function applyDom(y, cur, p, info) {
    if (cur !== lastSection) {
      lastSection?.el.dispatchEvent(new CustomEvent('jactive', { detail: false }));
      cur.el.dispatchEvent(new CustomEvent('jactive', { detail: true }));
      lastSection = cur;
    }
    const { vh } = S;
    for (const s of S.sections) {
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
        // non-sticky neighbours report their own live progress too (parallax)
        const lp = s.sticky ? sp : clamp((y - s.top + vh) / (s.h + vh));
        const v = lp.toFixed(4);
        for (const el of s.progress)
          if (el.dataset.lp !== v) {
            el.style.setProperty('--p', v);
            el.dataset.lp = v;
          }
      }
    }
    const anchors = info.anchors || {};
    const radii = info.radii || {};
    const focal = S.chh / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    for (const a of cur.anchors) {
      const v = anchors[a.key];
      if (!v) continue;
      project(v, pt);
      const x = Math.round(pt.x * 10) / 10;
      const yy = Math.round(pt.y * 10) / 10;
      if (x !== a.lx || yy !== a.ly) {
        a.el.style.transform = `translate3d(${x}px, ${yy}px, 0)`;
        a.lx = x;
        a.ly = yy;
      }
      if (radii[a.key]) {
        const rpx = Math.round((radii[a.key] / camera.position.distanceTo(v)) * focal);
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
    if (info.step !== undefined && info.step !== cur.step) {
      cur.step = info.step;
      cur.el.dispatchEvent(new CustomEvent('jstep', { detail: info.step }));
    }
    const nm = names[cur.name] || ['', ''];
    hudText('chapter', nm[0]);
    hudText('name', nm[1]);
    hudText('phase', info.phase || '');
    if (hud.box) {
      const foot = S.by('footer');
      const hide = (foot && foot.top < y + vh) || info.hideHud ? '0' : '';
      if (hud.box.style.opacity !== hide) {
        hud.box.style.transition = hide ? 'opacity 0.3s' : '';
        hud.box.style.opacity = hide;
      }
    }
  }

  /* ---------------- loop ---------------- */
  let last = performance.now();
  let frames = 0;
  let avg = 16;
  let raf = 0;
  let disposed = false;
  let readyAt = -1;
  const startedAt = performance.now();
  let introE = 0;
  let onFrame = null;
  let isReady = () => true;

  function frame(now) {
    if (disposed || !onFrame) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    S.time += reduced ? dt * 0.3 : dt;
    avg += (dt * 1000 - avg) * 0.05;
    if (++frames % 90 === 0) {
      if (avg > 23 && dpr > 1) dpr = Math.max(1, dpr - 0.15);
      else if (avg < 14.5 && dpr < maxDpr) dpr = Math.min(maxDpr, dpr + 0.1);
      if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
    }
    S.dpr = dpr;

    const y = window.__lenis ? window.__lenis.animatedScroll : window.scrollY;
    const total = Math.max(1, document.documentElement.scrollHeight - S.vh);
    const gp = clamp(y / total);
    let cur = S.sections[0];
    for (const s of S.sections) if (s.top <= y + S.vh * 0.5) cur = s;
    if (!cur) return;
    const p = cur.sticky ? clamp((y - cur.top) / Math.max(1, cur.h - S.vh)) : clamp((y - cur.top + S.vh) / (cur.h + S.vh));

    const ctx = { y, gp, cur, p, dt, time: S.time };
    onFrame.before?.(ctx);
    const pose = evalPose(y);
    // the intro: ease in from a little further out while the veil lifts
    if (introE < 1) pose.pos.addScaledVector(tmp.copy(pose.pos).sub(pose.look).normalize(), (1 - introE) * (pose.introPush ?? 120));
    camera.position.copy(pose.pos);
    camera.up.copy(UP);
    camera.lookAt(pose.look);
    camera.setViewOffset(S.cw, S.chh, -(pose.sx || 0) * S.cw, (pose.sy || 0) * S.chh, S.cw, S.chh);
    camera.updateMatrixWorld();

    const info = onFrame.after({ ...ctx, pose }) || {};
    if (veilEl) veilEl.style.opacity = (1 - introE).toFixed(3);
    applyDom(y, cur, p, info);
    if (hud.bar) hud.bar.style.transform = `scaleY(${gp.toFixed(4)})`;

    renderer.render(scene, camera);

    // the veil lifts on the wall clock, so a slow device still sees the world in ~2 s
    if (readyAt < 0 && (isReady() || now - startedAt > 2500)) {
      readyAt = now;
      requestAnimationFrame(() => window.dispatchEvent(new Event(readyEvent)));
    }
    introE = readyAt < 0 ? 0 : reduced ? 1 : 1 - Math.pow(1 - clamp((now - readyAt) / 2200), 3);
  }

  const own = (now) => {
    raf = requestAnimationFrame(own);
    if (window.__lenis && window.__journeyFrameSeen > now - 100) return;
    frame(now);
  };

  /**
   * start the loop.
   * @param {object} o
   * @param {(S) => void} o.timeline     (re)build the holds after every measure
   * @param {{ before?, after }} o.frame  after({ y, gp, cur, p, dt, time, pose }) → { anchors, radii, step, phase, hideHud }
   * @param {() => boolean} o.ready
   * @param {(A, B, t, e) => void} [o.fly]  page-specific flight tweaks
   */
  S.start = ({ timeline, frame: f, ready, fly: flyHook }) => {
    onMeasure = timeline;
    onFrame = f;
    onFly = flyHook || null;
    if (ready) isReady = ready;
    resize();
    window.__journeyFrame = (now) => {
      window.__journeyFrameSeen = now;
      frame(now);
    };
    raf = requestAnimationFrame(own);
    // warm the shader cache with everything in the scene
    setTimeout(() => {
      if (disposed) return;
      if (renderer.compileAsync) renderer.compileAsync(scene, camera).catch(() => { });
      else renderer.compile(scene, camera);
    }, 300);
  };

  S.info = () => ({ dpr, avg, calls: renderer.info.render.calls });

  S.dispose = (extra) => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.__journeyFrame = null;
    ro.disconnect();
    cro.disconnect();
    window.removeEventListener('resize', resize);
    extra?.();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material)
        [].concat(o.material).forEach((m) => {
          m.map?.dispose?.();
          m.dispose();
        });
    });
    disposeTextures();
    renderer.dispose();
  };

  return S;
}
