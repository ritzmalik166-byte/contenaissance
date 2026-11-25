import * as THREE from 'three';
import { sampleImage, rand } from './util';

/* =====================================================
   LOGO FORMATION — the real Contenaissance logo, sampled
   into points. Every point starts out among the stars,
   falls into one of a few clusters as the universe
   collapses, traces the outline, then fills the mark.
   All motion happens in the vertex shader from a single
   progress uniform: one draw call, no CPU work per frame.
===================================================== */

const VS = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aCluster;
  attribute vec3 aColor;
  attribute vec2 aSeed; // x: random, y: edge flag
  uniform float uP;
  uniform float uTime;
  uniform float uPx;
  uniform float uSize;
  varying vec3 vColor;
  varying float vA;
  varying float vSweep;
  float sm(float t) { t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  void main() {
    float k = aSeed.x;
    float gather = sm(uP / 0.38);
    float trace = sm((uP - 0.3) / 0.28);
    float fill = sm((uP - 0.5) / 0.3);
    vec3 p = mix(aStart, aCluster, gather);
    // swirl inside the clusters
    float sw = (1.0 - fill) * gather * 1.6;
    p.x += sin(uTime * 0.9 + k * 40.0) * sw;
    p.y += cos(uTime * 0.7 + k * 31.0) * sw;
    float arrive = aSeed.y > 0.5 ? sm((trace - k * 0.3) / 0.7) : sm((fill - k * 0.4) / 0.6);
    p = mix(p, position, arrive);
    // settled points breathe very slightly
    p.z += sin(uTime * 1.3 + k * 20.0) * 0.04 * arrive;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sweep = clamp((uP - 0.82) / 0.18, 0.0, 1.0);
    vSweep = exp(-pow((position.x / 9.0 - (sweep * 2.6 - 1.3)) / 0.12, 2.0)) * step(0.001, sweep) * step(sweep, 0.999);
    gl_PointSize = uSize * uPx * (0.7 + arrive * 0.5 + vSweep * 0.8) * (34.0 / -mv.z);
    vColor = mix(vec3(0.95, 0.74, 0.3), aColor, arrive);
    vA = 0.35 + arrive * 0.65;
  }
`;
const FS = /* glsl */ `
  uniform float uOpacity;
  uniform float uGlow;
  varying vec3 vColor;
  varying float vA;
  varying float vSweep;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, d);
    vec3 col = vColor * (1.0 + uGlow * 0.35) + vec3(1.0, 0.95, 0.8) * vSweep * 0.9;
    float alpha = a * vA * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

export const LOGO_W = 18;

export class LogoParticles {
  constructor({ mobile }) {
    this.group = new THREE.Group();
    this.U = { uP: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uSize: { value: mobile ? 2.6 : 2.2 }, uOpacity: { value: 1 }, uGlow: { value: 0 } };
    this.ready = false;
    const img = new Image();
    img.onload = () => this.build(img, mobile);
    img.src = '/images/logo.png';
  }

  build(img, mobile) {
    const pts = sampleImage(img, LOGO_W, mobile ? 3 : 2);
    const N = pts.length;
    const pos = new Float32Array(N * 3);
    const start = new Float32Array(N * 3);
    const cluster = new Float32Array(N * 3);
    const color = new Float32Array(N * 3);
    const seed = new Float32Array(N * 2);
    const centres = [
      [-24, 12, -10],
      [22, 14, -16],
      [-20, -14, -6],
      [26, -12, -12],
      [0, 20, -24],
    ];
    for (let i = 0; i < N; i++) {
      const q = pts[i];
      pos.set([q.x, q.y, 0], i * 3);
      // start: a deep shell, like the stars themselves
      const u = rand(i * 1.3) * 2 - 1;
      const th = rand(i * 2.9) * Math.PI * 2;
      const r = 60 + rand(i * 4.1) * 160;
      const s = Math.sqrt(1 - u * u);
      start.set([Math.cos(th) * s * r, u * r * 0.7, Math.sin(th) * s * r - 40], i * 3);
      const c = centres[Math.floor(rand(i * 5.7) * centres.length)];
      cluster.set([c[0] + (rand(i * 6.1) - 0.5) * 12, c[1] + (rand(i * 7.3) - 0.5) * 9, c[2] + (rand(i * 8.9) - 0.5) * 10], i * 3);
      color.set([q.r, q.g, q.b], i * 3);
      seed.set([rand(i * 9.7), q.edge ? 1 : 0], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aCluster', new THREE.BufferAttribute(cluster, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false }));
    this.points.frustumCulled = false;
    // the real logo image: the points hand over to it once they have settled,
    // so the final mark (and its lettering) is exactly the brand artwork
    const t = new THREE.TextureLoader().load('/images/logo@2x.png');
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    this.markMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    this.mark = new THREE.Mesh(new THREE.PlaneGeometry(LOGO_W, LOGO_W * (133 / 274)), this.markMat);
    this.mark.position.z = 0.05;
    this.group.add(this.points, this.mark);
    this.ready = true;
    this.count = N;
  }

  // fade: 1 = shown, 0 = hidden (used to clear the mark once the footer is in view)
  update(time, p, px, fade = 1) {
    this.group.visible = fade > 0.001;
    this.U.uTime.value = time;
    this.U.uP.value = p;
    this.U.uPx.value = px;
    this.U.uGlow.value = p >= 0.98 ? 0.5 + 0.5 * Math.sin(time * 1.4) : 0;
    if (this.markMat) {
      const k = Math.min(1, Math.max(0, (p - 0.74) / 0.16));
      const e = k * k * (3 - 2 * k);
      this.markMat.opacity = e * (p >= 0.98 ? 0.94 + 0.06 * Math.sin(time * 1.4) : 1) * fade;
      this.U.uOpacity.value = (1 - e * 0.9) * fade;
    }
  }
}
