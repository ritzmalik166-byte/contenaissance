import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createTextureKit, makeRealPlanet, makePlanetRing, makeAtmosphere } from './spaceMaterials';
import { makeStars, glowTexture } from './spaceCommon';

class Lemniscate extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2;
    const d = 1 + Math.sin(a) ** 2;

    const x = (Math.cos(a) / d) * 2.2;
    const y = ((Math.sin(a) * Math.cos(a)) / d) * 2.2;
    const z = Math.sin(a) * 0.32;

    return target.set(x, y, z).multiplyScalar(this.scale);
  }
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;

  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);

  grd.addColorStop(0, 'rgba(255,240,200,1)');
  grd.addColorStop(0.25, 'rgba(255,190,90,0.85)');
  grd.addColorStop(1, 'rgba(255,150,40,0)');

  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  return tex;
}

/**
 * Gold constellation hero.
 * progress (0..1) is driven by scroll.
 * Pointer is driven by mouse movement.
 */
// Soft-edged nebula: a real Milky Way photo, converted to luminance,
// tinted, and faded to nothing toward its edges so no rectangle shows.
function makeNebulaPlane(map, tint, width, height, opacity) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.ShaderMaterial({
      uniforms: {
        map: { value: map },
        tint: { value: new THREE.Color(tint) },
        opacity: { value: opacity },
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
        uniform vec3 tint;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(map, vUv).rgb;
          float lum = dot(c, vec3(0.3, 0.59, 0.11));
          vec2 d = (vUv - 0.5) * vec2(1.0, 1.6);
          float fall = smoothstep(0.5, 0.08, length(d));
          gl_FragColor = vec4(tint * lum * fall * opacity * 2.2, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
}

// Distant two-armed spiral galaxy (points + glowing core).
function makeSpiralGalaxy(count) {
  const group = new THREE.Group();
  const pos = [];
  const col = [];
  const c = new THREE.Color();
  const palette = [0xbcd4ff, 0x6f9bff, 0xffffff, 0xd2c4ff];

  for (let i = 0; i < count; i++) {
    const arm = i % 2;
    const r = Math.pow(Math.random(), 1.35) * 3;
    const a = arm * Math.PI + r * 1.9 + (Math.random() - 0.5) * 0.6;
    const spread = 0.18 + r * 0.16;

    pos.push(
      Math.cos(a) * r + (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * 0.14 * (1 - r / 3.2),
      Math.sin(a) * r + (Math.random() - 0.5) * spread
    );

    c.set(r < 0.6 ? 0xfff0d6 : palette[Math.floor(Math.random() * palette.length)]);
    c.multiplyScalar(0.55 + Math.random() * 0.6);
    col.push(c.r, c.g, c.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

  group.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        map: glowTexture('#ffffff'),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    )
  );

  const sprite = (hex, scale, opacity) => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(hex),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    sp.scale.setScalar(scale);
    group.add(sp);
  };

  sprite('#4f7dff', 7.5, 0.32);
  sprite('#e4ecff', 1.8, 0.95);

  return group;
}

export function createHeroScene(container) {
  if (!container) return null;

  // Responsive values
  let mobile = window.innerWidth < 760;
  let smallMobile = window.innerWidth < 400;

  const getInfinityScale = () => {
    if (smallMobile) return 0.42;
    if (mobile) return 0.52;
    return 1.15;
  };

  let baseInfinityScale = getInfinityScale();

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: false,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75)
  );

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x070504, 1);

  container.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070504, 0.055);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );

  camera.position.set(0, 0, 9);

  // Environment
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(
    new RoomEnvironment(),
    0.04
  );

  scene.environment = environment.texture;

  // Lights
  const key = new THREE.DirectionalLight(0xffc47a, 3.2);
  key.position.set(-6, 6, 5);
  scene.add(key);

  const rim = new THREE.PointLight(0xff8a2a, 40, 30);
  rim.position.set(5, -3, 3);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0x2a1a0a, 1.2));

  // Particle field
  const COUNT = mobile ? 1400 : 2600;

  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = -Math.random() * 40 + 8;

    seeds[i] = Math.random();
  }

  const pGeo = new THREE.BufferGeometry();

  pGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  const pMat = new THREE.PointsMaterial({
    size: 0.09,
    map: dotTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffc37a,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // Starfield — two depth layers of real-looking stars. They span
  // in front of the camera too, so the scroll fly-through passes
  // between them. Fog is off so distant stars stay visible.
  const farStars = makeStars(mobile ? 1100 : 2600, { x: 34, y: 20, z: 48, near: 4 });
  farStars.material.size = 0.045;
  farStars.material.fog = false;
  scene.add(farStars);

  const nearStars = makeStars(mobile ? 220 : 520, { x: 22, y: 13, z: 14, near: -8 });
  nearStars.material.size = 0.075;
  nearStars.material.fog = false;
  scene.add(nearStars);

  // Interactive sparkle stars — brighter, larger stars in three depth
  // layers. Each layer reacts by depth: near layers shift more with
  // the cursor and rush toward the camera faster on scroll.
  const SPARKLE_LAYERS = [
    { count: mobile ? 60 : 140, size: 0.11, depth: [10, 22], spread: [30, 17], par: 0.35, rush: 3 },
    { count: mobile ? 30 : 70, size: 0.17, depth: [5, 12], spread: [19, 11], par: 0.8, rush: 5 },
    { count: mobile ? 12 : 28, size: 0.26, depth: [1, 6], spread: [12, 7], par: 1.4, rush: 7 },
  ];

  const sparkles = SPARKLE_LAYERS.map((cfg, i) => {
    const layer = makeStars(cfg.count, { x: cfg.spread[0], y: cfg.spread[1], z: cfg.depth[1], near: cfg.depth[0] });
    layer.material.size = cfg.size;
    layer.material.fog = false;
    layer.material.color.set(i === 2 ? 0xfff1d0 : 0xffffff);
    scene.add(layer);
    return { layer, cfg };
  });

  // Gold infinity
  const infinityGroup = new THREE.Group();

  const tube = new THREE.TubeGeometry(
    new Lemniscate(1),
    360,
    0.26,
    48,
    true
  );

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xd9a441,
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    emissive: 0x2a1500,
    envMapIntensity: 1.4,
  });

  const infinity = new THREE.Mesh(tube, gold);
  infinityGroup.add(infinity);

  infinityGroup.position.set(0, 0.35, -1.5);
  infinityGroup.scale.setScalar(baseInfinityScale);

  scene.add(infinityGroup);

  // Side planets — real surfaces, kept in the left/right margins so
  // they frame the headline without covering it.
  const kit = createTextureKit(renderer, { mobile });
  kit.loadWhenNear(container);

  const sunDir = key.position.clone().normalize();

  // side: -1 left / 1 right · edge: fraction of the visible half-width
  // at that depth · par: pointer parallax strength · spin: rad/s
  const PLANET_DEFS = [
    {
      side: -1, edge: 0.7, y: 1.6, z: -6, par: 0.6, spin: 0.05,
      opts: { radius: 0.8, surface: 'mars', tint: 0xc8a68a, atmosphere: { color: '#f0a868', intensity: 0.8 }, glowColor: '#e0a65e', glowOpacity: 0.14 },
    },
    {
      side: -1, edge: 0.74, y: -2.1, z: -3, par: 1.0, spin: -0.08,
      opts: { radius: 0.24, surface: 'mercury', tint: 0xb0aaa4, atmosphere: { color: '#d8d0c8', intensity: 0.3 }, glowOpacity: 0 },
    },
    {
      side: 1, edge: 0.76, y: -0.3, z: -6, par: 0.5, spin: 0.06, ring: true,
      opts: { radius: 0.52, surface: 'saturn', tint: 0xf2e2c4, atmosphere: { color: '#ffc879', intensity: 0.7 }, glowColor: '#ffc879', glowOpacity: 0.12 },
    },
  ];

  const sidePlanets = PLANET_DEFS.map((def) => {
    const planet = makeRealPlanet(kit, {
      sunDir,
      segments: mobile ? 40 : 72,
      glowScale: 2.6,
      ...def.opts,
    });

    // scene.environment (studio room) ignores material.envMapIntensity,
    // so give planets the dark space environment explicitly to keep
    // their night sides dark. Hero fog stays on for the warm haze.
    const bodyMat = planet.userData.body.material;
    bodyMat.envMap = kit.environment(sunDir);
    bodyMat.envMapIntensity = 1.2;
    bodyMat.emissive.set(0x1a120a);
    bodyMat.emissiveIntensity = 1;

    if (def.ring) {
      const ring = makePlanetRing(kit, {
        inner: def.opts.radius * 1.3,
        outer: def.opts.radius * 2.45,
        tint: 0xf0dcb8,
        opacity: 0.9,
      });
      ring.material.envMap = kit.environment(sunDir);
      ring.material.envMapIntensity = 1.4;
      ring.material.emissive.set(0x2a2016);
      ring.rotation.x = Math.PI / 2 - 0.55;

      const ringTilt = new THREE.Group();
      ringTilt.rotation.z = 0.38;
      ringTilt.add(ring);
      planet.add(ringTilt);
    }

    scene.add(planet);

    return { def, planet, baseX: 0, scale: 1 };
  });

  // Earth on the horizon — night side with real city lights, a golden
  // sunrise blazing on the limb and a thin blue upper atmosphere.
  // Solved so the horizon sits ~78% down the frame as a wide arc
  const EARTH_R = 70;
  const HORIZON_Y = -83.84;
  const HORIZON_Z = -35;
  const horizon = new THREE.Group();
  horizon.position.set(0, HORIZON_Y, HORIZON_Z);
  scene.add(horizon);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, mobile ? 128 : 220, mobile ? 64 : 110),
    new THREE.MeshStandardMaterial({
      color: 0x04070d,
      roughness: 1,
      metalness: 0,
      emissive: 0xffc685,
      emissiveIntensity: 3,
      emissiveMap: kit.planet('earth_night', mobile ? '1k' : '2k'),
      envMap: kit.environment(sunDir),
      envMapIntensity: 0.2,
      fog: false,
    })
  );
  // Tilt so mid-latitude city lights (not the pole) face the camera
  earth.rotation.x = -1.13;
  horizon.add(earth);

  // Sun rising behind the planet → scattering brightest on the far limb
  const goldAtmo = makeAtmosphere(EARTH_R, {
      color: '#ffb257',
      sunDir: new THREE.Vector3(0, 0.55, -0.83).normalize(),
      intensity: 2.2,
      thickness: 0.012,
      power: 3.2,
      nightGlow: 0.08,
      segments: 128,
    });
  horizon.add(goldAtmo);
  const blueAtmo = makeAtmosphere(EARTH_R * 1.002, {
      color: '#5f8cff',
      sunDir: new THREE.Vector3(0, 1, 0.2).normalize(),
      intensity: 0.6,
      thickness: 0.01,
      power: 3,
      nightGlow: 0.3,
      segments: 128,
    });
  horizon.add(blueAtmo);

  // The cap is seen almost edge-on, so the front-face fresnel would
  // wash it grey: keep it faint and let the limb halo carry the glow.
  goldAtmo.userData.materials[0].uniforms.intensity.value = 0.18;
  blueAtmo.userData.materials[0].uniforms.intensity.value = 0.08;

  // Sunrise flare sitting just behind the silhouette (depth-tested so
  // the planet occludes its lower half)
  const flare = (hex, sx, sy, opacity) => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(hex),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    sp.scale.set(sx, sy, 1);
    sp.position.set(0, EARTH_R * 0.962, -EARTH_R * 0.27);
    horizon.add(sp);
    return sp;
  };

  const flareWide = flare('#ffb050', 80, 6, 0.75);
  const flareCore = flare('#fff1d2', 26, 4.2, 1);

  // Nebulae (real Milky Way photo, tinted) and a distant spiral galaxy
  const milkyWay = kit.color(`backgrounds/milkyway_${mobile ? '1k' : '1536'}.webp`);

  const nebulaGold = makeNebulaPlane(milkyWay, 0xffa83c, 26, 14, 0.65);
  nebulaGold.rotation.z = -1.15;
  scene.add(nebulaGold);

  const nebulaBlue = makeNebulaPlane(milkyWay, 0x3f78ff, 24, 13, 0.6);
  nebulaBlue.rotation.z = 1.05;
  scene.add(nebulaBlue);

  const galaxy = makeSpiralGalaxy(mobile ? 1400 : 3200);
  galaxy.rotation.set(1.12, 0, 0.45);
  scene.add(galaxy);

  // Backdrop items placed from the viewport like the planets
  const BACKDROP = [
    { node: nebulaGold, side: -1, edge: 0.92, y: 4.2, z: -14, par: 0.25 },
    { node: nebulaBlue, side: 1, edge: 0.92, y: -4.6, z: -14, par: 0.25 },
    { node: galaxy, side: 1, edge: 0.66, y: 6.8, z: -16, par: 0.2 },
  ].map((d) => ({ ...d, baseX: 0 }));

  // Place planets from the current viewport so they stay in the side
  // margins at any aspect ratio (peeking from the edges on mobile).
  const layoutPlanets = () => {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    for (const item of sidePlanets) {
      const { side, edge, z } = item.def;
      const halfW = (9 - z) * tanHalf * camera.aspect;

      item.baseX = side * halfW * (mobile ? 0.98 : edge);
      item.scale = mobile ? 0.55 : 1;
    }

    for (const item of BACKDROP) {
      const halfW = (9 - item.z) * tanHalf * camera.aspect;
      item.baseX = item.side * halfW * (mobile ? 0.9 : item.edge);
    }
  };

  // Animation state
  const state = {
    progress: 0,
    intro: 0,
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    visible: true,
  };

  const start = performance.now();

  let raf = 0;
  let destroyed = false;

  // Responsive resize
  const onResize = () => {
    if (destroyed) return;

    const rect = container.getBoundingClientRect();

    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (!w || !h) return;

    // Update responsive breakpoints
    mobile = window.innerWidth < 760;
    smallMobile = window.innerWidth < 400;

    baseInfinityScale = getInfinityScale();

    // Update camera
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        mobile ? 1.5 : 1.75
      )
    );

    renderer.setSize(w, h, false);

    layoutPlanets();

    // Keep the infinity on the headline: centred on desktop, lifted on
    // phones where the copy stacks in the top half (rocket below it).
    const infDist = 9 - infinityGroup.position.z; // camera's resting z (it flies in on scroll)
    const halfH = infDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    infinityGroup.position.y = mobile ? halfH * 0.48 : 0.35;

    // Recalculate infinity scale
    const scrollScale = mobile
      ? 1 + state.progress * 0.15
      : 1 + state.progress * 0.6;

    infinityGroup.scale.setScalar(
      baseInfinityScale *
      (0.6 + state.intro * 0.4) *
      scrollScale
    );
  };

  // Observe container size changes
  const resizeObserver = new ResizeObserver(() => {
    onResize();
  });

  resizeObserver.observe(container);

  // Observe browser and device viewport changes
  window.addEventListener('resize', onResize);

  window.visualViewport?.addEventListener(
    'resize',
    onResize
  );

  // Initial resize
  onResize();

  // Intersection observer
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

    state.px += (state.tx - state.px) * 0.05;
    state.py += (state.ty - state.py) * 0.05;

    camera.position.z = 9 - p * 14;
    camera.position.x = state.px * 0.6;
    camera.position.y = state.py * 0.4 - p * 0.8;

    camera.lookAt(
      state.px * 0.2,
      state.py * 0.1,
      camera.position.z - 10
    );

    const intro = state.intro;

    infinity.rotation.y =
      t * 0.25 +
      state.px * 0.5 +
      p * Math.PI * 1.2;

    infinity.rotation.x =
      Math.sin(t * 0.4) * 0.15 +
      state.py * 0.3 +
      p * 0.8;

    const scrollScale = mobile
      ? 1 + p * 0.15
      : 1 + p * 0.6;

    infinityGroup.scale.setScalar(
      baseInfinityScale *
      (0.6 + intro * 0.4) *
      scrollScale
    );

    points.rotation.z = t * 0.01;

    // Gentle star twinkle and drift
    farStars.material.opacity = 0.75 + Math.sin(t * 0.9) * 0.12;
    nearStars.material.opacity = 0.8 + Math.sin(t * 1.7 + 1.3) * 0.18;
    farStars.rotation.z = t * 0.004;
    nearStars.position.x = state.px * -0.25;

    // Sparkle stars: cursor parallax by depth; on scroll they rush
    // toward the camera, rise and swirl
    for (let i = 0; i < sparkles.length; i++) {
      const { layer, cfg } = sparkles[i];

      layer.position.set(
        -state.px * cfg.par,
        -state.py * cfg.par * 0.6 + p * cfg.par * 1.5,
        p * cfg.rush
      );

      layer.rotation.z = t * 0.006 * (i + 1) + p * 0.25 * (i + 1);

      layer.material.opacity =
        (0.55 + intro * 0.45) * (0.82 + Math.sin(t * (1.1 + i * 0.7) + i * 2.1) * 0.18);
    }

    pMat.opacity = 0.35 + intro * 0.65;

    // Side planets
    //  scroll: drift outward + rise, spin faster (camera also flies
    //          forward, so the near ones sweep past)
    //  pointer: depth-weighted parallax and a tilt toward the cursor
    for (let i = 0; i < sidePlanets.length; i++) {
      const { def, planet, baseX, scale } = sidePlanets[i];

      planet.position.set(
        baseX + def.side * p * 3.5 - state.px * def.par,
        def.y + p * (1.5 + def.par) - state.py * def.par * 0.6 +
          Math.sin(t * 0.35 + i * 1.7) * 0.12,
        def.z
      );

      planet.scale.setScalar(scale * (0.75 + intro * 0.25));

      const body = planet.userData.body;
      body.rotation.y = t * def.spin + p * def.side * 2.2 + state.px * 0.6;
      body.rotation.x = state.py * -0.35;
    }

    // Backdrop: gentle cursor parallax, scroll sink/drift
    for (const item of BACKDROP) {
      item.node.position.set(
        item.baseX - state.px * item.par,
        item.y - state.py * item.par * 0.6 + p * 1.2,
        item.z
      );
    }

    galaxy.rotation.y = t * 0.03;
    nebulaGold.material.uniforms.opacity.value = 0.65 * (0.6 + intro * 0.4);
    nebulaBlue.material.uniforms.opacity.value = 0.6 * (0.6 + intro * 0.4);

    // Horizon sinks away on scroll; slow planet rotation; flare breathes
    horizon.position.set(-state.px * 0.35, HORIZON_Y - p * 4 - state.py * 0.25, HORIZON_Z);
    earth.rotation.y = -0.15 + t * 0.002;
    flareWide.material.opacity = (0.65 + Math.sin(t * 0.7) * 0.1) * intro;
    flareCore.material.opacity = (0.85 + Math.sin(t * 1.1) * 0.1) * intro;

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

    destroy() {
      destroyed = true;

      cancelAnimationFrame(raf);

      resizeObserver.disconnect();
      io.disconnect();

      window.removeEventListener('resize', onResize);

      window.visualViewport?.removeEventListener(
        'resize',
        onResize
      );

      scene.traverse((o) => {
        o.geometry?.dispose();

        if (o.material) {
          [].concat(o.material).forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });

      kit.dispose();
      environment.dispose();
      pmrem.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}