
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
  glassMaterial,
} from './spaceMaterials';

/* =====================================================
   CINEMATIC GALAXY — SHOWREEL BACKGROUND

   Full-screen spiral galaxy
   Nebula clouds
   Layered starfield
   Real-surface planets + rocket flanking the video
   Mouse interaction
   Scroll: camera pulls back (zoom out) as the video zooms in
   Performance optimized
===================================================== */

// Rocket built from the shared PBR hull set: lathe-turned body,
// gold band, glass porthole, swept fins, dark nozzle and a two-layer
// additive flame.
function createRocket(kit, sunDir) {
  const group = new THREE.Group();

  const white = hullMaterial(kit, { color: 0xeef1ec, metalness: 0.35, repeat: [1.5, 1], sunDir });
  const orange = hullMaterial(kit, { color: 0xd9772b, metalness: 0.3, repeat: [0.5, 0.5], sunDir });
  const gold = hullMaterial(kit, { color: 0xe0b060, metalness: 1, roughness: 0.7, repeat: [0.5, 0.5], sunDir });
  const steel = hullMaterial(kit, { color: 0x3c4046, metalness: 1, roughness: 0.6, repeat: [0.5, 0.5], sunDir });

  const profile = [
    [0.0, -0.45], [0.15, -0.45], [0.16, -0.2], [0.16, 0.25],
    [0.145, 0.42], [0.11, 0.57], [0.06, 0.69], [0.0, 0.76],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  group.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 48), white));

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 48), gold);
  band.position.y = 0.3;
  group.add(band);

  // Brand livery: dark band around the mid-body carrying the gold
  // Contenaissance logo, wrapped on the curved hull facing camera.
  const livery = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1615, 0.1615, 0.22, 48, 1, true),
    hullMaterial(kit, { color: 0x14161b, metalness: 0.5, roughness: 0.7, repeat: [1.5, 0.5], sunDir })
  );
  livery.position.y = -0.07;
  group.add(livery);

  const LOGO_ASPECT = 274 / 133; // public/images/logo.png
  const LOGO_ARC = 2.0; // radians of hull the logo wraps across
  const LOGO_R = 0.1635;
  const logo = new THREE.Mesh(
    new THREE.CylinderGeometry(LOGO_R, LOGO_R, (LOGO_ARC * LOGO_R) / LOGO_ASPECT, 48, 1, true, -LOGO_ARC / 2, LOGO_ARC),
    new THREE.MeshStandardMaterial({
      map: kit.publicImage('/images/logo.png'),
      transparent: true,
      alphaTest: 0.08,
      metalness: 0.85,
      roughness: 0.35,
      envMap: kit.environment(sunDir),
      envMapIntensity: 1.4,
    })
  );
  logo.position.y = -0.07;
  group.add(logo);

  const porthole = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), glassMaterial(kit, { sunDir }));
  porthole.position.set(0, 0.12, 0.145);
  porthole.scale.z = 0.5;
  group.add(porthole);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.16, 32, 1, true), steel);
  nozzle.position.y = -0.53;
  group.add(nozzle);

  const finShape = new THREE.Shape()
    .moveTo(0, 0)
    .lineTo(0.17, -0.12)
    .lineTo(0.17, -0.26)
    .lineTo(0, -0.14)
    .closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.02, bevelEnabled: false });
  finGeo.translate(0, 0, -0.01);

  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    const fin = new THREE.Mesh(finGeo, orange);
    fin.position.set(0.15, -0.16, 0);
    pivot.add(fin);
    pivot.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;
    group.add(pivot);
  }

  const flameOuter = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('#ff9a3c'),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  flameOuter.scale.set(0.34, 0.95, 1);
  flameOuter.position.y = -0.95;
  group.add(flameOuter);

  const flameCore = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('#fff3c4'),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  flameCore.scale.set(0.16, 0.5, 1);
  flameCore.position.y = -0.75;
  group.add(flameCore);

  group.userData.flames = [flameOuter, flameCore];

  return group;
}

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


  // Side groups framing the video. They drift outward as the camera
  // pulls back, so the edges stay populated while the video grows.
  const flankLeft = new THREE.Group();
  const flankRight = new THREE.Group();
  universe.add(flankLeft, flankRight);


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

  flankLeft.add(planet1);


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

  flankRight.add(saturnGroup);


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

  flankRight.add(planet3);


  // Left: rust-red rocky world low in the frame
  const marsPlanet = makeRealPlanet(kit, {
    radius: 1.8,
    surface: 'mars',
    tint: 0xe9d2bd,
    sunDir,
    atmosphere: { color: '#f0a868', intensity: 0.9, thickness: 0.05, power: 3.6 },
    glowColor: '#e0a65e',
    glowScale: 2.8,
    glowOpacity: 0.24,
  });

  marsPlanet.position.set(-20, -8, -12);
  flankLeft.add(marsPlanet);


  // Left: rocket climbing up and to the right
  const ROCKET_TILT = -0.5;
  const rocket = createRocket(kit, sunDir);

  // Flight loop: centre, radii (world units) and angular speed
  const ROCKET_X = -16.5;
  const ROCKET_Y = -0.6;
  const ROCKET_RX = 2.6;
  const ROCKET_RY = 3.0;
  const ROCKET_SPEED = 0.42;

  rocket.position.set(ROCKET_X + ROCKET_RX, ROCKET_Y, -3);
  rocket.rotation.z = ROCKET_TILT;
  rocket.scale.setScalar(2.8);
  rocket.userData.flames.forEach((f) => (f.material.rotation = ROCKET_TILT));

  flankLeft.add(rocket);


  // Right: airless cratered moon
  const sideMoon = makeRealPlanet(kit, {
    radius: 0.95,
    surface: 'moon',
    tint: 0xe2dfe6,
    sunDir,
    segments: mobile ? 32 : 64,
    atmosphere: { intensity: 0.15, color: '#d9d4e6' },
    glowOpacity: 0,
  });

  sideMoon.position.set(19, -7, -5);
  flankRight.add(sideMoon);


  // Sparse asteroids around the edges
  const asteroids = makeAsteroidBelt(kit, {
    count: mobile ? 8 : 18,
    radiusRange: [15, 23],
    y: -2,
    ySpread: 7,
    z: -8,
    zSpread: 4,
    scaleRange: [0.08, 0.24],
  });

  universe.add(asteroids);


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


  // Scroll zoom tuning (world units at full video reveal)
  const ZOOM_OUT = 10;
  const FLANK_SPREAD = 4;

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

    // Zoom out as the video zooms in: the camera pulls back so stars
    // and planets shrink, while the side groups spread toward the
    // edges to keep framing the growing video.
    const zoom = state.parallax * state.parallax * (3 - 2 * state.parallax);

    camera.position.z =
      20 - state.hover * 0.45 + zoom * ZOOM_OUT;

    flankLeft.position.x = -zoom * FLANK_SPREAD;
    flankRight.position.x = zoom * FLANK_SPREAD;

    camera.lookAt(0, -1.5, -7);


    if (!reducedMotion) {

      // Galaxy movement
      galaxy.rotation.z = 0.12 + t * 0.012;
      galaxy.rotation.y = Math.sin(t * 0.12) * 0.045;

      // Nebula drift
      nebulaGroup.rotation.z = Math.sin(t * 0.08) * 0.025;

      nebulaGroup.position.x = Math.sin(t * 0.1) * 0.25;

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

      marsPlanet.rotation.y = t * 0.04;
      sideMoon.rotation.y = -t * 0.03;

      // Rocket: flies a slow elliptical loop through the empty left
      // area (clear of the video frame), nose following its velocity,
      // banking into the turns, with a flickering engine.
      const a = t * ROCKET_SPEED;
      rocket.position.set(
        ROCKET_X + Math.cos(a) * ROCKET_RX,
        ROCKET_Y + Math.sin(a) * ROCKET_RY,
        -3 + Math.sin(a * 2) * 0.8
      );

      const vx = -Math.sin(a) * ROCKET_RX;
      const vy = Math.cos(a) * ROCKET_RY;
      rocket.rotation.z = Math.atan2(vy, vx) - Math.PI / 2;
      rocket.rotation.y = Math.cos(a) * 0.5;
      const [flameOuter, flameCore] = rocket.userData.flames;
      flameOuter.material.rotation = flameCore.material.rotation = rocket.rotation.z;
      flameOuter.scale.y = 0.95 + Math.sin(t * 11) * 0.1;
      flameOuter.material.opacity = 0.75 + Math.sin(t * 17) * 0.12;
      flameCore.scale.y = 0.5 + Math.sin(t * 13 + 1) * 0.06;

      updateAsteroidBelt(asteroids, t);

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
