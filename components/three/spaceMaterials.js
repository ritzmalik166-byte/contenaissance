import * as THREE from 'three';
import { glowTexture } from './spaceCommon';

/* =====================================================
   Realistic PBR surfaces for the site's space scenes.

   - Planets use real equirectangular maps (Solar System
     Scope / NASA) with relief from bump maps and a
     physically-motivated atmosphere shell.
   - Rocks and spacecraft use tiling photo-scanned PBR sets
     (Poly Haven / ambientCG, CC0): diffuse + OpenGL normal +
     packed ARM (R = AO, G = roughness, B = metalness).
   - Reflections come from a small prefiltered "space"
     environment: one warm sun and a faint nebula bounce, so
     metals catch a highlight without looking like a studio.

   Texture budget (WebP, /public/textures/space):
   - planets: 1k equirect maps; only the hero moon uses 2k
   - PBR sets: one 512 tier — these objects never cover more
     than ~150px on screen, so a 1k mip level is never sampled
   - backdrop: 1536px Milky Way (≈1:1 with the plane), 1k mobile
   Credits live in public/textures/space/CREDITS.md.
===================================================== */

const BASE = '/textures/space';

/* ---------------- Texture kit ---------------- */

// One kit per scene/renderer. It:
//  - fetches each image URL once; repeat variants are clones sharing
//    one Source, so they share a single GPU upload
//  - defers all downloads until the scene is near the viewport
//    (loadWhenNear), so below-the-fold sections don't compete with
//    the hero on page load
//  - decodes off the render path and uploads before first use
//  - memoises identical materials so meshes share them
//  - disposes everything it handed out
export function createTextureKit(renderer, { mobile = false } = {}) {
  const loader = new THREE.ImageLoader();
  const anisotropy = Math.min(mobile ? 4 : 8, renderer.capabilities.getMaxAnisotropy());

  const sources = new Map(); // url -> { base, variants, requested }
  const textures = new Map(); // url|repeat -> Texture
  const materials = new Map(); // key -> Material
  let envRT = null;
  let observer = null;
  let active = false;
  let disposed = false;

  function fetchSource(url, entry) {
    entry.requested = true;

    loader.load(url, async (img) => {
      try {
        await img.decode?.();
      } catch {
        /* decode() can reject on some browsers; the image is still usable */
      }
      if (disposed) return;

      entry.base.image = img; // shared Source → every variant sees it
      for (const t of entry.variants) {
        t.needsUpdate = true;
        renderer.initTexture(t);
      }
    });
  }

  function texture(url, { srgb = true, tile = false, repeat = null } = {}) {
    const key = `${url}|${repeat ? repeat.join('x') : ''}`;
    if (textures.has(key)) return textures.get(key);

    let entry = sources.get(url);
    if (!entry) {
      const base = new THREE.Texture();
      base.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      base.anisotropy = anisotropy;
      if (tile) base.wrapS = base.wrapT = THREE.RepeatWrapping;

      entry = { base, variants: [base], requested: false };
      sources.set(url, entry);
      if (active) fetchSource(url, entry);
    }

    let tex = entry.base;
    if (repeat && (repeat[0] !== 1 || repeat[1] !== 1)) {
      tex = entry.base.clone();
      tex.repeat.set(repeat[0], repeat[1]);
      entry.variants.push(tex);
      if (entry.base.image) tex.needsUpdate = true;
    }

    textures.set(key, tex);
    return tex;
  }

  function activate() {
    if (active || disposed) return;
    active = true;
    observer?.disconnect();
    observer = null;
    sources.forEach((entry, url) => !entry.requested && fetchSource(url, entry));
  }

  return {
    mobile,

    // Start downloading once `el` is within a viewport of being seen.
    loadWhenNear(el, rootMargin = '100% 0px') {
      if (!el || typeof IntersectionObserver === 'undefined') return activate();
      observer = new IntersectionObserver(([e]) => e?.isIntersecting && activate(), { rootMargin });
      observer.observe(el);
    },

    load: activate,

    planet(name, res = '1k') {
      return texture(`${BASE}/planets/${name}_${res}.webp`);
    },

    data(file) {
      return texture(`${BASE}/${file}`, { srgb: false });
    },

    color(file) {
      return texture(`${BASE}/${file}`);
    },

    // Tiling PBR set → { map, normalMap, arm }
    pbr(name, repeat = [1, 1]) {
      const opts = { tile: true, repeat };
      return {
        map: texture(`${BASE}/pbr/${name}_diff_512.webp`, opts),
        normalMap: texture(`${BASE}/pbr/${name}_nor_512.webp`, { ...opts, srgb: false }),
        arm: texture(`${BASE}/pbr/${name}_arm_512.webp`, { ...opts, srgb: false }),
      };
    },

    // Returns the cached material for `key`, building it once.
    material(key, build) {
      if (!materials.has(key)) materials.set(key, build());
      return materials.get(key);
    },

    environment(sunDir = new THREE.Vector3(-0.5, 0.6, 0.7)) {
      if (!envRT) envRT = buildSpaceEnvironment(renderer, sunDir);
      return envRT.texture;
    },

    dispose() {
      disposed = true;
      observer?.disconnect();
      observer = null;
      textures.forEach((t) => t.dispose());
      textures.clear();
      sources.clear();
      materials.forEach((m) => m.dispose());
      materials.clear();
      envRT?.dispose();
      envRT = null;
    },
  };
}

