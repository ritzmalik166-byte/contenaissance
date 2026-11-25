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

/* Planets and asteroid belts with real PBR surfaces live in
   ./spaceMaterials (makeRealPlanet / makeAsteroidBelt). */

export function updateAsteroidBelt(group, t) {
  const rocks = group.userData.rocks;
  if (!rocks) return;

  // Each rock circles its own spot on a small ellipse that runs through
  // depth (it comes nearer and recedes, so perspective sells the 3D),
  // bobs, and tumbles on real time (not per frame). The belt as a whole
  // sways a little.
  for (const rock of rocks) {
    const m = rock.mesh;
    if (rock.bx === undefined) {
      rock.bx = m.position.x;
      rock.bz = m.position.z;
      rock.r0 = m.rotation.clone();
      const k = Math.sin(rock.phase * 12.9898) * 43758.5453;
      const h = k - Math.floor(k); // stable per-rock random
      rock.orbitR = 0.35 + h * 1.1;
      rock.orbitW = (0.12 + h * 0.22) * (rock.phase > Math.PI ? 1 : -1);
    }
    const a = t * rock.orbitW + rock.phase;
    m.position.set(
      rock.bx + Math.cos(a) * rock.orbitR,
      rock.baseY + Math.sin(t * rock.drift * 8 + rock.phase) * 0.32,
      rock.bz + Math.sin(a) * rock.orbitR * 1.8
    );
    m.rotation.set(
      rock.r0.x + rock.spin.x * t * 2.2,
      rock.r0.y + rock.spin.y * t * 2.2,
      rock.r0.z + rock.spin.z * t * 2.2
    );
  }
  group.rotation.y = Math.sin(t * 0.06) * 0.05;
  group.rotation.z = Math.sin(t * 0.045) * 0.02;
}
