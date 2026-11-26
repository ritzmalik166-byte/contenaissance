import * as THREE from 'three';
import { tex, rand, glowTexture, clamp, lerp, smooth, seg } from './util';

/* =====================================================
   COSMOS — the space chapters.
   - Services: six worlds with real surface maps (NASA data
     via Solar System Scope), lit by one sun, scattering rims
   - Portfolio: a procedural spiral galaxy; the studio's real
     project frames ride its arm
   - AI tools: the real tool marks as stars, linked; they
     organise into a ring, then into three rings (Human, AI,
     Story) that converge on one gold core
===================================================== */

const P = '/textures/space/planets';

const RIM_VS = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const RIM_FS = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSun;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // back faces of a slightly larger shell: bright at the planet's limb, fading outward
    float f = abs(dot(normalize(vN), normalize(vV)));
    float lit = 0.12 + 0.88 * smoothstep(-0.5, 0.5, dot(normalize(vN), normalize(uSun)));
    float a = pow(f, 1.4) * 1.5 * lit * uOpacity;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

export const WORLDS = [
  { map: 'mars_1k', r: 7, rim: '#ff9a6a' },
  { map: 'neptune_1k', r: 8.5, rim: '#7fb2ff' },
  { map: 'jupiter_1k', r: 12, rim: '#f3d2a2' },
  { map: 'venus_1k', r: 8, rim: '#ffd9a0' },
  { map: 'saturn_1k', r: 9, rim: '#f0d9a8', ring: true },
  { map: 'moon_1k', r: 6, rim: '#c9d4ff', bare: true },
];
export const WORLD_GAP = 170;

const GAL_VS = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aR;
  uniform float uTime;
  uniform float uPx;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vA;
  void main() {
    // differential rotation: the core turns faster than the rim
    float ang = uTime * 0.6 / (aR * 0.06 + 2.0);
    float c = cos(ang);
    float s = sin(ang);
    vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx * (260.0 / -mv.z);
    vColor = aColor;
    vA = uOpacity;
  }
`;
const GAL_FS = /* glsl */ `
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

function whiteMark(url, onReady) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    onReady(t, img.naturalWidth / img.naturalHeight);
  };
  img.src = url;
}

export class Cosmos {
  constructor({ mobile, projects, tools }) {
    this.mobile = mobile;
    this.worlds = new THREE.Group();
    this.buildWorlds();

    this.galaxy = new THREE.Group();
    this.buildGalaxy(projects);

    this.net = new THREE.Group();
    this.buildNetwork(tools);
  }

