import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { glowTexture } from './spaceCommon';

/* =====================================================
   ASTRONAUT — procedural, full-body EVA suit.
   Soft fabric suit (sheen), hard white shell parts,
   gold reflective visor, PLSS backpack, chest control
   module, umbilical hoses, gloves, boots, brand-orange
   bands, helmet lamps and a holo-projector on the left
   wrist. Rigged with shoulder / elbow / hip / knee
   pivots so it can float, tumble and raise its arm.

   createAstronaut(kit, { sunDir }) → {
     group,        // add to a scene; origin ≈ body centre
     height,       // world height at scale 1
     wrist,        // Object3D at the projector lens
     setPose({ arm, glow }),
     update(t),
   }
===================================================== */

const ORANGE = 0xf08a24;

export function createAstronaut(kit, { sunDir } = {}) {
  const env = kit.environment(sunDir);
  const segs = kit.mobile ? 20 : 36;

  /* ---------- materials ---------- */
  const suit = new THREE.MeshPhysicalMaterial({
    color: 0xeeebe4,
    roughness: 0.82,
    sheen: 0.7,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(0xffffff),
    envMap: env,
    envMapIntensity: 0.55,
  });
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xf7f6f2,
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    envMap: env,
    envMapIntensity: 0.9,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xb9bdc4,
    metalness: 1,
    roughness: 0.28,
    envMap: env,
    envMapIntensity: 1.1,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x3b3f46,
    metalness: 0.8,
    roughness: 0.4,
    envMap: env,
  });
  const glove = new THREE.MeshPhysicalMaterial({
    color: 0xd9d6cf,
    roughness: 0.7,
    sheen: 0.4,
    envMap: env,
    envMapIntensity: 0.5,
  });
  const orange = new THREE.MeshPhysicalMaterial({
    color: ORANGE,
    roughness: 0.55,
    clearcoat: 0.3,
    envMap: env,
    envMapIntensity: 0.6,
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
    sky.addColorStop(0, '#2a1606');
    sky.addColorStop(0.42, '#a8661c');
    sky.addColorStop(0.55, '#ffd27a');
    sky.addColorStop(0.62, '#c47a22');
    sky.addColorStop(1, '#1c0f05');
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, 256);
    g.globalCompositeOperation = 'lighter';
    const streak = g.createLinearGradient(40, 0, 120, 256);
    streak.addColorStop(0, 'rgba(255,255,255,0)');
    streak.addColorStop(0.5, 'rgba(255,246,220,0.55)');
    streak.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = streak;
    g.beginPath();
    g.moveTo(70, 0);
    g.lineTo(110, 0);
    g.lineTo(60, 256);
    g.lineTo(30, 256);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const visor = new THREE.MeshPhysicalMaterial({
    color: 0xe6b25a,
    map: visorTex,
    emissive: 0xffffff,
    emissiveMap: visorTex,
    emissiveIntensity: 0.55,
    metalness: 0.85,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMap: env,
    envMapIntensity: 1.6,
  });
  const sole = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.9 });
  const hoseBlue = new THREE.MeshStandardMaterial({ color: 0x3a6bd8, roughness: 0.45, envMap: env });
  const hoseRed = new THREE.MeshStandardMaterial({ color: 0xd8453a, roughness: 0.45, envMap: env });
  const screen = new THREE.MeshBasicMaterial({ color: 0x6ff7ff, toneMapped: false });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff4d6, toneMapped: false });

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

  const group = new THREE.Group();
  const body = new THREE.Group(); // pelvis-origin rig
  body.position.y = -0.1; // centre the bounding box on the group origin
  group.add(body);
  // upper body pivots at the pelvis (twist / lean / breathe)
  const spine = new THREE.Group();
  body.add(spine);

  /* ---------- torso ---------- */
  const torsoProfile = [
    [0.0, -0.02], [0.23, -0.02], [0.27, 0.06], [0.25, 0.2], [0.26, 0.36],
    [0.3, 0.5], [0.315, 0.62], [0.28, 0.71], [0.18, 0.77], [0.0, 0.78],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = mesh(new THREE.LatheGeometry(torsoProfile, segs * 2), suit, spine);
  torso.scale.z = 0.74;

  // hard upper torso shell (front plate)
  const hut = mesh(rbox(0.5, 0.3, 0.18, 0.08), shell, spine, [0, 0.58, 0.1]);
  hut.rotation.x = -0.08;

  // chest display & control module
  const dcm = mesh(rbox(0.3, 0.15, 0.1, 0.03), shell, spine, [0, 0.4, 0.25]);
  dcm.rotation.x = 0.25;
  const btnGeo = new THREE.BoxGeometry(0.035, 0.022, 0.012);
  [[-0.08, 0xff5a3c], [-0.03, 0xffc94a], [0.02, 0x5ff6a0], [0.07, 0x6ff7ff]].forEach(([x, c]) => {
    mesh(btnGeo, button(c), dcm, [x, 0.03, 0.052]);
  });
  mesh(new THREE.BoxGeometry(0.12, 0.04, 0.01), button(0x1d3b45), dcm, [0, -0.03, 0.052]);

  // brand stripe across the chest
  const chestBand = mesh(ring(0.27, 0.018), orange, spine, [0, 0.47, 0], [Math.PI / 2, 0, 0]);
  chestBand.scale.set(1.08, 0.76, 1);

  // waist bearing + hips
  mesh(ring(0.245, 0.03), metal, body, [0, 0.01, 0], [Math.PI / 2, 0, 0]).scale.set(1, 0.76, 1);
  const hips = mesh(new THREE.SphereGeometry(0.26, segs, segs / 2), suit, body, [0, -0.06, 0]);
  hips.scale.set(1, 0.62, 0.74);

  // neck ring
  mesh(ring(0.165, 0.035), metal, spine, [0, 0.79, 0.01], [Math.PI / 2, 0, 0]);

  /* ---------- helmet ---------- */
  const neck = new THREE.Group(); // head look pivot
  neck.position.set(0, 0.8, 0);
  spine.add(neck);
  const helmet = new THREE.Group();
  helmet.position.set(0, 0.21, 0.02);
  neck.add(helmet);
  mesh(new THREE.SphereGeometry(0.25, segs * 2, segs), shell, helmet);
  // gold visor: front cap of a slightly larger sphere (front = +z)
  mesh(
    new THREE.SphereGeometry(0.258, segs * 2, segs, Math.PI / 2 - 0.98, 1.96, 0.62, 1.32),
    visor,
    helmet
  );
  // sun-visor brow ridge over the gold visor
  mesh(
    new THREE.SphereGeometry(0.266, segs * 2, 6, Math.PI / 2 - 1.05, 2.1, 0.5, 0.16),
    shell,
    helmet
  );
  // side lamps + brand-orange ear modules (like the 2D pilot)
  [-1, 1].forEach((s) => {
    const ear = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, segs), orange, helmet, [s * 0.245, -0.02, -0.01], [0, 0, Math.PI / 2]);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, segs), darkMetal, ear, [0, s * 0.03, 0]);
    const housing = mesh(rbox(0.06, 0.06, 0.12, 0.02), shell, helmet, [s * 0.235, 0.12, 0.05]);
    mesh(new THREE.CircleGeometry(0.022, 16), lamp, housing, [0, 0, 0.061]);
  });

  /* ---------- backpack (PLSS) ---------- */
  const pack = mesh(rbox(0.54, 0.66, 0.26, 0.06), shell, spine, [0, 0.42, -0.31]);
  mesh(rbox(0.46, 0.08, 0.2, 0.03), darkMetal, pack, [0, -0.3, 0.02]);
  mesh(rbox(0.12, 0.3, 0.04, 0.015), orange, pack, [0.16, 0.06, -0.13]);
  mesh(rbox(0.12, 0.3, 0.04, 0.015), orange, pack, [-0.16, 0.06, -0.13]);

  // MMU thruster nozzles (puffs are emitted by the host scene)
  const nozzles = [];
  const nozzleGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.06, 12);
  [[-0.22, -0.33], [0.22, -0.33], [-0.22, 0.33], [0.22, 0.33]].forEach(([x, y]) => {
    const n = mesh(nozzleGeo, darkMetal, pack, [x, y, -0.08], [y < 0 ? Math.PI : 0, 0, 0]);
    const out = new THREE.Object3D();
    out.position.y = 0.05;
    n.add(out);
    nozzles.push(out);
  });

  // blinking beacon on top of the pack
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3b2f, toneMapped: false });
  mesh(new THREE.SphereGeometry(0.022, 12, 8), beaconMat, pack, [0.18, 0.34, -0.02]);
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
  beaconGlow.position.set(0.18, 0.34, -0.02);
  pack.add(beaconGlow);

  // umbilical hoses: chest module → backpack
  const hose = (side, mat) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.13, 0.38, 0.27),
      new THREE.Vector3(side * 0.3, 0.26, 0.2),
      new THREE.Vector3(side * 0.34, 0.3, -0.05),
      new THREE.Vector3(side * 0.24, 0.5, -0.2),
    ]);
    mesh(new THREE.TubeGeometry(curve, 24, 0.018, 8, false), mat, spine);
  };
  hose(-1, hoseBlue);
  hose(1, hoseRed);

  /* ---------- arms ---------- */
  const arm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.33, 0.62, 0);
    spine.add(shoulder);
    mesh(ring(0.1, 0.032), metal, shoulder, [0, 0, 0], [0, Math.PI / 2, 0]);
    mesh(new THREE.SphereGeometry(0.1, segs, segs / 2), suit, shoulder);
    mesh(capsule(0.088, 0.24), suit, shoulder, [0, -0.19, 0]);
    mesh(ring(0.09, 0.016), orange, shoulder, [0, -0.13, 0], [Math.PI / 2, 0, 0]);

    const elbow = new THREE.Group();
    elbow.position.y = -0.37;
    shoulder.add(elbow);
    mesh(new THREE.SphereGeometry(0.083, segs, segs / 2), suit, elbow);
    mesh(capsule(0.078, 0.22), suit, elbow, [0, -0.16, 0]);
    mesh(ring(0.075, 0.022), metal, elbow, [0, -0.31, 0], [Math.PI / 2, 0, 0]);

    // glove
    const hand = new THREE.Group();
    hand.position.y = -0.38;
    elbow.add(hand);
    const palm = mesh(rbox(0.11, 0.12, 0.07, 0.03), glove, hand);
    mesh(capsule(0.03, 0.05), glove, palm, [side * -0.06, 0.0, 0.02], [0, 0, side * 0.6]);
    mesh(rbox(0.1, 0.06, 0.06, 0.025), glove, palm, [0, -0.08, 0.005]);

    return { shoulder, elbow, hand };
  };
  const armR = arm(-1); // astronaut's right (viewer's left)
  const armL = arm(1); // astronaut's left — carries the projector

  // wrist holo-projector on the left forearm
  const device = mesh(rbox(0.11, 0.07, 0.13, 0.02), darkMetal, armL.elbow, [0, -0.24, 0.07]);
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
    mesh(capsule(0.105, 0.28), suit, hip, [0, -0.2, 0]);
    mesh(ring(0.105, 0.018), orange, hip, [0, -0.12, 0], [Math.PI / 2, 0, 0]);

    const knee = new THREE.Group();
    knee.position.y = -0.43;
    hip.add(knee);
    mesh(new THREE.SphereGeometry(0.1, segs, segs / 2), suit, knee);
    mesh(capsule(0.092, 0.27), suit, knee, [0, -0.2, 0]);

    const boot = new THREE.Group();
    boot.position.y = -0.44;
    knee.add(boot);
    mesh(rbox(0.17, 0.16, 0.3, 0.05), shell, boot, [0, 0, 0.04]);
    mesh(rbox(0.18, 0.04, 0.32, 0.015), sole, boot, [0, -0.08, 0.045]);
    mesh(ring(0.088, 0.02), metal, boot, [0, 0.09, 0], [Math.PI / 2, 0, 0]);
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
