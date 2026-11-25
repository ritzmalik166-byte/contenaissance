import * as THREE from 'three';
import { tex, rand } from './util';

/* =====================================================
   SKY — everything at "infinity". The group follows the
   camera, so translating never moves it; only turning does.
   - Milky Way: ESO panorama on an inner sphere
   - Stars: real-looking point stars with colour temperature
     and slow twinkle (one draw call)
   - Dome: a sky gradient with a sun, used while we are
     inside the atmosphere (clouds, launch pad, ascent)
===================================================== */

const STAR_VS = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPx;
  uniform float uCollapse;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vColor = aColor;
    vTw = 0.75 + 0.25 * sin(uTime * (0.6 + aPhase) + aPhase * 40.0);
    vec3 p = position * (1.0 - uCollapse * 0.985);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx * (1.0 + uCollapse * 1.5);
  }
`;
const STAR_FS = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 2.2) * vTw * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * (0.6 + core), a);
    #include <colorspace_fragment>
  }
`;

// near stars in a box that wraps around the camera: they stream slowly past,
// so the sky has real depth and motion (parallax), not a painted backdrop
const DRIFT_VS = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPx;
  uniform float uSpeed;
  varying vec3 vColor;
  varying float vA;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTime * uSpeed + 300.0, 600.0) - 300.0;
    p.x = mod(p.x + uTime * uSpeed * 0.18 + 300.0, 600.0) - 300.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = -mv.z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx * clamp(140.0 / max(d, 1.0), 0.6, 3.0);
    // fade in from the far edge, out before it reaches the lens
    vA = smoothstep(300.0, 200.0, d) * smoothstep(8.0, 40.0, d);
    vColor = aColor;
  }
