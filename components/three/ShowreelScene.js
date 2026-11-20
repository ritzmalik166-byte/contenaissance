
import * as THREE from 'three';
import {
  glowTexture,
  makeStars,
} from './spaceCommon';
import {
  createTextureKit,
  makeRealPlanet,
  makePlanetRing,
} from './spaceMaterials';

/* =====================================================
   CINEMATIC GALAXY — SHOWREEL BACKGROUND

   Full-screen spiral galaxy
   Nebula clouds
   Layered starfield
   Glowing planets
   Orbital rings
   Mouse interaction
   Scroll parallax
   Performance optimized
===================================================== */

function createGalaxy(count = 16000) {
  const group = new THREE.Group();

  const positions = [];
  const colors = [];
  const sizes = [];

  const palette = [
    new THREE.Color('#fff0c2'),
    new THREE.Color('#ffc16b'),
    new THREE.Color('#b58cff'),
    new THREE.Color('#668dff'),
    new THREE.Color('#e8c7ff'),
    new THREE.Color('#ffffff'),
  ];

  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const arm = Math.floor(Math.random() * 5);

    const radius = Math.pow(Math.random(), 0.65) * 15;

    const angle =
      (arm / 5) * Math.PI * 2 +
      radius * 0.48 +
      (Math.random() - 0.5) * 0.75;

    const spread = 0.12 + radius * 0.045;

    const x =
      Math.cos(angle) * radius +
      (Math.random() - 0.5) * spread * 2;

    const y =
      Math.sin(angle) * radius * 0.48 +
      (Math.random() - 0.5) * spread;

    const z = (Math.random() - 0.5) * (0.5 + radius * 0.08);

    positions.push(x, y, z);

    const paletteIndex =
      radius < 3
        ? Math.floor(Math.random() * 2)
        : Math.floor(Math.random() * palette.length);

    color.copy(palette[paletteIndex]);

    const brightness = 0.55 + Math.random() * 0.8;

    colors.push(
      color.r * brightness,
      color.g * brightness,
      color.b * brightness
    );

    sizes.push(Math.random());
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  );

  const material = new THREE.PointsMaterial({
    size: 0.075,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  group.add(new THREE.Points(geometry, material));

  // Bright central galactic core
  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('#ffcf83'),
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  core.scale.set(9, 5, 1);
  group.add(core);

  // Inner golden light
  const innerCore = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('#fff0c9'),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  innerCore.scale.set(3.5, 2.2, 1);
  group.add(innerCore);

  return group;
}


// Nebula clouds
function createNebula(color, size, opacity) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(color),
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  sprite.scale.set(size, size * 0.65, 1);

  return sprite;
}


// Orbital paths
function createOrbit(radius, opacity, color = 0xd6b87a) {
  const points = [];

  for (let i = 0; i <= 180; i++) {
    const angle = (i / 180) * Math.PI * 2;

    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.43,
        0
      )
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new THREE.LineLoop(geometry, material);
}


// Small glowing stars
function createStarField(count = 450) {
  const positions = [];
  const colors = [];

  const palette = [
    '#ffffff',
    '#b7d5ff',
    '#ffd69a',
    '#c8a6ff',
  ];

  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    positions.push(
      (Math.random() - 0.5) * 48,
      (Math.random() - 0.5) * 28,
      -Math.random() * 22
    );

    c.set(
      palette[Math.floor(Math.random() * palette.length)]
    );

    colors.push(c.r, c.g, c.b);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  );

  const material = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}


