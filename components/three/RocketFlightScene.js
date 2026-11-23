import * as THREE from 'three';
import { glowTexture } from './spaceCommon';
import { ASSEMBLY, explodeOffset, heroTilt } from '@/lib/user/rocketFlight';

/* =====================================================
   ROCKET FLIGHT — the hero's 3D rocket.

   One small transparent canvas fixed over the hero and the
   Rocket section. The rocket is built from the same parts
   as the DOM rocket in Rocket.jsx (nose, S5…S1, nozzle,
   flame) and sized from it, so it can land exactly on top:

     hero      floats beside the headline, spinning, engine lit
     travel    barrel-rolls across the screen to the DOM rocket
     explode   splits into a gold hologram of its stages
     assemble  each hologram stage drops into place and fades
               as Rocket.jsx brings in the real module

   Everything is measured in CSS px: the camera is placed so
   one world unit = one screen pixel on the z = 0 plane.
   No textures, no environment map: a handful of meshes.
===================================================== */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// GSAP power3.out — the DOM modules use it, so the hologram matches.
const power3Out = (t) => 1 - Math.pow(1 - t, 4);
const TAU = Math.PI * 2;
const FOV = 30;

const COLORS = {
  hull: 0x15191b,
  edge: 0xd9772b,
  yellow: 0xf2e21b,
  nose: 0xe7eee9,
  nozzle: 0xf4f4f0,
  holo: 0xe9b949,
};

// Nose profile from the DOM svg path "M52 0C80 30 100 80 102 150",
// in svg units (r from the axis, y down), sampled along the bezier.
function noseProfile(steps = 22) {
  const P = [
    [0, 0],
    [28, 30],
    [48, 80],
    [50, 150],
  ];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const r = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
    const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
    pts.push([r, y]);
  }
  return pts;
}

