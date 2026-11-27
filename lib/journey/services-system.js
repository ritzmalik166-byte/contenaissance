import * as THREE from 'three';
import { tex, rand, glowTexture } from './util';
import { Earth, R as ER } from './earth';

/* =====================================================
   SOLAR SYSTEM — the services page's world.
   One gold sun, a spiral dust disc, thin orbit rings and
   six real planets (NASA-based maps via Solar System Scope,
   see /public/textures/space/CREDITS.md), one per service.
   The planets are lit by the sun itself (a point light at
   the centre), so every close-up has a real terminator.
===================================================== */

const P = '/textures/space/planets';

// visit order = service order. a = orbit radius, th = angle on the orbit
// close-up framing: swing = how far round from the sun the camera looks
// (larger = more night side), dist = camera distance in radii
export const SYSTEM = [
  { map: 'mars_1k', r: 7, rim: '#ff9a6a', a: 74, th: 1.2 },
  { map: 'neptune_1k', r: 8.5, rim: '#7fb2ff', a: 134, th: 1.95 },
  { map: 'jupiter_1k', r: 12, rim: '#f3d2a2', a: 198, th: 2.62 },
  { map: 'venus_1k', r: 8, rim: '#ffd9a0', a: 104, th: 3.4 },
  { map: 'saturn_1k', r: 9, rim: '#f0d9a8', a: 166, th: 4.1, ring: true, dist: 4 },
  // Earth is shown on its night side: city lights, a lit limb
  { earth: true, r: 8.5, rim: '#8fb8ff', a: 236, th: 4.8, swing: 1.8, dist: 2.35 },
];
export const DISC_R = 290;

const RIM_VS = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const RIM_FS = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSun;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    // back faces of a slightly larger shell: bright at the limb, fading outward,
    // and only on the side the sun lights
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float f = abs(dot(N, V));
    float lit = 0.06 + 0.94 * smoothstep(-0.45, 0.55, dot(N, normalize(uSun - vW)));
    float a = pow(f, 1.4) * 1.6 * lit * uOpacity;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

const DISC_VS = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aR;
  uniform float uTime;
  uniform float uPx;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vA;
  void main() {
    // differential rotation: the inner disc turns faster than the rim
    float ang = uTime * 0.35 / (aR * 0.05 + 2.0);
    float c = cos(ang);
    float s = sin(ang);
    vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = -mv.z;
    gl_PointSize = min(aSize * uPx * (240.0 / d), 9.0 * uPx);
    vColor = aColor;
    // fade dust right in front of the lens (close-ups sit inside the disc)
    vA = uOpacity * smoothstep(6.0, 40.0, d);
  }
`;
const DISC_FS = /* glsl */ `
  varying vec3 vColor;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vA;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

export class SolarSystem {
  constructor({ mobile }) {
    this.mobile = mobile;
    this.group = new THREE.Group();
    // a gentle tilt so the disc reads as a diagonal sweep, not a flat plate
    this.group.rotation.set(0.06, 0, -0.1);
    this.orbitT = 0;
    this.hover = -1;
    this.hoverK = new Array(SYSTEM.length).fill(0);
    this.loaded = 0;

    this.buildSun();
    this.buildDisc();
    this.buildRings();
    this.buildPlanets();
  }

