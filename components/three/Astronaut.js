import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { glowTexture } from './spaceCommon';

/* =====================================================
   ASTRONAUT — procedural, full-body EVA suit modelled
   on a real spacewalk suit (EMU):
     - woven, matte orthofabric with stitched panel seams
       and light scuffing (procedural normal + colour maps)
     - pleated bellows at shoulders, elbows, waist, knees
       and ankles, with machined bearing rings
     - hard upper torso, chest display & control module
       with knobs, life-support backpack (PLSS) with the
       secondary oxygen pack, hoses and service panels
     - clear pressure bubble over a gold sun visor, helmet
       lights + camera assembly
     - five-finger gloves with grip pads and coloured
       wrist disconnect rings, lugged boots
     - brand-orange commander stripes and a mission patch
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

const ORANGE = 0xe0782a;

/* ---------- procedural fabric (shared, built once) ---------- */
let FABRIC = null;
function fabricMaps() {
  if (FABRIC) return FABRIC;
  const N = 256;
  const h = new Float32Array(N * N);
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();
  const noise = new Float32Array(N * N).map(() => rnd());
  const at = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // fine twill weave
      const weave = Math.sin((x + y) * 1.6) * Math.sin((x - y) * 1.6) * 0.08;
      // stitched panel seams: horizontal every 128px, vertical every 256px (tile edge)
      const sy = Math.abs(((y + 64) % 128) - 64);
      const sx = Math.min(x, N - x);
      let seam = 0;
      if (sy < 3) seam -= (3 - sy) * 0.22;
      if (sx < 2) seam -= (2 - sx) * 0.2;
      // stitch dots running beside each seam
      if (sy > 4 && sy < 6 && x % 6 < 3) seam -= 0.08;
      // soft quilting puff between seams
      const puff = Math.sin(((y % 128) / 128) * Math.PI) * 0.14;
      h[y * N + x] = weave + seam + puff + noise[y * N + x] * 0.04;
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
      const v = 240 + (noise[y * N + x] - 0.5) * 8 + Math.min(0, h[y * N + x]) * 35;
      cimg.data[i] = v;
      cimg.data[i + 1] = v;
      cimg.data[i + 2] = v - 1;
      cimg.data[i + 3] = 255;
    }
  }
  cg.putImageData(cimg, 0, 0);
  // scuffs: a few soft grey-brown smudges
  for (let k = 0; k < 14; k++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const r = 10 + rnd() * 30;
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

/* mission patch: round, gold infinity on black, brand ring */
function patchTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e0782a';
  g.beginPath();
  g.arc(64, 64, 62, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0d0b09';
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#e9b949';
  g.lineWidth = 9;
  g.beginPath();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const d = 1 + Math.sin(a) ** 2;
    const x = 64 + (Math.cos(a) / d) * 40;
    const y = 64 + ((Math.sin(a) * Math.cos(a)) / d) * 40;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createAstronaut(kit, { sunDir } = {}) {
  const env = kit.environment(sunDir);
  const segs = kit.mobile ? 20 : 36;
  const fab = fabricMaps();

  /* ---------- materials ---------- */
  // orthofabric: matte, woven, slightly warm white
  const suit = new THREE.MeshPhysicalMaterial({
    color: 0xf1f0ed,
    map: fab.color,
    normalMap: fab.normal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.93,
    sheen: 0.45,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0xf4efe6),
    envMap: env,
    envMapIntensity: 0.4,
  });
  // bellows folds: same cloth, a touch darker so the pleats read
  const pleat = suit.clone();
  pleat.color = new THREE.Color(0xd9d8d4);
  // painted fibreglass hard parts (HUT, backpack, boots, helmet shell)
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xf0efeb,
    roughness: 0.5,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    envMap: env,
    envMapIntensity: 0.6,
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
  const glove = new THREE.MeshPhysicalMaterial({
    color: 0xd4d1ca,
    map: fab.color,
    normalMap: fab.normal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.85,
    sheen: 0.3,
    envMap: env,
    envMapIntensity: 0.4,
  });
  const grip = new THREE.MeshStandardMaterial({ color: 0x8d8f93, roughness: 0.95 });
  const orange = new THREE.MeshPhysicalMaterial({
    color: ORANGE,
    map: fab.color,
    normalMap: fab.normal,
    roughness: 0.85,
    envMap: env,
    envMapIntensity: 0.4,
  });
  // Gold sun visor. Space reflects almost nothing, so a painted
  // reflection (horizon glow, sky, highlight streak) keeps it reading
  // as polished gold instead of a black hole.
  const visorTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#140b04');
    sky.addColorStop(0.4, '#6b3f12');
    sky.addColorStop(0.53, '#e9b45a');
    sky.addColorStop(0.58, '#ffe6b0');
    sky.addColorStop(0.64, '#9a5c1a');
    sky.addColorStop(1, '#0e0703');
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, 256);
    // the curve of a planet's limb reflected across the lower visor
    g.strokeStyle = 'rgba(255,220,160,0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(128, 330, 220, 170, 0, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
    g.globalCompositeOperation = 'lighter';
    const streak = g.createLinearGradient(40, 0, 120, 256);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(0.5, 'rgba(255,246,220,0.4)');
    streak.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = streak;
    g.beginPath();
    g.moveTo(70, 0);
    g.lineTo(100, 0);
    g.lineTo(55, 256);
    g.lineTo(32, 256);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const visor = new THREE.MeshPhysicalMaterial({
    color: 0xd9a24a,
    map: visorTex,
    emissive: 0xffffff,
    emissiveMap: visorTex,
    emissiveIntensity: 0.4,
    metalness: 0.95,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMap: env,
    envMapIntensity: 1.8,
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
  const sole = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.95 });
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0xbfbcb5, roughness: 0.7, envMap: env });
  const screen = new THREE.MeshBasicMaterial({ color: 0x6ff7ff, toneMapped: false });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff4d6, toneMapped: false });
  const lens = new THREE.MeshStandardMaterial({ color: 0x101216, metalness: 0.4, roughness: 0.1, envMap: env });
  const patch = new THREE.MeshStandardMaterial({ map: patchTexture(), roughness: 0.8 });

  const button = (hex) => new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });

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
  // pleated bellows: a stack of soft fabric rolls around a limb (along -y)
  const bellows = (parent, r, y0, count, step, mat = pleat) => {
    for (let i = 0; i < count; i++) {
      mesh(ring(r, r * 0.17), mat, parent, [0, y0 - i * step, 0], [Math.PI / 2, 0, 0]);
    }
  };
  // a two-tone machined bearing ring
  const bearing = (parent, r, y, rot = [Math.PI / 2, 0, 0]) => {
    const g = new THREE.Group();
    g.position.y = y;
    g.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(g);
    mesh(ring(r, r * 0.16), metal, g);
    mesh(ring(r * 1.02, r * 0.07), darkMetal, g, [0, 0, r * 0.12]);
    return g;
  };

  const group = new THREE.Group();
  const body = new THREE.Group(); // pelvis-origin rig
  body.position.y = -0.1; // centre the bounding box on the group origin
  group.add(body);
  // upper body pivots at the pelvis (twist / lean / breathe)
  const spine = new THREE.Group();
  body.add(spine);

  /* ---------- torso ---------- */
  const torsoProfile = [
    [0.0, -0.02], [0.24, -0.02], [0.28, 0.06], [0.26, 0.2], [0.27, 0.36],
    [0.31, 0.5], [0.325, 0.62], [0.29, 0.71], [0.19, 0.77], [0.0, 0.78],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = mesh(new THREE.LatheGeometry(torsoProfile, segs * 2), suit, spine);
  torso.scale.z = 0.76;

  // hard upper torso: a broad fibreglass breastplate
  const hut = mesh(rbox(0.58, 0.36, 0.2, 0.09), shell, spine, [0, 0.57, 0.11]);
  hut.rotation.x = -0.08;
  // shoulder yokes of the HUT
  [-1, 1].forEach((s) => {
    const yoke = mesh(rbox(0.2, 0.12, 0.3, 0.05), shell, spine, [s * 0.22, 0.71, -0.02]);
    yoke.rotation.z = s * -0.25;
  });

  // display & control module: box, knobs, LCD, purge valve
  const dcm = mesh(rbox(0.32, 0.16, 0.12, 0.025), shell, spine, [0, 0.38, 0.27]);
  dcm.rotation.x = 0.25;
  mesh(new THREE.BoxGeometry(0.13, 0.045, 0.01), button(0x2a4a52), dcm, [-0.06, 0.035, 0.062]);
  const knobGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.03, 16);
  [[0.07, 0.03], [0.12, 0.03], [0.07, -0.035], [0.12, -0.035]].forEach(([x, y]) => {
    mesh(knobGeo, darkMetal, dcm, [x, y, 0.07], [Math.PI / 2, 0, 0]);
  });
  const ledGeo = new THREE.BoxGeometry(0.018, 0.012, 0.01);
  [[-0.11, 0xff5a3c], [-0.08, 0xffc94a], [-0.05, 0x5ff6a0]].forEach(([x, c]) => {
    mesh(ledGeo, button(c), dcm, [x, -0.04, 0.062]);
  });
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 16), orange, dcm, [-0.12, -0.08, 0.02]);

  // mission patch on the left chest
  mesh(new THREE.CircleGeometry(0.055, 32), patch, spine, [0.17, 0.6, 0.215], [-0.08, 0.25, 0]);

  // waist: bearing + pleated lower-torso brief
  bearing(body, 0.25, 0.01).scale.set(1, 0.78, 1);
  bellows(body, 0.25, -0.02, 2, 0.035);
  const hips = mesh(new THREE.SphereGeometry(0.27, segs, segs / 2), suit, body, [0, -0.07, 0]);
  hips.scale.set(1, 0.64, 0.76);

  // neck ring (helmet disconnect)
  bearing(spine, 0.17, 0.79);

  /* ---------- helmet ---------- */
  const neck = new THREE.Group(); // head look pivot
  neck.position.set(0, 0.8, 0);
  spine.add(neck);
  const helmet = new THREE.Group();
  helmet.position.set(0, 0.21, 0.02);
  neck.add(helmet);
  // extravehicular visor assembly shell
  mesh(new THREE.SphereGeometry(0.25, segs * 2, segs), shell, helmet);
  // gold visor: front cap of a slightly larger sphere (front = +z)
  mesh(
    new THREE.SphereGeometry(0.258, segs * 2, segs, Math.PI / 2 - 0.98, 1.96, 0.62, 1.32),
    visor,
    helmet
  );
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
  // helmet lights + camera assembly on both temples
  [-1, 1].forEach((s) => {
    const arm = mesh(rbox(0.05, 0.035, 0.14, 0.01), darkMetal, helmet, [s * 0.235, 0.1, 0.0]);
    const housing = mesh(rbox(0.075, 0.07, 0.11, 0.02), shell, helmet, [s * 0.26, 0.13, 0.08]);
    mesh(new THREE.CircleGeometry(0.018, 16), lamp, housing, [-s * 0.012, 0.012, 0.056]);
    mesh(new THREE.CircleGeometry(0.012, 16), lamp, housing, [s * 0.014, 0.012, 0.056]);
    if (s > 0) mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 16), lens, housing, [0, -0.02, 0.06], [Math.PI / 2, 0, 0]);
    arm.rotation.y = s * 0.15;
  });

  /* ---------- backpack (PLSS + secondary oxygen pack) ---------- */
  const pack = mesh(rbox(0.56, 0.62, 0.26, 0.05), shell, spine, [0, 0.45, -0.31]);
  // service panels and vents on the back face
  mesh(rbox(0.4, 0.22, 0.02, 0.01), panel, pack, [0, 0.14, -0.13]);
  mesh(rbox(0.18, 0.18, 0.02, 0.01), panel, pack, [-0.12, -0.13, -0.13]);
  const ventGeo = new THREE.BoxGeometry(0.14, 0.008, 0.012);
  for (let i = 0; i < 5; i++) mesh(ventGeo, darkMetal, pack, [0.13, -0.06 - i * 0.03, -0.135]);
  mesh(rbox(0.06, 0.24, 0.03, 0.01), orange, pack, [0.24, 0.12, -0.12]);
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

  // umbilical hoses: chest module → backpack (sleeved, with end fittings)
  const hose = (side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.13, 0.36, 0.28),
      new THREE.Vector3(side * 0.3, 0.25, 0.2),
      new THREE.Vector3(side * 0.35, 0.3, -0.05),
      new THREE.Vector3(side * 0.25, 0.5, -0.2),
    ]);
    mesh(new THREE.TubeGeometry(curve, 32, 0.016, 10, false), hoseMat, spine);
    const end = curve.getPoint(0);
    mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), metal, spine, [end.x, end.y, end.z], [0, 0, Math.PI / 2]);
  };
  hose(-1);
  hose(1);

  /* ---------- arms ---------- */
  const arm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.34, 0.62, 0);
    spine.add(shoulder);
    bearing(shoulder, 0.105, 0, [0, Math.PI / 2, 0]);
    mesh(new THREE.SphereGeometry(0.1, segs, segs / 2), suit, shoulder);
    // upper arm: pleats under the shoulder, then the sleeve
    bellows(shoulder, 0.094, -0.06, 3, 0.03);
    mesh(capsule(0.09, 0.22), suit, shoulder, [0, -0.2, 0]);
    // brand-orange arm stripe
    mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.03, segs, 1, true), orange, shoulder, [0, -0.2, 0]);
    bearing(shoulder, 0.088, -0.29);

    const elbow = new THREE.Group();
    elbow.position.y = -0.37;
    shoulder.add(elbow);
    mesh(new THREE.SphereGeometry(0.084, segs, segs / 2), suit, elbow);
    bellows(elbow, 0.082, 0.04, 4, 0.03);
    mesh(capsule(0.078, 0.2), suit, elbow, [0, -0.17, 0]);
    // wrist disconnect: metal ring with a coloured bearing (blue L / red R)
    bearing(elbow, 0.074, -0.31);
    mesh(ring(0.076, 0.009), button(side > 0 ? 0x2f6bd8 : 0xd8453a), elbow, [0, -0.325, 0], [Math.PI / 2, 0, 0]);

    // glove: gauntlet cuff, palm, four fingers, thumb, grip pads
    const hand = new THREE.Group();
    hand.position.y = -0.38;
    elbow.add(hand);
    mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.06, segs), glove, hand, [0, 0.04, 0]);
    const palm = mesh(rbox(0.11, 0.11, 0.06, 0.025), glove, hand, [0, -0.04, 0]);
    mesh(rbox(0.1, 0.08, 0.012, 0.005), grip, palm, [0, -0.005, -0.031]);
    const fingerGeo = capsule(0.016, 0.05);
    [-0.036, -0.012, 0.012, 0.036].forEach((fx, i) => {
      const f = mesh(fingerGeo, glove, palm, [fx, -0.09 + Math.abs(fx) * 0.25, -0.006]);
      f.rotation.x = -0.35 - i * 0.04; // relaxed curl
      mesh(new THREE.SphereGeometry(0.012, 10, 8), grip, f, [0, -0.038, -0.008]);
    });
    const thumb = mesh(capsule(0.018, 0.04), glove, palm, [side * -0.065, -0.02, 0.012], [0.3, 0, side * 0.75]);
    mesh(new THREE.SphereGeometry(0.019, 10, 8), grip, thumb, [0, -0.035, 0]);

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
      map: glowTexture('#6ff7ff'),
      color: 0x6ff7ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  deviceGlow.scale.setScalar(0.45);
  wrist.add(deviceGlow);
  const deviceLight = new THREE.PointLight(0x6ff7ff, 0, 1.6, 2);
  wrist.add(deviceLight);

  /* ---------- legs ---------- */
  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.1, 0);
    body.add(hip);
    bearing(hip, 0.11, -0.04);
    mesh(capsule(0.108, 0.27), suit, hip, [0, -0.21, 0]);
    // commander stripe: brand orange around the thigh
    mesh(new THREE.CylinderGeometry(0.111, 0.111, 0.05, segs, 1, true), orange, hip, [0, -0.2, 0]);

    const knee = new THREE.Group();
    knee.position.y = -0.43;
    hip.add(knee);
    mesh(new THREE.SphereGeometry(0.102, segs, segs / 2), suit, knee);
    bellows(knee, 0.1, 0.05, 4, 0.032);
    mesh(capsule(0.094, 0.26), suit, knee, [0, -0.21, 0]);
    bellows(knee, 0.092, -0.33, 2, 0.03);

    const boot = new THREE.Group();
    boot.position.y = -0.44;
    knee.add(boot);
    // boot shell, toe cap, tongue panel, lugged sole
    mesh(rbox(0.18, 0.17, 0.3, 0.05), shell, boot, [0, 0, 0.04]);
    mesh(rbox(0.16, 0.08, 0.1, 0.03), panel, boot, [0, 0.03, 0.16]);
    mesh(rbox(0.12, 0.1, 0.02, 0.01), panel, boot, [0, 0.03, 0.18]);
    mesh(rbox(0.19, 0.035, 0.32, 0.012), sole, boot, [0, -0.085, 0.045]);
    const lugGeo = new THREE.BoxGeometry(0.17, 0.012, 0.025);
    for (let i = 0; i < 6; i++) mesh(lugGeo, sole, boot, [0, -0.106, -0.08 + i * 0.05]);
    bearing(boot, 0.09, 0.09);
    return { hip, knee };
  };
  const legR = leg(-1);
  const legL = leg(1);

  // total height at scale 1 (helmet top ≈ 1.16, sole ≈ -1.09 after offset)
  const height = 2.3;

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
