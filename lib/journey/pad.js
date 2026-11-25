import * as THREE from 'three';
import { tex, rand, glowTexture, clamp, easeOut, smooth, seg } from './util';

/* =====================================================
   LAUNCH COMPLEX at dusk.
   - NASA's Saturn V model (NASA 3D Resources) on a mobile
     launcher platform beside a steel lattice umbilical tower
   - facility lights, floodlights with light shafts, red
     aviation beacons
   - five F-1 engine plumes, a point light, vapour and
     exhaust smoke that is a pure function of the launch
     progress (so scrubbing backwards un-launches the rocket)
   Units: metres / 1.8. Origin = centre of the pad at ground.
===================================================== */

export const ROCKET_H = 60;
export const PLATFORM_H = 7;

const SMOKE_VS = /* glsl */ `
  attribute vec4 aData; // size, rotation, alpha, heat
  varying vec2 vUv;
  varying float vAlpha;
  varying float vHeat;
  varying float vDepth;
  void main() {
    vUv = uv;
    vAlpha = aData.z;
    vHeat = aData.w;
    vec3 center = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 mv = modelViewMatrix * vec4(center, 1.0);
    float c = cos(aData.y);
    float s = sin(aData.y);
    mv.xy += mat2(c, -s, s, c) * position.xy * aData.x;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const SMOKE_FS = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uHeat;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vHeat;
  varying float vDepth;
  void main() {
    vec4 t = texture2D(map, vUv);
    float a = t.a * vAlpha * smoothstep(1.0, 10.0, vDepth);
    if (a < 0.004) discard;
    vec3 col = mix(uShade, uLit, t.r);
    col += uHeat * vHeat * (0.5 + t.r);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

const BEAM_VS = /* glsl */ `
  varying float vAlong;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vAlong = uv.y;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_FS = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlong;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
    // brightest at the lamp (narrow end), fading toward the rocket
    float a = edge * pow(1.0 - vAlong, 1.3) * uOpacity;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

const FLAME_VS = /* glsl */ `
  varying float vAlong;
  varying vec3 vN;
  varying vec3 vV;
  varying float vAng;
  void main() {
    // cone apex points down; 1 at the nozzle, 0 at the tip
    vAlong = 1.0 - uv.y;
    vAng = uv.x;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FLAME_FS = /* glsl */ `
  uniform float uPower;
  uniform float uTime;
  uniform float uCore;
  varying float vAlong;
  varying vec3 vN;
  varying vec3 vV;
  varying float vAng;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float body = pow(facing, mix(2.2, 1.2, uCore));
    // shock diamonds + flicker running down the plume
    float diamonds = 0.82 + 0.18 * sin(vAlong * 46.0 - uTime * 30.0);
    float flick = 0.88 + 0.12 * sin(uTime * 53.0 + vAng * 40.0);
    float a = pow(vAlong, mix(1.6, 2.6, uCore)) * body * diamonds * flick * uPower;
    vec3 hot = vec3(1.0, 0.97, 0.88);
    vec3 warm = vec3(1.0, 0.62, 0.22);
    vec3 cool = vec3(0.9, 0.3, 0.08);
    vec3 col = mix(cool, mix(warm, hot, smoothstep(0.55, 0.95, vAlong)), smoothstep(0.1, 0.6, vAlong));
    gl_FragColor = vec4(col * a * (uCore > 0.5 ? 0.95 : 0.6), 1.0);
    #include <tonemapping_fragment>
  }