  buildSun() {
    this.sun = new THREE.Group();
    this.core = new THREE.Mesh(new THREE.SphereGeometry(7, 48, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1cf'), toneMapped: false }));
    const glow = glowTexture('rgba(255,240,205,1)', 'rgba(255,196,96,0.3)', 256);
    this.glowA = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 }));
    this.glowA.scale.setScalar(64);
    this.glowB = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb867, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
    this.glowB.scale.setScalar(230);
    this.light = new THREE.PointLight(0xfff1dc, 2.6, 0, 0);
    this.sun.add(this.core, this.glowA, this.glowB, this.light);
    this.ambient = new THREE.AmbientLight(0x22304a, 0.22);
    this.group.add(this.sun, this.ambient);
  }

  buildDisc() {
    const N = this.mobile ? 16000 : 42000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const rr = new Float32Array(N);
    const warm = [new THREE.Color('#ffe2a8'), new THREE.Color('#ffc46e'), new THREE.Color('#fff4dc')];
    const cool = [new THREE.Color('#8e9bff'), new THREE.Color('#c3cbff'), new THREE.Color('#f2f4ff'), new THREE.Color('#a9b6ff')];
    const ARMS = 3;
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = rand(i * 1.37 + 0.5);
      const r = 26 + Math.pow(u, 0.85) * (DISC_R - 26);
      const arm = i % ARMS;
      // arms wind outward; scatter narrows near the core, widens at the rim
      const spread = (rand(i * 2.91) - 0.5) * (0.5 + (r / DISC_R) * 0.9) + (rand(i * 7.3) - 0.5) * 0.35;
      const a = (arm / ARMS) * Math.PI * 2 + r * 0.021 + spread;
      const y = (rand(i * 4.13) - 0.5) * (2 + r * 0.035) * (rand(i * 9.7) < 0.8 ? 0.4 : 1);
      pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
      const k = THREE.MathUtils.smoothstep(r, 60, 150);
      c.copy(warm[i % warm.length]).lerp(cool[i % cool.length], k);
      // a little brightness noise so the arms are not uniform
      c.multiplyScalar(0.55 + rand(i * 5.9) * 0.6);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = 0.9 + Math.pow(rand(i * 3.3), 6) * 4.5 + (1 - k) * 0.6;
      rr[i] = r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aR', new THREE.BufferAttribute(rr, 1));
    this.discU = { uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 1 } };
    this.disc = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.discU, vertexShader: DISC_VS, fragmentShader: DISC_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.disc.frustumCulled = false;
    this.group.add(this.disc);
  }

  buildRings() {
    this.rings = new THREE.Group();
    const radii = [...SYSTEM.map((p) => p.a), 270, 312, 362, 424, 500];
    this.ringMats = radii.map((r, i) => {
      const pts = [];
      for (let k = 0; k < 256; k++) {
        const a = (k / 256) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const m = new THREE.LineBasicMaterial({ color: i < SYSTEM.length ? 0xe9b949 : 0xcfc7b6, transparent: true, opacity: 0, depthWrite: false });
      m.base = i < SYSTEM.length ? 0.26 : 0.12 - (i - SYSTEM.length) * 0.015;
      this.rings.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), m));
      return m;
    });
    this.group.add(this.rings);
  }

  buildPlanets() {
    const seg = this.mobile ? 56 : 96;
    this.planets = SYSTEM.map((w, i) => {
      const g = new THREE.Group();
      let body;
      let earth = null;
      if (w.earth) {
        earth = new Earth({ mobile: this.mobile });
        earth.group.scale.setScalar(w.r / ER);
        body = earth.surface;
        g.add(earth.group);
      } else {
        body = new THREE.Mesh(
          new THREE.SphereGeometry(w.r, seg, seg / 2),
          new THREE.MeshStandardMaterial({
            map: tex(`${P}/${w.map}.webp`, { aniso: 8, onLoad: () => this.loaded++ }),
            roughness: 1,
            metalness: 0,
          }),
        );
        body.rotation.z = 0.18 + rand(i) * 0.25;
        g.add(body);
        const rimU = { uColor: { value: new THREE.Color(w.rim) }, uSun: { value: new THREE.Vector3() }, uOpacity: { value: 1 } };
        const rim = new THREE.Mesh(
          new THREE.SphereGeometry(w.r * 1.07, seg, seg / 2),
          new THREE.ShaderMaterial({ uniforms: rimU, vertexShader: RIM_VS, fragmentShader: RIM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide }),
        );
        g.add(rim);
        g.userData.rimU = rimU;
      }
      if (w.ring) {
        const inner = w.r * 1.25;
        const outer = w.r * 2.3;
        const rg = new THREE.RingGeometry(inner, outer, 160, 1);
        const pos = rg.attributes.position;
        const uv = rg.attributes.uv;
        for (let k = 0; k < pos.count; k++) {
          const r = Math.hypot(pos.getX(k), pos.getY(k));
          uv.setXY(k, (r - inner) / (outer - inner), 0.5);
        }
        const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: tex(`${P}/saturn_ring.webp`), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false, alphaTest: 0.02 }));
        ring.rotation.x = -Math.PI / 2 + 0.42;
        ring.rotation.y = 0.18;
        g.add(ring);
      }
      this.group.add(g);
      return { g, body, earth, w, world: new THREE.Vector3() };
    });
  }

  /** true once the first worlds have their surfaces (the intro waits for it) */
  get ready() {
    return this.loaded >= 3;
  }

  /** advance the orbits (t = page progress) and refresh world positions */
  layout(t) {
    this.orbitT = t;
    this.group.updateMatrixWorld();
    this.planets.forEach((pl, i) => {
      const { a, th } = pl.w;
      // inner worlds travel further (Kepler-ish), all of them slowly
      const ang = th - t * 0.55 * Math.pow(74 / a, 1.5);
      pl.g.position.set(Math.cos(ang) * a, 0, Math.sin(ang) * a);
      pl.g.updateMatrixWorld();
      pl.g.getWorldPosition(pl.world);
    });
  }

  /** world-space centre of planet i */
  planetPos(i) {
    return this.planets[i].world;
  }

  /**
   * planets: 0..1 presence of every world (scroll-driven, e.g. the pull-back);
   * focus: while the camera holds on one world the others step aside
   * (time-eased), so nothing sits behind the copy
   */
  update(time, camera, px, { disc = 1, rings = 0, glow = 1, planets = 1, focus = -1 } = {}) {
    this.discU.uTime.value = time;
    this.discU.uPx.value = px;
    this.discU.uOpacity.value = disc;
    this.disc.visible = disc > 0.01;
    this.ringMats.forEach((m) => (m.opacity = m.base * rings));
    this.rings.visible = rings > 0.01;
    this.glowA.material.opacity = 0.95 * glow;
    this.glowB.material.opacity = 0.35 * glow;
    const sunW = this.sun.getWorldPosition(new THREE.Vector3());
    // frame-rate independent easing (~0.7 s to settle)
    const dt = Math.min(0.1, Math.max(0, time - (this.lastTime ?? time)));
    this.lastTime = time;
    const ease = 1 - Math.exp(-dt * 4.5);
    this.planets.forEach((pl, i) => {
      const show = focus < 0 || focus === i ? 1 : 0;
      pl.present = pl.present === undefined ? show : pl.present + (show - pl.present) * ease;
      const s = planets * pl.present;
      pl.g.scale.setScalar(Math.max(0.001, s));
      pl.g.visible = s > 0.01;
      const k = (this.hoverK[i] += ((this.hover === i ? 1 : 0) - this.hoverK[i]) * 0.06);
      // hover: the world turns a few degrees toward you
      const spin = time * 0.035 + i * 1.7 + k * 0.07;
      if (pl.earth) {
        pl.earth.spin = spin;
        pl.earth.sunDir.copy(sunW).sub(pl.world).normalize();
        pl.earth.update(time, camera.position.distanceTo(pl.world) / pl.g.children[0].scale.x);
      } else {
        pl.body.rotation.y = spin;
        pl.g.userData.rimU.uSun.value.copy(sunW);
        pl.g.userData.rimU.uOpacity.value = 1 + k * 0.5;
      }
    });
    const hk = Math.max(...this.hoverK);
    this.light.intensity = 2.6 * (1 + hk * 0.22);
  }
}
