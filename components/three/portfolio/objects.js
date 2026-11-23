import * as THREE from 'three';

/* =====================================================
   PORTFOLIO 3D — "Gilded Atelier" building blocks.

   The portfolio has its own visual language, separate from
   the homepage universe: no photographic planet textures,
   no Milky Way, no shared space materials. Everything here
   is procedural obsidian glass and liquid gold, lit by a
   warm studio environment and by the visitor's cursor.

   Every custom shader ends with the tonemapping/colorspace
   chunks so it matches standard materials both with and
   without the post-processing composer.
===================================================== */

export const GOLD = new THREE.Color('#e9b949');
export const random = (min, max) => Math.random() * (max - min) + min;

// Shared, by-reference uniform: world position of the cursor
// light. Every obsidian body reads it, so one write per frame
// moves the highlight across the whole scene.
export const CURSOR_LIGHT = { value: new THREE.Vector3(0, 0, 4) };
export const CURSOR_POWER = { value: 0 };

const NOISE_GLSL = /* glsl */ `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; }
    return s;
  }
`;

const OUT_CHUNKS = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/* ---------------- Studio environment ----------------
   A dark atelier with warm softboxes, pre-filtered with
   PMREM: metals pick up long gold reflections instead of
   a sky. */

export function makeStudioEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x050302, side: THREE.BackSide })
  );
  env.add(room);
  const box = (w, h, color, k, pos, look = [0, 0, 0]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.lookAt(...look);
    env.add(m);
  };
  box(16, 9, '#ffd9a0', 2.6, [-12, 10, 8]); // key, upper left
  box(3, 18, '#ff9a4a', 1.6, [16, 0, 2]); // amber strip, right
  box(22, 3, '#ffe7c2', 0.7, [0, -14, 6]); // floor bounce
  box(8, 8, '#6a4a2a', 0.5, [0, 4, -20]); // back fill
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035);
  pmrem.dispose();
  env.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  return rt;
}

/* ---------------- Image textures (owned by the portfolio) ---------------- */

export function createImageCache() {
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  return {
    get(url) {
      if (!cache.has(url)) {
        const tex = loader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        cache.set(url, tex);
      }
      return cache.get(url);
    },
    dispose() {
      cache.forEach((t) => t.dispose());
      cache.clear();
    },
  };
}

/* ---------------- Atelier backdrop ----------------
   Full-screen velvet black with two drifting amber light
   pools (per-section palette) and a sparse field of fine
   pin-prick lights in screen space. */

