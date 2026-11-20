
import * as THREE from 'three';
import {
  createTextureKit,
  makeRealPlanet,
  makePlanetRing,
  makeAsteroidBelt,
  hullMaterial,
  glassMaterial,
} from './spaceMaterials';

/* -------------------- Helpers -------------------- */

const random = (min, max) => Math.random() * (max - min) + min;

function createTexture(draw, width = 1024, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return texture;
}

function createGlow(color = '#ffffff') {
  const texture = createTexture((ctx, w, h) => {
    const gradient = ctx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, w / 2
    );

    gradient.addColorStop(0, color);
    gradient.addColorStop(0.15, `${color}aa`);
    gradient.addColorStop(0.4, `${color}35`);
    gradient.addColorStop(1, `${color}00`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, 256, 256);

  return texture;
}

function createNebula(color) {
  const texture = createTexture((ctx, w, h) => {
    for (let i = 0; i < 100; i++) {
      const x = random(0, w);
      const y = random(0, h);
      const radius = random(30, 180);

      const gradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, radius
      );

      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  });

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Sprite(material);
}

/* -------------------- Stars -------------------- */

function createStars(count = 1200) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = random(-45, 45);
    positions[i * 3 + 1] = random(-25, 25);
    positions[i * 3 + 2] = random(-70, 10);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.055,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

/* -------------------- Planets -------------------- */

// Real-surface planet; keeps the old { group, planet } shape so the
// animation loop can keep spinning only the surface.
function createPlanet(kit, radius, position, options) {
  const group = makeRealPlanet(kit, { radius, glowOpacity: 0, ...options });

  group.position.set(...position);

  return { group, planet: group.userData.body };
}

/* -------------------- Saturn Rings -------------------- */

// Same footprint as the old three flat bands (4.0 → 6.8), now one
// lit ring textured with the real Saturn ring radial profile.
function createRings(kit) {
  const ring = makePlanetRing(kit, {
    inner: 4.0,
    outer: 6.8,
    tint: 0xf2dfbf,
    opacity: 0.95,
    segments: 192,
  });

  ring.rotation.x = -Math.PI / 2 + 0.2;

  return ring;
}

/* -------------------- Rocket -------------------- */

function createRocket(glowTexture, kit, sunDir) {
  const group = new THREE.Group();

  // Machined aluminium hull panels
  const silver = hullMaterial(kit, {
    color: 0xe6e9ee,
    metalness: 1,
    roughness: 0.8,
    repeat: [1.5, 1],
    sunDir,
  });

  // Anodised gold trim
  const gold = hullMaterial(kit, {
    color: 0xe0b060,
    metalness: 1,
    roughness: 0.7,
    repeat: [0.5, 0.5],
    sunDir,
  });

  // Reflective porthole glass
  const dark = glassMaterial(kit, { sunDir });

  // Main body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.17, 0.9, 40),
    silver
  );

  group.add(body);

  // Nose
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.35, 40),
    silver
  );

  nose.position.y = 0.62;
  group.add(nose);

  // Window
  const windowMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 24, 24),
    dark
  );

  windowMesh.position.set(0, 0.2, 0.13);
  group.add(windowMesh);

  // Gold band
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.06, 40),
    gold
  );

  band.position.y = 0.35;
  group.add(band);

  // Fins
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.3, 0.06),
      gold
    );

    const angle = (i / 3) * Math.PI * 2;

    fin.position.set(
      Math.cos(angle) * 0.16,
      -0.35,
      Math.sin(angle) * 0.16
    );

    group.add(fin);
  }

  // Engine flame
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.8, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffa52e,
      transparent: true,
      opacity: 0.8,
    })
  );

  flame.rotation.x = Math.PI;
  flame.position.y = -0.78;
  group.add(flame);

  // Engine glow
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffb94e,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  glow.position.y = -0.8;
  glow.scale.set(1.2, 1.2, 1);
  group.add(glow);

  group.userData.flame = flame;
  group.userData.glow = glow;

  group.visible = false;

  return group;
}

/* =====================================================
   MAIN SCENE
===================================================== */

