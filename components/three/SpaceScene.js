
import * as THREE from 'three';
import {
  glowTexture,
  makeStars,
  makePlanet,
  makeAsteroidBelt,
  updateAsteroidBelt,
} from './spaceCommon';

function flameTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 128);

  grd.addColorStop(0, 'rgba(255,245,210,0.95)');
  grd.addColorStop(0.3, 'rgba(242,226,27,0.8)');
  grd.addColorStop(0.65, 'rgba(217,119,43,0.45)');
  grd.addColorStop(1, 'rgba(217,119,43,0)');

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Cinematic nebula background
function makeNebulaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;

  const ctx = canvas.getContext('2d');

  const clouds = [
    [360, 390, 430, 'rgba(92,55,145,0.34)'],
    [760, 560, 390, 'rgba(35,100,158,0.28)'],
    [1240, 330, 470, 'rgba(151,77,48,0.22)'],
    [1640, 650, 390, 'rgba(72,53,137,0.30)'],
    [1030, 820, 300, 'rgba(194,126,55,0.13)'],
  ];

  ctx.globalCompositeOperation = 'screen';

  clouds.forEach(([x, y, radius, color]) => {
    const gradient = ctx.createRadialGradient(
      x, y, 0, x, y, radius
    );

    gradient.addColorStop(0, color);
    gradient.addColorStop(0.38, color.replace(/[\d.]+\)$/, '0.10)'));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );
  });

  for (let i = 0; i < 95; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 18 + Math.random() * 70;

    const gradient = ctx.createRadialGradient(
      x, y, 0, x, y, radius
    );

    gradient.addColorStop(
      0,
      `rgba(155,167,255,${0.025 + Math.random() * 0.045})`
    );
    gradient.addColorStop(1, 'rgba(100,120,190,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

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

// Moving comets
function makeComet() {
  const group = new THREE.Group();

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffe5b0,
    })
  );

  group.add(head);

  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.55, -0.16, 0),
    new THREE.Vector3(-1.25, -0.34, 0),
  ];

  const geometry = new THREE.BufferGeometry()
    .setFromPoints(points);

  const tail = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x9dbbff,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
    })
  );

  group.add(tail);

  return group;
}

// Space station
function makeStation(glow) {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 1.4, 10),
    new THREE.MeshStandardMaterial({
      color: 0xcfd3cf,
      metalness: 0.6,
      roughness: 0.4,
    })
  );

  hull.rotation.z = Math.PI / 2.4;
  group.add(hull);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.045, 8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x8a8f86,
      metalness: 0.5,
      roughness: 0.5,
    })
  );

  ring.rotation.x = Math.PI / 2.6;
  group.add(ring);

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x16202a,
    metalness: 0.3,
    roughness: 0.6,
    emissive: 0x0d1720,
  });

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
function makeSatellite(glow) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0xe7eee9,
      metalness: 0.4,
      roughness: 0.5,
    })
  );

  group.add(body);

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1b2630,
    metalness: 0.2,
    roughness: 0.55,
    emissive: 0x0a1016,
  });

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

// Small drifting rocket
function makeDriftRocket(flameTex) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xcfd6cc,
    metalness: 0.3,
    roughness: 0.5,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12),
    bodyMat
  );

  group.add(body);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.26, 12),
    bodyMat
  );

  nose.position.y = 0.38;
  group.add(nose);

  const finMat = new THREE.MeshStandardMaterial({
    color: 0xd9772b,
    metalness: 0.2,
    roughness: 0.6,
  });

  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.16, 3),
      finMat
    );

    const angle = (i / 3) * Math.PI * 2;

    fin.position.set(
      Math.cos(angle) * 0.1,
      -0.24,
      Math.sin(angle) * 0.1
    );

    fin.rotation.x = Math.PI;
    fin.lookAt(0, -0.4, 0);

    group.add(fin);
  }

  const flame = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  flame.scale.set(0.2, 0.55, 1);
  flame.position.y = -0.52;

  group.add(flame);

  group.rotation.z = Math.PI;
  group.userData.flame = flame;

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

  const rim = new THREE.PointLight(
    0xc8f04a,
    8,
    24
  );

  rim.position.set(3, -1, 4);
  scene.add(rim);

  const RIM_BASE = rim.intensity;

  // Nebula background
  const nebulaTexture = makeNebulaTexture();

  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 25),
    new THREE.MeshBasicMaterial({
      map: nebulaTexture,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  nebula.position.set(0, 0, -27);
  scene.add(nebula);

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
  const asteroids = makeAsteroidBelt({
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
  const planetA = makePlanet({
    radius: 2.05,
    color: 0x66513b,
    emissive: 0x302016,
    glowColor: '#e0a65e',
    glowScale: 3.1,
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
  const planetARing = new THREE.Mesh(
    new THREE.TorusGeometry(2.75, 0.055, 8, 120),
    new THREE.MeshBasicMaterial({
      color: 0xc9a879,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );

  planetARing.position.copy(planetA.position);
  planetARing.rotation.set(1.18, 0.18, -0.28);

  scene.add(planetARing);

  // Secondary blue planet
  const planetB = makePlanet({
    radius: 1.15,
    color: 0x344b61,
    emissive: 0x142333,
    glowColor: '#83b9ed',
    glowScale: 3.2,
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

  const station = makeStation(lightGlow);

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

  const satellite = makeSatellite(lightGlow);

  satellite.position.set(2.7, 0.25, 0);
  satOrbit.add(satellite);

  // Drifting rocket
  const driftRocket = makeDriftRocket(flameTexture());

  driftRocket.position.set(-8, -3.4, -7);
  driftRocket.scale.setScalar(1.7);

  scene.add(driftRocket);

  // Comets
  const comets = [
    makeComet(),
    makeComet(),
    makeComet(),
  ];

  comets.forEach((comet, i) => {
    comet.position.set(
      -10 + i * 8,
      3.8 - i * 2.8,
      -11 - i * 3
    );

    comet.scale.setScalar(0.55 + i * 0.18);
    scene.add(comet);
  });

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

  const DRIFT_SPAN = 14;

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

      // Comet movement
      comets.forEach((comet, i) => {
        const cycle =
          (t * (0.12 + i * 0.035) + i * 0.38) % 1;

        comet.position.x = -13 + cycle * 26;

        comet.position.y =
          4.8 - cycle * 9 + Math.sin(t * 0.4 + i) * 0.25;

        comet.rotation.z = -0.22;

        comet.children[1].material.opacity =
          0.18 + Math.sin(t * 1.4 + i) * 0.12;
      });

      // Station lights
      station.userData.lights.forEach((light, i) => {
        light.material.opacity =
          0.4 + Math.sin(t * 2 + i) * 0.35 + 0.35;
      });

      satellite.userData.blip.material.opacity =
        0.5 + Math.sin(t * 3) * 0.4;

      // Drifting rocket
      driftRocket.position.x =
        ((t * 0.35) % DRIFT_SPAN) -
        DRIFT_SPAN / 2 - 5;

      driftRocket.position.y =
        -3.2 + Math.sin(t * 0.5) * 0.3;

      driftRocket.rotation.z =
        Math.PI + Math.sin(t * 0.4) * 0.08;

      // Engine flame
      const flameMat = driftRocket.userData.flame.material;

      flameMat.opacity =
        0.75 + Math.sin(t * 12) * 0.2;

      driftRocket.userData.flame.scale.set(
        0.2,
        0.5 + Math.sin(t * 10) * 0.08,
        1
      );

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
      nebulaTexture.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