export function makeBackdrop() {
  const mat = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uBase: { value: new THREE.Color('#080605') },
      uPoolA: { value: new THREE.Vector4(0.15, 0.7, 0.45, 0.5) },
      uColA: { value: new THREE.Color('#6b3e12') },
      uPoolB: { value: new THREE.Vector4(0.95, 0.1, 0.5, 0.5) },
      uColB: { value: new THREE.Color('#7a3510') },
      uShift: { value: new THREE.Vector2(0, 0) },
      uStars: { value: 1 },
      uDim: { value: 0 },
    },
    vertexShader: /* glsl */ `
      void main() { gl_Position = vec4(position.xy, 0.9999, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uRes, uShift;
      uniform float uTime, uStars, uDim;
      uniform vec3 uBase, uColA, uColB;
      uniform vec4 uPoolA, uPoolB;
      ${NOISE_GLSL}
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float stars(vec2 px, float cell, float density) {
        vec2 c = floor(px / cell);
        float h = h2(c);
        if (h < 1.0 - density) return 0.0;
        vec2 o = vec2(h2(c + 7.1), h2(c + 3.7)) * (cell - 4.0) + 2.0;
        float d = length(px - (c * cell + o));
        float tw = 0.6 + 0.4 * sin(uTime * (0.6 + h * 2.0) + h * 40.0);
        return smoothstep(1.4, 0.0, d) * tw * (0.35 + 0.65 * fract(h * 13.0));
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / uRes;
        float asp = uRes.x / uRes.y;
        vec3 col = uBase;
        float n = fbm(vec3(uv * vec2(asp, 1.0) * 2.2 + uShift * 0.15, uTime * 0.025));
        vec2 a = (uv - uPoolA.xy - uShift * 0.02) * vec2(asp, 1.0);
        vec2 b = (uv - uPoolB.xy - uShift * 0.03) * vec2(asp, 1.0);
        col += uColA * uPoolA.w * exp(-dot(a, a) / (uPoolA.z * uPoolA.z)) * (0.55 + 0.8 * n);
        col += uColB * uPoolB.w * exp(-dot(b, b) / (uPoolB.z * uPoolB.z)) * (0.55 + 0.8 * n);
        vec2 px = gl_FragCoord.xy + uShift * 18.0;
        float s = stars(px, 46.0, 0.05) + stars(px * 0.7 + 91.0, 71.0, 0.08) * 0.7;
        col += vec3(1.0, 0.94, 0.84) * s * 0.55 * uStars;
        float v = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(asp * 0.8, 1.0)));
        col *= mix(0.55, 1.0, v) * (1.0 - uDim);
        gl_FragColor = vec4(col, 1.0);
        ${OUT_CHUNKS}
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  mesh.userData.material = mat;
  return mesh;
}

/* ---------------- Obsidian orb ----------------
   Glossy black glass sphere: smoky internal marbling, a
   sharp key highlight, a second highlight that follows the
   cursor light, and a thin coloured fresnel rim. `ember`
   adds a glowing swirl (the red planet). */

export function makeObsidianOrb({
  segments = 64,
  tint = '#b9b2a8',
  rim = '#f3dcb0',
  rimStrength = 0.6,
  key = new THREE.Vector3(0.6, 0.55, 0.6),
  marble = 1,
  ember = null,
  emberStrength = 1,
  spec = 1,
} = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uKey: { value: key.clone().normalize() },
      uTint: { value: new THREE.Color(tint) },
      uRim: { value: new THREE.Color(rim) },
      uRimStrength: { value: rimStrength },
      uMarble: { value: marble },
      uEmber: { value: new THREE.Color(ember || '#000000') },
      uEmberK: { value: ember ? emberStrength : 0 },
      uCursor: CURSOR_LIGHT,
      uCursorK: CURSOR_POWER,
      uHot: { value: 0 },
      uSpec: { value: spec },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vObj;
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vObj = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vP = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRimStrength, uMarble, uEmberK, uCursorK, uHot, uSpec, uFade;
      uniform vec3 uKey, uTint, uRim, uEmber, uCursor;
      varying vec3 vObj;
      varying vec3 vN;
      varying vec3 vP;
      ${NOISE_GLSL}
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vP);
        vec3 p = normalize(vObj);
        float m = fbm(p * 2.4 + vec3(uTime * 0.015, 0.0, uTime * 0.01));
        float smoke = smoothstep(0.42, 0.78, m) * uMarble;
        float diff = max(dot(N, uKey), 0.0);
        vec3 col = vec3(0.010, 0.009, 0.008);
        col += uTint * (diff * 0.07 + smoke * diff * 0.32);
        vec3 H = normalize(uKey + V);
        float nh = max(dot(N, H), 0.0);
        col += vec3(1.0, 0.97, 0.9) * (pow(nh, 160.0) * 1.6 + pow(nh, 14.0) * 0.06) * uSpec;
        vec3 L = normalize(uCursor - vP);
        float att = 1.0 / (1.0 + 0.04 * dot(uCursor - vP, uCursor - vP));
        vec3 Hc = normalize(L + V);
        float nc = max(dot(N, Hc), 0.0);
        col += vec3(1.0, 0.86, 0.6) * (pow(nc, 120.0) * 2.2 * uSpec + max(dot(N, L), 0.0) * 0.05) * att * uCursorK;
        float e = smoothstep(0.5, 0.82, fbm(p * 3.1 + vec3(0.0, uTime * 0.04, 0.0)));
        col += uEmber * e * (0.25 + 0.75 * diff) * uEmberK;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
        col += uRim * fres * uRimStrength * (0.35 + 0.65 * smoothstep(-0.3, 0.6, dot(N, uKey)) + uHot);
        gl_FragColor = vec4(col, uFade);
        ${OUT_CHUNKS}
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(16, segments / 2)), mat);
  mesh.userData.material = mat;
  mesh.userData.tick = (t) => (mat.uniforms.uTime.value = t);
  return mesh;
}

/* ---------------- Banded gas giant ---------------- */

export function makeGasGiant(radius, {
  colors = ['#3d1606', '#8a3d12', '#c8652a', '#efa45a'],
  rim = '#ffb46a',
  rimStrength = 1,
  sunDir = new THREE.Vector3(-0.6, 0.55, 0.6),
  segments = 96,
} = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: sunDir.clone().normalize() },
      uC1: { value: new THREE.Color(colors[0]) },
      uC2: { value: new THREE.Color(colors[1]) },
      uC3: { value: new THREE.Color(colors[2]) },
      uC4: { value: new THREE.Color(colors[3]) },
      uRim: { value: new THREE.Color(rim) },
      uRimStrength: { value: rimStrength },
      uCursor: CURSOR_LIGHT,
      uCursorK: CURSOR_POWER,
      uFade: { value: 1 },
    },
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec3 vObj;
      varying vec3 vNormalW;
      varying vec3 vP;
      void main() {
        vObj = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRimStrength, uFade, uCursorK;
      uniform vec3 uSun, uC1, uC2, uC3, uC4, uRim, uCursor;
      varying vec3 vObj;
      varying vec3 vNormalW;
      varying vec3 vP;
      ${NOISE_GLSL}
      void main() {
        vec3 p = normalize(vObj);
        float n = fbm(vec3(p.x * 2.6 + uTime * 0.012, p.y * 11.0, p.z * 2.6));
        float b = p.y * 8.5 + n * 1.6 + sin(p.y * 27.0 + n * 4.0) * 0.28;
        float t = 0.5 + 0.5 * sin(b);
        vec3 col = mix(uC1, uC2, t);
        col = mix(col, uC3, smoothstep(0.55, 1.0, 0.5 + 0.5 * sin(b * 0.5 + 1.7)));
        col = mix(col, uC4, smoothstep(0.62, 0.95, n + 0.08 * sin(p.y * 40.0)));
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vP);
        float diff = max(dot(N, uSun), 0.0);
        float term = smoothstep(-0.15, 0.35, dot(N, uSun));
        vec3 lit = col * (diff * 0.95 + 0.03);
        vec3 L = normalize(uCursor - vP);
        lit += col * max(dot(N, L), 0.0) * 0.25 * uCursorK;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
        lit += uRim * fres * (0.15 + term) * uRimStrength;
        gl_FragColor = vec4(lit, uFade);
        ${OUT_CHUNKS}
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments / 2), mat);
  mesh.userData.tick = (t) => (mat.uniforms.uTime.value = t);
  return mesh;
}

/* ---------------- Gold ring band (procedural planetary ring) ---------------- */

export function makeRingBand(inner = 1.35, outer = 2.3, { color = '#e9c27a', opacity = 0.85 } = {}) {
  const geo = new THREE.RingGeometry(inner, outer, 160, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uIn: { value: inner },
      uOut: { value: outer },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vL;
      void main() { vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIn, uOut, uOpacity, uFade;
      uniform vec3 uColor;
      varying vec3 vL;
      float h(float x) { return fract(sin(x * 91.7) * 4375.85); }
      void main() {
        float r = (length(vL.xy) - uIn) / (uOut - uIn);
        float band = 0.55 + 0.45 * sin(r * 70.0 + sin(r * 13.0) * 2.0);
        band *= 0.6 + 0.4 * h(floor(r * 46.0));
        float edge = smoothstep(0.0, 0.06, r) * smoothstep(1.0, 0.85, r);
        float gap = 1.0 - 0.85 * smoothstep(0.012, 0.0, abs(r - 0.62));
        float a = band * edge * gap * uOpacity * uFade;
        gl_FragColor = vec4(uColor * (0.5 + band * 0.9), a);
        ${OUT_CHUNKS}
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.material = mat;
  return mesh;
}

/* ---------------- Fresnel rim shell (atmospheric limb) ---------------- */

export function makeRimShell(radius, { color = '#ffb46a', power = 3, intensity = 1.2, scale = 1.025, sunDir = null } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
      uSun: { value: (sunDir || new THREE.Vector3(0, 1, 0)).clone().normalize() },
      uUseSun: { value: sunDir ? 1 : 0 },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uSun;
      uniform float uPower, uIntensity, uUseSun, uFade;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uPower);
        float side = mix(1.0, smoothstep(-0.3, 0.6, dot(normalize(vN), uSun)), uUseSun);
        gl_FragColor = vec4(uColor * f * uIntensity * side * uFade, 1.0);
        ${OUT_CHUNKS}
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * scale, 96, 48), mat);
  mesh.userData.material = mat;
  return mesh;
}

/* ---------------- Gold shard field ----------------
   Instanced gold shards that tumble, part around the cursor
   light and scatter from click shockwaves. */

export function makeShards(count, bounds) {
  const geo = new THREE.TetrahedronGeometry(1, 0);
  geo.scale(0.5, 1.4, 0.08);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe0ac4c,
    metalness: 0.85,
    roughness: 0.32,
    emissive: 0x6a3a0a,
    emissiveIntensity: 0.8,
    envMapIntensity: 2.2,
    transparent: true,
    opacity: 1,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const items = [];
  for (let i = 0; i < count; i++) {
    const s = Math.pow(Math.random(), 2.2) * 0.32 + 0.05;
    items.push({
      p: new THREE.Vector3(random(-bounds.x, bounds.x), random(-bounds.y, bounds.y), random(bounds.zMin, bounds.zMax)),
      off: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      r: new THREE.Euler(random(0, 6.28), random(0, 6.28), random(0, 6.28)),
      spin: new THREE.Vector3(random(-0.4, 0.4), random(-0.6, 0.6), random(-0.3, 0.3)),
      kick: 0,
      drift: random(0.05, 0.25),
      phase: random(0, 6.28),
      s,
    });
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const d = new THREE.Vector3();
  const local = new THREE.Vector3();

  // Point on the cursor ray at depth z (ray = { o, d } in local space).
  const rayAt = (ray, z, out) => {
    const k = Math.abs(ray.d.z) > 1e-4 ? (z - ray.o.z) / ray.d.z : 0;
    return out.set(ray.o.x + ray.d.x * k, ray.o.y + ray.d.y * k, z);
  };
  const hit = new THREE.Vector3();

  // ray: cursor ray in local space (or null); power 0..1
  mesh.userData.tick = (t, dt, spread = 1, ray = null, power = 0) => {
    for (let i = 0; i < count; i++) {
      const it = items[i];
      const spinK = 1 + it.kick * 6;
      it.r.x += it.spin.x * dt * spinK;
      it.r.y += it.spin.y * dt * spinK;
      it.r.z += it.spin.z * dt * spinK;
      it.kick *= Math.exp(-dt * 1.6);
      q.setFromEuler(it.r);
      pos.set(it.p.x * spread, it.p.y * spread + Math.sin(t * it.drift + it.phase) * 0.25, it.p.z);
      if (ray && power > 0.01 && ray.o.z - pos.z > 0.5) {
        // part around the cursor ray at this shard's depth
        rayAt(ray, pos.z, hit);
        d.set(pos.x - hit.x, pos.y - hit.y, 0);
        const r = d.length();
        const R = 2.2;
        if (r < R && r > 1e-4) {
          const f = (1 - r / R) ** 2 * 3.2 * power;
          it.vel.addScaledVector(d.normalize(), f * dt * 6);
        }
      }
      // spring back home
      it.vel.addScaledVector(it.off, -dt * 5);
      it.vel.multiplyScalar(Math.exp(-dt * 3.2));
      it.off.addScaledVector(it.vel, dt);
      pos.add(it.off);
      sc.setScalar(it.s);
      m.compose(pos, q, sc);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  // Radial impulse from a click along the cursor ray.
  mesh.userData.burst = (ray, strength = 1) => {
    for (const it of items) {
      if (ray.o.z - it.p.z < 0.5) continue;
      rayAt(ray, it.p.z, hit);
      local.set(it.p.x + it.off.x - hit.x, it.p.y + it.off.y - hit.y, 0);
      const r = local.length();
      if (r > 5 || r < 1e-4) continue;
      const f = (1 - r / 5) ** 2 * 9 * strength;
      it.vel.addScaledVector(local.normalize(), f);
      it.kick = Math.max(it.kick, 1 - r / 5);
    }
  };

  mesh.userData.tick(0, 0);
  return mesh;
}

/* ---------------- Obsidian chips (small faceted pebbles) ---------------- */

export function makeObsidianChip(seed = 1) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 3.1 * seed + v.y * 1.7) * 0.5 + Math.cos(v.z * 2.3 * seed) * 0.5;
    v.multiplyScalar(0.78 + n * 0.22);
    v.y *= 0.8;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0a09,
    roughness: 0.18,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    flatShading: true,
    envMapIntensity: 1.2,
    transparent: true,
  });
  return new THREE.Mesh(geo, mat);
}

/* ---------------- Bokeh gold dust ----------------
   Points whose size and softness follow their distance from
   the focal plane — a lens look that racks focus during the
   aperture transitions. */

export function makeBokehDust(count, bounds) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  const ph = new Float32Array(count);
  const palette = ['#fff1d6', '#e9b949', '#ffcf8a', '#d98a3a'].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    pos[i * 3] = random(-bounds.x, bounds.x);
    pos[i * 3 + 1] = random(-bounds.y, bounds.y);
    pos[i * 3 + 2] = random(bounds.zMin, bounds.zMax);
    const c = palette[i % palette.length].clone().multiplyScalar(random(0.5, 1));
    col.set([c.r, c.g, c.b], i * 3);
    sz[i] = Math.pow(Math.random(), 4) * 1.8 + 0.5;
    ph[i] = random(0, 6.28);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uFocus: { value: 12 },
      uAperture: { value: 0.35 },
      uRise: { value: bounds.y * 2 },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime, uPixel, uFocus, uAperture, uRise;
      varying vec3 vColor;
      varying float vCoc;
      varying float vTw;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.05 + aSize * 0.03) + uRise * 0.5, uRise) - uRise * 0.5;
        p.x += sin(uTime * 0.2 + aPhase) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float z = max(-mv.z, 0.3);
        vCoc = min(abs(z - uFocus) * uAperture, 6.0);
        vColor = color;
        vTw = 0.7 + 0.3 * sin(uTime * 1.3 + aPhase);
        gl_PointSize = (aSize * 2.0 + vCoc * 8.0) * uPixel * (12.0 / z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec3 vColor;
      varying float vCoc;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float soft = mix(0.9, 0.12, clamp(vCoc / 3.0, 0.0, 1.0));
        float disc = smoothstep(1.0, 1.0 - soft, d);
        float ringEdge = smoothstep(0.65, 0.95, d) * disc * clamp(vCoc / 2.0, 0.0, 1.0) * 0.6;
        float a = (disc * mix(1.0, 0.35, clamp(vCoc / 2.5, 0.0, 1.0)) + ringEdge) / (1.0 + vCoc * vCoc * 0.35);
        gl_FragColor = vec4(vColor * a * vTw * uFade, 1.0);
        ${OUT_CHUNKS}
      }
    `,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.material = mat;
  return pts;
}