  /* ---------------- services: six worlds ---------------- */
  buildWorlds() {
    const seg = this.mobile ? 48 : 72;
    this.planets = WORLDS.map((w, i) => {
      const g = new THREE.Group();
      g.position.set(this.mobile ? 0 : 24, (this.mobile ? 9 : 0) + [0, 3, -2, 2, -3, 1][i], -i * WORLD_GAP);
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(w.r, seg, seg / 2),
        new THREE.MeshStandardMaterial({ map: tex(`${P}/${w.map}.webp`, { aniso: 8 }), roughness: 1, metalness: 0 }),
      );
      body.rotation.z = 0.2 + rand(i) * 0.3;
      g.add(body);
      const U = { uColor: { value: new THREE.Color(w.rim) }, uSun: { value: new THREE.Vector3(-1, 0.35, 0.6) }, uOpacity: { value: w.bare ? 0 : 1 } };
      const rim = new THREE.Mesh(
        new THREE.SphereGeometry(w.r * 1.07, seg, seg / 2),
        new THREE.ShaderMaterial({ uniforms: U, vertexShader: RIM_VS, fragmentShader: RIM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide }),
      );
      g.add(rim);
      if (w.ring) {
        const inner = w.r * 1.25;
        const outer = w.r * 2.3;
        const rg = new THREE.RingGeometry(inner, outer, 128, 1);
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
      this.worlds.add(g);
      return { g, body, w };
    });
    // a scatter of nearby dust so motion between worlds reads
    const N = this.mobile ? 500 : 1400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pos.set([(rand(i * 2.1) - 0.5) * 260, (rand(i * 3.7) - 0.5) * 160, 60 - rand(i * 5.3) * (WORLDS.length * WORLD_GAP + 120)], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.35, color: 0xd9d2c4, transparent: true, opacity: 0.55, depthWrite: false, map: glowTexture(), blending: THREE.AdditiveBlending }));
    this.worlds.add(this.dust);
  }

  /** camera for the services chapter at stop s (0..5, fractional) */
  worldsCamera(s, cam, look) {
    const z = -s * WORLD_GAP;
    if (this.mobile) {
      cam.set(0, 4, z + 44);
      look.set(0, 2, z);
    } else {
      cam.set(-2, 4, z + 56);
      look.set(6, 0, z);
    }
  }

  updateWorlds(time, active) {
    this.planets.forEach((pl, i) => {
      const on = i === active ? 1 : 0;
      pl.k = pl.k === undefined ? on : pl.k + (on - pl.k) * 0.06;
      pl.g.scale.setScalar(1 + pl.k * 0.16);
      pl.body.rotation.y = time * 0.05 + i;
    });
  }

  /* ---------------- portfolio galaxy ---------------- */
  buildGalaxy(projects) {
    const N = this.mobile ? 12000 : 34000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const rr = new Float32Array(N);
    const core = new THREE.Color('#ffe6b0');
    const arm = new THREE.Color('#a9c4ff');
    const pink = new THREE.Color('#ff8fb2');
    const RAD = 240;
    const ARMS = 2;
    for (let i = 0; i < N; i++) {
      const t = Math.pow(rand(i * 1.1), 0.7);
      const r = t * RAD;
      const a0 = (i % ARMS) * ((Math.PI * 2) / ARMS);
      const twist = r * 0.028;
      const scatter = (rand(i * 2.3) - 0.5) * (0.5 + t * 0.9) * (1.2 - t * 0.4);
      const ang = a0 + twist + scatter * 1.4;
      const thick = (rand(i * 3.1) - 0.5) * (14 * (1 - t) + 3);
      pos.set([Math.cos(ang) * r + (rand(i * 4.7) - 0.5) * 8, thick, Math.sin(ang) * r + (rand(i * 5.9) - 0.5) * 8], i * 3);
      const c = core.clone().lerp(arm, smooth(clamp(t * 1.6)));
      if (rand(i * 6.6) < 0.04 && t > 0.3) c.lerp(pink, 0.8);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = (rand(i * 7.7) < 0.03 ? 3.6 : 1.5) * (1.4 - t * 0.5);
      rr[i] = r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aR', new THREE.BufferAttribute(rr, 1));
    this.galU = { uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 1 } };
    this.stars = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.galU, vertexShader: GAL_VS, fragmentShader: GAL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.stars.frustumCulled = false;
    const bulge = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,236,200,1)', 'rgba(255,200,120,0.25)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    bulge.scale.setScalar(150);
    this.disc = new THREE.Group();
    this.disc.add(this.stars, bulge);
    this.disc.rotation.x = 0.38;
    this.galaxy.add(this.disc);

    // project frames along the arm (outer → inner, so we fly toward the core)
    this.frames = projects.map((pr, i) => {
      const k = i / Math.max(1, projects.length - 1);
      const r = 205 - k * 150;
      const ang = 0.15 + r * 0.028 + 0.35;
      const local = new THREE.Vector3(Math.cos(ang) * r, 6 + (i % 2 ? 4 : -2), Math.sin(ang) * r);
      const holder = new THREE.Group();
      holder.position.copy(local);
      this.disc.add(holder);
      const mat = new THREE.MeshBasicMaterial({ map: tex(pr.tex, { aniso: 8 }), transparent: true, toneMapped: false, side: THREE.DoubleSide });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xe9b949, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      frame.position.z = -0.05;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,220,150,0.8)', 'rgba(233,185,73,0.18)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
      const card = new THREE.Group();
      card.add(halo, frame, plane);
      holder.add(card);
      const f = { holder, card, plane, frame, halo, mat, aspect: 16 / 9, world: new THREE.Vector3() };
      const fit = () => {
        const img = mat.map.image;
        if (img?.width) f.aspect = img.width / img.height;
        const h = f.aspect >= 1 ? 16 / f.aspect : 12;
        const w = h * f.aspect;
        plane.scale.set(w, h, 1);
        frame.scale.set(w + 0.5, h + 0.5, 1);
        halo.scale.set(w * 2.4, h * 2.4, 1);
      };
      fit();
      if (!mat.map.image?.width) {
        const iv = setInterval(() => {
          if (mat.map.image?.width) {
            clearInterval(iv);
            fit();
          }
        }, 200);
      }
      return f;
    });
    this.galaxy.updateMatrixWorld(true);
    this.overview = new THREE.Vector3(0, 165, 205);
  }

  /** camera for the galaxy at stop s (-1 = overview, 0..n-1 frames) */
  galaxyCamera(s, cam, look) {
    const n = this.frames.length;
    const pose = (i, outC, outL) => {
      if (i < 0) {
        outC.copy(this.overview);
        outL.set(0, 0, 0);
        return;
      }
      const f = this.frames[Math.min(n - 1, i)];
      f.holder.getWorldPosition(f.world);
      const out = f.world.clone().setY(0).normalize();
      outC.copy(f.world).addScaledVector(out, 30).add(new THREE.Vector3(0, 10, 0));
      // keep the frame left of centre on desktop so the details sit to its right
      outL.copy(f.world);
      if (!this.mobile) {
        const right = new THREE.Vector3().subVectors(outL, outC).cross(new THREE.Vector3(0, 1, 0)).normalize();
        outL.addScaledVector(right, 6);
      } else outL.y -= 7; // mobile/tablet: frame sits high, the mission strip lives below it
    };
    const i0 = Math.floor(s);
    const t = s - i0;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const la = new THREE.Vector3();
    const lb = new THREE.Vector3();
    pose(i0, a, la);
    pose(i0 + 1, b, lb);
    cam.lerpVectors(a, b, t);
    // arc outward between frames so we travel through the stars, not across them
    cam.y += Math.sin(Math.PI * t) * 26;
    look.lerpVectors(la, lb, t);
  }

  updateGalaxy(time, camera, active, px) {
    this.galU.uTime.value = time;
    this.galU.uPx.value = px;
    this.frames.forEach((f, i) => {
      f.card.quaternion.copy(camera.quaternion);
      f.card.quaternion.premultiply(this.disc.quaternion.clone().invert());
      const on = i === active ? 1 : 0;
      f.k = f.k === undefined ? on : f.k + (on - f.k) * 0.08;
      f.card.scale.setScalar(0.75 + f.k * 0.35);
      f.frame.material.opacity = 0.15 + f.k * 0.5;
      f.halo.material.opacity = 0.25 + f.k * 0.6;
      f.mat.opacity = 0.55 + f.k * 0.45;
    });
  }

  frameAnchor(i, out) {
    const f = this.frames[i];
    if (!f) return null;
    return f.plane.getWorldPosition(out);
  }

  /* ---------------- tools → human × AI × story ---------------- */
  buildNetwork(tools) {
    const n = tools.length;
    this.nodes = tools.map((t, i) => {
      const g = new THREE.Group();
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,226,160,1)', 'rgba(233,185,73,0.22)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
      halo.scale.setScalar(5);
      const mark = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, color: 0xf3eee4, opacity: 0 }));
      mark.position.y = -3.2;
      g.add(halo, mark);
      whiteMark(t.logo, (texture, ar) => {
        mark.material.map = texture;
        mark.material.needsUpdate = true;
        mark.scale.set(2.2 * ar, 2.2, 1);
        mark.userData.ready = true;
      });
      // formations
      const f0 = new THREE.Vector3((rand(i * 3.1) - 0.5) * 120, (rand(i * 5.3) - 0.5) * 64, -30 - rand(i * 7.9) * 220);
      const ang = (i / n) * Math.PI * 2 + Math.PI / 2;
      const f1 = new THREE.Vector3(Math.cos(ang) * 34, Math.sin(ang) * 22, -150);
      const ring = i % 3;
      const idx = Math.floor(i / 3);
      const per = Math.ceil(n / 3);
      g.userData = { f0, f1, ring, ang2: (idx / per) * Math.PI * 2 + ring * 0.7, halo, mark };
      this.net.add(g);
      return g;
    });
    // links (nearest neighbours in the scattered state)
    const edges = [];
    this.nodes.forEach((a, i) => {
      this.nodes
        .map((b, j) => ({ j, d: a.userData.f0.distanceTo(b.userData.f0) }))
        .filter((e) => e.j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .forEach((e) => {
          const k = i < e.j ? `${i}-${e.j}` : `${e.j}-${i}`;
          if (!edges.some((x) => x.k === k)) edges.push({ k, a: i, b: e.j });
        });
    });
    // close the ring too
    for (let i = 0; i < n; i++) edges.push({ k: `r${i}`, a: i, b: (i + 1) % n, ringEdge: true });
    this.edges = edges;
    const lp = new Float32Array(edges.length * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    this.links = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xe9b949, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.links.frustumCulled = false;
    this.net.add(this.links);

    // the three rings + core
    this.rings = ['#f3eee4', '#e9b949', '#f6d77a'].map((c) => {
      const pts = [];
      for (let k = 0; k <= 128; k++) {
        const a = (k / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
      }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.net.add(l);
      return l;
    });
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,248,230,1)', 'rgba(233,185,73,0.45)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.core.position.set(0, 0, -150);
    this.net.add(this.core);
    this.ringCenters = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.ringRadius = 18;
  }

  /**
   * a: tools progress (scattered → ordered ring)
   * b: trinity progress (ring → three rings → converge → core)
   */
  updateNetwork(time, a, b) {
    const order = smooth(seg(a, 0.5, 0.95));
    const split = smooth(seg(b, 0.05, 0.3));
    const merge = smooth(seg(b, 0.38, 0.72));
    const R = lerp(16.5, 12, merge);
    const off = lerp(11, 0, merge);
    this.ringRadius = R;
    for (let r = 0; r < 3; r++) {
      const ang = -Math.PI / 2 + (r / 3) * Math.PI * 2 + Math.PI;
      this.ringCenters[r].set(Math.cos(ang) * off, Math.sin(ang) * off, -150);
      const ring = this.rings[r];
      ring.position.copy(this.ringCenters[r]);
      ring.scale.setScalar(R);
      ring.rotation.set(Math.sin(time * 0.2 + r) * 0.25 * (1 - merge), Math.cos(time * 0.17 + r * 2) * 0.25 * (1 - merge), 0);
      ring.material.opacity = split * 0.55;
    }
    const tmp = new THREE.Vector3();
    this.nodes.forEach((g, i) => {
      const u = g.userData;
      // drift while scattered
      const f0 = tmp.copy(u.f0).add(new THREE.Vector3(Math.sin(time * 0.3 + i) * 1.2, Math.cos(time * 0.25 + i) * 1.2, 0));
      g.position.lerpVectors(f0, u.f1, order);
      if (split > 0) {
        const c = this.ringCenters[u.ring];
        const ang = u.ang2 + time * 0.12 * (u.ring % 2 ? -1 : 1);
        const onRing = new THREE.Vector3(c.x + Math.cos(ang) * R, c.y + Math.sin(ang) * R, c.z);
        g.position.lerp(onRing, split);
      }
      const fadeIntoCore = smooth(seg(b, 0.7, 0.95));
      u.halo.material.opacity = (0.75 + Math.sin(time * 2 + i) * 0.15) * (1 - fadeIntoCore * 0.8);
      u.mark.material.opacity = u.mark.userData.ready ? (1 - split * 0.72) * (1 - fadeIntoCore) : 0;
    });
    // links follow their nodes, then dissolve as the rings take over
    const pos = this.links.geometry.attributes.position;
    this.edges.forEach((e, k) => {
      const A = this.nodes[e.a].position;
      const B = this.nodes[e.b].position;
      const show = e.ringEdge ? order : 1;
      pos.setXYZ(k * 2, A.x, A.y, A.z);
      pos.setXYZ(k * 2 + 1, lerp(A.x, B.x, show), lerp(A.y, B.y, show), lerp(A.z, B.z, show));
    });
    pos.needsUpdate = true;
    this.links.material.opacity = (0.12 + smooth(seg(a, 0.05, 0.4)) * 0.3) * (1 - split);
    const coreK = smooth(seg(b, 0.55, 0.9));
    this.core.material.opacity = coreK;
    this.core.scale.setScalar(4 + coreK * 34 + Math.sin(time * 1.6) * coreK * 1.5);
  }

  ringAnchor(r, out) {
    const c = this.ringCenters[r];
    const ang = -Math.PI / 2 + (r / 3) * Math.PI * 2 + Math.PI;
    // inside each ring, on its outer side, so labels never leave the frame
    const k = this.ringRadius * 0.55;
    return out.set(c.x + Math.cos(ang) * k, c.y + Math.sin(ang) * k, c.z);
  }
}