// Stable cache key for material options (Vectors/Colors serialise fine).
const keyOf = (type, opts) => `${type}:${JSON.stringify(opts)}`;

// A tiny scene rendered once into a PMREM cube: black space, a hot
// sun disc in the key-light direction, a faint cool nebula wash and a
// dim warm bounce from below. Gives metals believable reflections.
function buildSpaceEnvironment(renderer, sunDir) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020306);

  const geo = new THREE.SphereGeometry(1, 16, 16);
  const add = (color, intensity, dir, dist, scale) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    );
    m.position.copy(dir).normalize().multiplyScalar(dist);
    m.scale.setScalar(scale);
    env.add(m);
  };

  add(0xfff1d6, 40, sunDir, 10, 0.9); // sun
  add(0x5a6cff, 0.35, new THREE.Vector3(0.6, 0.3, -0.7), 10, 7); // nebula wash
  add(0x9b5cff, 0.22, new THREE.Vector3(-0.7, 0.1, -0.6), 10, 6);
  add(0xffb877, 0.18, new THREE.Vector3(0.2, -1, 0.1), 10, 8); // planet bounce

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.02);

  pmrem.dispose();
  geo.dispose();
  env.traverse((o) => o.material?.dispose());

  return rt;
}

/* ---------------- Atmosphere ---------------- */

const ATMO_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