/* ---------------- Glow points (galaxy, swirl) ---------------- */

function glowPointsMaterial({ size = 1, opacity = 1 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uSize: { value: size },
      uOpacity: { value: opacity },
      uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uTime: { value: 0 },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uSize, uPixel, uTime;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vTw = 0.65 + 0.35 * sin(uTime * 1.7 + aPhase);
        gl_PointSize = aSize * uSize * uPixel * (12.0 / max(-mv.z, 0.5));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity, uFade;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a;
        gl_FragColor = vec4(vColor * a * uOpacity * vTw * uFade, 1.0);
        ${OUT_CHUNKS}
      }
    `,
  });
}

// Spiral galaxy / particle swirl.
export function makeGalaxy(count, radius, {
  arms = 3,
  twist = 2.8,
  thickness = 0.08,
  inner = '#fff4dc',
  outer = '#d98a3a',
  size = 1,
} = {}) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  const ph = new Float32Array(count);
  const ci = new THREE.Color(inner);
  const co = new THREE.Color(outer);
  const c = new THREE.Color();
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 1.7) * radius;
    const k = r / radius;
    const a = (i % arms) * ((Math.PI * 2) / arms) + k * twist * Math.PI + gauss() * (0.55 - k * 0.3);
    const spread = gauss() * 0.18 * radius * (1 - k * 0.5);
    pos[i * 3] = Math.cos(a) * r + spread * 0.4;
    pos[i * 3 + 1] = gauss() * thickness * radius * (1 - k);
    pos[i * 3 + 2] = Math.sin(a) * r + spread * 0.4;
    c.copy(ci).lerp(co, Math.min(1, k * 1.3)).multiplyScalar(0.55 + (1 - k) * 0.6);
    col.set([c.r, c.g, c.b], i * 3);
    sz[i] = (Math.random() < 0.04 ? 3 : 1) * (0.7 + Math.random() * 1.2) * (1.4 - k * 0.6);
    ph[i] = random(0, 6.28);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const mat = glowPointsMaterial({ size });
  const pts = new THREE.Points(geo, mat);
  pts.userData.material = mat;
  pts.userData.tick = (t) => (mat.uniforms.uTime.value = t);
  return pts;
}

/* ---------------- Glow sprite ---------------- */

function glowTexture(hex) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  const col = new THREE.Color(hex);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  grd.addColorStop(0, `rgba(${rgb},0.95)`);
  grd.addColorStop(0.3, `rgba(${rgb},0.32)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.shared = true;
  return tex;
}

