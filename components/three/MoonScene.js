import * as THREE from 'three';
import { glowTexture, random, makeStars } from './spaceCommon';

/* =====================================================
   Cinematic moon backdrop for the Showreel section.
   A massive, procedurally-textured lunar sphere (craters +
   bump depth) lit from one side with a warm golden rim, so
   it reads as a huge moon partially hidden behind the video
   frame. Same public API as the previous ShowreelScene
   (setPointer / setParallax / pulse) so the section's GSAP
   wiring and markup don't need to change.
===================================================== */

// Draw a circle-bounded shape, repeating it across the canvas edges so
// the texture tiles seamlessly when repeated on the sphere.
function wrapped(ctx, x, y, r, draw) {
  const { width: w, height: h } = ctx.canvas;
  const xs = [0];
  const ys = [0];

  if (x - r < 0) xs.push(w);
  if (x + r > w) xs.push(-w);
  if (y - r < 0) ys.push(h);
  if (y + r > h) ys.push(-h);

  for (const dx of xs) {
    for (const dy of ys) draw(x + dx, y + dy);
  }
}

function radial(ctx, x, y, r, stops) {
  wrapped(ctx, x, y, r, (px, py) => {
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function softBlob(ctx, x, y, r, rgba) {
  radial(ctx, x, y, r, [
    [0, rgba],
    [1, rgba.replace(/[\d.]+\)$/, '0)')],
  ]);
}

// Equirectangular texture: the canvas is 2:1 so craters stay round on
// the sphere's equator band, which is the part facing the camera.
function generateMoonTextures(size, repeat) {
  const w = size * 2;
  const h = size;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cctx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bctx = bumpCanvas.getContext('2d');

  cctx.fillStyle = '#8f8b85';
  cctx.fillRect(0, 0, w, h);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, w, h);

  // Highland / lowland mottling
  for (let i = 0; i < 260; i++) {
    const light = Math.random() > 0.5;
    softBlob(
      cctx,
      random(0, w),
      random(0, h),
      random(h * 0.02, h * 0.12),
      light ? 'rgba(200,196,188,0.06)' : 'rgba(40,38,36,0.07)'
    );
  }

  // Irregular dark maria, each built from a cluster of soft blobs
  for (let m = 0; m < 9; m++) {
    const cx = random(0, w);
    const cy = random(0, h);
    const spread = random(h * 0.06, h * 0.16);

    for (let i = 0; i < 14; i++) {
      softBlob(
        cctx,
        cx + random(-spread, spread) * 1.6,
        cy + random(-spread, spread),
        random(spread * 0.3, spread * 0.8),
        'rgba(34,33,32,0.16)'
      );
    }
  }

  // Craters with a power-law size spread: lots of small ones, few big
  const craterCount = Math.round(size * 0.9);

  for (let i = 0; i < craterCount; i++) {
    const x = random(0, w);
    const y = random(0, h);
    const r = h * (0.002 + 0.055 * Math.pow(Math.random(), 3.2));
    const big = r > h * 0.018;

    // Color: darker floor, faint bright rim
    radial(cctx, x, y, r * 1.15, [
      [0, 'rgba(28,27,26,0.32)'],
      [0.72, 'rgba(28,27,26,0.14)'],
      [0.86, 'rgba(225,220,210,0.16)'],
      [1, 'rgba(225,220,210,0)'],
    ]);

    // Bump: bowl-shaped floor, thin raised rim
    radial(bctx, x, y, r * 1.2, [
      [0, 'rgba(45,45,45,0.85)'],
      [0.7, 'rgba(85,85,85,0.6)'],
      [0.84, 'rgba(225,225,225,0.85)'],
      [1, 'rgba(128,128,128,0)'],
    ]);

    if (big) {
      // Central peak + light ejecta halo on the larger craters
      softBlob(bctx, x, y, r * 0.18, 'rgba(200,200,200,0.7)');
      softBlob(cctx, x, y, r * 2.2, 'rgba(210,206,198,0.05)');
    }
  }

  // Fine regolith speckle
  for (let i = 0; i < w * 3; i++) {
    const v = Math.round(random(30, 230));
    cctx.fillStyle = `rgba(${v},${v},${v},0.06)`;
    cctx.fillRect(random(0, w), random(0, h), 1.5, 1.5);
  }

  const colorTex = new THREE.CanvasTexture(colorCanvas);
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);

  for (const tex of [colorTex, bumpTex]) {
    tex.anisotropy = 4;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
  }

  return { colorTex, bumpTex };
}

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
  texRepeat: 1,
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

  const { colorTex, bumpTex } = generateMoonTextures(mobile ? 640 : 1024, opts.texRepeat);

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, mobile ? 40 : 72, mobile ? 40 : 72),
    new THREE.MeshStandardMaterial({
      map: colorTex,
      bumpMap: bumpTex,
      bumpScale: 1.2,
      roughness: 1,
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

      colorTex.dispose();
      bumpTex.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
