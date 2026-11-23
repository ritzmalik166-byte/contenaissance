import * as THREE from 'three';
import { glowSprite, makeOrbit } from './objects';

/* =====================================================
   Screen-anchored 3D layer. These objects live in camera
   space and are positioned from live DOM rects every
   frame, so they stay locked to the Figma layout at any
   breakpoint while still being real lit/bloomed 3D.
===================================================== */

export const HUD_DEPTH = 6;

// CSS px → camera-space point on the HUD plane.
export function screenToHud(camera, w, h, x, y, out = new THREE.Vector3(), depth = HUD_DEPTH) {
  const halfH = depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const halfW = halfH * (w / h);
  return out.set((x / w) * 2 * halfW - halfW, -((y / h) * 2 * halfH - halfH), -depth);
}

export const hudUnitsPerPx = (camera, h, depth = HUD_DEPTH) =>
  (2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;

/* ---------------- Constellation ----------------
   getNodes() → [{ x, y, id, group }] in CSS px (viewport)
   getEdges(nodes) → [[i, j], ...]
   Lines draw on as nodes scroll into view; nodes whose
   `group` matches the hovered id ignite. */

const GOLD = new THREE.Color('#e9b949');
const HOT = new THREE.Color('#fff1c9');

export function createConstellation({ maxNodes = 40, maxEdges = 80, getNodes, getEdges }) {
  const group = new THREE.Group();

  const linePos = new Float32Array(maxEdges * 6);
  const lineCol = new Float32Array(maxEdges * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  lines.frustumCulled = false;
  lines.renderOrder = 10;
  group.add(lines);

  const sprites = [];
  for (let i = 0; i < maxNodes; i++) {
    const halo = glowSprite('#ffd27a', 0.2, 0);
    halo.material.depthTest = false;
    halo.renderOrder = 11;
    const core = glowSprite('#ffffff', 0.05, 0);
    core.material.depthTest = false;
    core.renderOrder = 12;
    group.add(halo, core);
    sprites.push({ halo, core, reveal: 0, heat: 0 });
  }

  const tmp = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const c = new THREE.Color();

  function update(camera, w, h, dt, hoverId, intensity = 1) {
    const nodes = intensity > 0.01 ? getNodes() : [];
    const k = 1 - Math.exp(-dt * 3.2);
    const kh = 1 - Math.exp(-dt * 8);
    const upp = hudUnitsPerPx(camera, h);
    const pts = [];

    for (let i = 0; i < maxNodes; i++) {
      const s = sprites[i];
      const n = nodes[i];
      if (!n) {
        s.halo.visible = s.core.visible = false;
        s.reveal = 0;
        continue;
      }
      const inView = n.y < h * 0.94 && n.y > -h * 0.3;
      s.reveal += ((inView ? 1 : 0) - s.reveal) * k;
      s.heat += ((hoverId && n.group === hoverId ? 1 : 0) - s.heat) * kh;
      screenToHud(camera, w, h, n.x, n.y, tmp);
      pts[i] = tmp.clone();
      const a = s.reveal * intensity;
      s.halo.visible = s.core.visible = a > 0.01;
      s.halo.position.copy(tmp);
      s.core.position.copy(tmp);
      const size = (n.size || 1) * (1 + s.heat * 1.4);
      s.halo.scale.setScalar(upp * 46 * size);
      s.core.scale.setScalar(upp * 9 * size);
      s.halo.material.opacity = a * (0.55 + s.heat * 0.45);
      s.core.material.opacity = a;
    }

    const edges = nodes.length > 1 ? getEdges(nodes) : [];
    let e = 0;
    for (; e < Math.min(edges.length, maxEdges); e++) {
      const [i, j] = edges[e];
      const A = pts[i];
      const B = pts[j];
      if (!A || !B) {
        linePos.fill(0, e * 6, e * 6 + 6);
        lineCol.fill(0, e * 6, e * 6 + 6);
        continue;
      }
      const ra = sprites[i].reveal;
      const rb = sprites[j].reveal;
      const draw = Math.min(ra, rb);
      tmpA.copy(A);
      tmpB.copy(A).lerp(B, draw);
      linePos.set([tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z], e * 6);
      const heat = Math.max(sprites[i].heat, sprites[j].heat);
      const strength = (0.32 + heat * 0.68) * intensity * (edges[e][2] ?? 1);
      c.copy(GOLD).lerp(HOT, heat * 0.6).multiplyScalar(strength);
      lineCol.set([c.r, c.g, c.b, c.r, c.g, c.b], e * 6);
    }
    linePos.fill(0, e * 6);
    lineCol.fill(0, e * 6);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    lineGeo.setDrawRange(0, e * 2);
  }

  return { group, update };
}

/* ---------------- CTA orbit ----------------
   Two tilted rings + orbiting gold planet + small moon,
   centred on the DOM `.pf-cta__orbit` box. */

export function createCtaOrbit(kitMoon) {
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  group.add(tilt);

  const outer = makeOrbit(1, { opacity: 0.28, color: new THREE.Color('#cfd6ff') });
  const inner = makeOrbit(0.74, { opacity: 0.2, color: new THREE.Color('#cfd6ff') });
  const dashed = makeOrbit(1.32, { opacity: 0.12, dashed: true, color: new THREE.Color('#e9b949') });
  [outer, inner, dashed].forEach((l) => {
    l.rotation.x = Math.PI / 2; // orbit lines are built in XZ; face the camera
    l.material.depthTest = false;
    l.renderOrder = 10;
    tilt.add(l);
  });

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 24, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd25a').multiplyScalar(2.2), depthTest: false })
  );
  dot.renderOrder = 12;
  const dotGlow = glowSprite('#e9b949', 0.3, 0.9);
  dotGlow.material.depthTest = false;
  dotGlow.renderOrder = 11;
  dot.add(dotGlow);
  tilt.add(dot);

  if (kitMoon) {
    kitMoon.position.set(Math.cos(0.75) * 1.18, Math.sin(0.75) * 1.18, 0);
    kitMoon.scale.setScalar(0.11);
    tilt.add(kitMoon);
  }

  let angle = 0.9;
  let speed = 0.35;
  const center = new THREE.Vector3();

  function update(camera, w, h, dt, t, rect, { boost = 0, px = 0, py = 0, visible = 1 } = {}) {
    group.visible = visible > 0.01 && !!rect;
    if (!group.visible) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    screenToHud(camera, w, h, cx, cy, center);
    group.position.copy(center);
    const r = (rect.width / 2) * hudUnitsPerPx(camera, h);
    group.scale.setScalar(r);

    speed += (0.35 + boost * 2.4 - speed) * (1 - Math.exp(-dt * 3));
    angle += speed * dt;
    dot.position.set(Math.cos(angle), Math.sin(angle), 0);

    tilt.rotation.x += (py * 0.35 + Math.sin(t * 0.4) * 0.06 - tilt.rotation.x) * (1 - Math.exp(-dt * 4));
    tilt.rotation.y += (px * 0.45 - tilt.rotation.y) * (1 - Math.exp(-dt * 4));
    if (kitMoon) {
      kitMoon.rotation.y += dt * 0.2;
      kitMoon.userData.tick?.(t);
    }

    [outer, inner, dashed].forEach((l, i) => (l.material.opacity = [0.28, 0.2, 0.12][i] * visible * (1 + boost * 0.8)));
    dotGlow.material.opacity = 0.9 * visible;
  }

  return { group, update };
}