`;

/* =====================================================
   CONTENAISSANCE LAUNCHER — 3D model measured from the
   brand reference render (853×1280 px; vehicle spans
   y 15 → 1250 = 1235 px). All sizes are reference pixels
   scaled so the vehicle is ROCKET_H tall: ogive fairing,
   upper stage, wider logo section, core, two boosters on
   ±x, black bands, ribbed bell nozzles. Surface detail
   (panel seams, rivets, grime) comes from tiling canvas
   maps; logos are separate high-res decals on ±z.
===================================================== */
const PX = ROCKET_H / 1235; // reference px → world units
const Y = (py) => (1250 - py) * PX; // reference y (from the top) → height above the core nozzle exit
const CORE_R = 46;
const LOGO_R = 50.5; // the logo section is slightly wider than the core
const BOOST_R = 33;
const BOOST_X = CORE_R + BOOST_R + 0.6; // boosters touch the core
export const ROCKET_SPEC = { booster: BOOST_X * PX, boosterUp: 5 * PX, coreExit: 31.5 * PX, boosterExit: 28.5 * PX };

/* ---------- geometry helpers ---------- */
// lathe from [radius px, ref-y px] points listed top → bottom; the first `nose` points
// run through a spline (smooth ogive), the rest stay exact (crisp shoulders and skirts)
const lathe = (pts, seg = 96, nose = 0) => {
  const v = pts.map(([r, py]) => new THREE.Vector2(r * PX, Y(py)));
  const head = nose > 1 ? new THREE.SplineCurve(v.slice(0, nose)).getPoints(nose * 12) : [];
  const all = [...head, ...v.slice(nose)];
  all.reverse(); // LatheGeometry wants bottom → top
  return heightUV(new THREE.LatheGeometry(all, seg));
};
// v = height, so the tiling panel maps keep square rivets everywhere (incl. the nose)
const PANEL_H = 4.2; // world units per panel row
function heightUV(geo) {
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / PANEL_H);
  uv.needsUpdate = true;
  return geo;
}
const ring = (r, py0, py1, seg = 96) => {
  const h = (py1 - py0) * PX;
  const g = new THREE.CylinderGeometry(r * PX, r * PX, h, seg, 1, true);
  g.translate(0, Y(py1) + h / 2, 0);
  return g;
};
const bell = (throat, exit, py0, py1) =>
  lathe(
    [
      [throat * 0.82, py0 - 3],
      [throat, py0],
      [throat + (exit - throat) * 0.3, py0 + (py1 - py0) * 0.38],
      [throat + (exit - throat) * 0.72, py0 + (py1 - py0) * 0.75],
      [exit, py1],
    ],
    64,
    5,
  );
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
function rod(a, b, r, mat) {
  _a.set(...a);
  _b.set(...b);
  const len = _a.distanceTo(_b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(_a).add(_b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _b.sub(_a).normalize());
  return m;
}

/* ---------- surface maps (canvas, generated once) ---------- */
function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const rnd = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();
// panel layout shared by colour + bump: seam at the top of each tile, 3 vertical seams (the reference shows mostly circumferential joints), rivet rows along them
function panelLayout(g, W, H, seam, rivet) {
  g.fillStyle = seam;
  g.fillRect(0, 0, W, 3);
  for (let i = 0; i < 3; i++) g.fillRect(Math.round((i / 3) * W), 0, 2, H);
  g.fillStyle = rivet;
  for (let x = 6; x < W; x += 14) {
    g.beginPath();
    g.arc(x, 9, 1.6, 0, Math.PI * 2);
    g.arc(x, H - 6, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 3; i++) {
    const x = Math.round((i / 3) * W);
    for (let y = 20; y < H; y += 16) {
      g.beginPath();
      g.arc(x - 6, y, 1.4, 0, Math.PI * 2);
      g.arc(x + 8, y, 1.4, 0, Math.PI * 2);
      g.fill();
    }
  }
}
let MAPS = null;
function surfaceMaps() {
  if (MAPS) return MAPS;
  const W = 1024;
  const H = 512;
  const color = canvasTex(
    W,
    H,
    (g) => {
      g.fillStyle = '#f1f0ec';
      g.fillRect(0, 0, W, H);
      // faint vertical weathering streaks + speckle
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(120,112,100,${0.015 + rnd() * 0.03})`;
        g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 20 + rnd() * 180);
      }
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = `rgba(90,85,80,${rnd() * 0.06})`;
        g.fillRect(rnd() * W, rnd() * H, 1, 1);
      }
      panelLayout(g, W, H, 'rgba(70,68,64,0.55)', 'rgba(150,146,140,0.55)');
    },
    { repeat: true },
  );
  const bump = canvasTex(
    W,
    H,
    (g) => {
      g.fillStyle = '#808080';
      g.fillRect(0, 0, W, H);
      panelLayout(g, W, H, '#202020', '#f0f0f0');
    },
    { srgb: false, repeat: true },
  );
  const rough = canvasTex(
    W,
    H,
    (g) => {
      g.fillStyle = '#7a7a7a';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 400; i++) {
        g.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},128,0.05)`;
        g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 6, 30 + rnd() * 120);
      }
    },
    { srgb: false, repeat: true },
  );
  // brushed metal for the nozzles: fine streaks running down the bell
  const brushed = canvasTex(
    512,
    256,
    (g, w, h) => {
      g.fillStyle = '#8a8a8a';
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x++) {
        g.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() * 0.18})`;
        g.fillRect(x, 0, 1, h);
      }
    },
    { srgb: false, repeat: true },
  );
  // weathered skin for the lower core + boosters (reference: greyer white, rust bleeding from seams and rivets)
  const weathered = canvasTex(
    W,
    H,
    (g) => {
      g.fillStyle = '#e2dfd8';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 420; i++) {
        g.fillStyle = `rgba(105,98,88,${0.02 + rnd() * 0.05})`;
        g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 4, 30 + rnd() * 220);
      }
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = `rgba(80,74,66,${rnd() * 0.09})`;
        g.fillRect(rnd() * W, rnd() * H, 1 + rnd(), 1 + rnd());
      }
      // rust drips running down from the circumferential seam (top of each tile)
      for (let i = 0; i < 140; i++) {
        const x = rnd() * W;
        const len = 8 + rnd() * (rnd() > 0.85 ? 140 : 46);
        const grd = g.createLinearGradient(0, 4, 0, 4 + len);
        grd.addColorStop(0, `rgba(150,86,38,${0.35 + rnd() * 0.35})`);
        grd.addColorStop(1, 'rgba(150,86,38,0)');
        g.fillStyle = grd;
        g.fillRect(x, 4, 1 + rnd() * 2.5, len);
      }
      // rust bloom along the seam itself and at a few rivets
      for (let x = 0; x < W; x += 2) {
        if (rnd() > 0.55) continue;
        g.fillStyle = `rgba(140,80,36,${rnd() * 0.45})`;
        g.fillRect(x, 1, 2, 4 + rnd() * 4);
      }
      for (let i = 0; i < 3; i++) {
        const sx = Math.round((i / 3) * W);
        for (let y = 20; y < H; y += 16) {
          if (rnd() > 0.35) continue;
          const grd = g.createLinearGradient(0, y, 0, y + 26);
          grd.addColorStop(0, 'rgba(140,82,40,0.45)');
          grd.addColorStop(1, 'rgba(140,82,40,0)');
          g.fillStyle = grd;
          g.fillRect(sx - 7, y, 2, 26);
        }
      }
      panelLayout(g, W, H, 'rgba(66,60,54,0.65)', 'rgba(128,120,110,0.65)');
    },
    { repeat: true },
  );
  MAPS = { color, bump, rough, brushed, weathered };
  return MAPS;
}

