import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* =====================================================
   ROCKET MODEL — the homepage's small rocket, as a real
   3D spacecraft (Mission Archive flight + CTA dock).

   One shared WebGL renderer draws every <RocketSprite>
   on the page into its own 2D canvas, so any number of
   rockets cost a single GL context, and only rockets
   actually on screen are rendered.

   The model is framed in the old SVG sprite's footprint
   (viewBox -40 0 184 330, axis at x = 52, nose tip at
   y ≈ 2, flame hinged at y = 238), 1 world unit = 100
   viewBox units, so every existing CSS size, transform
   origin and GSAP animation lines up unchanged:
     - the flame length follows `.rsprite__flame`'s
       inline `scale(1, s)` (set by the scroll code)
     - the engine light follows `.rsprite__enginelight`'s
       inline opacity
===================================================== */

// The canvas extends past the sprite box so fins and a long, boosted
// flame never clip: x -132…236, y 0…560 (viewBox units).
export const CANVAS_BOX = { x0: -132, x1: 236, y0: 0, y1: 560 };
const AXIS_X = 52;
const W = (v) => v / 100; // viewBox units → world units

const ORANGE = 0xd8692a;

/* ---------- procedural textures ---------- */
function hullTexture() {
  // graphite fuselage: brushed metal, panel seams, rivet rows
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2f34';
  g.fillRect(0, 0, 512, 256);
  // brushed streaks along the hull
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 256;
    const a = 0.02 + Math.random() * 0.05;
    g.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`;
    g.lineWidth = 0.6 + Math.random();
    g.beginPath();
    const x = Math.random() * 512;
    g.moveTo(x, y);
    g.lineTo(x + 40 + Math.random() * 120, y);
    g.stroke();
  }
  // panel seams: 8 around, one band across the middle
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * 512;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, 128);
  g.lineTo(512, 128);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, 130);
  g.lineTo(512, 130);
  g.stroke();
  // rivets beside the seams
  for (let i = 0; i < 8; i++) {
    for (let k = 0; k < 14; k++) {
      const x = (i / 8) * 512 + 7;
      const y = 10 + k * 18;
      g.fillStyle = 'rgba(160,168,176,0.55)';
      g.beginPath();
      g.arc(x, y, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function noseTexture() {
  // cream ceramic tiles with fine joints and slight heat staining
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#d9cfba'); // tip: faint heat tint
  grd.addColorStop(0.25, '#e9e1cf');
  grd.addColorStop(1, '#e4dbc8');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(90,80,60,0.18)';
  g.lineWidth = 1;
  for (let y = 24; y < 256; y += 24) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  for (let x = 0; x < 512; x += 32) {
    for (let y = 0; y < 256; y += 24) {
      const off = (y / 24) % 2 ? 16 : 0;
      g.beginPath();
      g.moveTo(x + off, y);
      g.lineTo(x + off, y + 24);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function glowTex(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ---------- volumetric flame shader ---------- */
const FLAME_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vView;
  float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
  float n3(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main(){
    vUv = uv;
    vec3 p = position;
    // turbulent swelling, stronger toward the tail
    float along = 1.0 - uv.y;
    float t = n3(vec3(p.x*6.0, p.y*5.0 + uTime*7.0, p.z*6.0 + uSeed));
    p.xz *= 1.0 + (t - 0.5) * 0.55 * along;
    p.x += (n3(vec3(p.y*3.0 - uTime*5.0, uSeed, 0.0)) - 0.5) * 0.06 * along;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FLAME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uIntensity;
  uniform vec3 uHot;
  uniform vec3 uMid;
  uniform vec3 uCool;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vView;
  float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
  float n3(vec3 p){
    vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main(){
    float along = 1.0 - vUv.y;            // 0 at the nozzle → 1 at the tail
    // view-facing density: thick through the middle, wispy at the edges
    float body = pow(abs(dot(normalize(vN), normalize(vView))), 1.05);
    float fbm = n3(vec3(vUv.x*8.0, along*6.0 - uTime*9.0, uSeed)) * 0.6
              + n3(vec3(vUv.x*17.0, along*13.0 - uTime*15.0, uSeed+3.0)) * 0.4;
    float a = body * pow(1.0 - along, 1.35) * (0.55 + fbm * 0.9) * uIntensity;
    // licks: the tail breaks up into tongues of fire
    a *= smoothstep(0.0, 0.35, fbm + (1.0 - along) * 0.8 - 0.25);
    vec3 col = mix(uHot, uMid, smoothstep(0.0, 0.35, along));
    col = mix(col, uCool, smoothstep(0.35, 0.95, along));
    gl_FragColor = vec4(col * a * 1.6, a);
  }
`;

/* ---------- build the spacecraft ---------- */
function buildRocket(env) {
  const root = new THREE.Group();
  const spin = new THREE.Group(); // slow roll about the hull axis
  root.add(spin);

  const hull = new THREE.MeshPhysicalMaterial({
    map: hullTexture(),
    color: 0xffffff,
    metalness: 0.85,
    roughness: 0.34,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    envMap: env,
    envMapIntensity: 1.1,
  });
  const ceramic = new THREE.MeshPhysicalMaterial({
    map: noseTexture(),
    color: 0xffffff,
    metalness: 0.05,
    roughness: 0.32,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    envMap: env,
    envMapIntensity: 0.9,
  });
  const orangePaint = new THREE.MeshPhysicalMaterial({
    color: ORANGE,
    metalness: 0.55,
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
    envMap: env,
    envMapIntensity: 1.0,
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf0c45a, metalness: 1, roughness: 0.22, envMap: env, envMapIntensity: 1.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bec5, metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.2, side: THREE.DoubleSide });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.9, roughness: 0.35, envMap: env });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a1018,
    metalness: 0,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMap: env,
    envMapIntensity: 1.6,
    transparent: true,
    opacity: 0.88,
  });

  const add = (geo, mat, parent = spin, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const SEG = 64;

  // ogive nose cone: tip at viewBox y 2, shoulder at y 150 (radius 50)
  const R = W(50);
  const yTip = -W(2);
  const yShoulder = -W(150);
  const nosePts = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40; // 0 = shoulder → 1 = tip
    const r = R * Math.pow(Math.cos((s * Math.PI) / 2), 0.72);
    nosePts.push(new THREE.Vector2(Math.max(r, 0.0005), yShoulder + (yTip - yShoulder) * s));
  }
  add(new THREE.LatheGeometry(nosePts, SEG), ceramic);
  const noseR = (y) => {
    const s = (y - yShoulder) / (yTip - yShoulder);
    return R * Math.pow(Math.cos((s * Math.PI) / 2), 0.72);
  };

  // fuselage cylinder (y 150 → 234) and a short boat-tail
  const yBase = -W(234);
  add(new THREE.CylinderGeometry(R, R, yShoulder - yBase, SEG, 1, true), hull, spin, [0, (yShoulder + yBase) / 2, 0]);
  add(
    new THREE.LatheGeometry([new THREE.Vector2(R * 0.78, yBase - W(9)), new THREE.Vector2(R * 0.97, yBase - W(1)), new THREE.Vector2(R, yBase)], SEG),
    darkSteel
  );
  add(new THREE.CircleGeometry(R * 0.78, SEG), darkSteel, spin, [0, yBase - W(9), 0], [Math.PI / 2, 0, 0]);

  // brand-orange stage rings + thin gold pinstripes
  [W(150), W(229)].forEach((y) => {
    add(new THREE.CylinderGeometry(R * 1.012, R * 1.012, W(7), SEG, 1, true), orangePaint, spin, [0, -y, 0]);
    add(new THREE.TorusGeometry(R * 1.014, 0.004, 6, SEG), gold, spin, [0, -y + W(5), 0], [Math.PI / 2, 0, 0]);
  });

  // portholes on the fuselage: gold bezel, dark glass dome, bolts
  [W(172), W(210)].forEach((y) => {
    const p = new THREE.Group();
    p.position.set(0, -y, R);
    spin.add(p);
    add(new THREE.TorusGeometry(W(8.2), W(2), 12, 32), gold, p);
    const g = add(new THREE.SphereGeometry(W(7), 24, 12), glass, p);
    g.scale.z = 0.35;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.006, 6, 4), darkSteel, p, [Math.cos(a) * W(8.2), Math.sin(a) * W(8.2), 0.012]);
    }
  });

  // cockpit window on the nose (y 92): gold bezel set into the curved
  // ceramic, a pilot's helmet visible behind the glass
  {
    const y = -W(92);
    const r = noseR(y);
    // the nose surface's tilt there
    const dy = 0.01;
    const slope = Math.atan2(noseR(y - dy) - noseR(y + dy), 2 * dy);
    const win = new THREE.Group();
    win.position.set(0, y, r - 0.01);
    win.rotation.x = -slope;
    spin.add(win);
    add(new THREE.TorusGeometry(W(17.5), W(3.2), 14, 48), gold, win);
    add(new THREE.CircleGeometry(W(16), 40), new THREE.MeshBasicMaterial({ color: 0x04060a }), win, [0, 0, -0.012]);
    // pilot: white helmet + dark visor with a warm reflection
    const helm = add(new THREE.SphereGeometry(W(9), 24, 16), new THREE.MeshStandardMaterial({ color: 0xeae6de, roughness: 0.45, envMap: env }), win, [0, -W(1.5), -0.04]);
    helm.scale.z = 0.7;
    const visor = add(
      new THREE.SphereGeometry(W(9.3), 24, 12, Math.PI / 2 - 0.9, 1.8, 0.7, 1.2),
      new THREE.MeshPhysicalMaterial({ color: 0x111318, metalness: 0.6, roughness: 0.08, clearcoat: 1, envMap: env, envMapIntensity: 2 }),
      win,
      [0, -W(1.5), -0.04]
    );
    visor.scale.z = 0.7;
    const dome = add(new THREE.SphereGeometry(W(16), 32, 16), glass, win, [0, 0, -0.005]);
    dome.scale.z = 0.3;
    dome.material = glass.clone();
    dome.material.opacity = 0.32;
  }

  // swept fins: extruded, bevelled, orange clear-coated metal
  {
    const s = new THREE.Shape();
    // (x = out from the hull, y = up) in viewBox units → world
    s.moveTo(0, -W(186));
    s.lineTo(W(36), -W(244));
    s.quadraticCurveTo(W(40), -W(258), W(28), -W(258));
    s.lineTo(0, -W(236));
    s.lineTo(0, -W(186));
    const finGeo = new THREE.ExtrudeGeometry(s, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 4,
      curveSegments: 12,
    });
    finGeo.translate(0, 0, -0.015);
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
      const f = new THREE.Group();
      f.rotation.y = a;
      spin.add(f);
      add(finGeo, orangePaint, f, [R - 0.02, 0, 0]);
      // root fairing strip along the hull
      add(new THREE.BoxGeometry(0.03, W(50), 0.05), darkSteel, f, [R - 0.005, -W(211), 0]);
    });
  }

  // engine: machined bell with a glowing throat
  const bellPts = [
    [0.15, -W(243)], [0.165, -W(246)], [0.2, -W(252)], [0.255, -W(260)], [0.29, -W(266)],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(bellPts, SEG), steel);
  add(new THREE.TorusGeometry(0.29, 0.008, 8, SEG), darkSteel, spin, [0, -W(266), 0], [Math.PI / 2, 0, 0]);
  const throatMat = new THREE.MeshBasicMaterial({ color: 0xffa24a, side: THREE.DoubleSide, toneMapped: false });
  const throat = add(new THREE.LatheGeometry(bellPts.map((v) => new THREE.Vector2(v.x * 0.94, v.y)), SEG), throatMat);
  throat.castShadow = false;
  add(new THREE.CylinderGeometry(0.15, 0.16, W(10), 32), darkSteel, spin, [0, -W(238), 0]);

  /* ---------- exhaust: layered volumetric flame ---------- */
  const flame = new THREE.Group();
  flame.position.y = -W(238); // hinge = the old sprite's flame origin
  root.add(flame);
  const exitY = -W(266) - flame.position.y;
  const layers = [];
  const layer = (radius, len, hot, mid, cool, seed, intensity) => {
    const geo = new THREE.CylinderGeometry(radius, radius * 0.06, len, 40, 24, true);
    geo.translate(0, -len / 2, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: seed },
        uIntensity: { value: intensity },
        uHot: { value: new THREE.Color(hot) },
        uMid: { value: new THREE.Color(mid) },
        uCool: { value: new THREE.Color(cool) },
      },
      vertexShader: FLAME_VERT,
      fragmentShader: FLAME_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = exitY;
    flame.add(m);
    layers.push(mat);
    return m;
  };
  layer(0.29, 1.15, 0xffb35a, 0xff5a1f, 0x8a1a08, 1.3, 1.25); // outer plume
  layer(0.2, 0.88, 0xffe1a0, 0xff8a2e, 0xc2380f, 4.1, 1.5); // mid flame
  layer(0.11, 0.55, 0xffffff, 0xfff0b8, 0xffa040, 7.7, 2.0); // white-hot core
  // shock diamonds in the core
  const diamondTex = glowTex('rgba(255,250,230,1)', 'rgba(255,220,150,0.45)');
  const diamonds = [0.12, 0.26, 0.4].map((d, i) => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: diamondTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 - i * 0.2 })
    );
    sp.scale.set(0.16 - i * 0.03, 0.09 - i * 0.015, 1);
    sp.position.y = exitY - d;
    flame.add(sp);
    return sp;
  });
  // heat bloom around the nozzle and plume
  const bloom = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex('rgba(255,170,80,0.9)', 'rgba(255,110,40,0.35)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.55,
    })
  );
  bloom.scale.set(1.1, 1.5, 1);
  bloom.position.y = exitY - 0.45;
  flame.add(bloom);

  // engine light: warm point light under the hull, lighting fins + tail
  const engineLight = new THREE.PointLight(0xff8a3a, 2, 2.2, 1.6);
  engineLight.position.set(0, -W(285), 0.25);
  root.add(engineLight);

  return {
    root,
    spin,
    flame,
    throatMat,
    bloom,
    diamonds,
    engineLight,
    update(t, flameScale, light) {
      // the flame hinges at the old sprite's origin, so a scale here
      // keeps it attached to the nozzle at any length
      flame.scale.set(1, Math.max(0.05, flameScale), 1);
      const flick = 0.9 + Math.sin(t * 37) * 0.05 + Math.sin(t * 23.7) * 0.05;
      layers.forEach((m) => {
        m.uniforms.uTime.value = t;
      });
      bloom.material.opacity = 0.7 * flick * Math.min(1.4, flameScale);
      diamonds.forEach((d, i) => (d.material.opacity = (0.75 - i * 0.18) * flick));
      engineLight.intensity = (1.2 + light * 2.6) * flick;
      throatMat.color.setRGB(1, 0.55 + light * 0.2, 0.25);
      // a gentle roll about the axis keeps the cockpit mostly facing us
      spin.rotation.y = Math.sin(t * 0.45) * 0.55;
    },
  };
}