// Two shells, both weighted toward the lit hemisphere so the night
// side stays dark like a real planet:
//  - rim:  front faces hugging the surface — fresnel in-scatter
//  - halo: back faces of a larger sphere — light bleeding off the limb
export function makeAtmosphere(radius, {
  color = '#8fb8ff',
  sunDir = new THREE.Vector3(-0.5, 0.6, 0.7),
  intensity = 1,
  thickness = 0.06,
  power = 3.2,
  nightGlow = 0.08,
  segments = 64,
} = {}) {
  const group = new THREE.Group();
  const glowColor = new THREE.Color(color);
  const sun = sunDir.clone().normalize();

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.004, segments, segments),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: glowColor },
        sunDir: { value: sun },
        intensity: { value: intensity },
        power: { value: power },
        nightGlow: { value: nightGlow },
      },
      vertexShader: ATMO_VERTEX,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        uniform vec3 glowColor;
        uniform vec3 sunDir;
        uniform float intensity;
        uniform float power;
        uniform float nightGlow;
        void main() {
          float f = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), power);
          float lit = smoothstep(-0.2, 0.6, dot(vWorldNormal, sunDir));
          float a = f * (nightGlow + lit) * intensity;
          gl_FragColor = vec4(glowColor * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const scale = 1 + thickness;
  const edge = Math.sqrt(1 - 1 / (scale * scale));

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * scale, segments, segments),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: glowColor },
        sunDir: { value: sun },
        intensity: { value: intensity * 0.85 },
        edge: { value: edge },
        nightGlow: { value: nightGlow },
      },
      vertexShader: ATMO_VERTEX,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        uniform vec3 glowColor;
        uniform vec3 sunDir;
        uniform float intensity;
        uniform float edge;
        uniform float nightGlow;
        void main() {
          float d = clamp(-dot(vNormal, vViewDir) / edge, 0.0, 1.0);
          float lit = smoothstep(-0.3, 0.7, dot(vWorldNormal, sunDir));
          float a = pow(d, 2.4) * (nightGlow + lit) * intensity;
          gl_FragColor = vec4(glowColor * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );

  group.add(halo, rim);
  group.userData.materials = [rim.material, halo.material];

  return group;
}

/* ---------------- Planets ---------------- */

// Surface presets keyed by texture name.
const PLANET_SURFACES = {
  mars: { bump: 'self', bumpScale: 2.2, roughness: 0.92 },
  mercury: { bump: 'self', bumpScale: 2.8, roughness: 0.95 },
  moon: { bump: 'height', bumpScale: 3.2, roughness: 0.97 },
  neptune: { roughness: 0.62 },
  saturn: { roughness: 0.66 },
};

/**
 * Textured planet with atmosphere and soft glow sprite.
 * Drop-in for spaceCommon.makePlanet: returns a Group with
 * userData.body / userData.glow / userData.atmosphere.
 */
export function makeRealPlanet(kit, {
  radius,
  surface,
  tint = 0xffffff,
  sunDir,
  atmosphere = {},
  glowColor = '#ffffff',
  glowScale = 2.5,
  glowOpacity = 0.32,
  segments,
  emissive = 0x000000,
  emissiveIntensity = 0,
}) {
  const preset = PLANET_SURFACES[surface] ?? {};
  const group = new THREE.Group();
  const segs = segments ?? (kit.mobile ? 48 : 96);

  const map = kit.planet(surface);
  const material = new THREE.MeshStandardMaterial({
    map,
    color: tint,
    roughness: preset.roughness ?? 0.9,
    metalness: 0,
    emissive,
    emissiveIntensity,
  });

  if (preset.bump === 'self') {
    material.bumpMap = map;
    material.bumpScale = preset.bumpScale;
  } else if (preset.bump === 'height') {
    material.bumpMap = kit.data(`planets/${surface}_height_1k.webp`);
    material.bumpScale = preset.bumpScale;
  }

  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, segs, Math.round(segs / 2)), material);
  group.add(body);

  const atmo = makeAtmosphere(radius, { sunDir, segments: Math.max(32, segs / 2), ...atmosphere });
  group.add(atmo);

  let glow = null;
  if (glowOpacity > 0) {
    glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(glowColor),
        transparent: true,
        opacity: glowOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.scale.setScalar(radius * glowScale);
    group.add(glow);
  }

  group.userData.body = body;
  group.userData.glow = glow;
  group.userData.atmosphere = atmo;

  return group;
}

/* ---------------- Planetary rings ---------------- */

// Flat annulus whose radial UV samples the real Saturn ring strip
// (alpha keeps the Cassini division and ringlet gaps). Lit with a
// standard material so the rings shade with the key light.
export function makePlanetRing(kit, {
  inner,
  outer,
  tint = 0xffffff,
  opacity = 1,
  segments = 160,
}) {
  const geo = new THREE.RingGeometry(inner, outer, segments, 1);

  // Remap UVs: u runs inner → outer edge across the strip.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    uv.setXY(i, (v3.length() - inner) / (outer - inner), 0.5);
  }

  const tex = kit.color('planets/saturn_ring.webp');

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    color: tint,
    transparent: true,
    opacity,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.85,
    metalness: 0,
  });

  return new THREE.Mesh(geo, mat);
}