/* ---------- decals ---------- */
// the three brand logos on one wrap, laid out as in the reference
const LOGOS = ['/images/logo@2x.png', '/images/rocket/logo-r.png', '/images/rocket/logo-ctm.png'];
const LABEL = { top: 352, bottom: 574, arc: 2.6 }; // ref px, radians of wrap (front view ≈ 96% of the body width)
function logoDecal() {
  const W = 1024;
  const H = Math.round(W * ((LABEL.bottom - LABEL.top) / (LOGO_R * LABEL.arc)));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  const imgs = LOGOS.map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });
  Promise.all(imgs.map((i) => i.decode().catch(() => null))).then(() => {
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    // [image, centre y (0..1 of label), max width (0..1), max height (0..1)] — from the reference
    const slots = [
      [imgs[0], 0.14, 0.86, 0.26],
      [imgs[1], 0.5, 0.4, 0.38],
      [imgs[2], 0.86, 0.84, 0.21],
    ];
    for (const [img, cy, mw, mh] of slots) {
      if (!img?.naturalWidth) continue;
      const k = Math.min((mw * W) / img.naturalWidth, (mh * H) / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      g.drawImage(img, (W - w) / 2, cy * H - h / 2, w, h);
    }
    t.needsUpdate = true;
  });
  return t;
}
// service hatches (thin outlined panels) on the upper stage and the core
function hatchDecal() {
  // reference: a tall centre hatch and two side panels, each outlined with a rivet border,
  // plus vertical skin seams between them
  return canvasTex(1024, 1024, (g, w, h) => {
    const panel = (x0, y0, x1, y1) => {
      const [X0, Y0, X1, Y1] = [x0 * w, y0 * h, x1 * w, y1 * h];
      g.strokeStyle = 'rgba(70,66,60,0.85)';
      g.lineWidth = 4;
      g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; // lit lower edge, gives the panel a slight relief
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(X0 + 3, Y1 + 3);
      g.lineTo(X1 + 3, Y1 + 3);
      g.lineTo(X1 + 3, Y0 + 3);
      g.stroke();
      g.fillStyle = 'rgba(80,76,70,0.9)';
      const dot = (x, y) => {
        g.beginPath();
        g.arc(x, y, 3.4, 0, Math.PI * 2);
        g.fill();
      };
      for (let x = X0 + 10; x <= X1 - 8; x += 18) {
        dot(x, Y0 + 10);
        dot(x, Y1 - 10);
      }
      for (let y = Y0 + 28; y <= Y1 - 26; y += 18) {
        dot(X0 + 10, y);
        dot(X1 - 10, y);
      }
    };
    panel(0.4, 0.1, 0.6, 0.86);
    panel(0.12, 0.18, 0.27, 0.66);
    panel(0.73, 0.18, 0.88, 0.66);
    g.fillStyle = 'rgba(70,66,60,0.6)';
    for (const x of [0.06, 0.33, 0.67, 0.94]) g.fillRect(x * w, 0, 3, h);
  });
}
// booster access panel (outer side): bolted outline with the intake grille, as in the reference
function boosterPanelDecal() {
  return canvasTex(256, 512, (g, w, h) => {
    g.strokeStyle = 'rgba(58,54,50,0.8)';
    g.lineWidth = 3;
    g.strokeRect(10, 8, w - 20, h - 16);
    g.fillStyle = 'rgba(58,54,50,0.85)';
    for (let y = 22; y < h - 14; y += 34) {
      g.beginPath();
      g.arc(22, y, 3, 0, Math.PI * 2);
      g.arc(w - 22, y, 3, 0, Math.PI * 2);
      g.fill();
    }
    // grille
    const gx = w * 0.36;
    const gy = h * 0.3;
    const gw = w * 0.28;
    const gh = h * 0.42;
    g.fillStyle = '#262626';
    g.fillRect(gx, gy, gw, gh);
    g.fillStyle = '#8f8c86';
    for (let y = gy + 8; y < gy + gh - 6; y += 14) g.fillRect(gx + 6, y, gw - 12, 5);
    g.strokeStyle = '#4a4744';
    g.lineWidth = 2;
    g.strokeRect(gx - 3, gy - 3, gw + 6, gh + 6);
  });
}
// approximate radius of a bell() at fraction t of its length (same control points)
function bellR(throat, exit, t) {
  const d = exit - throat;
  if (t < 0.38) return throat + d * 0.3 * (t / 0.38);
  if (t < 0.75) return throat + d * (0.3 + 0.42 * ((t - 0.38) / 0.37));
  return throat + d * (0.72 + 0.28 * ((t - 0.75) / 0.25));
}