export function createShowreelScene(container) {
  if (!container) return null;

  let mobile = window.innerWidth < 760;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !mobile,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? 1.3 : 1.75)
  );

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  renderer.setClearColor(0x000000, 0);

  container.appendChild(renderer.domElement);

  const kit = createTextureKit(renderer, { mobile });
  kit.loadWhenNear(container);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    48,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );

  camera.position.set(0, 0, 20);

  // Lighting
  scene.add(new THREE.AmbientLight(0x7888aa, 0.65));

  const goldenLight = new THREE.PointLight(
    0xffbd68,
    8,
    40
  );

  goldenLight.position.set(0, -5, 5);
  scene.add(goldenLight);

  const blueLight = new THREE.PointLight(
    0x567fff,
    5,
    35
  );

  blueLight.position.set(-9, 4, 0);
  scene.add(blueLight);

  const purpleLight = new THREE.PointLight(
    0xa16bff,
    4,
    30
  );

  purpleLight.position.set(10, 5, -5);
  scene.add(purpleLight);

  // Distant "sun" so the textured planets get a real terminator.
  // Only lit meshes (the planets) respond — the galaxy is unlit.
  const sunLight = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sunLight.position.set(6, 3, 8);
  scene.add(sunLight);

  const sunDir = sunLight.position.clone().normalize();


  // Main universe
  const universe = new THREE.Group();
  scene.add(universe);


  // Background star layers
  const farStars = makeStars(
    mobile ? 350 : 900,
    {
      x: 50,
      y: 30,
      z: 35,
      near: 5,
    }
  );

  universe.add(farStars);

  const foregroundStars = createStarField(
    mobile ? 180 : 450
  );

  universe.add(foregroundStars);


  // Main galaxy
  const galaxy = createGalaxy(
    mobile ? 6500 : 16000
  );

  galaxy.position.set(0, -6, -12);

  galaxy.rotation.x = 0.16;
  galaxy.rotation.z = 0.12;

  universe.add(galaxy);


  // Nebula clouds
  const nebulaGroup = new THREE.Group();

  const nebula1 = createNebula(
    '#394fba',
    15,
    0.25
  );

  nebula1.position.set(-12, 1, -10);

  const nebula2 = createNebula(
    '#8743bd',
    18,
    0.22
  );

  nebula2.position.set(11, -1, -11);

  const nebula3 = createNebula(
    '#ff9d4d',
    12,
    0.17
  );

  nebula3.position.set(0, -10, -10);

  const nebula4 = createNebula(
    '#315eaa',
    13,
    0.2
  );

  nebula4.position.set(-7, 8, -13);

  nebulaGroup.add(
    nebula1,
    nebula2,
    nebula3,
    nebula4
  );

  universe.add(nebulaGroup);


  // Galaxy orbit rings
  const orbitGroup = new THREE.Group();

  orbitGroup.position.set(0, -5, -8);

  const orbit1 = createOrbit(12, 0.17);
  const orbit2 = createOrbit(15, 0.12);
  const orbit3 = createOrbit(18, 0.07, 0x7789ba);

  orbitGroup.add(orbit1, orbit2, orbit3);

  universe.add(orbitGroup);


  // Main blue planet
  // Ice giant — real Neptune cloud bands
  const planet1 = makeRealPlanet(kit, {
    radius: 2.4,
    surface: 'neptune',
    tint: 0xbfd0ec,
    sunDir,
    atmosphere: { color: '#719dff', intensity: 1.2, thickness: 0.07, power: 2.8 },
    glowColor: '#719dff',
    glowScale: 2.7,
    glowOpacity: 0.28,
  });

  planet1.position.set(-10, 8, -7);

  universe.add(planet1);


  // Saturn-like planet
  const saturnGroup = new THREE.Group();

  // Gas giant — real Saturn bands
  const planet2 = makeRealPlanet(kit, {
    radius: 0.95,
    surface: 'saturn',
    sunDir,
    atmosphere: { color: '#ffc879', intensity: 0.8, thickness: 0.06, power: 3.2 },
    glowColor: '#ffc879',
    glowScale: 2.6,
    glowOpacity: 0.28,
  });

  saturnGroup.add(planet2);

  // Real ring system. Tilted (rather than squashed) to the same
  // on-screen ellipse as the old 0.55-scaled orbit line, so it now
  // passes correctly in front of and behind the planet.
  const saturnRing = makePlanetRing(kit, {
    inner: 1.25,
    outer: 2.05,
    tint: 0xf0dcb8,
    opacity: 0.9,
  });

  saturnRing.rotation.x = Math.acos(0.55) + 0.35;

  saturnGroup.add(saturnRing);

  saturnGroup.position.set(11, 3, -8);

  universe.add(saturnGroup);


  // Small distant planet
  // Small cratered rocky world, cool-tinted to keep the palette
  const planet3 = makeRealPlanet(kit, {
    radius: 0.65,
    surface: 'mercury',
    tint: 0xb9cdee,
    sunDir,
    atmosphere: { color: '#79aaff', intensity: 0.7, thickness: 0.05, power: 3.6 },
    glowColor: '#79aaff',
    glowScale: 2.5,
    glowOpacity: 0.26,
  });

  planet3.position.set(12, -1, -6);

  universe.add(planet3);


  // State
  const state = {
    px: 0,
    py: 0,

    tx: 0,
    ty: 0,

    parallax: 0,
    targetParallax: 0,

    pulse: 0,

    hover: 0,
    targetHover: 0,

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
        mobile ? 1.3 : 1.75
      )
    );

    renderer.setSize(w, h, false);
  };


  const resizeObserver = new ResizeObserver(onResize);

  resizeObserver.observe(container);

  window.addEventListener('resize', onResize);

  onResize();


  // Visibility optimization
  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
  });

  io.observe(container);


  // Animation
  const render = () => {
    if (destroyed) return;

    raf = requestAnimationFrame(render);

    if (!state.visible) return;

    const t = (performance.now() - start) / 1000;

    if (!reducedMotion) {
      state.px += (state.tx - state.px) * 0.035;
      state.py += (state.ty - state.py) * 0.035;

      state.parallax +=
        (state.targetParallax - state.parallax) * 0.08;

      state.hover +=
        (state.targetHover - state.hover) * 0.06;
    } else {
      state.parallax = state.targetParallax;
    }


    // Mouse movement
    universe.position.x = state.px * 0.65;
    universe.position.y =
      -state.parallax * 2 + state.py * 0.4;

    camera.position.x = state.px * 0.25;
    camera.position.y = state.py * 0.2;

    camera.position.z =
      20 - state.hover * 0.45 + state.parallax * 0.8;

    camera.lookAt(0, -1.5, -7);


    if (!reducedMotion) {

      // Galaxy movement
      galaxy.rotation.z = 0.12 + t * 0.012;
      galaxy.rotation.y = Math.sin(t * 0.12) * 0.045;

      // Nebula drift
      nebulaGroup.rotation.z = Math.sin(t * 0.08) * 0.025;

      nebulaGroup.position.x = Math.sin(t * 0.1) * 0.25;

      // Orbit animation
      orbitGroup.rotation.z = t * 0.008;

      // Planet movement
      planet1.rotation.y = t * 0.035;

      planet1.position.x =
        -10 + Math.sin(t * 0.25) * 0.45;

      planet1.position.y =
        8 + Math.cos(t * 0.2) * 0.3;

      planet2.rotation.y = t * 0.06;

      saturnGroup.position.y =
        3 + Math.sin(t * 0.3) * 0.45;

      saturnGroup.rotation.z =
        Math.sin(t * 0.18) * 0.08;

      planet3.rotation.y = -t * 0.05;

      farStars.rotation.y = t * 0.002;

      foregroundStars.rotation.z = t * 0.0015;
    }


    // Hover lighting response
    goldenLight.intensity =
      8 + state.hover * 5 + state.pulse * 6;

    blueLight.intensity =
      5 + state.hover * 2;

    // Pulse effect
    state.pulse *= 0.94;

    renderer.render(scene, camera);
  };


  render();


  return {
    state,

    resize: onResize,

    setPointer(x, y) {
      state.tx = x;
      state.ty = y;
    },

    setParallax(p) {
      state.targetParallax = p;
    },

    // Call when user hovers over video/buttons
    pulse() {
      state.pulse = 1;
      state.targetHover = 1;

      window.clearTimeout(this.hoverTimeout);

      this.hoverTimeout = window.setTimeout(() => {
        state.targetHover = 0;
      }, 900);
    },

    destroy() {
      destroyed = true;

      cancelAnimationFrame(raf);

      window.clearTimeout(this.hoverTimeout);

      resizeObserver.disconnect();
      io.disconnect();

      window.removeEventListener('resize', onResize);

      scene.traverse((object) => {
        object.geometry?.dispose();

        if (object.material) {
          [].concat(object.material).forEach((material) => {
            material.map?.dispose();
            material.dispose();
          });
        }
      });

      kit.dispose();

      renderer.dispose();

      renderer.domElement.remove();
    },
  };
}