/* ---------------- Rocks / asteroids ---------------- */

// Seeded PRNG so asteroid shapes are stable per variant.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Compact 3D value noise + fBm.
function makeNoise(rand) {
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = rand() * 2 - 1;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const v = (x, y, z) => vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];

  const noise = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = fade(x - xi), w = fade(y - yi), s = fade(z - zi);
    return lerp(
      lerp(lerp(v(xi, yi, zi), v(xi + 1, yi, zi), u), lerp(v(xi, yi + 1, zi), v(xi + 1, yi + 1, zi), u), w),
      lerp(lerp(v(xi, yi, zi + 1), v(xi + 1, yi, zi + 1), u), lerp(v(xi, yi + 1, zi + 1), v(xi + 1, yi + 1, zi + 1), u), w),
      s
    );
  };

  return (x, y, z, octaves = 5) => {
    let sum = 0, amp = 0.5, freq = 1;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x * freq, y * freq, z * freq) * amp;
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
}

/**
 * Irregular, cratered asteroid mesh. Sphere topology keeps clean UVs
 * for the tiling rock texture; fBm + impact craters break the
 * silhouette, and normals are welded across the UV seam.
 */
export function makeRockGeometry(seed, { widthSegments = 48, heightSegments = 32 } = {}) {
  const rand = mulberry32(seed * 9973 + 17);
  const fbm = makeNoise(rand);

  const geo = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();

  // Overall potato shape
  const stretch = new THREE.Vector3(0.75 + rand() * 0.6, 0.6 + rand() * 0.35, 0.7 + rand() * 0.45);

  const craters = [];
  const craterCount = 5 + Math.floor(rand() * 6);
  for (let i = 0; i < craterCount; i++) {
    craters.push({
      c: new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(),
      r: 0.18 + Math.pow(rand(), 2) * 0.45,
      depth: 0.06 + rand() * 0.1,
    });
  }

  const off = rand() * 100;

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = p.clone().normalize();

    let h = 1 + fbm(n.x * 1.4 + off, n.y * 1.4, n.z * 1.4, 3) * 0.55;
    h += fbm(n.x * 5 + off, n.y * 5, n.z * 5, 3) * 0.08;

    for (const cr of craters) {
      const d = Math.acos(THREE.MathUtils.clamp(n.dot(cr.c), -1, 1)) / cr.r;
      if (d < 1.35) {
        // bowl + raised rim
        const bowl = d < 1 ? (d * d - 1) * cr.depth : 0;
        const rim = Math.exp(-Math.pow((d - 1) * 4.5, 2)) * cr.depth * 0.45;
        h += bowl + rim;
      }
    }

    p.copy(n).multiplyScalar(h).multiply(stretch);
    pos.setXYZ(i, p.x, p.y, p.z);
  }

  geo.computeVertexNormals();
  weldNormals(geo);
  geo.computeBoundingSphere();

  return geo;
}