/* ---------- the vehicle ---------- */
export function buildRocket() {
  const rocket = new THREE.Group();
  const M = surfaceMaps();
  const white = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: M.color,
    bumpMap: M.bump,
    bumpScale: 1.2,
    roughnessMap: M.rough,
    roughness: 0.4,
    metalness: 0.12,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.55,
  });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.5, metalness: 0.15, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.4 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x8d8b86, roughness: 0.55, metalness: 0.3 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xc4c4c7, roughnessMap: M.brushed, roughness: 0.32, metalness: 1, envMapIntensity: 1.1, side: THREE.DoubleSide });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3a3d, roughness: 0.45, metalness: 0.85, envMapIntensity: 0.8 });
  // lower core + boosters: same skin, weathered (greyer, rust at seams) and a little less glossy
  const worn = white.clone();
  worn.map = M.weathered;
  worn.clearcoat = 0.18;
  worn.roughness = 0.5;
  worn.bumpScale = 1.5;
  const fitting = new THREE.MeshStandardMaterial({ color: 0x6e6a64, roughness: 0.5, metalness: 0.75, envMapIntensity: 0.7 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.8, metalness: 0.3 });
  // fine cooling-tube bands on the bells: a slightly darker brushed steel, not black
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x8d8d90, roughness: 0.35, metalness: 1, envMapIntensity: 1 });
  const bolt = (x, y, z, axis = 'z', r = 1.1, len = 1.4) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * PX, r * PX, len * PX, 6), fitting);
    b.position.set(x, y, z);
    if (axis === 'z') b.rotation.x = Math.PI / 2;
    else if (axis === 'x') b.rotation.z = Math.PI / 2;
    rocket.add(b);
  };
  const add = (geo, mat, x = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.x = x * PX;
    rocket.add(m);
    return m;
  };

  /* core: ogive fairing → upper stage → logo section → core stage → engine skirt */
  add(
    lathe(
      [
        [0, 16],
        [12.5, 24],
        [21, 36],
        [28, 48],
        [34.5, 60],
        [39.5, 72],
        [44, 84],
        [48, 96],
        [50.5, 108],
        [52, 122],
        [52, 205],
        [51, 212],
        [47, 220],
        [46.5, 352],
        [LOGO_R, 360],
        [LOGO_R, 574],
        [47, 582],
        [47, 606],
        [0, 606.5],
      ],
      96,
      11,
    ),
    white,
  );
  // lower core stage (below the second black band): weathered skin, aft skirt
  add(
    lathe([
      [0, 604],
      [CORE_R, 604],
      [CORE_R, 1142],
      [43, 1152],
      [36, 1160],
      [0, 1161],
    ]),
    worn,
  );
  // black bands (reference y 295–318 and 584–606)
  add(ring(46.9, 295, 318), black);
  add(ring(47.6, 583, 606), black);
  // thin seams: fairing panels, fairing base, logo-section edges, core joints
  for (const [r, py] of [[49.4, 100], [52.2, 148], [46.8, 352], [LOGO_R + 0.2, 362], [LOGO_R + 0.2, 572], [CORE_R + 0.2, 612], [CORE_R + 0.2, 745], [CORE_R + 0.2, 880], [CORE_R + 0.2, 1010], [CORE_R + 0.2, 1138]]) {
    add(ring(r, py - 0.8, py + 0.8), seamMat);
  }

  /* riveting + structural trim on the upper vehicle (reference close-up of the fairing) */
  const rivetGeo = new THREE.SphereGeometry(0.95 * PX, 6, 4);
  const rivetMat = new THREE.MeshStandardMaterial({ color: 0xb4b1aa, roughness: 0.4, metalness: 0.7, envMapIntensity: 0.8 });
  const _m = new THREE.Matrix4();
  const rivetRing = (r, py, n, x = 0) => {
    const im = new THREE.InstancedMesh(rivetGeo, rivetMat, n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      im.setMatrixAt(i, _m.makeTranslation((x + Math.sin(a) * r) * PX, Y(py), Math.cos(a) * r * PX));
    }
    rocket.add(im);
  };
  // rivet rows either side of each fairing seam
  for (const [r, py] of [[49.2, 96], [49.8, 104], [52, 144], [52, 152]]) rivetRing(r, py, 120);
  // fairing base: a raised lip (wider than the fairing) with a rivet row, and a step ring below it
  add(lathe([[52, 200], [53.6, 203], [53.6, 213], [52.4, 215]], 96), white);
  rivetRing(53.7, 208, 132);
  add(ring(47.4, 219, 223), seamMat);
  rivetRing(47.3, 226, 110);
  // black bands: riveted edges (top + bottom) on both
  for (const [r, py] of [[47.1, 297.5], [47.1, 315.5], [47.8, 585.5], [47.8, 603.5]]) rivetRing(r, py, 110);
  // logo-section edges: rivet rows
  for (const py of [366, 568]) rivetRing(LOGO_R + 0.15, py, 120);
  // retaining clamps above and below each black band, front and back (the small hooks in the reference)
  const clip = (a, py0, py1, r) => {
    const x = Math.sin(a) * (r + 1.4) * PX;
    const z = Math.cos(a) * (r + 1.4) * PX;
    rocket.add(rod([x, Y(py0), z], [x, Y(py1), z], 1.1 * PX, fitting));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(4 * PX, 3 * PX, 3 * PX), fitting);
    foot.position.set(x, Y(py0 < py1 ? py0 : py1), z);
    foot.rotation.y = a;
    rocket.add(foot);
  };
  for (const back of [0, Math.PI]) {
    for (const a of [-0.62, 0.62]) {
      clip(a + back, 278, 296, 46.6); // above the upper band
      clip(a + back, 317, 336, 46.6); // below the upper band
      clip(a + back, 606, 626, CORE_R); // below the lower band, after the logos
    }
  }
  // cable trays running down the core, front and back (reference x ≈ ±33 px of the axis)
  for (const side of [1, -1]) {
    for (const th of [0.78, -0.78]) {
      const x = Math.sin(th) * (CORE_R + 1.2) * PX;
      const z = Math.cos(th) * (CORE_R + 1.2) * PX * side;
      rocket.add(rod([x, Y(1140), z], [x, Y(608), z], 1.3 * PX, seamMat));
    }
  }
  // core aft skirt: ribbed rings + a dark thrust ring at the base
  for (const py of [1112, 1122, 1132]) add(ring(CORE_R + 0.5, py - 1.2, py + 1.2), fitting);
  add(ring(CORE_R + 0.9, 1100, 1106), seamMat);
  add(lathe([[37, 1158], [38.5, 1160], [38.5, 1164], [37, 1166]], 64), darkSteel);
  // thrust frame: a V-truss from the skirt ring down to the engine collar (the lattice in the reference)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = a + (i % 2 ? 1 : -1) * (Math.PI / 12);
    rocket.add(rod([Math.sin(a) * 36 * PX, Y(1163), Math.cos(a) * 36 * PX], [Math.sin(b) * 24 * PX, Y(1180), Math.cos(b) * 24 * PX], 1.4 * PX, darkSteel));
  }
  // propellant feed lines curving to the engine
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rocket.add(rod([Math.sin(a) * 31 * PX, Y(1161), Math.cos(a) * 31 * PX], [Math.sin(a) * 27 * PX, Y(1186), Math.cos(a) * 27 * PX], 2 * PX, fitting));
  }
  add(lathe([[22, 1166], [26.5, 1170], [26.5, 1178], [23, 1182]], 48), darkSteel); // turbopump collar
  // core engine: bell with cooling-tube ribs, a manifold torus at the top and a turbine exhaust
  add(bell(23, 31.5, 1180, 1250), steel);
  for (let k = 1; k <= 7; k++) {
    const t = k / 8;
    const py = 1180 + 70 * t;
    add(ring(bellR(23, 31.5, t) + 0.3, py - 0.5, py + 0.5, 64), ribMat);
  }
  const manifold = new THREE.Mesh(new THREE.TorusGeometry(24.2 * PX, 1.8 * PX, 10, 48), fitting);
  manifold.rotation.x = Math.PI / 2;
  manifold.position.y = Y(1186);
  rocket.add(manifold);
  rocket.add(rod([27 * PX, Y(1183), 6 * PX], [31 * PX, Y(1222), 8 * PX], 1.8 * PX, darkSteel));

  /* strap-on boosters */
  const panelMat = new THREE.MeshStandardMaterial({ map: boosterPanelDecal(), transparent: true, roughness: 0.55, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [-1, 1]) {
    const x = s * BOOST_X;
    add(
      lathe(
        [
          [0, 654],
          [6, 660],
          [13, 672],
          [20, 684],
          [26, 696],
          [30.5, 708],
          [BOOST_R, 721],
          [BOOST_R, 1144],
          [30, 1152],
          [25, 1160],
          [0, 1161],
        ],
        72,
        7,
      ),
      worn,
      x,
    );
    // dark nose tip
    add(lathe([[0, 652.5], [3.6, 656], [6.4, 661], [0, 661.5]], 32), black, x);
    add(ring(BOOST_R + 0.3, 1058, 1067, 72), black, x);
    // circumferential joints (reference spacing), the nose seam and the aft frames
    for (const py of [721, 760, 800, 845, 885, 925, 965, 1005, 1088, 1140]) add(ring(BOOST_R + 0.2, py - 0.8, py + 0.8, 72), seamMat, x);
    add(ring(BOOST_R + 0.9, 1098, 1105, 72), fitting, x);
    for (const py of [1118, 1126, 1134]) add(ring(BOOST_R + 0.5, py - 1, py + 1, 72), fitting, x);
    // longitudinal seams, front and back, toward the core
    for (const side of [1, -1]) {
      const th = -s * 0.5;
      const bx = (x + Math.sin(th) * (BOOST_R + 0.3)) * PX;
      const bz = Math.cos(th) * (BOOST_R + 0.3) * PX * side;
      rocket.add(rod([bx, Y(1140), bz], [bx, Y(722), bz], 0.6 * PX, seamMat));
    }
    // aft skirt stringers on the taper
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rocket.add(rod([(x + Math.sin(a) * 33.2) * PX, Y(1144), Math.cos(a) * 33.2 * PX], [(x + Math.sin(a) * 25.4) * PX, Y(1160), Math.cos(a) * 25.4 * PX], 0.7 * PX, darkSteel));
    }
    // attachment fittings to the core, bridging the visible groove between core and booster
    // on the front and back (z = ±FZ, where that groove is ~20 px wide), as in the reference
    const FZ = 25;
    const cx = Math.sqrt(CORE_R * CORE_R - FZ * FZ); // core surface at z = FZ
    const bx = BOOST_X - Math.sqrt(BOOST_R * BOOST_R - FZ * FZ); // booster surface at z = FZ
    const gx = s * ((cx + bx) / 2) * PX;
    const gw = (bx - cx + 2) * PX;
    for (const zs of [1, -1]) {
      const z = zs * (FZ - 1) * PX;
      // heavy upper fitting + diagonal strut
      const up = new THREE.Mesh(new THREE.BoxGeometry(gw, 24 * PX, 6 * PX), fitting);
      up.position.set(gx, Y(734), z);
      rocket.add(up);
      rocket.add(rod([gx, Y(724), z], [s * (cx + 1) * PX, Y(760), zs * (FZ - 4) * PX], 1.4 * PX, darkSteel));
      for (const by of [-8, 0, 8]) bolt(gx, Y(734 + by), z + zs * 3.2 * PX);
      // bolted brackets with a rust stain below each
      for (const py of [832, 925, 1040, 1138]) {
        const br = new THREE.Mesh(new THREE.BoxGeometry(gw, 11 * PX, 5 * PX), fitting);
        br.position.set(gx, Y(py), z);
        rocket.add(br);
        const rs = new THREE.Mesh(new THREE.BoxGeometry(gw * 0.6, 5 * PX, 1 * PX), rust);
        rs.position.set(gx, Y(py + 8), z + zs * 0.6 * PX);
        rocket.add(rs);
        for (const ox of [-0.28, 0.28]) for (const by of [-3, 3]) bolt(gx + ox * gw, Y(py + by), z + zs * 2.8 * PX);
      }
    }
    // bolted access panel with the intake grille on the outer side (reference y ≈ 955–1040)
    const arc = 0.95;
    const pg = new THREE.CylinderGeometry((BOOST_R + 0.15) * PX, (BOOST_R + 0.15) * PX, 85 * PX, 24, 1, true, s * (Math.PI / 2) - arc / 2, arc);
    pg.translate(0, Y(1040) + 42.5 * PX, 0);
    const panel = new THREE.Mesh(pg, panelMat);
    panel.position.x = x * PX;
    rocket.add(panel);
    // booster engine: gimbal collar, ribbed bell, manifold
    add(lathe([[18, 1161], [22, 1164], [22, 1171], [18.5, 1174]], 48), darkSteel, x);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      rocket.add(rod([(x + Math.sin(a) * 24) * PX, Y(1160), Math.cos(a) * 24 * PX], [(x + Math.sin(a + 0.4) * 19) * PX, Y(1174), Math.cos(a + 0.4) * 19 * PX], 1.1 * PX, darkSteel));
    }
    add(bell(18.5, 28.5, 1173, 1245), steel, x);
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      const py = 1173 + 72 * t;
      add(ring(bellR(18.5, 28.5, t) + 0.25, py - 0.45, py + 0.45, 64), ribMat, x);
    }
    const bm = new THREE.Mesh(new THREE.TorusGeometry(19.6 * PX, 1.4 * PX, 8, 40), fitting);
    bm.rotation.x = Math.PI / 2;
    bm.position.set(x * PX, Y(1178), 0);
    rocket.add(bm);
  }

  /* decals: hatches (upper stage + core) and the brand logos, front (+z) and back (−z) */
  const hatchMat = new THREE.MeshStandardMaterial({ map: hatchDecal(), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
  // logos self-lit from their own colours (emissiveMap = the decal), so they stay bright and readable
  // in the dusk/night pad lighting; the lit map + a light clear coat still give them the body sheen
  const logoTex = logoDecal();
  const logoMat = new THREE.MeshPhysicalMaterial({ map: logoTex, emissiveMap: logoTex, emissive: 0xffffff, emissiveIntensity: 0.75, transparent: true, roughness: 0.4, metalness: 0.02, clearcoat: 0.2, clearcoatRoughness: 0.35, envMapIntensity: 0.4, polygonOffset: true, polygonOffsetFactor: -3 });
  const wrap = (r, top, bottom, arc) => {
    const h = (bottom - top) * PX;
    const g = new THREE.CylinderGeometry(r * PX, r * PX, h, 64, 1, true, -arc / 2, arc);
    g.translate(0, Y(bottom) + h / 2, 0);
    return g;
  };
  const decals = [
    [wrap(46.6, 230, 292, 1.5), hatchMat],
    [wrap(CORE_R + 0.1, 628, 700, 1.2), hatchMat],
    [wrap(LOGO_R + 0.1, LABEL.top, LABEL.bottom, LABEL.arc), logoMat],
  ];
  for (const rot of [0, Math.PI]) {
    for (const [geo, mat] of decals) {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = rot;
      rocket.add(m);
    }
  }
  return rocket;
}

/** three plumes (core + two boosters, matching the rocket artwork) + glow, hangs below y = 0 of its parent */
export function makeEngines(scale = 1) {
  const g = new THREE.Group();
  const U = { uPower: { value: 0 }, uTime: { value: 0 }, uCore: { value: 0 } };
  const UC = { uPower: U.uPower, uTime: U.uTime, uCore: { value: 1 } };
  const mk = (u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const outerMat = mk(U);
  const coreMat = mk(UC);
  const cone = (r, len) => {
    const geo = new THREE.ConeGeometry(r, len, 24, 1, true);
    geo.rotateX(Math.PI);
    geo.translate(0, -len / 2, 0);
    return geo;
  };
  const outer = cone(1.9 * scale, 26 * scale);
  const inner = cone(0.9 * scale, 11 * scale);
  // [x, z, size, nozzle-exit y]: core engine on the axis, booster nozzles either side (from the artwork)
  const b = ROCKET_SPEC.booster;
  const up = ROCKET_SPEC.boosterUp;
  const spots = [[0, 0, 0.8, 0], [-b, 0, 0.72, up], [b, 0, 0.72, up]];
  g.userData.plumes = spots.map(([x, z, k, y]) => {
    const p = new THREE.Group();
    p.position.set(x * scale, y * scale, z * scale);
    p.userData.k = k;
    p.add(new THREE.Mesh(outer, outerMat), new THREE.Mesh(inner, coreMat));
    g.add(p);
    return p;
  });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,236,190,1)', 'rgba(255,140,40,0.3)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.position.y = -4 * scale;
  glow.scale.setScalar(30 * scale);
  g.add(glow);
  g.userData.glow = glow;
  g.userData.U = U;
  g.userData.scale = scale;
  return g;
}

export function updateEngines(g, power, time) {
  const s = g.userData.scale;
  g.visible = power > 0.005;
  if (!g.visible) return;
  g.userData.plumes.forEach((p, i) => {
    const f = 1 + Math.sin(time * 37 + i * 1.7) * 0.07 + Math.sin(time * 23.3 + i) * 0.05;
    const k = p.userData.k;
    p.scale.set((0.75 + power * 0.35) * k, Math.max(0.001, (0.25 + power * 0.95) * f) * k, (0.75 + power * 0.35) * k);
  });
  g.userData.U.uPower.value = Math.min(1, power * 1.3);
  g.userData.U.uTime.value = time;
  g.userData.glow.material.opacity = Math.min(1, power * 1.2);
  g.userData.glow.scale.setScalar((30 + power * 40 + Math.sin(time * 30) * 2) * s);
}

export class Pad {
  constructor({ mobile, renderer }) {
    this.mobile = mobile;
    this.group = new THREE.Group();
    // lights live in their own always-visible group: hiding a light changes
    // the scene's light count, which forces every lit material to recompile
    this.lights = new THREE.Group();
    this.state = { lights: 0, tower: 0, flood: 0, vent: 0, ignite: 0, smoke: 0, lift: 0, shake: 0 };
    this.rocketReady = false;

    this.buildGround();
    this.buildFacility();
    this.buildPlatformAndTower();
    this.buildLights();
    this.buildSmoke();

    this.rocket = new THREE.Group();
    this.rocketBody = new THREE.Group();
    this.rocket.add(this.rocketBody);
    this.rocket.position.y = PLATFORM_H;
    this.engines = makeEngines(1);
    this.rocket.add(this.engines);
    this.engineLight = new THREE.PointLight(0xff9a3c, 0, 420, 2);
    this.lights.add(this.engineLight);
    this.group.add(this.rocket);
    // the hero only needs Earth: fetch the rocket once that has had a head start
    this.loadTimer = setTimeout(() => this.loadRocket(), 1200);
  }

  loadRocket() {
    // the Contenaissance launcher: real 3D geometry built from the brand artwork (see buildRocket)
    const model = buildRocket();
    this.model = model;
    this.rocketBody.add(model);
    this.rocketReady = true;
    this.onRocket?.(model);
  }

  buildGround() {
    const d = tex('/textures/space/pbr/rock_diff_512.webp', { repeat: true, aniso: 8 });
    d.repeat.set(360, 360);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      new THREE.MeshLambertMaterial({ map: d, color: new THREE.Color('#3a3a40') }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);
    // concrete apron around the pad
    const apron = new THREE.Mesh(new THREE.CircleGeometry(95, 64), new THREE.MeshLambertMaterial({ color: new THREE.Color('#55565a') }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = 0.05;
    this.group.add(apron);
  }

  buildFacility() {
    // distant buildings, assembly halls and service structures (instanced)
    const n = this.mobile ? 40 : 80;
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#2a2d33') });
    const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n);
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const a = rand(i * 3.3) * Math.PI * 2;
      const r = 260 + rand(i * 5.1) * 700;
      const w = 8 + rand(i * 2.2) * 30;
      const h = 4 + Math.pow(rand(i * 7.7), 2) * 22;
      M.compose(new THREE.Vector3(Math.cos(a) * r, h / 2, Math.sin(a) * r - 200), q.setFromEuler(new THREE.Euler(0, rand(i) * 3, 0)), new THREE.Vector3(w, h, w * (0.6 + rand(i * 9) * 0.8)));
      boxes.setMatrixAt(i, M);
    }
    this.group.add(boxes);

    // facility lights: roads, aprons, the far town
    const N = this.mobile ? 500 : 1100;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sodium = new THREE.Color('#ffb466');
    const white = new THREE.Color('#e8f0ff');
    for (let i = 0; i < N; i++) {
      let x;
      let z;
      const k = rand(i * 1.31);
      if (k < 0.35) {
        // two straight roads to the pad
        const t = rand(i * 2.7);
        const road = i % 2;
        x = road ? -40 + t * -1400 : 12 + (i % 4 < 2 ? -3 : 3);
        z = road ? -60 + (i % 4 < 2 ? -3 : 3) : 120 + t * 1200;
        if (road) x += (rand(i) - 0.5) * 2;
      } else if (k < 0.75) {
        const a = rand(i * 3.9) * Math.PI * 2;
        const r = 200 + rand(i * 4.3) * 900;
        x = Math.cos(a) * r + (rand(i * 6) - 0.5) * 40;
        z = Math.sin(a) * r - 200 + (rand(i * 7) - 0.5) * 40;
      } else {
        const a = rand(i * 8.1) * Math.PI * 2;
        const r = 1100 + rand(i * 9.4) * 700;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      }
      pos.set([x, 1 + rand(i * 5) * 4, z], i * 3);
      const c = rand(i * 11) < 0.7 ? sodium : white;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.facilityMat = new THREE.PointsMaterial({ size: 7, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
    this.facility = new THREE.Points(g, this.facilityMat);
    this.facility.frustumCulled = false;
    this.group.add(this.facility);
  }

  buildPlatformAndTower() {
    const steel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6b6f76'), metalness: 0.55, roughness: 0.55 });
    const concrete = new THREE.MeshStandardMaterial({ color: new THREE.Color('#77777a'), roughness: 0.95, metalness: 0 });
    this.steel = steel;
    // mobile launcher platform
    const plat = new THREE.Mesh(new THREE.BoxGeometry(44, PLATFORM_H, 36), concrete);
    plat.position.y = PLATFORM_H / 2;
    this.group.add(plat);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(17, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    hole.position.y = PLATFORM_H + 0.05;
    this.group.add(hole);
    // hold-down posts
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3, 1.4), steel);
      post.position.set(Math.cos(a) * 6.4, PLATFORM_H + 1.5, Math.sin(a) * 6.4);
      this.group.add(post);
    }

    // lattice umbilical tower: columns, rings and X braces as one instanced mesh
    const parts = [];
    const TX = 17;
    const TZ = 0;
    const W = 9;
    const H = 84;
    const L = 6;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    corners.forEach(([cx, cz]) => parts.push({ p: [TX + (cx * W) / 2, PLATFORM_H + H / 2, TZ + (cz * W) / 2], s: [0.9, H, 0.9], r: [0, 0, 0] }));
    for (let y = 0; y <= H; y += L) {
      const yy = PLATFORM_H + y;
      parts.push({ p: [TX, yy, TZ - W / 2], s: [W, 0.5, 0.5], r: [0, 0, 0] });
      parts.push({ p: [TX, yy, TZ + W / 2], s: [W, 0.5, 0.5], r: [0, 0, 0] });
      parts.push({ p: [TX - W / 2, yy, TZ], s: [0.5, 0.5, W], r: [0, 0, 0] });
      parts.push({ p: [TX + W / 2, yy, TZ], s: [0.5, 0.5, W], r: [0, 0, 0] });
      if (y < H) {
        const diag = Math.hypot(W, L);
        const ang = Math.atan2(L, W);
        [-1, 1].forEach((sgn) => {
          parts.push({ p: [TX, yy + L / 2, TZ - W / 2], s: [diag, 0.32, 0.32], r: [0, 0, sgn * ang] });
          parts.push({ p: [TX, yy + L / 2, TZ + W / 2], s: [diag, 0.32, 0.32], r: [0, 0, sgn * ang] });
          parts.push({ p: [TX - W / 2, yy + L / 2, TZ], s: [0.32, 0.32, diag], r: [-sgn * ang, 0, 0] });
          parts.push({ p: [TX + W / 2, yy + L / 2, TZ], s: [0.32, 0.32, diag], r: [-sgn * ang, 0, 0] });
        });
      }
    }
    // swing arms to the rocket
    // the lowest arm stops at the +x booster; the others reach the core (clear of the booster nose at ~31)
    [14, 36, 47.8, 56].forEach((h) => {
      const len = TX - W / 2 - (h < 31 ? 7.1 : 4.2);
      parts.push({ p: [TX - W / 2 - len / 2, PLATFORM_H + h, 0], s: [len, 1.6, 2.4], r: [0, 0, 0] });
    });
    // crane on top
    parts.push({ p: [TX - 4, PLATFORM_H + H + 2, 0], s: [16, 1, 1], r: [0, 0, 0] });
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tower = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, parts.length);
    parts.forEach((pt, i) => {
      M.compose(new THREE.Vector3(...pt.p), q.setFromEuler(new THREE.Euler(...pt.r)), new THREE.Vector3(...pt.s));
      tower.setMatrixAt(i, M);
    });
    this.group.add(tower);
    this.towerTop = new THREE.Vector3(TX, PLATFORM_H + H + 3, TZ);

    // red aviation beacons + white work lights up the tower
    const beacons = [];
    for (let y = 12; y <= H; y += 18) beacons.push([TX + W / 2 + 0.6, PLATFORM_H + y, TZ + W / 2 + 0.6]);
    beacons.push([TX - 12, PLATFORM_H + H + 3, 0]);
    const red = glowTexture('rgba(255,80,60,1)', 'rgba(255,30,20,0.3)');
    this.beacons = beacons.map((b, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: red, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
      s.position.set(...b);
      s.scale.setScalar(i === beacons.length - 1 ? 7 : 4.5);
      s.userData.ph = i * 0.7;
      this.group.add(s);
      return s;
    });
    const wl = glowTexture('rgba(255,244,225,1)', 'rgba(255,220,170,0.28)');
    this.worklights = [];
    for (let y = 6; y <= H; y += 6) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wl, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
      s.position.set(TX - W / 2 - 0.4, PLATFORM_H + y, TZ + (y % 12 ? 3 : -3));
      s.scale.setScalar(3.2);
      s.userData.y = y / H;
      this.group.add(s);
      this.worklights.push(s);
    }
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0x5a6a90, 0x120d0a, 0.35);
    this.moon = new THREE.DirectionalLight(0x9fb4ff, 0.35);
    this.moon.position.set(-200, 300, -300);
    this.lights.add(this.hemi, this.moon);

    const fixtures = [
      [-48, 2, 52],
      [52, 2, 46],
      [-56, 2, -40],
      [44, 2, -54],
    ];
    const glow = glowTexture('rgba(255,250,240,1)', 'rgba(255,235,200,0.35)');
    this.floods = fixtures.map(([x, y, z], i) => {
      const light = new THREE.SpotLight(0xfff1dc, 0, 320, 0.36, 0.55, 2);
      light.position.set(x, y + 3, z);
      light.target.position.set(0, 30 + (i % 2) * 14, 0);
      this.lights.add(light, light.target);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
      s.position.set(x, y + 3, z);
      s.scale.setScalar(16);
      this.group.add(s);
      // light shaft
      const from = new THREE.Vector3(x, y + 3, z);
      const to = new THREE.Vector3(0, 30 + (i % 2) * 14, 0);
      const len = from.distanceTo(to) * 1.05;
      const geo = new THREE.CylinderGeometry(9, 0.8, len, 24, 1, true);
      geo.translate(0, -len / 2, 0);
      const U = { uColor: { value: new THREE.Color('#ffe9c8') }, uOpacity: { value: 0 } };
      const beam = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      beam.position.copy(to);
      beam.lookAt(from);
      beam.rotateX(-Math.PI / 2);
      this.group.add(beam);
      return { light, sprite: s, U };
    });
  }

  buildSmoke() {
    const N = this.mobile ? 70 : 150;
    this.smokeN = N;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.smokeData = new Float32Array(N * 4);
    geo.setAttribute('aData', new THREE.InstancedBufferAttribute(this.smokeData, 4));
    this.smokeU = {
      map: { value: tex('/textures/space/fx/smoke.webp') },
      uLit: { value: new THREE.Color('#c9c4bf') },
      uShade: { value: new THREE.Color('#3b3a3d') },
      uHeat: { value: new THREE.Color('#ff8a30') },
    };
    this.smoke = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ uniforms: this.smokeU, vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false }), N);
    this.smoke.frustumCulled = false;
    this.group.add(this.smoke);
    this.smokeSeeds = Array.from({ length: N }, (_, i) => ({
      side: i % 2 ? 1 : -1,
      a: rand(i * 1.9),
      b: rand(i * 2.7),
      c: rand(i * 3.3),
      d: rand(i * 4.1),
      trail: i >= N * 0.62,
    }));
    this.M = new THREE.Matrix4();
  }

  updateSmoke(time) {
    const s = this.state;
    const N = this.smokeN;
    const M = this.M;
    const data = this.smokeData;
    const lift = s.lift;
    for (let i = 0; i < N; i++) {
      const q = this.smokeSeeds[i];
      let x = 0;
      let y = 0;
      let z = 0;
      let size = 1;
      let alpha = 0;
      let heat = 0;
      if (!q.trail) {
        // ground billow: born through the ignition, thrown out of the trench both ways
        const born = q.a * 0.8;
        const age = clamp((s.smoke - born) / 0.55);
        if (age > 0) {
          const e = easeOut(age);
          const dist = 8 + e * (55 + q.b * 120);
          x = q.side * dist * (0.85 + q.c * 0.3);
          z = (q.d - 0.5) * (14 + e * 90);
          y = 2 + e * (6 + q.c * 34) + Math.sin(time * 0.3 + i) * 1.2;
          size = 10 + e * (40 + q.b * 50);
          alpha = Math.min(1, age * 4) * (0.95 - e * 0.4);
          heat = (1 - e) * s.ignite * 0.9;
        }
        // vapour vent before ignition (small, near the rocket)
        if (s.vent > 0 && i % 5 === 0) {
          const t = (time * 0.12 + q.a) % 1;
          const vx = q.side * (6 + t * 10);
          x = age > 0 ? x : vx;
          y = age > 0 ? y : PLATFORM_H + 18 + q.b * 30 + t * 6;
          z = age > 0 ? z : (q.d - 0.5) * 6;
          size = age > 0 ? size : 4 + t * 10;
          alpha = Math.max(alpha, s.vent * Math.sin(Math.PI * t) * 0.35);
        }
      } else {
        // exhaust column left by the climbing rocket
        if (lift > 1) {
          const k = (q.a + time * 0.02) % 1;
          const h = k * Math.min(lift, 520);
          y = PLATFORM_H + h;
          const spread = 2 + (1 - h / Math.max(lift, 1)) * 12 + h * 0.03;
          x = (q.b - 0.5) * spread;
          z = (q.c - 0.5) * spread;
          size = 8 + spread * 2.2;
          const nearRocket = 1 - clamp((lift - h) / 40);
          heat = nearRocket * 0.9;
          alpha = 0.75 * (0.35 + 0.65 * (1 - k)) * clamp(lift / 20);
        }
      }
      M.makeTranslation(x, y, z);
      this.smoke.setMatrixAt(i, M);
      data[i * 4] = size;
      data[i * 4 + 1] = q.a * 6.28 + time * 0.05 * q.side;
      data[i * 4 + 2] = alpha;
      data[i * 4 + 3] = heat;
    }
    this.smoke.instanceMatrix.needsUpdate = true;
    this.smoke.geometry.attributes.aData.needsUpdate = true;
  }

  /** on = 0 switches every pad light off without removing it */
  setLightsOn(on) {
    this.lightsOn = on;
  }

  update(time) {
    const s = this.state;
    const L = this.lightsOn ?? 1;
    this.hemi.intensity = 0.35 * L;
    this.moon.intensity = 0.35 * L;
    this.facilityMat.opacity = s.lights;
    this.beacons.forEach((b) => (b.material.opacity = s.tower * (0.45 + 0.55 * (Math.sin(time * 2.4 + b.userData.ph) > 0.2 ? 1 : 0.15))));
    this.worklights.forEach((w) => (w.material.opacity = smooth(seg(s.tower * 1.25 - w.userData.y * 0.25, 0, 1)) * 0.95));
    this.floods.forEach((f, i) => {
      const on = smooth(seg(s.flood * 4 - i * 0.6, 0, 1));
      f.light.intensity = on * 5200 * L;
      f.sprite.material.opacity = on;
      f.U.uOpacity.value = on * 0.16;
    });
    const p = s.ignite;
    updateEngines(this.engines, p, time);
    this.engineLight.intensity = p * 22000 * L;
    this.engineLight.position.set(0, PLATFORM_H + s.lift - 8, 0);
    this.rocket.position.set(
      (Math.random() - 0.5) * s.shake * 0.25,
      PLATFORM_H + s.lift + (Math.random() - 0.5) * s.shake * 0.12,
      (Math.random() - 0.5) * s.shake * 0.25,
    );
    this.updateSmoke(time);
  }
}