`;
const DRIFT_FS = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 2.0) * vA * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

const DOME_VS = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const DOME_FS = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunDir;
  uniform vec3 uSun;
  uniform float uOpacity;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    float k = 1.0 - exp(-max(h, 0.0) * 6.5);
    vec3 col = mix(uHorizon, uZenith, k);
    // warm band toward the sun's side of the horizon
    vec3 sd = normalize(uSunDir);
    float az = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-4), normalize(vec3(sd.x, 0.0, sd.z) + 1e-4)), 0.0);
    col += uSun * pow(az, 5.0) * exp(-max(h, 0.0) * 9.0) * 0.35;
    col = mix(col, uGround, smoothstep(0.0, -0.035, h));
    float s = max(dot(d, sd), 0.0);
    col += uSun * (pow(s, 900.0) * 6.0 + pow(s, 24.0) * 0.4 + pow(s, 4.0) * 0.1);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

export class Sky {
  constructor({ mobile }) {
    this.group = new THREE.Group();
    this.group.renderOrder = -10;

    // Milky Way
    const mw = tex(mobile ? '/textures/space/backgrounds/milkyway_1k.webp' : '/textures/space/backgrounds/milkyway_1536.webp');
    this.mwMat = new THREE.MeshBasicMaterial({ map: mw, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, color: 0x6e6e6e });
    this.milky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), this.mwMat);
    this.milky.rotation.set(0.5, 0.3, 0.9);
    this.milky.renderOrder = -10;

    // dome
    this.domeU = {
      uZenith: { value: new THREE.Color('#1b4f9c') },
      uHorizon: { value: new THREE.Color('#f2cf98') },
      uGround: { value: new THREE.Color('#203048') },
      uSunDir: { value: new THREE.Vector3(-0.4, 0.18, -1) },
      uSun: { value: new THREE.Color('#ffe2b0') },
      uOpacity: { value: 0 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(950, 48, 24),
      new THREE.ShaderMaterial({ uniforms: this.domeU, vertexShader: DOME_VS, fragmentShader: DOME_FS, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false }),
    );
    this.dome.renderOrder = -9;

    // stars
    const N = mobile ? 3000 : 7000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const phase = new Float32Array(N);
    const temps = [new THREE.Color('#9db4ff'), new THREE.Color('#cad7ff'), new THREE.Color('#fff4ea'), new THREE.Color('#ffd2a1'), new THREE.Color('#ffb46b')];
    for (let i = 0; i < N; i++) {
      // bias toward a galactic band so the sky has structure
      const u = rand(i * 3 + 1) * 2 - 1;
      const th = rand(i * 3 + 2) * Math.PI * 2;
      let y = u;
      if (rand(i * 7) < 0.45) y *= 0.22;
      const r = Math.sqrt(1 - y * y);
      const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).applyEuler(new THREE.Euler(0.5, 0.3, 0.9));
      pos.set([v.x * 900, v.y * 900, v.z * 900], i * 3);
      const c = temps[Math.floor(rand(i * 11) * temps.length)];
      col.set([c.r, c.g, c.b], i * 3);
      const m = rand(i * 13);
      size[i] = 1.4 + Math.pow(m, 6) * 6.5;
      phase[i] = rand(i * 17) * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    this.starU = { uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 1 }, uCollapse: { value: 0 } };
    this.stars = new THREE.Points(
      g,
      new THREE.ShaderMaterial({ uniforms: this.starU, vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    this.stars.renderOrder = -8;
    this.stars.frustumCulled = false;

    // drifting near stars
    const D = mobile ? 700 : 1800;
    const dp = new Float32Array(D * 3);
    const dc = new Float32Array(D * 3);
    const ds = new Float32Array(D);
    for (let i = 0; i < D; i++) {
      dp.set([(rand(i * 5.1 + 3) - 0.5) * 600, (rand(i * 6.3 + 7) - 0.5) * 600, (rand(i * 7.7 + 1) - 0.5) * 600], i * 3);
      const c = temps[Math.floor(rand(i * 9.1 + 2) * temps.length)];
      dc.set([c.r, c.g, c.b], i * 3);
      ds[i] = 1.2 + Math.pow(rand(i * 3.3 + 5), 5) * 3.5;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aColor', new THREE.BufferAttribute(dc, 3));
    dg.setAttribute('aSize', new THREE.BufferAttribute(ds, 1));
    this.driftU = { uTime: { value: 0 }, uPx: { value: 1 }, uSpeed: { value: 6 }, uOpacity: { value: 1 } };
    this.drift = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: this.driftU, vertexShader: DRIFT_VS, fragmentShader: DRIFT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.drift.frustumCulled = false;
    this.drift.renderOrder = -7;

    // the far sky turns slowly (milky way + stars), the dome stays put
    this.space = new THREE.Group();
    this.space.add(this.milky, this.stars);
    this.group.add(this.space, this.dome, this.drift);
    this.state = { stars: 1, milky: 1, dome: 0 };
  }

  /** dome colours: lerp between two presets */
  setDome(a, b, t) {
    const U = this.domeU;
    U.uZenith.value.copy(a.zenith).lerp(b.zenith, t);
    U.uHorizon.value.copy(a.horizon).lerp(b.horizon, t);
    U.uGround.value.copy(a.ground).lerp(b.ground, t);
    U.uSun.value.copy(a.sun).lerp(b.sun, t);
  }

  update(camera, time, px) {
    this.group.position.copy(camera.position);
    this.starU.uTime.value = time;
    this.starU.uPx.value = px;
    this.space.rotation.y = time * 0.006;
    this.space.rotation.x = Math.sin(time * 0.03) * 0.02;
    this.driftU.uTime.value = time;
    this.driftU.uPx.value = px;
    this.driftU.uOpacity.value = this.state.stars * (1 - this.state.dome);
    this.drift.visible = this.driftU.uOpacity.value > 0.01;
    const s = this.state;
    this.starU.uOpacity.value = s.stars;
    this.mwMat.opacity = s.milky;
    this.domeU.uOpacity.value = s.dome;
    this.stars.visible = s.stars > 0.01;
    this.milky.visible = s.milky > 0.01 && s.dome < 0.99;
    this.dome.visible = s.dome > 0.01;
  }
}

export const DOME = {
  day: { zenith: new THREE.Color('#1d5bb0'), horizon: new THREE.Color('#f4d8a6'), ground: new THREE.Color('#a9b8c9'), sun: new THREE.Color('#fff0cc') },
  golden: { zenith: new THREE.Color('#284c8a'), horizon: new THREE.Color('#f0ae66'), ground: new THREE.Color('#5e5a6a'), sun: new THREE.Color('#ffc27a') },
  dusk: { zenith: new THREE.Color('#081128'), horizon: new THREE.Color('#a85a34'), ground: new THREE.Color('#141826'), sun: new THREE.Color('#ff8d3f') },
  high: { zenith: new THREE.Color('#000000'), horizon: new THREE.Color('#0c2a5c'), ground: new THREE.Color('#0a1a33'), sun: new THREE.Color('#ffffff') },
};
