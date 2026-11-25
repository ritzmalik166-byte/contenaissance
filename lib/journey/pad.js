import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

/** five F-1 plumes + glow, hangs below y = 0 of its parent */
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
  const spots = [[0, 0], [2.4, 2.4], [-2.4, 2.4], [2.4, -2.4], [-2.4, -2.4]];
  g.userData.plumes = spots.map(([x, z]) => {
    const p = new THREE.Group();
    p.position.set(x * scale, 0, z * scale);
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
    p.scale.set(0.75 + power * 0.35, Math.max(0.001, (0.25 + power * 0.95) * f), 0.75 + power * 0.35);
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
    new GLTFLoader().load('/models/saturn-v.glb', (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const k = ROCKET_H / size.y;
      model.scale.setScalar(k);
      const c = box.getCenter(new THREE.Vector3());
      model.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      model.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        m.envMapIntensity = 0.22;
        m.roughness = 0.48;
        m.metalness = 0.12;
        m.side = THREE.FrontSide;
        if (m.map) m.map.anisotropy = 8;
      });
      this.model = model;
      this.rocketBody.add(model);
      this.rocketReady = true;
      this.onRocket?.(model);
    });
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
    const hole = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 12), new THREE.MeshBasicMaterial({ color: 0x050505 }));
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
    [14, 30, 44, 56].forEach((h) => {
      const len = TX - W / 2 - 4.2;
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
