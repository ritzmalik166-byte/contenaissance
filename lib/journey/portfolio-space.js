import * as THREE from 'three';
import { rand, glowTexture, smooth, clamp } from './util';

/* =====================================================
   DEEP SPACE — the portfolio page's world (Chapter 03,
   "The Missions"). The camera travels down -z through it:
   - a bright guiding star with a lens-flare cross (hero)
   - constellations, one per discipline, labelled in HTML
   - soft nebulae in violet, blue, rose and gold
   - one plotted star per featured mission, a dotted course
     line threading them
   - at the end of the archive, a launch beam rising from a
     golden horizon: "your brand could be our next mission"
   Everything is sprites / points / lines: light to draw.
===================================================== */

// where things sit along the flight (z grows negative)
export const Z = {
  star: -480,
  constellations: -170,
  missions: [-900, -1420, -1940],
  archive: -2600,
  beam: -3700,
};

/** a soft, lumpy cloud texture (many offset radial gradients) */
function cloudTexture(seed, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const h = size / 2;
  for (let i = 0; i < 26; i++) {
    const a = rand(seed * 31 + i) * Math.PI * 2;
    const r = Math.pow(rand(seed * 17 + i * 3), 0.7) * h * 0.55;
    const x = h + Math.cos(a) * r;
    const y = h + Math.sin(a) * r;
    const s = h * (0.25 + rand(seed * 7 + i * 5) * 0.45);
    const grd = g.createRadialGradient(x, y, 0, x, y, s);
    const al = 0.05 + rand(seed * 13 + i) * 0.09;
    grd.addColorStop(0, `rgba(255,255,255,${al})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  // keep the edge clean so sprites never show a square
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(h, h, h * 0.4, h, h, h);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** a thin horizontal streak (the flare's cross arms) */
function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 512, 0);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.5, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 15, 512, 2);
  const v = g.createLinearGradient(0, 0, 0, 32);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.5, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = v;
  g.fillRect(0, 0, 512, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const additive = (map, color, opacity = 1) =>
  new THREE.SpriteMaterial({ map, color: new THREE.Color(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity });

/** a star with halo and cross arms; scale with `size` */
function makeFlare({ size = 1, halo = '#ffc9a8', arms = true, glow, streak }) {
  const g = new THREE.Group();
  const core = new THREE.Sprite(additive(glow, '#ffffff', 1));
  core.scale.setScalar(6 * size);
  const inner = new THREE.Sprite(additive(glow, '#fff2dc', 0.9));
  inner.scale.setScalar(18 * size);
  const haloS = new THREE.Sprite(additive(glow, halo, 0.42));
  haloS.scale.setScalar(150 * size);
  g.add(haloS, inner, core);
  if (arms) {
    const h = new THREE.Sprite(additive(streak, '#fff1e0', 0.85));
    h.scale.set(300 * size, 6 * size, 1);
    const v = new THREE.Sprite(additive(streak, '#fff1e0', 0.75));
    v.material.rotation = Math.PI / 2;
    v.scale.set(230 * size, 6 * size, 1);
    g.add(h, v);
  }
  g.userData.parts = g.children.map((s) => ({ s, base: s.material.opacity }));
  return g;
}

const BEAM_VS = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BEAM_FS = /* glsl */ `
  uniform float uRise;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float core = exp(-x * x * 1400.0);
    float glow = exp(-x * x * 34.0) * 0.4;
    // the beam grows upward; its tip is soft
    float tip = smoothstep(uRise, uRise - 0.22, vUv.y);
    float base = smoothstep(0.0, 0.03, vUv.y);
    float shimmer = 0.88 + 0.12 * sin(vUv.y * 40.0 - uTime * 3.0);
    float a = (core * 1.3 + glow * shimmer) * tip * base * uOpacity;
    vec3 col = mix(uColor, vec3(1.0, 0.97, 0.9), clamp(core * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(col * a, 1.0);
  }
`;

export class DeepSpace {
  constructor({ mobile, constellations = [] }) {
    this.mobile = mobile;
    this.group = new THREE.Group();
    this.glow = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.22)', 256);
    this.streak = streakTexture();
    this.ready = true;

    this.buildNebulae();
    this.buildHeroStar();
    this.buildConstellations(constellations);
    this.buildMissionStars();
    this.buildCourse();
    this.buildBeam();
  }

  buildNebulae() {
    const COLORS = ['#6b4a8a', '#2c3d7a', '#7a4060', '#8a6233', '#3b2f6b'];
    const N = this.mobile ? 14 : 26;
    const texs = [0, 1, 2, 3].map((k) => cloudTexture(k + 1));
    this.clouds = [];
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1;
      const m = additive(texs[i % 4], COLORS[i % COLORS.length], 0);
      const s = new THREE.Sprite(m);
      const z = 60 - (i / N) * 3900 - rand(i * 3.1) * 80;
      s.position.set(side * (90 + rand(i * 1.7) * 330), (rand(i * 2.3) - 0.5) * 300, z);
      s.scale.setScalar(260 + rand(i * 4.1) * 380);
      m.rotation = rand(i * 5.9) * Math.PI;
      s.userData.base = 0.32 + rand(i * 6.7) * 0.3;
      this.group.add(s);
      this.clouds.push(s);
    }
    // a warm bloom behind the guiding star (the hero's pink-gold haze)
    const bloom = new THREE.Sprite(additive(texs[1], '#a0705a', 0));
    bloom.position.set(0, 80, Z.star - 40);
    bloom.scale.setScalar(520);
    bloom.userData.base = 0.55;
    this.group.add(bloom);
    this.clouds.push(bloom);
  }

  buildHeroStar() {
    this.heroStar = makeFlare({ size: 1, glow: this.glow, streak: this.streak });
    this.heroStar.position.set(0, 108, Z.star);
    this.group.add(this.heroStar);
  }

  /** constellations: [{ code, pts: [[x, y], …], at: [x, y] }] in hero-view units */
  buildConstellations(list) {
    this.constellations = list.map((c) => {
      const g = new THREE.Group();
      g.position.set(c.at[0], c.at[1], Z.constellations);
      const pts = c.pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
      const lines = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xe9b949, transparent: true, opacity: 0, depthWrite: false }),
      );
      const stars = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.PointsMaterial({ size: 4.2, map: this.glow, color: 0xfff4dc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      g.add(lines, stars);
      this.group.add(g);
      // the label sits on the constellation's first star
      return { g, lines, stars, at: c.at, p0: pts[0].clone(), label: pts[0].clone().add(g.position) };
    });
  }

  /** narrow screens: pull the constellations in and shrink them so they stay in view */
  fit(fx) {
    for (const c of this.constellations) {
      const s = fx < 1 ? 0.65 : 1;
      c.g.position.set(c.at[0] * fx, c.at[1] * (fx < 1 ? 1.25 : 1), Z.constellations);
      c.g.scale.setScalar(s);
      c.label.copy(c.p0).multiplyScalar(s).add(c.g.position);
    }
  }

  buildMissionStars() {
    this.missionStars = Z.missions.map((z, k) => {
      const textSide = k % 2 === 0 ? 1 : -1;
      const f = makeFlare({ size: 0.42, halo: ['#ffcf8a', '#9fb4ff', '#ffb38a'][k % 3], glow: this.glow, streak: this.streak });
      f.position.set(textSide * 92, 58, z - 150);
      this.group.add(f);
      return f;
    });
  }

  // the plotted course: a dotted line weaving past every mission star
  buildCourse() {
    const P = [
      [-40, -30, 40],
      [30, 10, Z.star + 100],
      [-60, 30, Z.missions[0] - 150],
      [80, 50, Z.missions[1] - 150],
      [-90, 40, Z.missions[2] - 150],
      [20, -10, Z.archive],
      [0, 20, Z.beam + 200],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(P);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(600)),
      new THREE.LineDashedMaterial({ color: 0xe9d6a8, dashSize: 3, gapSize: 7, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    line.computeLineDistances();
    this.course = line;
    this.group.add(line);
  }

  buildBeam() {
    const g = new THREE.Group();
    g.position.set(0, 0, Z.beam);
    const H = 210;
    this.beamU = { uRise: { value: 0 }, uOpacity: { value: 1 }, uTime: { value: 0 }, uColor: { value: new THREE.Color('#e9b949') } };
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(70, H),
      new THREE.ShaderMaterial({ uniforms: this.beamU, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    beam.position.y = -96 + H / 2;
    this.horizon = new THREE.Sprite(additive(this.glow, '#d9a24a', 0));
    this.horizon.position.set(0, -92, 0);
    this.horizon.scale.set(560, 170, 1);
    this.horizonWide = new THREE.Sprite(additive(this.glow, '#8a5a22', 0));
    this.horizonWide.position.set(0, -110, -10);
    this.horizonWide.scale.set(1100, 260, 1);
    this.tip = makeFlare({ size: 0.36, arms: false, halo: '#ffe2b0', glow: this.glow, streak: this.streak });
    g.add(this.horizonWide, this.horizon, beam, this.tip);
    this.beam = { g, H, base: -96 };
    this.group.add(g);
  }

  /**
   * @param {object} s  nebula / stars / constellations / beam 0..1 (from the pose)
   */
  update(time, camera, { nebula = 1, constellation = 0, missions = 1, course = 1, beam = 0, hero = 1 } = {}) {
    for (const c of this.clouds) {
      // fade clouds right in front of the lens (we fly through them)
      const d = camera.position.distanceTo(c.position);
      c.material.opacity = c.userData.base * nebula * smooth(clamp((d - 70) / 260));
      c.visible = c.material.opacity > 0.004;
    }
    const tw = 0.92 + Math.sin(time * 1.7) * 0.05 + Math.sin(time * 4.3) * 0.03;
    for (const { s, base } of this.heroStar.userData.parts) s.material.opacity = base * hero * tw;
    this.heroStar.visible = hero > 0.01;
    this.constellations.forEach((c, i) => {
      const k = constellation * (0.75 + 0.25 * Math.sin(time * 0.8 + i * 2));
      c.lines.material.opacity = 0.42 * constellation;
      c.stars.material.opacity = k;
      c.g.visible = constellation > 0.01;
    });
    this.missionStars.forEach((f, i) => {
      const t = 0.9 + Math.sin(time * 2.1 + i) * 0.1;
      for (const { s, base } of f.userData.parts) s.material.opacity = base * missions * t;
      f.visible = missions > 0.01;
    });
    this.course.material.opacity = 0.22 * course;
    this.course.visible = course > 0.01;

    // the launch beam rises with the finale
    this.beamU.uTime.value = time;
    this.beamU.uRise.value = beam * 1.05;
    this.beamU.uOpacity.value = Math.min(1, beam * 3);
    this.horizon.material.opacity = 0.75 * smooth(clamp(beam * 2));
    this.horizonWide.material.opacity = 0.4 * smooth(clamp(beam * 2));
    this.tip.position.y = this.beam.base + this.beam.H * Math.min(1, beam * 1.05) - 4;
    for (const { s, base } of this.tip.userData.parts) s.material.opacity = base * smooth(clamp(beam * 4));
    this.beam.g.visible = beam > 0.001;
  }

  constellationLabel(i) {
    return this.constellations[i]?.label;
  }
}