// Average normals of vertices that share a position (UV seam, poles)
// so smooth shading has no visible crease.
function weldNormals(geo) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const map = new Map();
  const key = (i) =>
    `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;

  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    const acc = map.get(k) ?? [0, 0, 0];
    acc[0] += nor.getX(i);
    acc[1] += nor.getY(i);
    acc[2] += nor.getZ(i);
    map.set(k, acc);
  }

  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = map.get(key(i));
    v.set(x, y, z).normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  nor.needsUpdate = true;
}

// One material per tint, shared by every rock using it.
export function rockMaterial(kit, tint = 0xffffff) {
  const color = new THREE.Color(tint);

  return kit.material(keyOf('rock', color.getHex()), () => {
    const { map, normalMap, arm } = kit.pbr('rock', [2, 1]);
    return new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughnessMap: arm,
      aoMap: arm,
      aoMapIntensity: 0.9,
      color,
      roughness: 1,
      metalness: 0,
    });
  });
}

// Pull a palette color toward white so it tints, rather than
// darkens, the photographic rock albedo.
export function softTint(hex, amount = 0.55) {
  return new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amount);
}

const rand = (min, max) => Math.random() * (max - min) + min;

/**
 * Cratered asteroid band. Same options and userData.rocks layout as
 * the old low-poly belt, so spaceCommon.updateAsteroidBelt animates it
 * unchanged. A handful of unique rock shapes and one material per
 * palette tint are shared across every instance to keep it cheap.
 */
export function makeAsteroidBelt(kit, {
  count = 18,
  radiusRange = [6, 11],
  arc = Math.PI * 2,
  y = 0,
  ySpread = 1.2,
  z = -16,
  zSpread = 4,
  scaleRange = [0.08, 0.26],
  colors = ['#6b6459', '#4d473e', '#847a68'],
  variants = 6,
} = {}) {
  const group = new THREE.Group();
  const rocks = [];

  const seg = kit.mobile ? { widthSegments: 28, heightSegments: 18 } : { widthSegments: 48, heightSegments: 32 };
  const geometries = Array.from({ length: variants }, (_, i) => makeRockGeometry(i + 1, seg));
  const materials = colors.map((c) => rockMaterial(kit, softTint(c)));

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geometries[i % variants], materials[i % materials.length]);

    const angle = rand(0, arc);
    const radius = rand(radiusRange[0], radiusRange[1]);

    mesh.position.set(
      Math.cos(angle) * radius,
      y + rand(-ySpread, ySpread),
      z + rand(-zSpread, zSpread)
    );
    mesh.scale.setScalar(rand(scaleRange[0], scaleRange[1]));
    mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));

    group.add(mesh);

    rocks.push({
      mesh,
      spin: new THREE.Vector3(rand(-0.15, 0.15), rand(-0.2, 0.2), rand(-0.1, 0.1)),
      drift: rand(0.02, 0.06),
      phase: rand(0, Math.PI * 2),
      baseY: mesh.position.y,
    });
  }

  group.userData.rocks = rocks;

  return group;
}

/* ---------------- Spacecraft surfaces ---------------- */

// Machined / painted hull panels. Every spacecraft surface (hulls,
// fins, gold trim) uses this one PBR set, tinted per part.
export function hullMaterial(kit, {
  color = 0xd9dcdc,
  metalness = 0.85,
  roughness = 1,
  repeat = [1, 1],
  envMapIntensity = 1,
  sunDir,
} = {}) {
  return kit.material(keyOf('hull', { color, metalness, roughness, repeat, envMapIntensity }), () => {
    const { map, normalMap, arm } = kit.pbr('metal', repeat);
    return new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: arm,
      metalnessMap: arm,
      aoMap: arm,
      color,
      metalness,
      roughness,
      envMap: kit.environment(sunDir),
      envMapIntensity,
    });
  });
}

// Photovoltaic cells: glassy, dark blue, with a sharp sun glint.
// One shared instance per scene for every panel.
export function solarPanelMaterial(kit, { sunDir } = {}) {
  return kit.material('solar', () => {
    const { map, normalMap, arm } = kit.pbr('solar', [2.5, 1]);
    return new THREE.MeshPhysicalMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: arm,
      metalnessMap: arm,
      roughness: 0.55,
      metalness: 0.6,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMap: kit.environment(sunDir),
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    });
  });
}

// Dark reflective viewport glass (no textures).
export function glassMaterial(kit, { sunDir } = {}) {
  return kit.material('glass', () =>
    new THREE.MeshPhysicalMaterial({
      color: 0x070b14,
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMap: kit.environment(sunDir),
      envMapIntensity: 1.6,
    })
  );
}
