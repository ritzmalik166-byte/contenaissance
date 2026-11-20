import * as THREE from 'three';
import {
  glowTexture,
  makeStars,
  updateAsteroidBelt,
} from './spaceCommon';
import {
  createTextureKit,
  makeRealPlanet,
  makePlanetRing,
  makeAsteroidBelt,
  hullMaterial,
  solarPanelMaterial,
} from './spaceMaterials';

// Floating space dust
function makeDustField(count, bounds) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const palette = [
    new THREE.Color('#d8d9ff'),
    new THREE.Color('#f2c77a'),
    new THREE.Color('#a9c9ff'),
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3] =
      (Math.random() - 0.5) * bounds.x;

    positions[i * 3 + 1] =
      (Math.random() - 0.5) * bounds.y;

    positions[i * 3 + 2] =
      -4 - Math.random() * bounds.z;

    const color = palette[
      Math.floor(Math.random() * palette.length)
    ];

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
  );

  const material = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

// Planet atmosphere
function makeAtmosphereGlow(
  glow,
  color = '#c8f04a',
  scale = 5
) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glow,
      color,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  sprite.scale.setScalar(scale);
  return sprite;
}

// Space station
function makeStation(glow, kit, sunDir) {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 1.4, 48, 1),
    hullMaterial(kit, { color: 0xe4e7e6, repeat: [2, 1.4], sunDir })
  );

  hull.rotation.z = Math.PI / 2.4;
  group.add(hull);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.045, 16, 128),
    hullMaterial(kit, { color: 0x9ea39b, repeat: [24, 0.5], sunDir })
  );

  ring.rotation.x = Math.PI / 2.6;
  group.add(ring);

  const panelMat = solarPanelMaterial(kit, { sunDir });

  [-1, 1].forEach((side) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.35, 0.02),
      panelMat
    );

    panel.position.x = side * 0.95;
    panel.rotation.z = side * 0.15;

    group.add(panel);
  });

  const lightMat = new THREE.SpriteMaterial({
    map: glow,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lights = [];

  for (let i = 0; i < 4; i++) {
    const light = new THREE.Sprite(lightMat.clone());

    light.scale.setScalar(0.1);

    const angle = (i / 4) * Math.PI * 2;

    light.position.set(
      Math.cos(angle) * 0.24,
      Math.sin(angle) * 0.24,
      0.72
    );

    group.add(light);
    lights.push(light);
  }

  group.userData.lights = lights;

  return group;
}

// Satellite
function makeSatellite(glow, kit, sunDir) {
  const group = new THREE.Group();

  // Gold-anodised bus — reuses the hull PBR set, tinted
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.4),
    hullMaterial(kit, { color: 0xffc35a, metalness: 1, roughness: 0.75, sunDir })
  );

  group.add(body);

  const panelMat = solarPanelMaterial(kit, { sunDir });

  [-1, 1].forEach((side) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.2),
      panelMat
    );

    panel.position.x = side * 0.34;
    panel.rotation.y = Math.PI / 2;

    group.add(panel);
  });

  const blip = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glow,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  blip.scale.setScalar(0.09);
  blip.position.z = 0.22;

  group.add(blip);
  group.userData.blip = blip;

  return group;
}

// ============================================
// MAIN SPACE SCENE
// ============================================

