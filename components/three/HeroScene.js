import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

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
 * Gold constellation hero. `progress` (0..1) is driven by scroll, pointer by mouse.
 */
export function createHeroScene(container) {
  const mobile = window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x070504, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070504, 0.055);

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffc47a, 3.2);
  key.position.set(-6, 6, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xff8a2a, 40, 30);
  rim.position.set(5, -3, 3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x2a1a0a, 1.2));

  // --- particle field
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
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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

  // --- constellation lines between nearby nodes
  const NODES = mobile ? 110 : 190;
  const nodes = [];
  for (let i = 0; i < NODES; i++) {
    nodes.push(new THREE.Vector3((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 15, -Math.random() * 26 + 4));
  }
  const linePos = [];
  for (let i = 0; i < NODES; i++) {
    let links = 0;
    for (let j = i + 1; j < NODES && links < 2; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 3.1) {
        linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        links++;
      }
    }
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  const lines = new THREE.LineSegments(
    lGeo,
    new THREE.LineBasicMaterial({ color: 0xffa94a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(lines);

  const nGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  const nodePts = new THREE.Points(
    nGeo,
    new THREE.PointsMaterial({ size: 0.22, map: pMat.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd28a })
  );
  scene.add(nodePts);

  // --- glowing triangular shards
  const shardGeo = new THREE.BufferGeometry();
  shardGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, 0, -0.42, -0.3, 0, 0.42, -0.3, 0], 3));
  shardGeo.computeVertexNormals();
  const shardMat = new THREE.MeshBasicMaterial({
    color: 0xff9a2e,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const SHARDS = mobile ? 26 : 48;
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, SHARDS);
  const shardData = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < SHARDS; i++) {
    shardData.push({
      p: new THREE.Vector3((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 14, -Math.random() * 30 + 5),
      r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      s: 0.25 + Math.random() * 0.7,
      v: 0.2 + Math.random() * 0.6,
    });
  }
  scene.add(shards);

  // --- gold infinity
  const infinityGroup = new THREE.Group();
  const tube = new THREE.TubeGeometry(new Lemniscate(1), 360, 0.26, 48, true);
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

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, 0.006, 8, 220),
    new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.35 })
  );
  halo.rotation.x = Math.PI / 2.3;
  infinityGroup.add(halo);

  infinityGroup.position.set(0, 0.35, -1.5);
  infinityGroup.scale.setScalar(mobile ? 0.75 : 1.15);
  scene.add(infinityGroup);

  // --- state
  const state = { progress: 0, intro: 0, px: 0, py: 0, tx: 0, ty: 0, visible: true };
  const start = performance.now();
  let raf = 0;

  const render = () => {
    raf = requestAnimationFrame(render);
    if (!state.visible) return;

    const t = (performance.now() - start) / 1000;
    const p = state.progress;
    state.px += (state.tx - state.px) * 0.05;
    state.py += (state.ty - state.py) * 0.05;

    camera.position.z = 9 - p * 14;
    camera.position.x = state.px * 0.6;
    camera.position.y = state.py * 0.4 - p * 0.8;
    camera.lookAt(state.px * 0.2, state.py * 0.1, camera.position.z - 10);

    const intro = state.intro;
    infinity.rotation.y = t * 0.25 + state.px * 0.5 + p * Math.PI * 1.2;
    infinity.rotation.x = Math.sin(t * 0.4) * 0.15 + state.py * 0.3 + p * 0.8;
    infinityGroup.scale.setScalar((mobile ? 0.75 : 1.15) * (0.6 + intro * 0.4) * (1 + p * 0.6));
    halo.rotation.z = t * 0.15;
    halo.material.opacity = 0.35 * intro * (1 - p);

    points.rotation.z = t * 0.01;
    lines.position.y = Math.sin(t * 0.3) * 0.15;
    nodePts.position.y = lines.position.y;
    pMat.opacity = 0.35 + intro * 0.65;

    for (let i = 0; i < SHARDS; i++) {
      const d = shardData[i];
      dummy.position.set(d.p.x, d.p.y + Math.sin(t * d.v + i) * 0.4, d.p.z);
      dummy.rotation.set(d.r.x + t * d.v * 0.5, d.r.y + t * d.v * 0.3, d.r.z);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
    shardMat.opacity = 0.55 * (0.4 + Math.sin(t * 1.3) * 0.1 + 0.5);

    renderer.render(scene, camera);
  };
  render();

  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  const io = new IntersectionObserver(([e]) => (state.visible = e.isIntersecting));
  io.observe(container);

  return {
    state,
    setPointer(x, y) {
      state.tx = x;
      state.ty = y;
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); });
      });
      pmrem.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