// Blueprint lattice for the hologram: rings at the given profile
// points plus meridians running along the whole profile.
// profile: [[r, y], …] bottom → top, in unit space.
function latticeGeometry(profile, ringIdx, meridians = 10, ringSegs = 48) {
  const pos = [];
  for (const i of ringIdx) {
    const [r, y] = profile[i];
    if (r < 0.01) continue;
    for (let s = 0; s < ringSegs; s++) {
      const a0 = (s / ringSegs) * TAU;
      const a1 = ((s + 1) / ringSegs) * TAU;
      pos.push(Math.sin(a0) * r, y, Math.cos(a0) * r, Math.sin(a1) * r, y, Math.cos(a1) * r);
    }
  }
  for (let m = 0; m < meridians; m++) {
    const a = (m / meridians) * TAU;
    for (let i = 0; i < profile.length - 1; i++) {
      const [r0, y0] = profile[i];
      const [r1, y1] = profile[i + 1];
      pos.push(Math.sin(a) * r0, y0, Math.cos(a) * r0, Math.sin(a) * r1, y1, Math.cos(a) * r1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// launch: true → on scroll the rocket blasts off up and out of the top
// of the screen (input.launch 0 → 1), then climbs back in from below
// and lands on the DOM rocket (input.travel 0 → 1) for the assembly.
export function createRocketFlight(container, { getInputs, launch = false }) {
  if (!container) return null;

  let mobile = window.innerWidth < 760;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  const dpr = () => Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 10000);
  let W = 1;
  let H = 1;
  let D = 1; // camera distance where 1 unit = 1px

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0x15100c, 1.1));
  const key = new THREE.DirectionalLight(0xffe1b0, 2.6);
  key.position.set(-1, 1.3, 1.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.6);
  rim.position.set(1.4, 0.4, -1);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe9b949, 0.7);
  fill.position.set(0.6, -1, 1);
  scene.add(fill);

  /* ---------- shared geometry ---------- */
  const geo = {
    hull: new THREE.CylinderGeometry(0.5, 0.5, 1, 40),
    hullWire: latticeGeometry(
      [
        [0.5, -0.5],
        [0.5, -1 / 6],
        [0.5, 1 / 6],
        [0.5, 0.5],
      ],
      [0, 1, 2, 3]
    ),
    rim: new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1, true),
    nozzle: new THREE.CylinderGeometry(0.4, 0.5, 1, 32),
    disc: new THREE.CircleGeometry(0.5, 32),
  };

  // Nose: lathe in units of the nose width (base radius ≈ 0.48),
  // origin at its vertical centre.
  const NOSE_H = 150 / 104;
  const profile = noseProfile();
  const lathePts = profile
    .map(([r, y]) => new THREE.Vector2(r / 104, (75 - y) / 104))
    .reverse(); // bottom → top
  geo.nose = new THREE.LatheGeometry(lathePts, 40);
  geo.noseWire = latticeGeometry(
    lathePts.map((p) => [p.x, p.y]),
    lathePts.map((_, i) => i).filter((i) => i % 5 === 0)
  );
  // Nose surface radius at a local height (nose units), from the lathe
  const noseRadiusAt = (y) => {
    for (let i = 0; i < lathePts.length - 1; i++) {
      const a = lathePts[i];
      const b = lathePts[i + 1];
      if (y >= a.y && y <= b.y) return a.x + ((y - a.y) / (b.y - a.y || 1)) * (b.x - a.x);
    }
    return y < lathePts[0].y ? lathePts[0].x : 0;
  };

  // Wraps a flat decal (built in the XY plane, facing +z) onto a
  // surface of revolution, so portholes sit flush on the curved hull
  // instead of standing off it as flat discs.
  const wrapOnto = (g, radiusAt, lift) => {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const R = radiusAt(y);
      const a = x / R;
      p.setXYZ(i, Math.sin(a) * (R + lift), y, Math.cos(a) * (R + lift));
      n.setXYZ(i, Math.sin(a), 0, Math.cos(a));
    }
    p.needsUpdate = true;
    n.needsUpdate = true;
    g.computeBoundingSphere();
    return g;
  };

  // Module porthole, in hull units (hull radius 0.5)
  const PORT_R = 0.12;
  geo.portGlass = wrapOnto(new THREE.CircleGeometry(PORT_R, 40), () => 0.5, 0.012);
  geo.portRing = wrapOnto(new THREE.RingGeometry(PORT_R, PORT_R * 1.22, 48, 1), () => 0.5, 0.018);

  // Cockpit window on the nose (svg circle cx52 cy88 r19), in nose units
  const WIN_Y = (75 - 88) / 104;
  const winGeo = (inner, outer, lift) => {
    const g = inner > 0 ? new THREE.RingGeometry(inner, outer, 48, 1) : new THREE.CircleGeometry(outer, 40);
    g.translate(0, WIN_Y, 0);
    return wrapOnto(g, noseRadiusAt, lift);
  };
  geo.winGlass = winGeo(0, 17 / 104, 0.014);
  geo.winRing = winGeo(17 / 104, 20 / 104, 0.022);

  // S1 wing, matching the DOM clip-path: attaches to the hull side
  // from 40% down the module and sweeps out below it. Units: x in
  // module widths (outward), y in module heights (centre = 0).
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0.1);
  finShape.lineTo(0.4, -0.65);
  finShape.lineTo(0, -0.515);
  finShape.closePath();
  geo.fin = new THREE.ExtrudeGeometry(finShape, { depth: 1, bevelEnabled: false });
  geo.fin.translate(0, 0, -0.5);

  // Flame cones: base at y = 0, tip at y = -1
  const cone = (r) => {
    const g = new THREE.ConeGeometry(r, 1, 24, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, -0.5, 0);
    return g;
  };
  geo.flameOuter = cone(0.5);
  geo.flameInner = cone(0.28);

  /* ---------- materials ---------- */
  const allMaterials = [];
  const track = (m) => {
    allMaterials.push(m);
    return m;
  };
  const solid = (color, opts = {}) =>
    track(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.25,
        transparent: true,
        ...opts,
      })
    );
  const wire = () =>
    track(
      new THREE.LineBasicMaterial({
        color: COLORS.holo,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );

  const flameMat = (inner, outer) =>
    track(
      new THREE.ShaderMaterial({
        uniforms: {
          uInner: { value: new THREE.Color(inner) },
          uOuter: { value: new THREE.Color(outer) },
          uAlpha: { value: 1 },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying float vFacing;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * normal);
            vFacing = abs(dot(n, normalize(-mv.xyz)));
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uInner;
          uniform vec3 uOuter;
          uniform float uAlpha;
          uniform float uTime;
          varying vec2 vUv;
          varying float vFacing;
          void main() {
            float along = 1.0 - vUv.y;           // 1 at the nozzle, 0 at the tip
            float flick = 0.85 + 0.15 * sin(uTime * 38.0 + vUv.y * 18.0);
            vec3 col = mix(uOuter, uInner, smoothstep(0.35, 1.0, along));
            float a = pow(along, 1.3) * pow(vFacing, 1.4) * flick * uAlpha;
            gl_FragColor = vec4(col * a, a);
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );

  /* ---------- rocket ---------- */
  const rocket = new THREE.Group();
  scene.add(rocket);

  // k: 0 = S1 … 4 = S5, 5 = nose (matches lib/user/rocketFlight)
  const segs = [];

  const makeModule = (k) => {
    const group = new THREE.Group();
    const hullMat = solid(COLORS.hull, { roughness: 0.45, metalness: 0.4, emissive: new THREE.Color(COLORS.holo), emissiveIntensity: 0 });
    const rimMat = solid(COLORS.edge, { roughness: 0.4, metalness: 0.5, emissive: new THREE.Color(COLORS.edge), emissiveIntensity: 0.25 });
    const emblemMat = solid(COLORS.yellow, { roughness: 0.3, metalness: 0.2, emissive: new THREE.Color(COLORS.yellow), emissiveIntensity: 0.55 });
    const portMat = solid(0x07090a, { roughness: 0.1, metalness: 0.6 });
    const wireMat = wire();

    const hull = new THREE.Mesh(geo.hull, hullMat);
    const hullWire = new THREE.LineSegments(geo.hullWire, wireMat);
    const rimTop = new THREE.Mesh(geo.rim, rimMat);
    const rimBot = new THREE.Mesh(geo.rim, rimMat);
    // flush porthole wrapped onto the hull: dark glass + thin yellow ring
    const emblem = new THREE.Group();
    emblem.add(new THREE.Mesh(geo.portGlass, portMat), new THREE.Mesh(geo.portRing, emblemMat));
    group.add(hull, hullWire, rimTop, rimBot, emblem);

    const fins = [];
    if (k === 0) {
      // right, left and back (rotation.y = π/2 maps +x to -z): the
      // front stays clear so no fin is ever seen edge-on over the hull
      [0, Math.PI, Math.PI / 2].forEach((angle) => {
        const pivot = new THREE.Group();
        pivot.rotation.y = angle;
        const fin = new THREE.Mesh(geo.fin, rimMat);
        pivot.add(fin);
        group.add(pivot);
        fins.push(fin);
      });
    }

    rocket.add(group);
    return {
      k,
      group,
      solids: [hullMat, rimMat, emblemMat, portMat],
      hullMat,
      wires: [wireMat],
      layout(w, h) {
        hull.scale.set(w, h, w);
        hullWire.scale.set(w * 1.04, h, w * 1.04);
        const t = Math.max(2, w * 0.018);
        rimTop.scale.set(w * 1.02, t, w * 1.02);
        rimBot.scale.set(w * 1.02, t, w * 1.02);
        rimTop.position.y = h / 2 - t / 2;
        rimBot.position.y = -h / 2 + t / 2;
        // hull units → px (uniform so the porthole stays round)
        emblem.scale.setScalar(w);
        fins.forEach((fin) => {
          fin.scale.set(w, h, Math.max(4, w * 0.06));
          fin.position.x = w / 2 - 1;
        });
      },
    };
  };

  const makeNose = () => {
    const group = new THREE.Group();
    const bodyMat = solid(COLORS.nose, { roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide, emissive: new THREE.Color(COLORS.holo), emissiveIntensity: 0 });
    const glassMat = solid(0x080b0b, { roughness: 0.08, metalness: 0.6 });
    const ringMat = solid(COLORS.yellow, { roughness: 0.3, emissive: new THREE.Color(COLORS.yellow), emissiveIntensity: 0.6 });
    const wireMat = wire();

    const body = new THREE.Mesh(geo.nose, bodyMat);
    const bodyWire = new THREE.LineSegments(geo.noseWire, wireMat);
    const cap = new THREE.Mesh(geo.disc, bodyMat);
    cap.rotation.x = Math.PI / 2;
    // cockpit window, wrapped onto the nose curve (scaled with the body)
    const windowGroup = new THREE.Group();
    windowGroup.add(new THREE.Mesh(geo.winGlass, glassMat), new THREE.Mesh(geo.winRing, ringMat));
    group.add(body, bodyWire, cap, windowGroup);
    rocket.add(group);

    return {
      k: 5,
      group,
      solids: [bodyMat, glassMat, ringMat],
      hullMat: bodyMat,
      wires: [wireMat],
      layout(w, h) {
        const sy = h / NOSE_H;
        body.scale.set(w, sy, w);
        bodyWire.scale.set(w * 1.04, sy, w * 1.04);
        cap.scale.setScalar(w * 0.96);
        cap.position.y = -h / 2;
        windowGroup.scale.set(w, sy, w);
      },
    };
  };

  for (let k = 0; k < 5; k++) segs.push(makeModule(k));
  segs.push(makeNose());

  // Nozzle + flame ride with S1
  const nozzleGroup = new THREE.Group();
  const nozzleMat = solid(COLORS.nozzle, { roughness: 0.3, metalness: 0.5 });
  const nozzle = new THREE.Mesh(geo.nozzle, nozzleMat);
  nozzleGroup.add(nozzle);
  rocket.add(nozzleGroup);

  const flame = new THREE.Group();
  const flameOuterMat = flameMat(0xffd27a, 0xff5a3c);
  const flameInnerMat = flameMat(0xffffff, 0xc8f04a);
  const flameOuter = new THREE.Mesh(geo.flameOuter, flameOuterMat);
  const flameInner = new THREE.Mesh(geo.flameInner, flameInnerMat);
  const flameGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture('#ff8a3c'), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  track(flameGlow.material);
  flame.add(flameOuter, flameInner, flameGlow);
  nozzleGroup.add(flame);

  /* ---------- layout (DOM px, from the Rocket section) ---------- */
  // parts = { modules: [{top,h,w}] S1 first, nose, nozzle, flame }
  let L = 1; // nose top → nozzle bottom
  let layout = null;
  let moduleH = 100;

  const setLayout = (parts) => {
    if (!parts) return;
    layout = parts;
    const top = parts.nose.top;
    L = parts.nozzle.top + parts.nozzle.h - top;
    moduleH = parts.modules[0]?.h || 100;
    const yOf = (p) => L / 2 - (p.top - top + p.h / 2); // centre, y up

    parts.modules.forEach((p, k) => {
      segs[k].layout(p.w, p.h);
      segs[k].baseY = yOf(p);
    });
    segs[5].layout(parts.nose.w, parts.nose.h);
    segs[5].baseY = yOf(parts.nose);

    nozzle.scale.set(parts.nozzle.w, parts.nozzle.h, parts.nozzle.w);
    nozzleGroup.userData.baseY = yOf(parts.nozzle);
    flame.position.y = -parts.nozzle.h / 2 + 2;
    flame.userData.w = parts.flame.w;
    flame.userData.h = parts.flame.h;
  };

  /* ---------- resize ---------- */
  const onResize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    mobile = W < 760;
    renderer.setPixelRatio(dpr());
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    D = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.position.set(0, 0, D);
    camera.near = D * 0.3; // tight depth range: no z-fighting on the decals
    camera.far = D * 4;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  onResize();
  window.addEventListener('resize', onResize);

  /* ---------- state ---------- */
  const state = {
    intro: 0,
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    travel: 0, // smoothed
    launch: 0, // smoothed lift-off progress (launch mode)
    spin: 0.6,
  };

  let raf = 0;
  let running = false;
  let destroyed = false;
  let last = performance.now();
  const t0 = last;

  const frame = () => {
    if (destroyed) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;

    const input = getInputs();
    if (!input || !layout) {
      raf = requestAnimationFrame(frame);
      return;
    }

    // smoothed scroll progress gives the rocket some weight
    state.travel += (input.travel - state.travel) * Math.min(1, dt * 7);
    if (Math.abs(input.travel - state.travel) < 0.0005) state.travel = input.travel;
    const tr = state.travel;
    const time = input.time;

    // Launch mode, phase 1: lift off and leave through the top. Phase 2
    // (below) climbs back up from under the screen onto the DOM rocket,
    // where the usual hologram + assembly takes over.
    if (launch) {
      state.launch += (input.launch - state.launch) * Math.min(1, dt * 7);
      if (Math.abs(input.launch - state.launch) < 0.0005) state.launch = input.launch;
      if (state.launch < 1) {
        launchFrame(t, state.launch, input);
        return;
      }
    }

    // Idle: nothing left to draw once every stage is the real module
    if (tr >= 1 && input.travel >= 1 && time >= ASSEMBLY.done + 0.05) {
      renderer.domElement.style.visibility = 'hidden';
      running = false;
      return;
    }
    renderer.domElement.style.visibility = 'visible';

    state.px += (state.tx - state.px) * 0.06;
    state.py += (state.ty - state.py) * 0.06;

    const P = easeInOut(tr);
    const away = 1 - P;
    const idle = reducedMotion ? 0 : 1;

    /* --- where the rocket is on screen --- */
    const hero = input.hero;
    const flameH = flame.userData.h || 100;
    const heroScale = (hero.h * 0.94) / (L + flameH * 1.3);
    const heroCY = hero.cy - (flameH * 1.3 * heroScale) / 2 + Math.sin(t * 1.1) * 8 * idle;

    const destCX = input.dest.cx;
    const destCY = input.dest.top + L / 2;

    const intro = state.intro;
    if (launch) {
      // the swoop: continues the lift-off path into the Rocket section
      const p = pathAt(1 + tr, input);
      const roll = unwrap(p.rz, state.roll ?? p.rz);
      state.roll = roll;
      rocket.position.set(p.x - W / 2, H / 2 - p.y, 0);
      rocket.scale.setScalar(p.scale);
      rocket.rotation.set(
        Math.sin(t * 0.7) * 0.03 * away * idle,
        -0.15 * away + state.px * 0.3 * away,
        roll
      );
      // smoke lingers through the loop, then clears as it docks
      drawSmoke(1 + tr, input, 1 - smooth(0.7, 1, tr));
    } else {
      puffs.forEach((sp) => (sp.visible = false));
      let sx = lerp(hero.cx, destCX, P);
      let sy = lerp(heroCY, destCY, P);
      // arc over the page while travelling
      sy -= Math.sin(Math.PI * tr) * H * (mobile ? 0.05 : 0.12);
      // intro: launches up into frame from below
      sy += (1 - intro) * H * 0.75;
      const zLift = Math.sin(Math.PI * tr) * D * (mobile ? 0.05 : 0.1);
      rocket.position.set(sx - W / 2, H / 2 - sy, zLift);
      rocket.scale.setScalar(lerp(heroScale, 1, P));

      /* --- orientation --- */
      // Hero: a gentle sway that keeps the portholes and cockpit facing
      // the viewer; the barrel roll during travel lands facing front.
      const tilt = mobile ? -0.18 : -0.3;
      rocket.rotation.set(
        state.py * 0.18 * away + Math.sin(t * 0.7) * 0.03 * away * idle,
        (Math.sin(t * 0.5) * 0.35 * idle - 0.15) * away + TAU * P + state.px * 0.3 * away,
        lerp(tilt, 0, P) + (1 - intro) * 0.25 - state.px * 0.08 * away
      );
    }

    /* --- explode into a hologram, then assemble --- */
    const explode = smooth(0.45, 0.95, tr);
    const ghost = smooth(0.55, 1, tr);

    for (const seg of segs) {
      const k = seg.k;
      const a = clamp01((time - ASSEMBLY.start(k)) / ASSEMBLY.duration(k));
      const landed = power3Out(a);
      const vis = 1 - clamp01(a * 1.25);
      const off = -explodeOffset(k, moduleH) * explode * (1 - landed); // DOM down → world up
      seg.group.position.set(0, seg.baseY + off, 0);
      seg.group.rotation.y = explode * (1 - landed) * (k % 2 ? 0.45 : -0.45);
      seg.group.visible = vis > 0.002;

      const solidAlpha = vis * lerp(1, 0.16, ghost);
      seg.solids.forEach((m) => {
        m.opacity = solidAlpha;
        m.depthWrite = solidAlpha > 0.95;
      });
      seg.hullMat.emissiveIntensity = ghost * 0.35;
      seg.wires.forEach((m) => (m.opacity = vis * ghost * 0.7));
    }

    // nozzle + flame hand over to the DOM ones at touchdown
    const nozzleVis = 1 - smooth(0.88, 1, tr);
    nozzleGroup.position.y = nozzleGroup.userData.baseY;
    nozzleGroup.visible = nozzleVis > 0.002;
    nozzleMat.opacity = nozzleVis;
    nozzleMat.depthWrite = nozzleVis > 0.95;

    const thrust = lerp(1.3, 0.45, P) * (1 + (1 - intro) * 0.6);
    const flick = 1 + (Math.sin(t * 31) * 0.05 + Math.sin(t * 17.3) * 0.04) * idle;
    const fw = flame.userData.w || 52;
    flameOuter.scale.set(fw * 0.9, flameH * thrust * flick, fw * 0.9);
    flameInner.scale.set(fw * 0.9, flameH * thrust * 0.62 * flick, fw * 0.9);
    flameOuterMat.uniforms.uTime.value = t;
    flameInnerMat.uniforms.uTime.value = t + 0.37;
    flameOuterMat.uniforms.uAlpha.value = nozzleVis;
    flameInnerMat.uniforms.uAlpha.value = nozzleVis;
    flameGlow.scale.setScalar(fw * 2.6 * (0.9 + thrust * 0.3));
    flameGlow.position.y = -flameH * 0.12;
    flameGlow.material.opacity = 0.75 * nozzleVis * flick;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  /* ---------- launch mode: one continuous flight path ----------
     g ∈ [0, 2] along the whole journey (screen px, y down):
       0 → 1  lift-off: climbs along its tilted axis to the upper right
              of the hero, staying on screen
       1 → 2  the swoop: keeps climbing, banks over in a big loop (nose
              following its velocity) and rises nose-up into its slot in
              the Rocket section, where the hologram assembly takes over */
  const easeG = (u) => u * u * (3 - 2 * u);
  function pathAt(g, input, bob = 0) {
    const hero = input.hero;
    const flameH = flame.userData.h || 100;
    const heroScale = (hero.h * 0.94) / (L + flameH * 1.3);
    const tilt = heroTilt(mobile);
    const cy0 = hero.cy - (flameH * 1.3 * heroScale) / 2 + bob;
    // lift-off ends with the rocket's centre high on the right
    const climb = Math.max(0, cy0 - H * (mobile ? 0.3 : 0.26));
    // sideways drift along the tilt, kept inside narrow (phone) screens
    const drift = Math.max(0, Math.min(climb * Math.tan(-tilt), W * 0.74 - hero.cx));
    const lift = (P) => ({
      x: hero.cx + P * drift,
      y: cy0 - P * climb,
      s: heroScale * (1 - 0.15 * P),
    });
    if (g <= 1) {
      const p = lift(g * g); // accelerates like a real lift-off
      return { x: p.x, y: p.y, scale: p.s, rz: tilt };
    }
    const E = lift(1);
    const u = easeG(Math.min(1, g - 1));
    const dx3 = input.dest.cx;
    const dy3 = input.dest.top + L / 2;
    // cubic: carry on up-right, bank over the top of the screen to the
    // left (clear of the section copy), then come straight down onto
    // the slot
    const up = { x: -Math.sin(tilt), y: -Math.cos(tilt) };
    const reach = H * (mobile ? 0.16 : 0.22);
    const p1 = { x: Math.min(E.x + up.x * reach, W * 0.82), y: E.y + up.y * reach };
    const p2 = { x: dx3, y: dy3 - H * (mobile ? 0.4 : 0.55) };
    const v = 1 - u;
    const x = v * v * v * E.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * dx3;
    const y = v * v * v * E.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * dy3;
    const tx = 3 * v * v * (p1.x - E.x) + 6 * v * u * (p2.x - p1.x) + 3 * u * u * (dx3 - p2.x);
    const ty = 3 * v * v * (p1.y - E.y) + 6 * v * u * (p2.y - p1.y) + 3 * u * u * (dy3 - p2.y);
    // nose along the velocity (rz is counter-clockwise, screen y is down)…
    const vel = Math.hypot(tx, ty) > 1e-3 ? -Math.atan2(tx, -ty) : 0;
    // …until the landing flip: it pitches back upright and descends
    // tail-first on its flame (it approaches from the right, so the
    // heading stays in (−π, π) and blending to 0 is the short way)
    const flip = smooth(0.42, 0.86, u);
    // grows mostly after the flip, when it's upright and fits the screen
    return { x, y, scale: lerp(E.s, 1, u * u), rz: vel * (1 - flip) };
  }

  // keep the roll continuous through the loop (no ±π flips)
  const unwrap = (a, ref) => a + TAU * Math.round((ref - a) / TAU);

  /* exhaust smoke left along the path — puffs are anchored to fixed
     points of the route (not to the rocket), so each one stays where
     it was puffed out, then billows and thins as the rocket flies on.
     Fully driven by scroll position, so it's reversible. */
  const smokeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    // a few overlapping soft blobs → a cloudy, uneven puff
    [[64, 64, 52, 0.55], [46, 56, 34, 0.35], [80, 70, 36, 0.35], [62, 82, 30, 0.3], [70, 46, 28, 0.3]].forEach(([x, y, r, a]) => {
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(0.6, `rgba(255,255,255,${a * 0.35})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const SMOKE_STEP = 0.014; // route spacing between puffs
  const SMOKE_SPAN = 0.42; // how far back along the route smoke lingers
  const SMOKE_POOL = Math.ceil(SMOKE_SPAN / SMOKE_STEP) + 2;
  const smokeHot = new THREE.Color(0xffb468); // fresh, lit by the flame
  const smokeCold = new THREE.Color(0xcfc9c0); // cooled grey
  const hash = (n) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const puffs = Array.from({ length: SMOKE_POOL }, () => {
    const mat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false });
    allMaterials.push(mat);
    const sp = new THREE.Sprite(mat);
    sp.renderOrder = -1;
    sp.visible = false;
    scene.add(sp);
    return sp;
  });

  function drawSmoke(g, input, fade) {
    puffs.forEach((sp) => (sp.visible = false));
    if (fade <= 0.001 || g < 0.03) return;
    const j0 = Math.max(1, Math.ceil((g - SMOKE_SPAN) / SMOKE_STEP));
    const j1 = Math.floor(g / SMOKE_STEP);
    for (let j = j0; j <= j1; j++) {
      const at = j * SMOKE_STEP;
      const age = (g - at) / SMOKE_SPAN; // 0 fresh → 1 gone
      const p = pathAt(at, input);
      // puffed out of the nozzle, drifting a little off the line
      const half = (L / 2) * p.scale;
      const r1 = hash(j);
      const r2 = hash(j + 31.7);
      const spread = (r1 - 0.5) * 40 * age;
      const x = p.x + half * Math.sin(p.rz) + Math.cos(p.rz) * spread;
      const y = p.y + half * Math.cos(p.rz) - Math.sin(p.rz) * spread + age * 18;
      const sp = puffs[j % SMOKE_POOL];
      const size = (26 + age * 110 + r2 * 18) * (0.55 + p.scale * 0.6);
      sp.position.set(x - W / 2, H / 2 - y, -4);
      sp.scale.set(size, size, 1);
      sp.material.rotation = r1 * TAU + age * (r2 - 0.5) * 2;
      sp.material.color.copy(smokeHot).lerp(smokeCold, Math.min(1, age * 3));
      // fades in over the first bit, then thins out
      sp.material.opacity = Math.min(1, age * 12) * Math.pow(1 - age, 1.6) * 0.7 * fade;
      sp.visible = true;
    }
  }

  function launchFrame(t, tr, input) {
    renderer.domElement.style.visibility = 'visible';

    state.px += (state.tx - state.px) * 0.06;
    state.py += (state.ty - state.py) * 0.06;

    const idle = reducedMotion ? 0 : 1;
    const intro = state.intro;
    const flameH = flame.userData.h || 100;

    // Holds perfectly still until you scroll (no sway, bob or cursor
    // follow) — the hero backdrop streams past it instead, so it still
    // reads as flying.
    const p = pathAt(tr, input);
    const tilt = p.rz;
    // intro: flies in along its own exhaust line (from the horizon glow)
    const back = (1 - intro) * H * 0.75;
    const sy = p.y + back * Math.cos(tilt);
    const sx = p.x + back * Math.sin(tilt);
    state.roll = tilt;

    rocket.position.set(sx - W / 2, H / 2 - sy, 0);
    rocket.scale.setScalar(p.scale);
    rocket.rotation.set(0, -0.15, tilt + (1 - intro) * 0.25);
    drawSmoke(tr, input, 1);

    // solid rocket, no hologram
    for (const seg of segs) {
      seg.group.position.set(0, seg.baseY, 0);
      seg.group.rotation.y = 0;
      seg.group.visible = true;
      seg.solids.forEach((m) => {
        m.opacity = 1;
        m.depthWrite = true;
      });
      seg.hullMat.emissiveIntensity = 0;
      seg.wires.forEach((m) => (m.opacity = 0));
    }
    nozzleGroup.position.y = nozzleGroup.userData.baseY;
    nozzleGroup.visible = true;
    nozzleMat.opacity = 1;
    nozzleMat.depthWrite = true;

    // full burn on the way up
    const thrust = lerp(1.3, 2.6, smooth(0, 0.4, tr)) * (1 + (1 - intro) * 0.6);
    const flick = 1 + (Math.sin(t * 31) * 0.05 + Math.sin(t * 17.3) * 0.04) * idle;
    const fw = flame.userData.w || 52;
    flameOuter.scale.set(fw * 0.9, flameH * thrust * flick, fw * 0.9);
    flameInner.scale.set(fw * 0.9, flameH * thrust * 0.62 * flick, fw * 0.9);
    flameOuterMat.uniforms.uTime.value = t;
    flameInnerMat.uniforms.uTime.value = t + 0.37;
    flameOuterMat.uniforms.uAlpha.value = 1;
    flameInnerMat.uniforms.uAlpha.value = 1;
    flameGlow.scale.setScalar(fw * 2.6 * (0.9 + thrust * 0.3));
    flameGlow.position.y = -flameH * 0.12;
    flameGlow.material.opacity = 0.75 * flick;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  const wake = () => {
    if (running || destroyed) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  wake();

  return {
    state,
    setLayout,
    wake,
    setPointer(x, y) {
      state.tx = x;
      state.ty = y;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      Object.values(geo).forEach((g) => g.dispose());
      allMaterials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