export function createSpaceScene(container) {
  if (!container) return null;

  let mobile = window.innerWidth < 760;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: true,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      mobile ? 1.4 : 1.75
    )
  );

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  container.appendChild(renderer.domElement);

  const kit = createTextureKit(renderer, { mobile });
  kit.loadWhenNear(container);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    48,
    container.clientWidth / container.clientHeight,
    0.1,
    60
  );

  camera.position.set(0, 0, 12);

  // Cinematic lighting
  scene.add(
    new THREE.AmbientLight(0x596070, 1.35)
  );

  const key = new THREE.DirectionalLight(
    0xffe3b2,
    2.0
  );

  key.position.set(-4, 5, 6);
  scene.add(key);

  // World-space direction toward the key light; drives atmosphere
  // scattering and the environment's sun highlight.
  const sunDir = key.position.clone().normalize();

  const rim = new THREE.PointLight(
    0xc8f04a,
    8,
    24
  );

  rim.position.set(3, -1, 4);
  scene.add(rim);

  const RIM_BASE = rim.intensity;

  // Milky Way backdrop (ESO all-sky panorama, galactic core crop)
  const nebulaTexture = kit.color(
    `backgrounds/milkyway_${mobile ? '1k' : '1536'}.webp`
  );

  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 25),
    new THREE.MeshBasicMaterial({
      map: nebulaTexture,
      transparent: true,
      // Additive blend: opacity acts as brightness. Kept low so the
      // Milky Way reads as atmosphere and the copy stays legible.
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  nebula.position.set(0, 0, -27);
  scene.add(nebula);

  // Scale the backdrop to always overfill the frustum ("cover"), so
  // its edges never show as a rectangle on wide or tall screens.
  // Sized for the farthest camera position (z = 12), with margin for
  // the pointer/scroll parallax.
  const NEBULA_W = 46;
  const NEBULA_H = 25;
  const NEBULA_MARGIN = 1.3;

  const fitNebula = () => {
    const dist = 12 - nebula.position.z;
    const viewH =
      2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewW = viewH * camera.aspect;

    nebula.scale.setScalar(
      Math.max(
        (viewW * NEBULA_MARGIN) / NEBULA_W,
        (viewH * NEBULA_MARGIN) / NEBULA_H
      )
    );
  };

  // Layered stars
  const stars = makeStars(
    mobile ? 650 : 1500,
    { x: 30, y: 18, z: 34 }
  );

  scene.add(stars);

  const nearStars = makeStars(
    mobile ? 100 : 260,
    { x: 22, y: 13, z: 13 }
  );

  nearStars.material.opacity = 0.72;
  scene.add(nearStars);

  // Floating dust
  const dust = makeDustField(
    mobile ? 260 : 620,
    { x: 28, y: 17, z: 22 }
  );

  scene.add(dust);

  // Asteroid field
  const asteroids = makeAsteroidBelt(kit, {
    count: mobile ? 22 : 52,
    radiusRange: [4.5, 13],
    arc: Math.PI * 1.55,
    y: -0.8,
    ySpread: 3.8,
    z: -15,
    zSpread: 9,
  });

  scene.add(asteroids);

  // Main planet
  // Rust-red rocky world: real Mars albedo + relief, thin dusty air
  const planetA = makeRealPlanet(kit, {
    radius: 2.05,
    surface: 'mars',
    tint: 0xe9d2bd,
    sunDir,
    atmosphere: { color: '#f0a868', intensity: 0.9, thickness: 0.05, power: 3.6 },
    glowColor: '#e0a65e',
    glowScale: 3.1,
    glowOpacity: 0.3,
  });

  planetA.position.set(-7.1, 2.8, -14);
  scene.add(planetA);

  const planetAHalo = makeAtmosphereGlow(
    glowTexture('#d58a55'),
    '#d58a55',
    6.8
  );

  planetAHalo.position.copy(planetA.position);
  planetAHalo.position.z -= 0.45;

  scene.add(planetAHalo);

  // Planet ring
  // Ice-and-dust ring system (real Saturn ring radial profile).
  // RingGeometry lies in XY like the old torus, so the same
  // rotation/animation applies.
  const planetARing = makePlanetRing(kit, {
    inner: 2.45,
    outer: 3.15,
    tint: 0xe2c49a,
    opacity: 0.75,
  });

  planetARing.position.copy(planetA.position);
  planetARing.rotation.set(1.18, 0.18, -0.28);

  scene.add(planetARing);

  // Secondary blue planet
  // Ice giant: real Neptune cloud bands, deep blue scattering
  const planetB = makeRealPlanet(kit, {
    radius: 1.15,
    surface: 'neptune',
    tint: 0xc8d8ee,
    sunDir,
    atmosphere: { color: '#7fb6ff', intensity: 1.25, thickness: 0.07, power: 2.8 },
    glowColor: '#83b9ed',
    glowScale: 3.2,
    glowOpacity: 0.3,
  });

  planetB.position.set(7.3, -3.1, -12);
  scene.add(planetB);

  const planetBHalo = makeAtmosphereGlow(
    glowTexture('#83b9ed'),
    '#83b9ed',
    4.8
  );

  planetBHalo.position.copy(planetB.position);
  planetBHalo.position.z -= 0.35;

  scene.add(planetBHalo);

  // Space station
  const lightGlow = glowTexture('#c8f04a');

  const station = makeStation(lightGlow, kit, sunDir);

  station.position.set(8.0, 3.2, -9);
  station.scale.setScalar(1.75);

  scene.add(station);

  const stationHalo = makeAtmosphereGlow(
    lightGlow,
    '#c8f04a',
    4.2
  );

  stationHalo.position.copy(station.position);
  stationHalo.position.z -= 0.35;

  scene.add(stationHalo);

  // Orbiting satellite
  const satOrbit = new THREE.Group();

  satOrbit.position.copy(station.position);
  scene.add(satOrbit);

  const satellite = makeSatellite(lightGlow, kit, sunDir);

  satellite.position.set(2.7, 0.25, 0);
  satOrbit.add(satellite);

  // Interaction state
  const state = {
    progress: 0,
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    pulse: 0,
    visible: true,
  };

  const start = performance.now();

  let raf = 0;
  let destroyed = false;

  // Resize
  const onResize = () => {
    if (destroyed) return;

    const rect = container.getBoundingClientRect();

    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (!w || !h) return;

    mobile = window.innerWidth < 760;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitNebula();

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        mobile ? 1.4 : 1.75
      )
    );

    renderer.setSize(w, h, false);
  };

  const resizeObserver = new ResizeObserver(onResize);

  resizeObserver.observe(container);
  window.addEventListener('resize', onResize);

  onResize();

  // Pause rendering outside viewport
  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
  });

  io.observe(container);

  // Animation loop
  const render = () => {
    if (destroyed) return;

    raf = requestAnimationFrame(render);

    if (!state.visible) return;

    const t = (performance.now() - start) / 1000;
    const p = state.progress;

    if (!reducedMotion) {
      state.px += (state.tx - state.px) * 0.05;
      state.py += (state.ty - state.py) * 0.05;
    }

    // Camera parallax and scroll movement
    camera.position.x = state.px * 0.78;
    camera.position.y = state.py * 0.58 + p * 1.05;
    camera.position.z = 12 - p * 3.2;

    camera.lookAt(
      state.px * 0.24,
      state.py * 0.18 - p * 0.45,
      -10
    );

    // Different background movement speeds
    nebula.position.x = state.px * -0.42;
    nebula.position.y = -p * 0.7 + state.py * -0.18;

    nearStars.position.x = state.px * -0.18;

    dust.position.x = state.px * -0.32;
    dust.position.y = -p * 0.35;

    if (!reducedMotion) {
      // Planet rotation
      planetA.rotation.y = t * 0.055;
      planetB.rotation.y = -t * 0.075;

      planetARing.rotation.z =
        -0.28 + Math.sin(t * 0.08) * 0.035;

      // Space station orbit
      satOrbit.rotation.y = t * 0.35;
      station.rotation.y = t * 0.08;

      // Nebula movement
      nebula.rotation.z = Math.sin(t * 0.025) * 0.012;

      nearStars.rotation.y = t * -0.006;
      dust.rotation.y = t * 0.004;

      // Station lights
      station.userData.lights.forEach((light, i) => {
        light.material.opacity =
          0.4 + Math.sin(t * 2 + i) * 0.35 + 0.35;
      });

      satellite.userData.blip.material.opacity =
        0.5 + Math.sin(t * 3) * 0.4;

      // Asteroid movement
      updateAsteroidBelt(asteroids, t);
      asteroids.rotation.y = t * 0.012;
    }

    // Star movement
    stars.rotation.y = reducedMotion ? 0 : t * 0.003;

    // Interactive light pulse
    state.pulse *= 0.92;
    rim.intensity = RIM_BASE + state.pulse * 14;

    renderer.render(scene, camera);
  };

  render();

  // Public API: keep compatible with existing Rocket.jsx
  return {
    state,

    resize: onResize,

    setPointer(x, y) {
      state.tx = x;
      state.ty = y;
    },

    setProgress(p) {
      state.progress = p;
    },

    pulse() {
      state.pulse = 1;
    },

    destroy() {
      destroyed = true;

      cancelAnimationFrame(raf);

      resizeObserver.disconnect();
      io.disconnect();

      window.removeEventListener('resize', onResize);

      scene.traverse((o) => {
        o.geometry?.dispose();

        if (o.material) {
          [].concat(o.material).forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });

      lightGlow.dispose();
      kit.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
