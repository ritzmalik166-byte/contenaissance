import * as THREE from 'three';
import { glowTexture, makeStars } from './spaceCommon';
import { createTextureKit } from './spaceMaterials';

/* =====================================================
   Cinematic moon backdrop for the Showreel section.
   A massive lunar sphere using real lunar maps — LRO colour
   mosaic plus LOLA elevation (with fine crater relief folded in)
   as the bump map — lit from one side with a warm golden rim, so
   it reads as a huge moon partially hidden behind the video
   frame. Same public API as the previous ShowreelScene
   (setPointer / setParallax / pulse) so the section's GSAP
   wiring and markup don't need to change.
===================================================== */

const GLOW_VERTEX = `
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

// Two shells, both brightest on the sunlit side:
//  - halo: back faces of a slightly larger sphere, a soft glow that
//    fades out from the moon's edge into space
//  - rim:  front faces hugging the surface, a thin gold fresnel line
function makeAtmosphere(radius, sunDir) {
  const HALO_SCALE = 1.07;
  const edge = Math.sqrt(1 - 1 / (HALO_SCALE * HALO_SCALE));

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * HALO_SCALE, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color('#f5c76a') },
        sunDir: { value: sunDir },
        intensity: { value: 0.9 },
        edge: { value: edge },
      },
      vertexShader: GLOW_VERTEX,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        uniform vec3 glowColor;
        uniform vec3 sunDir;
        uniform float intensity;
        uniform float edge;
        void main() {
          float d = clamp(-dot(vNormal, vViewDir) / edge, 0.0, 1.0);
          float lit = smoothstep(-0.25, 0.75, dot(vWorldNormal, sunDir));
          float a = pow(d, 2.2) * (0.12 + lit) * intensity;
          gl_FragColor = vec4(glowColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.003, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color('#ffd27a') },
        sunDir: { value: sunDir },
        intensity: { value: 0.85 },
      },
      vertexShader: GLOW_VERTEX,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        uniform vec3 glowColor;
        uniform vec3 sunDir;
        uniform float intensity;
        void main() {
          float f = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 4.0);
          float lit = smoothstep(0.0, 0.8, dot(vWorldNormal, sunDir));
          gl_FragColor = vec4(glowColor, f * lit * intensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const group = new THREE.Group();
  group.add(halo, rim);
  group.userData.materials = [halo.material, rim.material];

  return group;
}

const DEFAULTS = {
  radius: 7.4,
  position: [0.6, -2.2, -4.5],
  tilt: 0,
  sun: [7, 4.5, 5],
  rim: [6, 3, 3],
  // Limb glow placement, as a fraction of the radius
  glow: [0.72, 0.58, 0.3],
  glowScale: 1.9,
  glowOpacity: 0.8,
  ambient: 0.9,
  sunColor: 0xffdca0,
  rimIntensity: 4,
  // Relief strength of the real elevation map
  bumpScale: 1.6,
  // Per unit of setParallax(0..1): positive shift moves the moon up
  scrollShift: -1.8,
  scrollSpin: 0.35,
  scrollDolly: 1.2,
};

export function createMoonScene(container, options = {}) {
  if (!container) return null;

  const opts = { ...DEFAULTS, ...options };

  let mobile = window.innerWidth < 760;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: true,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  container.appendChild(renderer.domElement);

  const kit = createTextureKit(renderer, { mobile });
  kit.loadWhenNear(container);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    60
  );
  camera.position.set(0, 0, 12);

  scene.add(new THREE.AmbientLight(0x241f18, opts.ambient));

  // Warm "sun" grazing from the upper right, like the reference image
  const sun = new THREE.DirectionalLight(opts.sunColor, 2.4);
  sun.position.set(...opts.sun);
  scene.add(sun);

  const rim = new THREE.PointLight(0xf2c96b, opts.rimIntensity, 26);
  rim.position.set(...opts.rim);
  scene.add(rim);

  const RIM_BASE = rim.intensity;

  // Sparse deep starfield for a touch of depth behind the moon
  const stars = makeStars(mobile ? 160 : 320, { x: 24, y: 14, z: 28, near: 10 });
  scene.add(stars);

  // The moon itself — big enough to spill past the video frame's
  // top and bottom edges.
  const RADIUS = opts.radius;
  const [baseX, baseY, baseZ] = opts.position;
  const moon = new THREE.Group();
  moon.position.set(baseX, baseY, baseZ);
  scene.add(moon);

  // Real equirectangular maps wrap the sphere exactly once, so the
  // legacy `texRepeat` option no longer applies.
  // Hero moon is the one 2k map on the site (1k on mobile)
  const colorTex = kit.planet('moon', mobile ? '1k' : '2k');
  const bumpTex = kit.data('planets/moon_height_1k.webp');

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, mobile ? 64 : 128, mobile ? 48 : 96),
    new THREE.MeshStandardMaterial({
      map: colorTex,
      bumpMap: bumpTex,
      bumpScale: opts.bumpScale,
      roughness: 0.96,
      metalness: 0,
    })
  );
  // Tilt/spin only the surface — the glow layers must stay locked to
  // the sunlit edge.
  body.rotation.x = opts.tilt;
  moon.add(body);

  const sunDir = new THREE.Vector3(...opts.sun).normalize();
  const atmosphere = makeAtmosphere(RADIUS, sunDir);
  moon.add(atmosphere);

  // Extra warm glow sprite hugging the sunlit limb for that
  // cinematic golden-edge look
  const limbGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('#ffd98a'),
      transparent: true,
      opacity: opts.glowOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  limbGlow.scale.setScalar(RADIUS * opts.glowScale);
  limbGlow.position.set(RADIUS * opts.glow[0], RADIUS * opts.glow[1], RADIUS * opts.glow[2]);
  moon.add(limbGlow);

  const state = {
    px: 0,
    py: 0,
    tx: 0,
    ty: 0,
    parallax: 0,
    targetParallax: 0,
    pulse: 0,
    visible: true,
  };

  const start = performance.now();
  let raf = 0;
  let destroyed = false;

  const onResize = () => {
    if (destroyed) return;

    const rect = container.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (!w || !h) return;

    mobile = window.innerWidth < 760;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.75));
    renderer.setSize(w, h, false);
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);
  window.addEventListener('resize', onResize);
  onResize();

  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
  });
  io.observe(container);

  const render = () => {
    if (destroyed) return;

    raf = requestAnimationFrame(render);

    if (!state.visible) return;

    const t = (performance.now() - start) / 1000;

    if (!reducedMotion) {
      state.px += (state.tx - state.px) * 0.05;
      state.py += (state.ty - state.py) * 0.05;
      state.parallax += (state.targetParallax - state.parallax) * 0.16;
    } else {
      state.parallax = state.targetParallax;
    }

    moon.position.y = baseY + state.parallax * opts.scrollShift + state.py * 0.3;
    moon.position.x = baseX + state.px * 0.5;

    camera.position.z = 12 + state.parallax * opts.scrollDolly;
    camera.lookAt(0, 0, -4);

    if (!reducedMotion) {
      // Slow, subtle self-rotation, nudged along by scroll depth
      body.rotation.y = t * 0.025 + state.parallax * opts.scrollSpin;

      stars.rotation.y = t * 0.003;

      limbGlow.material.opacity = opts.glowOpacity * (0.88 + Math.sin(t * 0.8) * 0.12);
    }

    state.pulse *= 0.92;
    rim.intensity = RIM_BASE + state.pulse * 9;

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
            m.bumpMap?.dispose();
            m.dispose();
          });
        }
      });

      kit.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
