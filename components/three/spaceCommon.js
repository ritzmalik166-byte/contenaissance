import * as THREE from 'three';

/* =====================================================
   Shared building blocks for the site's cinematic space
   scenes (Rocket stages + Showreel) — keeps the look,
   lighting and materials consistent between sections.
===================================================== */

export const random = (min, max) => Math.random() * (max - min) + min;
export const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function glowTexture(hex = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;

  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const color = new THREE.Color(hex);
  const rgb = `${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)}`;

  grd.addColorStop(0, `rgba(${rgb},0.95)`);
  grd.addColorStop(0.35, `rgba(${rgb},0.35)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  return tex;
}

export function makeStars(count, spread) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = random(-spread.x, spread.x);
    positions[i * 3 + 1] = random(-spread.y, spread.y);
    positions[i * 3 + 2] = -random(spread.near ?? 2, spread.z);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.05,
    map: glowTexture('#fef6e4'),
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.userData.baseOpacity = 1;

  return points;
}

export function makePlanet({ radius, color, emissive, glowColor, glowScale = 2.5 }) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 1),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.4,
      roughness: 0.85,
      metalness: 0.08,
      flatShading: true,
    })
  );
  group.add(body);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(glowColor),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  glow.scale.setScalar(radius * glowScale);
  group.add(glow);

  group.userData.body = body;
  group.userData.glow = glow;

  return group;
}

/* Low-poly, irregular rocks scattered along a band — reads as a
   drifting asteroid field without the cost of heavy geometry. */
export function makeAsteroidBelt({
  count = 18,
  radiusRange = [6, 11],
  arc = Math.PI * 2,
  y = 0,
  ySpread = 1.2,
  z = -16,
  zSpread = 4,
  colors = ['#6b6459', '#4d473e', '#847a68'],
} = {}) {
  const group = new THREE.Group();
  const rocks = [];

  const geometries = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 0),
  ];

  for (let i = 0; i < count; i++) {
    const geo = choose(geometries).clone();

    // Knock the vertices around so each rock reads as irregular, not a
    // perfect platonic solid.
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      pos.setXYZ(
        v,
        pos.getX(v) * random(0.75, 1.25),
        pos.getY(v) * random(0.75, 1.25),
        pos.getZ(v) * random(0.75, 1.25)
      );
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: choose(colors),
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);

    const angle = random(0, arc);
    const radius = random(radiusRange[0], radiusRange[1]);
    const scale = random(0.08, 0.26);

    mesh.position.set(
      Math.cos(angle) * radius,
      y + random(-ySpread, ySpread),
      z + random(-zSpread, zSpread)
    );
    mesh.scale.setScalar(scale);
    mesh.rotation.set(random(0, Math.PI), random(0, Math.PI), random(0, Math.PI));

    group.add(mesh);

    rocks.push({
      mesh,
      spin: new THREE.Vector3(random(-0.15, 0.15), random(-0.2, 0.2), random(-0.1, 0.1)),
      drift: random(0.02, 0.06),
      phase: random(0, Math.PI * 2),
      baseY: mesh.position.y,
    });
  }

  group.userData.rocks = rocks;

  return group;
}

export function updateAsteroidBelt(group, t) {
  const rocks = group.userData.rocks;
  if (!rocks) return;

  for (const rock of rocks) {
    rock.mesh.rotation.x += rock.spin.x * 0.01;
    rock.mesh.rotation.y += rock.spin.y * 0.01;
    rock.mesh.rotation.z += rock.spin.z * 0.01;
    rock.mesh.position.y = rock.baseY + Math.sin(t * rock.drift + rock.phase) * 0.18;
  }
}
