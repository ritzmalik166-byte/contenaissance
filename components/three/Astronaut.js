import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { glowTexture } from './spaceCommon';

/* =====================================================
   ASTRONAUT — procedural, full-body EVA suit modelled
   on a real spacewalk suit (EMU):
     - woven ripstop orthofabric with double-stitched panel
       seams and light grime (procedural normal + colour maps)
     - anatomical, adult proportions: tapered limbs (deltoid,
       forearm, thigh, calf), natural waist, real trousers
     - natural cloth folds (foldedLathe) bunching at joints,
       waist and ankles, with baked fold shading; orange bands
       sewn into the cloth, slim machined bearing rings
     - hard upper torso, chest display & control module
       with knobs, life-support backpack (PLSS) with the
       secondary oxygen pack, hoses and service panels
     - clear pressure bubble over a black visor reflecting
       space, round glowing lamp pods, orange crown stripe
     - brand chest module (∞ CONTENAISSANCE screen, orange
       lights + dial), dark harness with buckles, ribbed
       umbilical hose, glowing orange backpack side lights
     - dark grey gloves, knee guards, thigh pocket, chunky
       white boots with orange midsoles
     - brand-orange bands and an ∞ shoulder patch
   Rigged with shoulder / elbow / hip / knee pivots so it
   can float, tumble and raise its arm.

   createAstronaut(kit, { sunDir }) → {
     group,        // add to a scene; origin ≈ body centre
     height,       // world height at scale 1
     wrist,        // Object3D at the projector lens
     setPose({ arm, glow }),
     update(t),
   }
===================================================== */

const ORANGE = 0xd8692a; // burnt brand orange (less toy-bright)