const glowCache = new Map();
export function glowSprite(color = '#ffd08a', scale = 1, opacity = 1) {
  if (!glowCache.has(color)) glowCache.set(color, glowTexture(color));
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowCache.get(color),
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  s.scale.setScalar(scale);
  return s;
}

export function disposeGlowCache() {
  glowCache.forEach((t) => t.dispose());
  glowCache.clear();
}

/* ---------------- Orbit lines ---------------- */

export function makeOrbit(radius, { color = GOLD, opacity = 0.35, segments = 256, dashed = false } = {}) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: radius * 0.012, gapSize: radius * 0.02, depthWrite: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

/* ---------------- Media card (image / video on a rounded glass plane) ---------------- */

export function makeMediaCard(texture, { width = 2.2, height = 1.45 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      map: { value: texture },
      uAspect: { value: width / height },
      uUvScale: { value: new THREE.Vector2(1, 1) },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
      uHover: { value: 0 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uGlint: { value: new THREE.Vector2(0.5, 0.5) },
      uGold: { value: GOLD.clone() },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec2 uUvScale, uUvOffset, uGlint;
      uniform float uAspect, uHover, uOpacity, uTime, uFade;
      uniform vec3 uGold;
      varying vec2 vUv;
      float sdRound(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        float d = sdRound(p, vec2(uAspect * 0.5, 0.5), 0.045);
        float alpha = 1.0 - smoothstep(-0.004, 0.0, d);
        vec2 uv = ((vUv - 0.5) * (1.0 - uHover * 0.07) + 0.5) * uUvScale + uUvOffset;
        vec3 col = texture2D(map, uv).rgb;
        col *= 0.8 + 0.3 * uHover;
        // glass sheen sweeping across, plus a glint that tracks the cursor
        float sheen = smoothstep(0.08, 0.0, abs(vUv.x + vUv.y * 0.6 - fract(uTime * 0.12) * 2.4 + 0.4));
        col += sheen * 0.08 * (0.4 + uHover);
        float g = exp(-dot((vUv - uGlint) * vec2(uAspect, 1.0), (vUv - uGlint) * vec2(uAspect, 1.0)) * 9.0);
        col += vec3(1.0, 0.9, 0.7) * g * 0.22 * uHover;
        float rim = smoothstep(-0.03, -0.002, d);
        col = mix(col, uGold * (1.2 + uHover * 2.0), rim * (0.35 + uHover * 0.65));
        gl_FragColor = vec4(col, alpha * uOpacity * uFade);
        ${OUT_CHUNKS}
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.userData.material = mat;

  // Cover-fit the texture once its image/video dimensions are known.
  mesh.userData.fit = () => {
    const tex = mat.uniforms.map.value;
    const img = tex?.image;
    const w = img?.videoWidth || img?.naturalWidth || img?.width;
    const h = img?.videoHeight || img?.naturalHeight || img?.height;
    if (!w || !h) return false;
    const a = w / h;
    const target = width / height;
    if (a > target) {
      mat.uniforms.uUvScale.value.set(target / a, 1);
      mat.uniforms.uUvOffset.value.set((1 - target / a) / 2, 0);
    } else {
      mat.uniforms.uUvScale.value.set(1, a / target);
      mat.uniforms.uUvOffset.value.set(0, (1 - a / target) / 2);
    }
    return true;
  };
  return mesh;
}

/* ---------------- Eclipse (black disc + corona) ---------------- */

export function makeEclipse(radius) {
  const group = new THREE.Group();

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96),
    new THREE.MeshBasicMaterial({ color: 0x030202 })
  );
  disc.renderOrder = 2;
  group.add(disc);

  const coronaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uFade: { value: 1 }, uColor: { value: new THREE.Color('#ffd58f') } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uPower, uFade;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float edge = 0.5;
        float n = fbm(vec3(cos(a) * 2.0, sin(a) * 2.0, uTime * 0.15));
        float lop = 0.55 + 0.45 * smoothstep(-0.2, 1.0, -sin(a + 0.6));
        float ring = smoothstep(edge - 0.012, edge, r) * exp(-(r - edge) * (9.0 - n * 4.0));
        float thin = smoothstep(edge - 0.006, edge, r) * smoothstep(edge + 0.02, edge, r);
        float glow = ring * lop * 0.55 + thin * 1.1 * lop;
        gl_FragColor = vec4(uColor * glow * uPower * uFade, 1.0);
        ${OUT_CHUNKS}
      }
    `,
  });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(radius * 4, radius * 4), coronaMat);
  corona.position.z = -0.01;
  corona.renderOrder = 1;
  group.add(corona);

  group.userData.tick = (t, power = 1) => {
    coronaMat.uniforms.uTime.value = t;
    coronaMat.uniforms.uPower.value = power;
  };
  return group;
}

/* ---------------- Aperture iris (section transition) ----------------
   Full-screen overlay drawn in the HUD pass: nine curved
   obsidian blades with gold edges close around a shrinking
   aperture; a warm flare and anamorphic streak bloom inside
   it at the cut. uClose 0 → fully open (invisible). */

export function makeIris() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uClose: { value: 0 },
      uSpin: { value: 0 },
      uTime: { value: 0 },
      uLight: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: /* glsl */ `
      void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uRes, uLight;
      uniform float uClose, uSpin, uTime;
      #define N 9.0
      #define TAU 6.2831853
      void main() {
        if (uClose < 0.001) discard;
        vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
        float len = length(q);
        float a = atan(q.y, q.x);
        float c = uClose;
        float R = mix(2.4, 0.26, c);
        float seg = TAU / N;
        float th = uSpin;
        float k = mod(a - th, seg) - seg * 0.5;
        float rPoly = R * cos(seg * 0.5) / cos(k);
        float inside = smoothstep(rPoly + 0.004, rPoly - 0.004, len);
        // curved blade seams spiralling outward from the aperture
        float sp = a - th + log(max(len, 1e-3) / R) * 1.15;
        float bi = floor(sp / seg);
        float bf = fract(sp / seg);
        float seam = smoothstep(0.035, 0.0, bf) + smoothstep(0.965, 1.0, bf);
        float shade = 0.5 + 0.5 * sin(bi * 2.39);
        vec3 blade = vec3(0.006, 0.005, 0.004) + vec3(0.012, 0.009, 0.005) * shade * (1.0 - bf);
        // cursor-lit sheen across the blades
        vec2 l = q - uLight;
        blade += vec3(0.05, 0.035, 0.016) * exp(-dot(l, l) * 3.0) * (0.3 + 0.7 * (1.0 - bf));
        blade += vec3(0.85, 0.62, 0.24) * seam * 0.06 * smoothstep(R * 3.5, R, len);
        // gold edge around the aperture
        float edge = smoothstep(0.006, 0.0, abs(len - rPoly));
        float edgeGlow = exp(-abs(len - rPoly) * 26.0) * 0.5;
        vec3 col = blade + vec3(1.0, 0.76, 0.32) * (edge * 0.7 + edgeGlow * 0.2);
        // flare + anamorphic streak inside the aperture at the cut
        float flare = exp(-len * len * 18.0) * pow(c, 4.0);
        float streak = exp(-abs(q.y) * 60.0) * exp(-abs(q.x) * 1.8) * pow(c, 3.0);
        vec3 light = vec3(1.0, 0.82, 0.5) * (flare * 0.8 + streak * 0.4);
        float alpha = (1.0 - inside) * smoothstep(0.0, 0.12, c);
        gl_FragColor = vec4(col * (1.0 - inside) + light * inside, max(alpha, (flare + streak) * inside));
        ${OUT_CHUNKS}
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.material = mat;
  return mesh;
}

/* ---------------- Click shockwave ---------------- */

export function makeShockwave() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uLife: { value: 0 }, uColor: { value: new THREE.Color('#ffd27a') } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLife;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float e = 1.0 - pow(1.0 - uLife, 3.0);
        float ring = exp(-abs(r - e) * 60.0) + exp(-abs(r - e * 0.72) * 90.0) * 0.4;
        float a = ring * (1.0 - uLife) * smoothstep(1.0, 0.9, r);
        gl_FragColor = vec4(uColor * a * 1.6, 1.0);
        ${OUT_CHUNKS}
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.renderOrder = 20;
  mesh.visible = false;
  mesh.userData.material = mat;
  return mesh;
}

/* ---------------- Fade a whole set in/out ----------------
   Custom shaders expose `uFade`; built-in materials use
   opacity. Base values are captured once so per-frame
   updates stay intact. */

export function setFade(root, k) {
  root.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      const u = m.uniforms;
      if (u?.uFade) {
        u.uFade.value = k;
      } else if (!u) {
        if (m.userData.baseOpacity === undefined) {
          m.userData.baseOpacity = m.opacity;
          m.userData.baseTransparent = m.transparent;
        }
        m.opacity = m.userData.baseOpacity * k;
        m.transparent = k < 0.999 ? true : m.userData.baseTransparent;
      }
    }
  });
}

/* ---------------- Disposal ---------------- */

export function disposeObject(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => {
      // Shared glow textures and cached images are freed by their owners;
      // per-object video textures are freed here.
      if (m.map?.isCanvasTexture && !m.map.userData?.shared) m.map.dispose();
      Object.values(m.uniforms || {}).forEach((u) => u?.value?.isVideoTexture && u.value.dispose());
      m.dispose();
    });
  });
}