export function createArchiveSpaceScene(container, visibilityTarget = container) {
  if (!container) return null;

  const isMobile = window.innerWidth < 760;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    1,
    0.1,
    150
  );

  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, isMobile ? 1.4 : 1.75)
  );

  renderer.setClearColor(0x000000, 0);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Important: CSS controls the displayed canvas size.
  renderer.setSize(
    container.clientWidth || 1,
    container.clientHeight || 1,
    false
  );

  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  container.appendChild(renderer.domElement);

  const kit = createTextureKit(renderer, { mobile: isMobile });
  kit.loadWhenNear(visibilityTarget);

  /* Lighting */

  scene.add(new THREE.AmbientLight(0x8c79bd, 0.45));

  const sunlight = new THREE.DirectionalLight(0xffe1b5, 2.5);

  sunlight.position.set(-15, 12, 20);
  scene.add(sunlight);

  const sunDir = sunlight.position.clone().normalize();

  /* Background */

  const background = new THREE.Group();
  scene.add(background);

  const stars = createStars(isMobile ? 500 : 1300);
  background.add(stars);

  const nebulae = [
    {
      color: 'rgba(140,70,220,0.18)',
      position: [-15, 7, -35],
      scale: [35, 23],
    },
    {
      color: 'rgba(220,150,90,0.15)',
      position: [17, -5, -40],
      scale: [32, 22],
    },
    {
      color: 'rgba(100,70,200,0.15)',
      position: [0, 13, -45],
      scale: [35, 25],
    },
  ];

  nebulae.forEach((item) => {
    const nebula = createNebula(item.color);

    nebula.position.set(...item.position);
    nebula.scale.set(...item.scale);

    background.add(nebula);
  });

  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlow('#ffd29a'),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  sunGlow.position.set(-20, 14, -38);
  sunGlow.scale.set(22, 22, 1);

  background.add(sunGlow);

  /* Ringed Planet */

  const saturn = createPlanet(kit, 3.1, [10, 4, -23], {
    surface: 'saturn',
    sunDir,
    atmosphere: { color: '#ffd6a0', intensity: 0.75, thickness: 0.05 },
  });

  saturn.group.rotation.z = -0.3;

  saturn.group.add(createRings(kit));

  scene.add(saturn.group);

  /* Purple Planet */

  // Cratered rocky world, violet-tinted to keep the section palette
  const purplePlanet = createPlanet(kit, 2.2, [-12, -3, -27], {
    surface: 'mercury',
    tint: 0xb4a0e4,
    sunDir,
    atmosphere: { color: '#baa1ff', intensity: 0.9, thickness: 0.06 },
  });

  scene.add(purplePlanet.group);

  /* Small Moon */

  // Real lunar albedo + LOLA relief, airless (no scattering)
  const moon = makeRealPlanet(kit, {
    radius: 0.55,
    surface: 'moon',
    tint: 0xd8d4dc,
    sunDir,
    segments: isMobile ? 32 : 48,
    atmosphere: { intensity: 0.12, color: '#c9c3d6' },
    glowOpacity: 0,
  });

  moon.position.set(-5, 6, -32);
  scene.add(moon);

  /* Asteroids */

  const asteroids = makeAsteroidBelt(kit, {
    count: isMobile ? 12 : 26,
    radiusRange: [4, 15],
    y: 0,
    ySpread: 8,
    z: -8,
    zSpread: 4,
    scaleRange: [0.08, 0.32],
    colors: ['#62584f', '#81776a', '#39332e', '#9a8974'],
  });
  scene.add(asteroids);

  /* Planetary Horizon */

  const horizonGroup = new THREE.Group();

  horizonGroup.position.set(0, -55, -25);

  // Vast rocky world filling the bottom of the frame: real cratered
  // surface in deep violet, with warm sunset scattering on its limb.
  const horizonWorld = makeRealPlanet(kit, {
    radius: 45,
    surface: 'mercury',
    tint: 0x5e4d7c,
    sunDir,
    segments: isMobile ? 64 : 128,
    atmosphere: { color: '#ffb875', intensity: 1.1, thickness: 0.035, power: 2.6, nightGlow: 0.15 },
    glowOpacity: 0,
  });

  const horizon = horizonWorld.userData.body;
  horizonGroup.add(horizonWorld);

  scene.add(horizonGroup);

  const horizonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlow('#d49a9d'),
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  horizonGlow.position.set(0, -8, -30);
  horizonGlow.scale.set(45, 18, 1);

  scene.add(horizonGlow);

  /* Rocket */

  const rocket = createRocket(createGlow('#ffca70'), kit, sunDir);

  scene.add(rocket);

  /* Animation State */

  const state = {
    scroll: 0,
    targetScroll: 0,
    pointerX: 0,
    pointerY: 0,
    targetX: 0,
    targetY: 0,
    visible: true,
  };

  const clock = new THREE.Clock();

  let animationFrame = 0;
  let destroyed = false;

  let rocketActive = false;
  let rocketStart = 0;
  let rocketNext = random(4, 8);
  let rocketDuration = random(6, 9);

  /* Resize */

  function resize() {
    if (destroyed) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth < 760 ? 1.4 : 1.75
      )
    );

    renderer.setSize(width, height, false);
  }

  const resizeObserver = new ResizeObserver(resize);

  resizeObserver.observe(container);

  window.addEventListener('resize', resize);

  resize();

  /* Visibility */

  const observer = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;

    if (state.visible) {
      clock.getDelta();
    }
  });

  observer.observe(visibilityTarget);

  /* Animation Loop */

  function animate() {
    if (destroyed) return;

    animationFrame = requestAnimationFrame(animate);

    if (!state.visible) return;

    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    const motion = reducedMotion ? 0 : 1;
    const smooth = 1 - Math.exp(-delta * 3);

    // Smooth pointer movement
    state.pointerX += (state.targetX - state.pointerX) * smooth;
    state.pointerY += (state.targetY - state.pointerY) * smooth;

    // Scroll parallax
    state.scroll += (state.targetScroll - state.scroll) * smooth;

    const progress = state.scroll;

    background.position.y = progress * 3;

    saturn.group.position.y = 4 - progress * 3;

    purplePlanet.group.position.y = -3 + progress * 4;

    asteroids.position.y = -8 + progress * 15;

    horizonGroup.position.y = -55 + progress * 5;

    horizonGlow.position.y = -8 + progress * 5;

    // Camera movement
    camera.position.x = state.pointerX * 1.1;
    camera.position.y = state.pointerY * 0.7;

    camera.lookAt(
      state.pointerX * 0.3,
      state.pointerY * 0.2,
      -20
    );

    if (motion) {
      // Planet rotation
      saturn.planet.rotation.y += delta * 0.045;

      purplePlanet.planet.rotation.y += delta * 0.06;

      moon.rotation.y += delta * 0.12;

      horizon.rotation.y += delta * 0.004;

      // Asteroid movement
      asteroids.rotation.y += delta * 0.025;

      // Star movement
      stars.rotation.y += delta * 0.001;

      // Nebula movement
      background.children.forEach((child) => {
        if (child.isSprite && child !== sunGlow) {
          child.material.rotation += delta * 0.002;
        }
      });

      // Rocket launch
      if (!rocketActive && time >= rocketNext) {
        rocketActive = true;
        rocketStart = time;
        rocketDuration = random(6, 9);

        rocket.position.set(
          Math.random() > 0.5 ? -25 : 25,
          random(-2, 5),
          -10
        );

        rocket.rotation.z = rocket.position.x < 0
          ? -Math.PI / 2
          : Math.PI / 2;

        rocket.visible = true;
      }

      if (rocketActive) {
        const progress = Math.min(
          (time - rocketStart) / rocketDuration,
          1
        );

        const direction = rocket.position.x < 0 ? 1 : -1;

        rocket.position.x += direction * delta * 7;

        const flicker = 0.8 + Math.sin(time * 35) * 0.2;

        rocket.userData.flame.scale.y = flicker;

        rocket.userData.glow.material.opacity = 0.6 + Math.random() * 0.3;

        if (progress >= 1) {
          rocketActive = false;
          rocket.visible = false;
          rocketNext = time + random(10, 17);
        }
      }
    }

    renderer.render(scene, camera);
  }

  animate();

  /* Public API */

  return {
    setScroll(progress) {
      state.targetScroll = progress;
    },

    setPointer(x, y) {
      state.targetX = x;
      state.targetY = y;
    },

    destroy() {
      if (destroyed) return;

      destroyed = true;

      cancelAnimationFrame(animationFrame);

      resizeObserver.disconnect();
      observer.disconnect();

      window.removeEventListener('resize', resize);

      // Dispose all geometries, materials and textures
      const textures = new Set();
      const materials = new Set();
      const geometries = new Set();

      scene.traverse((object) => {
        if (object.geometry) {
          geometries.add(object.geometry);
        }

        if (object.material) {
          const list = Array.isArray(object.material)
            ? object.material
            : [object.material];

          list.forEach((material) => {
            materials.add(material);

            Object.values(material).forEach((value) => {
              if (value?.isTexture) {
                textures.add(value);
              }
            });
          });
        }
      });

      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());

      kit.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