/* ---------- shared renderer ---------- */
let shared = null;

function createShared() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const scene = new THREE.Scene();
  const { x0, x1, y0, y1 } = CANVAS_BOX;
  const camera = new THREE.OrthographicCamera(W(x0 - AXIS_X), W(x1 - AXIS_X), -W(y0), -W(y1), 0.1, 20);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, -W(y0), 0);
  camera.position.y = 0;

  const rocket = buildRocket(env);
  scene.add(rocket.root);

  // cinematic lighting: warm key from upper-left front (casts the fin
  // and porthole shadows), cool rim from behind-right, low fill
  scene.add(new THREE.AmbientLight(0x404858, 0.6));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
  key.position.set(-3, 3, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -1.6;
  key.shadow.camera.right = 1.6;
  key.shadow.camera.top = 1.2;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  key.target.position.set(0, -1.6, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fc8ff, 2.2);
  rim.position.set(4, 1.5, -3);
  scene.add(rim);
  const rimWarm = new THREE.DirectionalLight(0xffb070, 0.9);
  rimWarm.position.set(-4, -2, -2);
  scene.add(rimWarm);

  const instances = new Set();
  let raf = 0;
  const clock = new THREE.Clock();

  const readScale = (el) => {
    const m = /scale\(\s*[\d.]+\s*,\s*([\d.]+)\s*\)/.exec(el?.style.transform || '');
    return m ? parseFloat(m[1]) : 1;
  };
  const readLight = (el) => {
    const v = parseFloat(el?.style.opacity);
    return Number.isFinite(v) ? v : 0.5;
  };
  const visible = (inst) => {
    const el = inst.canvas;
    if (!el.isConnected) return false;
    if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  };

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = clock.getElapsedTime();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    instances.forEach((inst) => {
      if (!visible(inst)) return;
      const cw = Math.max(2, Math.round(inst.canvas.clientWidth * dpr));
      const ch = Math.max(2, Math.round(inst.canvas.clientHeight * dpr));
      if (inst.canvas.width !== cw || inst.canvas.height !== ch) {
        inst.canvas.width = cw;
        inst.canvas.height = ch;
      }
      const s = renderer.getSize(new THREE.Vector2());
      if (s.x !== cw || s.y !== ch) renderer.setSize(cw, ch, false);
      rocket.update(t + inst.phase, readScale(inst.flameEl), readLight(inst.lightEl));
      renderer.render(scene, camera);
      inst.ctx.clearRect(0, 0, cw, ch);
      inst.ctx.drawImage(renderer.domElement, 0, 0, cw, ch);
    });
  };

  return {
    add(inst) {
      instances.add(inst);
      if (!raf) raf = requestAnimationFrame(frame);
    },
    remove(inst) {
      instances.delete(inst);
      if (!instances.size && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
  };
}

/** Registers a 2D canvas to receive the rocket; returns an unregister fn,
 *  or null if WebGL isn't available (the caller keeps the SVG sprite). */
export function attachRocket(canvas, { flameEl, lightEl } = {}) {
  if (!shared) shared = createShared() || 'none';
  if (shared === 'none') return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const inst = { canvas, ctx, flameEl, lightEl, phase: Math.random() * 10 };
  shared.add(inst);
  return () => shared.remove(inst);
}