/* ---------- procedural fabric (shared, built once) ---------- */
let FABRIC = null;
function fabricMaps() {
  if (FABRIC) return FABRIC;
  const N = 512;
  const h = new Float32Array(N * N);
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();
  const noise = new Float32Array(N * N).map(() => rnd());
  const at = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // fine ripstop/twill weave + a coarser ripstop grid
      const weave = Math.sin((x + y) * 2.2) * Math.sin((x - y) * 2.2) * 0.05;
      const grid = (x % 24 < 1 || y % 24 < 1) ? -0.04 : 0;
      // stitched panel seams: horizontal every 256px, vertical at the tile edge
      const sy = Math.abs(((y + 128) % 256) - 128);
      const sx = Math.min(x, N - x);
      let seam = 0;
      if (sy < 3) seam -= (3 - sy) * 0.2;
      if (sx < 3) seam -= (3 - sx) * 0.18;
      // double row of stitches either side of each seam
      if ((sy > 5 && sy < 8) || (sy > 11 && sy < 14)) if (x % 7 < 4) seam -= 0.07;
      if ((sx > 5 && sx < 8) || (sx > 11 && sx < 14)) if (y % 7 < 4) seam -= 0.07;
      // soft quilting puff between seams
      const puff = Math.sin(((y % 256) / 256) * Math.PI) * 0.1;
      h[y * N + x] = weave + grid + seam + puff + noise[y * N + x] * 0.035;
    }
  }

  // normal map from the height field
  const nc = document.createElement('canvas');
  nc.width = nc.height = N;
  const ng = nc.getContext('2d');
  const nimg = ng.createImageData(N, N);
  const S = 2.2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * S;
      const dy = (at(x, y + 1) - at(x, y - 1)) * S;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      nimg.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      nimg.data[i + 3] = 255;
    }
  }
  ng.putImageData(nimg, 0, 0);

  // colour map: off-white cloth, darker seams, faint wear
  const cc = document.createElement('canvas');
  cc.width = cc.height = N;
  const cg = cc.getContext('2d');
  const cimg = cg.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      // warm off-white cloth; seams and stitches pick up a little grime
      const v = 238 + (noise[y * N + x] - 0.5) * 7 + Math.min(0, h[y * N + x]) * 40;
      cimg.data[i] = v;
      cimg.data[i + 1] = v - 2;
      cimg.data[i + 2] = v - 7;
      cimg.data[i + 3] = 255;
    }
  }
  cg.putImageData(cimg, 0, 0);
  // scuffs: a few soft grey-brown smudges
  for (let k = 0; k < 22; k++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const r = 16 + rnd() * 50;
    const g = cg.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(120,110,95,${0.05 + rnd() * 0.07})`);
    g.addColorStop(1, 'rgba(120,110,95,0)');
    cg.fillStyle = g;
    cg.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  FABRIC = { normal: tex(nc, false), color: tex(cc, true) };
  return FABRIC;
}

/* the brand infinity (lemniscate) stroked at (cx, cy), half-width s */
function drawInfinity(g, cx, cy, s, color, width) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const d = 1 + Math.sin(a) ** 2;
    const x = cx + (Math.cos(a) / d) * s;
    const y = cy + ((Math.sin(a) * Math.cos(a)) / d) * s;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
}

const canvasTex = (c) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/* shoulder patch: black disc, orange infinity */
function patchTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#121212';
  g.beginPath();
  g.arc(64, 64, 63, 0, Math.PI * 2);
  g.fill();
  drawInfinity(g, 64, 64, 40, '#f08a2c', 11);
  return canvasTex(c);
}

/* chest module screen: dark glass, orange infinity + wordmark */
function chestScreenTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 144);
  bg.addColorStop(0, '#1a1a1c');
  bg.addColorStop(1, '#0b0b0c');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 144);
  drawInfinity(g, 128, 58, 46, '#f39a32', 12);
  g.fillStyle = '#f4f1ea';
  g.font = '600 19px Arial, Helvetica, sans-serif';
  g.textAlign = 'center';
  g.fillText('CONTENAISSANCE', 128, 122);
  return canvasTex(c);
}

/* visor: black glass reflecting deep space — stars, a faint galactic
   band and a warm orange glow along the lower rim */
function visorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(110, 100, 10, 128, 128, 190);
  bg.addColorStop(0, '#0b0d16');
  bg.addColorStop(1, '#010103');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  // galactic band across the middle
  g.save();
  g.translate(128, 150);
  g.rotate(-0.25);
  const band = g.createLinearGradient(0, -40, 0, 40);
  band.addColorStop(0, 'rgba(120,110,170,0)');
  band.addColorStop(0.5, 'rgba(170,150,200,0.28)');
  band.addColorStop(1, 'rgba(120,110,170,0)');
  g.fillStyle = band;
  g.fillRect(-200, -40, 400, 80);
  g.restore();
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const a = 0.25 + rnd() * 0.75;
    g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    const r = rnd() < 0.08 ? 1.4 : 0.7;
    g.fillRect(rnd() * 256, rnd() * 256, r, r);
  }
  // warm sunrise glow reflected along the lower rim
  const rim = g.createRadialGradient(170, 330, 120, 170, 330, 175);
  rim.addColorStop(0, 'rgba(255,120,30,0)');
  rim.addColorStop(0.75, 'rgba(255,135,40,0.6)');
  rim.addColorStop(1, 'rgba(255,135,40,0)');
  g.fillStyle = rim;
  g.fillRect(0, 0, 256, 256);
  // soft highlight streak, upper left
  g.globalCompositeOperation = 'lighter';
  const hl = g.createLinearGradient(30, 20, 90, 120);
  hl.addColorStop(0, 'rgba(255,255,255,0)');
  hl.addColorStop(0.5, 'rgba(255,255,255,0.22)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.beginPath();
  g.ellipse(70, 70, 22, 60, 0.6, 0, Math.PI * 2);
  g.fill();
  return canvasTex(c);
}

export function createAstronaut(kit, { sunDir } = {}) {
  const env = kit.environment(sunDir);
  const segs = kit.mobile ? 20 : 36;
  const fab = fabricMaps();

  /* ---------- materials ---------- */
  // orthofabric: matte, woven, slightly warm white
  const suit = new THREE.MeshPhysicalMaterial({
    color: 0xf2efe8,
    map: fab.color,
    normalMap: fab.normal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.92,
    sheen: 0.55,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(0xf6efe2),
    envMap: env,
    envMapIntensity: 0.35,
  });
  // Soft fabric limbs / torso / trousers (foldedLathe): same cloth, but
  // shaded per vertex so fold valleys darken (baked occlusion) and the
  // orange bands + stitch lines are woven into the same surface.
  const suitFold = suit.clone();
  suitFold.vertexColors = true;
  // bellows folds: same cloth, a touch darker so the pleats read
  const pleat = suit.clone();
  pleat.color = new THREE.Color(0xdcd8d0);
  // painted composite hard parts (HUT, backpack, helmet shell): satin,
  // not glossy plastic, with a faint woven texture under the paint
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xece9e2,
    roughness: 0.55,
    normalMap: fab.normal,
    normalScale: new THREE.Vector2(0.12, 0.12),
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
    envMap: env,
    envMapIntensity: 0.55,
  });
  // boot uppers: coated off-white leather/fabric
  const bootMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8e4dc,
    roughness: 0.68,
    normalMap: fab.normal,
    normalScale: new THREE.Vector2(0.3, 0.3),
    sheen: 0.3,
    sheenColor: new THREE.Color(0xf4ede0),
    envMap: env,
    envMapIntensity: 0.45,
  });
  // waist belt webbing
  const webbing = new THREE.MeshPhysicalMaterial({
    color: 0xd9d5cc,
    map: fab.color,
    normalMap: fab.normal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.9,
    sheen: 0.4,
    envMap: env,
    envMapIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.MeshStandardMaterial({ color: 0xc8c6c0, roughness: 0.6, envMap: env, envMapIntensity: 0.5 });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xa9adb3,
    metalness: 1,
    roughness: 0.32,
    envMap: env,
    envMapIntensity: 1,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x34373d,
    metalness: 0.7,
    roughness: 0.45,
    envMap: env,
  });
  // dark grey gloves with near-black grip pads (as in the reference)
  const glove = new THREE.MeshPhysicalMaterial({
    color: 0x5a5b5f,
    map: fab.color,
    normalMap: fab.normal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.8,
    sheen: 0.3,
    envMap: env,
    envMapIntensity: 0.4,
  });
  const gloveFold = glove.clone();
  gloveFold.vertexColors = true;
  const grip = new THREE.MeshStandardMaterial({ color: 0x2b2c2f, roughness: 0.95 });
  // harness webbing + buckles
  const strap = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.85, envMap: env, envMapIntensity: 0.3 });
  const buckle = new THREE.MeshStandardMaterial({ color: 0x8e9196, metalness: 0.9, roughness: 0.35, envMap: env });
  // glossy orange hard parts (boot midsoles, helmet stripe)
  const orangeHard = new THREE.MeshPhysicalMaterial({
    color: ORANGE,
    roughness: 0.45,
    clearcoat: 0.3,
    envMap: env,
    envMapIntensity: 0.5,
  });
  // self-lit orange indicator lights
  const glowOrange = new THREE.MeshBasicMaterial({ color: 0xffa340, toneMapped: false });
  const orange = new THREE.MeshPhysicalMaterial({
    color: ORANGE,
    map: fab.color,
    normalMap: fab.normal,
    roughness: 0.85,
    envMap: env,
    envMapIntensity: 0.4,
  });
  // Black glass visor reflecting deep space (stars, galactic band, an
  // orange glow along the lower rim). Painted in, since real space
  // would reflect nothing and read as a flat black hole.
  const visorTex = visorTexture();
  const visor = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: visorTex,
    emissive: 0xffffff,
    emissiveMap: visorTex,
    emissiveIntensity: 0.55,
    metalness: 0.2,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMap: env,
    envMapIntensity: 0.7,
  });
  // clear polycarbonate pressure bubble over the visor
  const bubble = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    envMap: env,
    envMapIntensity: 2.2,
  });
  const sole = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.95, envMap: env, envMapIntensity: 0.2 });
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0xbfbcb5, roughness: 0.7, envMap: env });
  const screen = new THREE.MeshBasicMaterial({ color: 0xf3c94f, toneMapped: false });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff4d6, toneMapped: false });
  const patch = new THREE.MeshStandardMaterial({ map: patchTexture(), roughness: 0.8 });
  const chestScreen = new THREE.MeshBasicMaterial({ map: chestScreenTexture(), toneMapped: false });


  /* ---------- helpers ---------- */
  const mesh = (geo, mat, parent, [x = 0, y = 0, z = 0] = [], rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(m);
    return m;
  };
  const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 8, segs);
  const ring = (R, tube) => new THREE.TorusGeometry(R, tube, 12, segs * 2);
  const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 4, r);
  // a slim two-tone machined bearing ring
  const bearing = (parent, r, y, rot = [Math.PI / 2, 0, 0]) => {
    const g = new THREE.Group();
    g.position.y = y;
    g.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(g);
    mesh(ring(r, r * 0.09), metal, g);
    mesh(ring(r * 1.015, r * 0.045), darkMetal, g, [0, 0, r * 0.08]);
    return g;
  };

  /* Soft fabric segment (limb, torso, trousers): a lathe around the
     local y axis from an anatomical profile, then pushed in and out by
     natural cloth folds — wavy compression rings that drift around the
     limb plus a few diagonal twist folds — strongest where `fold` is
     high (joints, waist, ankles). Fold valleys are darkened through
     vertex colours (baked occlusion); orange bands and stitch seams are
     painted into the same vertex colours so they sit flush with the
     cloth instead of floating on it.
       profile: [[radius, y, fold 0..1], …] listed top → bottom
       bands:   [[yTop, yBottom], …] in brand orange */
  const ORANGE_LIN = new THREE.Color(ORANGE);
  const foldedLathe = (profile, { seed = 1, amp = 0.011, scaleZ = 1, bands = [], seamBack = true } = {}) => {
    // densify the profile (bottom → top so the lathe faces outward)
    const src = profile.slice().reverse();
    const pts = [];
    const folds = [];
    for (let k = 0; k < src.length - 1; k++) {
      const [r0, y0, f0] = src[k];
      const [r1, y1, f1] = src[k + 1];
      const n = Math.max(2, Math.ceil(Math.abs(y1 - y0) / 0.008));
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const e = t * t * (3 - 2 * t); // smooth radius blend between keys
        pts.push(new THREE.Vector2(r0 + (r1 - r0) * e, y0 + (y1 - y0) * t));
        folds.push(f0 + (f1 - f0) * t);
      }
    }
    const last = src[src.length - 1];
    pts.push(new THREE.Vector2(last[0], last[1]));
    folds.push(last[2]);

    const radial = segs * 2;
    const geo = new THREE.LatheGeometry(pts, radial);
    const pos = geo.attributes.position;
    const P = pts.length;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i <= radial; i++) {
      const phi = (i / radial) * Math.PI * 2;
      for (let j = 0; j < P; j++) {
        const v = i * P + j;
        const y = pts[j].y;
        const r = pts[j].x;
        const f = folds[j];
        // compression folds ripple round the limb, plus twist folds
        const n =
          0.55 * Math.sin(y * 92 + 1.6 * Math.sin(phi * 2 + seed) + seed * 3.1) +
          0.3 * Math.sin(y * 155 + 2.2 * Math.sin(phi * 3 - seed * 1.7)) +
          0.22 * Math.sin(phi * 5 + y * 34 + seed * 2.3);
        // fabric drapes in soft ridges: sharpen the crests a little
        const d = r > 0.002 ? amp * (0.25 + 0.75 * f) * Math.sign(n) * Math.abs(n) ** 0.8 : 0;
        const rr = r + d;
        pos.setXYZ(v, rr * Math.sin(phi), y, rr * Math.cos(phi) * scaleZ);
        // shade: valleys darker, ridges catch a touch more light
        let shade = 0.93 + (d / amp) * 0.09;
        // stitch seam down the back of each panel
        if (seamBack && Math.abs(phi - Math.PI) < 0.025) shade *= 0.8;
        const band = bands.find(([a, b]) => y <= a && y >= b);
        if (band) {
          c.copy(ORANGE_LIN).multiplyScalar(shade / 0.93);
          // stitched edges of the band
          if (band[0] - y < 0.004 || y - band[1] < 0.004) c.multiplyScalar(0.72);
        } else {
          c.setRGB(shade, shade, shade);
        }
        col[v * 3] = c.r;
        col[v * 3 + 1] = c.g;
        col[v * 3 + 2] = c.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    // repeat the weave around the limb so it isn't stretched
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 3, uv.getY(k) * 1.5);
    return geo;
  };
  // a flat webbing strap wrapped round a limb at height y (sits on the
  // cloth, clear of its folds) — instead of a thin, wire-like torus
  const strapBand = (parent, profile, y, h = 0.024, amp = 0.012) => {
    const rr = radiusAt(profile, y) + amp * 0.35 + 0.001;
    const m = mesh(new THREE.CylinderGeometry(rr, rr, h, segs * 2, 1, true), strap, parent, [0, y, 0]);
    // stitched edges
    [h / 2, -h / 2].forEach((dy) => mesh(ring(rr + 0.0006, 0.0016), darkMetal, parent, [0, y + dy * 0.8, 0], [Math.PI / 2, 0, 0]));
    return m;
  };
  // radius of a profile at height y (for parts that must sit on it)
  const radiusAt = (profile, y) => {
    for (let k = 0; k < profile.length - 1; k++) {
      const [r0, y0] = profile[k];
      const [r1, y1] = profile[k + 1];
      if (y <= y0 && y >= y1) return r0 + ((r1 - r0) * (y0 - y)) / (y0 - y1);
    }
    return profile[profile.length - 1][0];
  };

  const group = new THREE.Group();
  const body = new THREE.Group(); // pelvis-origin rig
  body.position.y = -0.05; // centre the bounding box on the group origin (legs are adult-length now)
  group.add(body);
  // upper body pivots at the pelvis (twist / lean / breathe)
  const spine = new THREE.Group();
  body.add(spine);

  /* ---------- torso ---------- */
  // Human torso: broad chest, tapering to a natural waist, soft cloth
  // folds bunching at the waist where the upper suit meets the trousers.
  const TORSO = [
    [0.0, 0.78, 0], [0.2, 0.77, 0], [0.29, 0.7, 0.05], [0.312, 0.6, 0.1], [0.3, 0.48, 0.2],
    [0.266, 0.34, 0.45], [0.246, 0.2, 0.85], [0.248, 0.08, 1], [0.252, -0.0, 0.8], [0.25, -0.04, 0.5],
  ];
  mesh(foldedLathe(TORSO, { seed: 2, amp: 0.009, scaleZ: 0.76 }), suitFold, spine);

  // hard upper torso: a sculpted composite breastplate (softer edges,
  // follows the chest instead of reading as a box)
  const hut = mesh(rbox(0.56, 0.35, 0.19, 0.085), shell, spine, [0, 0.57, 0.11]);
  hut.rotation.x = -0.08;
  hut.scale.set(1, 1, 0.92);
  // shoulder yokes of the HUT, sloping with the shoulders
  [-1, 1].forEach((s) => {
    const yoke = mesh(rbox(0.2, 0.1, 0.3, 0.045), shell, spine, [s * 0.215, 0.71, -0.02]);
    yoke.rotation.z = s * -0.3;
  });

  // chest control module: a big white box with the brand screen,
  // two orange indicator lights and a round orange dial
  const dcm = mesh(rbox(0.27, 0.24, 0.1, 0.03), shell, spine, [0, 0.5, 0.26]);
  dcm.rotation.x = 0.1;
  mesh(rbox(0.22, 0.125, 0.012, 0.012), darkMetal, dcm, [0, 0.04, 0.048]);
  mesh(new THREE.PlaneGeometry(0.205, 0.112), chestScreen, dcm, [0, 0.04, 0.0552]);
  const ledGeo = rbox(0.026, 0.014, 0.012, 0.005);
  [-0.075, -0.04].forEach((x) => mesh(ledGeo, glowOrange, dcm, [x, -0.075, 0.05]));
  mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.014, 24), darkMetal, dcm, [0.075, -0.075, 0.05], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.016, 24), glowOrange, dcm, [0.075, -0.075, 0.054], [Math.PI / 2, 0, 0]);
  // small orange light on the collar, under the helmet ring
  mesh(rbox(0.05, 0.018, 0.02, 0.006), glowOrange, spine, [0, 0.735, 0.19], [-0.5, 0, 0]);

  // harness: shoulder straps down to the chest module, side straps
  // to the belt, metal buckles at the joins
  const strapSeg = (parent, a, b, w = 0.045, t = 0.012) => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const m = mesh(new THREE.BoxGeometry(w, A.distanceTo(B), t), strap, parent);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  };
  const buckleGeo = rbox(0.055, 0.03, 0.018, 0.006);
  [-1, 1].forEach((s) => {
    // over the shoulder yoke, down the front of the chest
    strapSeg(spine, [s * 0.17, 0.77, -0.1], [s * 0.17, 0.79, 0.07]);
    strapSeg(spine, [s * 0.17, 0.79, 0.07], [s * 0.16, 0.66, 0.225]);
    // (z follows the chest plate, then the cloth below it)
    strapSeg(spine, [s * 0.16, 0.66, 0.222], [s * 0.165, 0.4, 0.222]);
    strapSeg(spine, [s * 0.165, 0.4, 0.222], [s * 0.172, 0.12, 0.2]);
    mesh(buckleGeo, buckle, spine, [s * 0.16, 0.6, 0.232]);
    mesh(buckleGeo, buckle, spine, [s * 0.168, 0.3, 0.218]);
  });

  // trousers: a soft pelvis/seat that the legs grow out of, with folds
  // at the waistband and across the hips (replaces the old ball hips)
  const PANTS = [
    [0.244, 0.07, 0.6], [0.258, 0.0, 0.9], [0.27, -0.06, 0.6], [0.268, -0.12, 0.45],
    [0.238, -0.17, 0.35], [0.17, -0.205, 0.2], [0.08, -0.222, 0.05], [0.0, -0.226, 0],
  ];
  mesh(foldedLathe(PANTS, { seed: 5, amp: 0.008, scaleZ: 0.8 }), suitFold, body);

  // belt: stitched webbing band hugging the waist, a machined buckle
  // with a dark tongue in front, and two dark keepers
  {
    const r = radiusAt(TORSO, 0.11) + 0.012;
    const band = mesh(new THREE.CylinderGeometry(r, r + 0.002, 0.05, segs * 2, 1, true), webbing, body, [0, 0.11, 0]);
    band.scale.z = 0.76;
    // stitch rows along both edges of the webbing
    [0.13, 0.09].forEach((y) => {
      const st = mesh(ring(r + 0.002, 0.0018), strap, body, [0, y, 0], [Math.PI / 2, 0, 0]);
      st.scale.y = 0.76;
    });
    const front = r * 0.76;
    const bk = mesh(rbox(0.085, 0.056, 0.016, 0.008), buckle, body, [0, 0.11, front + 0.006]);
    mesh(rbox(0.05, 0.026, 0.01, 0.006), darkMetal, bk, [0, 0, 0.007]);
    [-1, 1].forEach((s) => {
      const x = s * 0.075;
      const z = 0.76 * Math.sqrt(r * r - x * x);
      mesh(rbox(0.014, 0.058, 0.014, 0.004), strap, body, [x, 0.11, z + 0.002], [0, Math.atan2(x, z / 0.76) * 0.8, 0]);
    });
  }

  // neck ring (helmet disconnect)
  bearing(spine, 0.17, 0.79);

  /* ---------- helmet ---------- */
  const neck = new THREE.Group(); // head look pivot
  neck.position.set(0, 0.8, 0);
  spine.add(neck);
  const helmet = new THREE.Group();
  helmet.position.set(0, 0.21, 0.02);
  neck.add(helmet);
  // a helmet is a little taller than wide and deeper than wide — a
  // perfect sphere reads as a toy
  helmet.scale.set(0.97, 1.03, 1.02);
  // extravehicular visor assembly shell: polished composite
  const helmetShell = shell.clone();
  helmetShell.roughness = 0.32;
  helmetShell.clearcoat = 0.6;
  helmetShell.clearcoatRoughness = 0.18;
  helmetShell.normalScale = new THREE.Vector2(0.05, 0.05);
  mesh(new THREE.SphereGeometry(0.25, segs * 2, segs), helmetShell, helmet);
  // black rubber gasket framing the visor opening
  const gasket = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.7, envMap: env, envMapIntensity: 0.3 });
  mesh(
    new THREE.SphereGeometry(0.2595, segs * 2, 3, Math.PI / 2 - 1.06, 2.12, 0.55, 0.035),
    gasket,
    helmet
  );
  // …and down both sides of it (thin meridian strips on the visor edges)
  [-1, 1].forEach((s) => {
    const edge = Math.PI / 2 + s * 1.02;
    mesh(new THREE.SphereGeometry(0.2595, 3, segs, edge - 0.02, 0.04, 0.56, 1.4), gasket, helmet);
  });
  // black space visor: front cap of a slightly larger sphere (front = +z)
  mesh(
    new THREE.SphereGeometry(0.258, segs * 2, segs, Math.PI / 2 - 1.02, 2.04, 0.58, 1.38),
    visor,
    helmet
  );
  // orange stripe over the crown, front to back (as in the reference)
  {
    // (arc ends short of the visor's top edge so it never overlaps it)
    const A = 1.1;
    const geo = new THREE.TorusGeometry(0.252, 0.016, 8, segs * 2, A);
    geo.rotateZ(Math.PI / 2 - A / 2 - 0.05); // arc centred just behind the top
    geo.rotateY(Math.PI / 2); // into the y-z plane (+x → back)
    const stripe = mesh(geo, orangeHard, helmet);
    stripe.scale.set(1.03, 1, 1);
  }
  // visor frame: brow ridge + side pivots
  mesh(
    new THREE.SphereGeometry(0.266, segs * 2, 6, Math.PI / 2 - 1.05, 2.1, 0.5, 0.16),
    shell,
    helmet
  );
  mesh(
    new THREE.SphereGeometry(0.262, segs * 2, 4, Math.PI / 2 - 1.02, 2.04, 1.92, 0.06),
    darkMetal,
    helmet
  );
  // clear pressure bubble over the front
  mesh(
    new THREE.SphereGeometry(0.272, segs * 2, segs, Math.PI / 2 - 1.15, 2.3, 0.35, 1.7),
    bubble,
    helmet
  );
  // round lamp pods on both temples, glowing white lenses facing forward
  const lampGlowMat = new THREE.SpriteMaterial({
    map: glowTexture('#fff4d6'),
    color: 0xfff4d6,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  [-1, 1].forEach((s) => {
    const pod = new THREE.Group();
    pod.position.set(s * 0.262, 0.11, 0.07);
    pod.rotation.y = s * 0.35; // splayed slightly outward
    helmet.add(pod);
    mesh(rbox(0.04, 0.035, 0.09, 0.01), darkMetal, helmet, [s * 0.24, 0.1, 0.0]);
    mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.085, segs), shell, pod, [0, 0, 0], [Math.PI / 2, 0, 0]);
    mesh(ring(0.038, 0.008), darkMetal, pod, [0, 0, 0.044]);
    mesh(new THREE.CircleGeometry(0.032, 24), lamp, pod, [0, 0, 0.044]);
    const glow = new THREE.Sprite(lampGlowMat);
    glow.scale.setScalar(0.16);
    glow.position.z = 0.06;
    pod.add(glow);
  });

  /* ---------- backpack (PLSS + secondary oxygen pack) ---------- */
  const pack = mesh(rbox(0.56, 0.62, 0.26, 0.05), shell, spine, [0, 0.45, -0.31]);
  // service panels and vents on the back face
  mesh(rbox(0.4, 0.22, 0.02, 0.01), panel, pack, [0, 0.14, -0.13]);
  mesh(rbox(0.18, 0.18, 0.02, 0.01), panel, pack, [-0.12, -0.13, -0.13]);
  const ventGeo = new THREE.BoxGeometry(0.14, 0.008, 0.012);
  for (let i = 0; i < 5; i++) mesh(ventGeo, darkMetal, pack, [0.13, -0.06 - i * 0.03, -0.135]);
  mesh(rbox(0.06, 0.24, 0.03, 0.01), orange, pack, [0.24, 0.12, -0.12]);
  // glowing orange light strips + status lights down both sides
  const packGlowMat = new THREE.SpriteMaterial({
    map: glowTexture('#ffa340'),
    color: 0xffa340,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  [-1, 1].forEach((s) => {
    mesh(rbox(0.014, 0.42, 0.06, 0.006), glowOrange, pack, [s * 0.283, 0.02, 0.03]);
    [0.2, 0.13].forEach((y) => mesh(rbox(0.012, 0.03, 0.03, 0.005), glowOrange, pack, [s * 0.283, y + 0.08, -0.07]));
    const g = new THREE.Sprite(packGlowMat);
    g.scale.set(0.22, 0.6, 1);
    g.position.set(s * 0.3, 0.02, 0.03);
    pack.add(g);
  });
  // SOP: secondary oxygen pack hung under the PLSS
  const sop = mesh(rbox(0.5, 0.14, 0.22, 0.04), shell, pack, [0, -0.39, 0.01]);
  mesh(rbox(0.44, 0.03, 0.2, 0.01), darkMetal, sop, [0, 0.085, 0]);

  // MMU thruster nozzles (puffs are emitted by the host scene)
  const nozzles = [];
  const nozzleGeo = new THREE.CylinderGeometry(0.022, 0.036, 0.05, 12);
  [[-0.22, -0.31], [0.22, -0.31], [-0.22, 0.31], [0.22, 0.31]].forEach(([x, y]) => {
    const n = mesh(nozzleGeo, darkMetal, pack, [x, y, -0.09], [y < 0 ? Math.PI : 0, 0, 0]);
    const out = new THREE.Object3D();
    out.position.y = 0.05;
    n.add(out);
    nozzles.push(out);
  });

  // blinking beacon + antenna on top of the pack
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3b2f, toneMapped: false });
  mesh(new THREE.SphereGeometry(0.02, 12, 8), beaconMat, pack, [0.18, 0.32, -0.02]);
  mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6), metal, pack, [-0.2, 0.39, -0.04]);
  const beaconGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('#ff3b2f'),
      color: 0xff3b2f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beaconGlow.scale.setScalar(0.22);
  beaconGlow.position.set(0.18, 0.32, -0.02);
  pack.add(beaconGlow);

  // umbilical hose: one thick, ribbed hose from under the chest module,
  // looping down the astronaut's right side and back into the pack
  {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, 0.38, 0.29),
      new THREE.Vector3(-0.12, 0.26, 0.29),
      new THREE.Vector3(-0.26, 0.2, 0.22),
      new THREE.Vector3(-0.35, 0.24, 0.02),
      new THREE.Vector3(-0.27, 0.36, -0.19),
    ]);
    mesh(new THREE.TubeGeometry(curve, 48, 0.026, 12, false), hoseMat, spine);
    const ribGeo = ring(0.027, 0.006);
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 1; i < 28; i++) {
      const u = i / 28;
      const rib = mesh(ribGeo, hoseMat, spine);
      rib.position.copy(curve.getPointAt(u));
      rib.quaternion.setFromUnitVectors(up, curve.getTangentAt(u));
    }
    const end = curve.getPoint(0);
    mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 16), metal, spine, [end.x, end.y, end.z]);
  }

  /* ---------- arms ---------- */
  const arm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.34, 0.62, 0);
    spine.add(shoulder);
    // rounded deltoid under the yoke
    const delt = mesh(new THREE.SphereGeometry(0.102, segs, segs / 2), suit, shoulder, [side * 0.005, -0.005, 0]);
    delt.scale.set(1, 1.05, 0.95);
    // Upper arm: full at the deltoid, tapering to the elbow; cloth
    // gathers under the shoulder and bunches at the elbow crease.
    // The brand-orange band is sewn into the sleeve.
    const UPPER_ARM = [
      [0.099, 0.03, 0.3], [0.1, -0.02, 0.9], [0.097, -0.08, 1], [0.093, -0.13, 0.45],
      [0.09, -0.18, 0.12], [0.087, -0.24, 0.12], [0.083, -0.3, 0.7], [0.08, -0.35, 1], [0.079, -0.39, 1],
    ];
    mesh(foldedLathe(UPPER_ARM, { seed: 3 + side, bands: [[-0.23, -0.27]] }), suitFold, shoulder);
    // brand patch on the outside of the left upper arm, above the band
    if (side > 0) {
      const r = radiusAt(UPPER_ARM, -0.175) + 0.004;
      mesh(new THREE.CircleGeometry(0.044, 32), patch, shoulder, [r, -0.175, 0], [0, Math.PI / 2, 0]);
    }

    const elbow = new THREE.Group();
    elbow.position.y = -0.37;
    shoulder.add(elbow);
    mesh(new THREE.SphereGeometry(0.081, segs, segs / 2), suit, elbow);
    // Forearm: bunched below the elbow, tapering to a slim wrist.
    // The left band sits above the wrist projector.
    const FOREARM = [
      [0.082, 0.04, 1], [0.08, -0.02, 1], [0.078, -0.08, 0.6], [0.075, -0.14, 0.2],
      [0.07, -0.22, 0.12], [0.066, -0.28, 0.3], [0.064, -0.32, 0.5], [0.065, -0.345, 0.2],
    ];
    mesh(
      foldedLathe(FOREARM, { seed: 7 + side, amp: 0.009, bands: [side > 0 ? [-0.08, -0.12] : [-0.18, -0.22]] }),
      suitFold,
      elbow
    );
    // wrist disconnect: slim metal ring + dark cuff
    bearing(elbow, 0.069, -0.315);
    mesh(ring(0.068, 0.009), strap, elbow, [0, -0.335, 0], [Math.PI / 2, 0, 0]);

    // glove: flared gauntlet with soft folds, a shaped palm, two-jointed
    // fingers with grip pads, an opposed thumb
    const hand = new THREE.Group();
    hand.position.y = -0.38;
    elbow.add(hand);
    const GAUNTLET = [[0.074, 0.075, 0.3], [0.071, 0.045, 0.8], [0.063, 0.01, 1], [0.056, -0.015, 0.6]];
    mesh(foldedLathe(GAUNTLET, { seed: 9 + side, amp: 0.006, seamBack: false }), gloveFold, hand);
    const palm = mesh(rbox(0.1, 0.105, 0.05, 0.024), glove, hand, [0, -0.045, 0]);
    palm.scale.set(1, 1, 0.95);
    mesh(rbox(0.09, 0.075, 0.01, 0.005), grip, palm, [0, -0.008, -0.026]); // palm pad
    mesh(rbox(0.085, 0.035, 0.014, 0.007), pleat, palm, [0, 0.018, 0.024]); // back-of-hand knuckle guard
    const seg1 = capsule(0.0165, 0.028);
    const seg2 = capsule(0.0148, 0.024);
    [-0.034, -0.0115, 0.0115, 0.034].forEach((fx, i) => {
      const len = 1 - Math.abs(fx) * 3.2; // middle fingers longest
      const f1 = new THREE.Group();
      f1.position.set(fx, -0.098 + Math.abs(fx) * 0.22, -0.004);
      f1.rotation.set(-0.28 - i * 0.03, 0, fx * -0.9); // relaxed curl, slight splay
      palm.add(f1);
      mesh(seg1, glove, f1, [0, -0.02 * len, 0]).scale.y = len;
      const f2 = new THREE.Group();
      f2.position.y = -0.042 * len;
      f2.rotation.x = -0.4;
      f1.add(f2);
      mesh(seg2, glove, f2, [0, -0.017 * len, 0]).scale.y = len;
      mesh(new THREE.SphereGeometry(0.0115, 10, 8), grip, f2, [0, -0.032 * len, -0.006]);
    });
    const thumb = new THREE.Group();
    thumb.position.set(side * -0.05, -0.03, 0.01);
    thumb.rotation.set(0.35, 0, side * 0.8);
    palm.add(thumb);
    mesh(capsule(0.019, 0.026), glove, thumb, [0, -0.02, 0]);
    const thumb2 = new THREE.Group();
    thumb2.position.y = -0.042;
    thumb2.rotation.z = side * 0.25;
    thumb.add(thumb2);
    mesh(capsule(0.0165, 0.02), glove, thumb2, [0, -0.014, 0]);
    mesh(new THREE.SphereGeometry(0.013, 10, 8), grip, thumb2, [0, -0.028, -0.005]);

    return { shoulder, elbow, hand };
  };
  const armR = arm(-1); // astronaut's right (viewer's left)
  const armL = arm(1); // astronaut's left — carries the projector

  // wrist holo-projector on the left forearm (cuff-mounted unit)
  const device = mesh(rbox(0.11, 0.07, 0.13, 0.02), darkMetal, armL.elbow, [0, -0.22, 0.075]);
  mesh(rbox(0.12, 0.02, 0.14, 0.008), metal, device, [0, -0.04, 0]);
  const screenMesh = mesh(new THREE.PlaneGeometry(0.08, 0.1), screen, device, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  screenMesh.position.y = 0.036;
  screenMesh.rotation.set(-Math.PI / 2, 0, 0);
  const wrist = new THREE.Object3D(); // projector lens
  wrist.position.set(0, 0.05, 0);
  device.add(wrist);
  const deviceGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('#f3c94f'),
      color: 0xf3c94f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  deviceGlow.scale.setScalar(0.45);
  wrist.add(deviceGlow);
  const deviceLight = new THREE.PointLight(0xf3c94f, 0, 1.6, 2);
  wrist.add(deviceLight);

  /* ---------- legs ---------- */
  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.1, 0);
    body.add(hip);
    // Thigh: full at the hip, tapering to the knee; folds at the groin
    // and where the trousers gather over the knee. Orange band sewn in.
    const THIGH = [
      [0.118, 0.04, 0.4], [0.12, -0.03, 0.8], [0.117, -0.1, 0.35], [0.111, -0.2, 0.15],
      [0.105, -0.3, 0.2], [0.1, -0.4, 0.8], [0.099, -0.47, 1],
    ];
    mesh(foldedLathe(THIGH, { seed: 11 + side, amp: 0.012, bands: [[-0.3, -0.345]] }), suitFold, hip);
    // harness leg loop round the top of the thigh
    strapBand(hip, THIGH, -0.07);
    // cargo pocket on the right thigh (front-outer): a soft gusseted
    // pocket with a flap and a stitched edge
    if (side < 0) {
      const pocket = mesh(rbox(0.095, 0.13, 0.04, 0.018), suit, hip, [-0.06, -0.2, 0.108], [0, -0.5, 0]);
      mesh(rbox(0.1, 0.042, 0.046, 0.014), pleat, pocket, [0, 0.055, 0.003]);
      mesh(rbox(0.02, 0.012, 0.006, 0.003), buckle, pocket, [0, 0.04, 0.026]);
    }

    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);
    mesh(new THREE.SphereGeometry(0.099, segs, segs / 2), suit, knee);
    // padded knee guard: a curved, quilted pad (not a box) on a strap
    const padGeo = new THREE.SphereGeometry(0.11, segs, segs / 2, Math.PI / 2 - 0.85, 1.7, Math.PI / 2 - 0.75, 1.5);
    const pad = mesh(padGeo, shell, knee, [0, -0.01, 0.0]);
    pad.scale.set(1, 1.08, 1.05);
    mesh(new THREE.SphereGeometry(0.1105, segs, 4, Math.PI / 2 - 0.55, 1.1, Math.PI / 2 - 0.45, 0.9), panel, knee, [0, -0.01, 0.002]).scale.set(1, 1.08, 1.06);
    // Shin + calf: the calf swells behind, the trouser leg narrows,
    // then stacks in soft folds above the boot. Orange cuff band.
    const SHIN = [
      [0.1, 0.05, 1], [0.099, -0.02, 0.9], [0.098, -0.1, 0.35], [0.097, -0.16, 0.15],
      [0.091, -0.24, 0.15], [0.085, -0.31, 0.45], [0.09, -0.36, 1], [0.096, -0.4, 1],
      [0.088, -0.44, 0.6], [0.078, -0.47, 0.2], // stacks over the boot top, tucks in below
    ];
    mesh(foldedLathe(SHIN, { seed: 13 + side, amp: 0.012, bands: [[-0.285, -0.32]] }), suitFold, knee);
    strapBand(knee, SHIN, -0.115, 0.022); // holds the knee guard

    const boot = new THREE.Group();
    boot.position.y = -0.47;
    knee.add(boot);
    // Sculpted boot upper from a side profile: heel counter, ankle
    // shaft, instep slope and a rounded, slightly sprung toe.
    {
      const s = new THREE.Shape();
      s.moveTo(-0.08, -0.085);
      s.lineTo(0.15, -0.085);
      s.quadraticCurveTo(0.205, -0.085, 0.205, -0.05);
      s.quadraticCurveTo(0.2, -0.015, 0.15, -0.005);
      s.quadraticCurveTo(0.085, 0.01, 0.055, 0.06);
      s.lineTo(0.05, 0.085);
      s.lineTo(-0.07, 0.085);
      s.quadraticCurveTo(-0.095, 0.0, -0.088, -0.055);
      s.quadraticCurveTo(-0.086, -0.085, -0.08, -0.085);
      const W = 0.12;
      const geo = new THREE.ExtrudeGeometry(s, {
        depth: W,
        bevelEnabled: true,
        bevelThickness: 0.032,
        bevelSize: 0.022,
        bevelSegments: 6,
        curveSegments: 18,
      });
      geo.rotateY(-Math.PI / 2); // profile → y/z, extrusion → x
      geo.translate(W / 2, 0, 0);
      // shape it: narrower toe and ankle shaft, rounded sides, so it
      // reads as a moulded boot rather than an extruded block
      {
        const p = geo.attributes.position;
        const sm = (a, b, x) => {
          const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
          return t * t * (3 - 2 * t);
        };
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const y = p.getY(i);
          const z = p.getZ(i);
          const k = 1 - 0.22 * sm(0.08, 0.23, z) - 0.12 * sm(0.0, 0.1, y) + 0.04 * Math.cos(y * 14);
          p.setX(i, x * k);
        }
        geo.computeVertexNormals();
      }
      mesh(geo, bootMat, boot, [0, 0, 0.0]);
      // tongue panel lying on the instep slope, crossed by two buckled
      // straps (the slope runs up-and-back at ~56°)
      const tongue = mesh(rbox(0.1, 0.1, 0.012, 0.005), panel, boot, [0, 0.053, 0.115], [-0.97, 0, 0]);
      [-0.024, 0.024].forEach((y) => {
        mesh(rbox(0.15, 0.017, 0.014, 0.006), strap, tongue, [0, y, 0.007]);
        mesh(rbox(0.022, 0.024, 0.01, 0.004), buckle, tongue, [side * 0.06, y, 0.015]);
      });
      // heel pull tab
      mesh(rbox(0.04, 0.05, 0.012, 0.005), strap, boot, [0, 0.075, -0.098], [0.1, 0, 0]);
    }
    // layered sole from a real foot outline: orange midsole, dark
    // rubber outsole, lugged tread
    {
      const o = new THREE.Shape();
      o.moveTo(-0.082, -0.06);
      o.absarc(0, -0.06, 0.082, Math.PI, Math.PI * 2, false); // heel
      o.lineTo(0.098, 0.13);
      o.absarc(0, 0.13, 0.098, 0, Math.PI, false); // toe box
      o.lineTo(-0.082, -0.06);
      const layer = (depth, mat, y) => {
        const g = new THREE.ExtrudeGeometry(o, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 20 });
        g.rotateX(Math.PI / 2); // outline → x/z, extrusion → down
        return mesh(g, mat, boot, [0, y, 0.0]);
      };
      layer(0.012, orangeHard, -0.104);
      layer(0.02, sole, -0.12);
      const lugGeo = new THREE.BoxGeometry(0.14, 0.008, 0.02);
      for (let i = 0; i < 7; i++) mesh(lugGeo, sole, boot, [0, -0.146, -0.11 + i * 0.05]);
    }
    return { hip, knee };
  };
  const legR = leg(-1);
  const legL = leg(1);

  // total height at scale 1 (legs lengthened ~0.1 for adult proportions;
  // the host scales by this, so the on-screen size is unchanged)
  const height = 2.39;

  /* =====================================================
     ANIMATION
     Layers, blended every frame:
       idle     breathing, zero-g "swim" of the arms (IK),
                flutter kick, slow torso twist
       look     random glances (saccades); locks onto the
                hologram while presenting
       motion   lean into movement, limbs trail behind
                (spring-smoothed screen velocity from host)
       gestures wave (time-based, play('wave')),
                tap on the wrist device (scrubbed: pose.tap),
                present (scrubbed: pose.arm)
  ===================================================== */
  const { lerp, clamp, smootherstep } = THREE.MathUtils;
  const UPPER = 0.37; // shoulder → elbow
  const LOWER = 0.38; // elbow → hand

  const pose = { arm: 0, glow: 0, tap: 0, look: 0 };
  const motion = { vx: 0, vy: 0, sx: 0, sy: 0 };
  const look = { yaw: 0, pitch: 0, ty: 0, tp: 0, next: 0 };
  let wave = { start: -1, dur: 2.6 };
  let clock = 0;

  const setPose = (p = {}) => Object.assign(pose, p);
  const setMotion = (vx, vy) => {
    motion.vx = vx;
    motion.vy = vy;
  };
  const play = (name) => {
    if (name === 'wave' && (wave.start < 0 || clock - wave.start > wave.dur)) wave.start = clock;
  };

  // --- two-bone IK: aims shoulder + elbow so the hand reaches `target`
  // (in the shoulder's parent space). `pole` = direction the elbow
  // should point. Elbow bends about its local X (negative = forward).
  const _d = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _f = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _y = new THREE.Vector3();
  const _z = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const solveArm = (limb, target, pole, blend = 1) => {
    _d.copy(target).sub(limb.shoulder.position);
    const dist = clamp(_d.length(), Math.abs(UPPER - LOWER) + 1e-3, UPPER + LOWER - 1e-3);
    _d.normalize();
    // upper arm deviates from the straight line toward the pole
    const a1 = Math.acos(clamp((UPPER * UPPER + dist * dist - LOWER * LOWER) / (2 * UPPER * dist), -1, 1));
    _p.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
    _u.copy(_d).multiplyScalar(Math.cos(a1)).addScaledVector(_p, Math.sin(a1)).normalize();
    // forearm direction
    _f.copy(_d).multiplyScalar(dist).addScaledVector(_u, -UPPER).normalize();
    _y.copy(_u).negate();
    _x.crossVectors(_f, _u);
    if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0);
    _x.normalize();
    _z.crossVectors(_x, _y).normalize();
    _m.makeBasis(_x, _y, _z);
    _q.setFromRotationMatrix(_m);
    limb.shoulder.quaternion.slerp(_q, blend);
    const bend = -Math.acos(clamp(_u.dot(_f), -1, 1));
    limb.elbow.rotation.set(lerp(limb.elbow.rotation.x, bend, blend), 0, 0);
  };

  const tR = new THREE.Vector3();
  const poleR = new THREE.Vector3();
  const vTap = new THREE.Vector3();
  const POLE_REST = new THREE.Vector3(-0.2, -0.3, -1);
  const POLE_WAVE = new THREE.Vector3(-0.8, -0.6, 0.1);
  const POLE_TAP = new THREE.Vector3(-0.6, -0.8, 0.2);
  const shoulderLPresent = new THREE.Euler(-0.95, -0.35, 0.42);

  const damp = (cur, tgt, k, dt) => cur + (tgt - cur) * (1 - Math.exp(-k * dt));

  const update = (t, dt = 1 / 60) => {
    clock = t;
    dt = Math.min(dt, 0.1);
    const breathe = Math.sin(t * 1.25);

    // motion springs (velocity in NDC/s from the host)
    motion.sx = damp(motion.sx, clamp(motion.vx, -3, 3), 4, dt);
    motion.sy = damp(motion.sy, clamp(motion.vy, -3, 3), 4, dt);
    const mx = motion.sx;
    const my = motion.sy;

    const present = smootherstep(pose.arm, 0, 1);
    const tap = smootherstep(pose.tap, 0, 1);

    // --- body: lean into motion, slow twist, breathing
    body.rotation.set(-my * 0.12 + Math.sin(t * 0.37) * 0.04, Math.sin(t * 0.23) * 0.12, -mx * 0.18);
    spine.rotation.set(
      0.04 + breathe * 0.02 - my * 0.08 - tap * 0.12,
      Math.sin(t * 0.41) * 0.1 * (1 - present) + present * 0.18 + tap * 0.15,
      Math.sin(t * 0.29) * 0.04
    );
    spine.scale.set(1 + breathe * 0.008, 1, 1 + breathe * 0.012);

    // --- head look: wandering glances, or the hologram while presenting
    if (t > look.next) {
      look.ty = (Math.random() - 0.5) * 0.9;
      look.tp = (Math.random() - 0.35) * 0.35;
      look.next = t + 1.6 + Math.random() * 2.4;
    }
    const lookYaw = lerp(look.ty, 0.32, Math.max(present, pose.look));
    const lookPitch = lerp(look.tp, 0.12, present) - tap * 0.35;
    look.yaw = damp(look.yaw, lookYaw, 5, dt);
    look.pitch = damp(look.pitch, lookPitch, 5, dt);
    neck.rotation.set(look.pitch, look.yaw, -look.yaw * 0.15);
    visorTex.offset.set(-look.yaw * 0.12, look.pitch * 0.08);

    // --- left arm: idle swim → raised presenting pose (+ motion lag)
    armL.shoulder.rotation.set(
      lerp(0.15 + Math.sin(t * 0.9) * 0.22 + my * 0.25, shoulderLPresent.x, present),
      lerp(Math.sin(t * 0.7) * 0.15, shoulderLPresent.y, present),
      lerp(0.35 + Math.sin(t * 0.9 + 1) * 0.12 + mx * 0.3, shoulderLPresent.z, present)
    );
    armL.elbow.rotation.set(lerp(-0.55 + Math.sin(t * 0.9 + 0.6) * 0.25, -1.55, present), 0, 0);
    armL.hand.rotation.set(lerp(Math.sin(t * 1.1) * 0.2, 0.35, present), 0, 0);

    // --- right arm (IK): swim / wave / tap the wrist device
    // rest target, swimming in slow loops
    tR.set(
      -0.5 + Math.sin(t * 0.9) * 0.08 + mx * 0.12,
      0.05 + Math.sin(t * 0.9 + 1.2) * 0.12 + my * 0.15,
      0.16 + Math.cos(t * 0.9) * 0.1
    );
    poleR.copy(POLE_REST);

    // wave hello
    let w = 0;
    if (wave.start >= 0) {
      const wt = t - wave.start;
      if (wt < wave.dur) {
        w = smootherstep(wt, 0, 0.45) * (1 - smootherstep(wt, wave.dur - 0.5, wave.dur));
        tR.lerp(_d.set(-0.6 + Math.sin(wt * 9) * 0.11, 1.02, 0.18), w);
        poleR.lerp(POLE_WAVE, w);
      }
    }

    // tap the left wrist device
    if (tap > 0.001) {
      group.updateMatrixWorld(true);
      device.getWorldPosition(vTap);
      spine.worldToLocal(vTap);
      vTap.y += 0.06;
      vTap.z += 0.05;
      tR.lerp(vTap, tap);
      poleR.lerp(POLE_TAP, tap);
    }
    solveArm(armR, tR, poleR.normalize());
    armR.hand.rotation.set(lerp(0.1, -0.6, w), 0, lerp(0, -0.4, tap));

    // --- legs: slow flutter kick, trailing behind motion
    const kick = Math.sin(t * 1.1);
    legR.hip.rotation.set(-0.5 + kick * 0.12 + my * 0.3, 0, -0.08 - mx * 0.1);
    legR.knee.rotation.set(0.85 - kick * 0.15, 0, 0);
    legL.hip.rotation.set(-0.15 - kick * 0.12 + my * 0.3, 0, 0.1 - mx * 0.1);
    legL.knee.rotation.set(0.5 + kick * 0.15, 0, 0);

    // --- lights
    const g = pose.glow * (0.85 + Math.sin(t * 9) * 0.08);
    deviceGlow.material.opacity = g * 0.95;
    deviceLight.intensity = g * 2.4;
    const beacon = (t % 1.6) < 0.12 ? 1 : 0;
    beaconGlow.material.opacity = beacon * 0.9;
    beaconMat.color.setHex(beacon ? 0xff5a4a : 0x5a1410);
  };

  update(0);

  return {
    group,
    height,
    wrist,
    nozzles,
    setPose,
    setMotion,
    play,
    update,
    get speed() {
      return Math.hypot(motion.sx, motion.sy);
    },
    get motionDir() {
      return { x: motion.sx, y: motion.sy };
    },
  };
}
