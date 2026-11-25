/* =====================================================
   LAUNCH SMOKE — a canvas particle system for the Rocket
   section's lift-off (Rocket.jsx).

   The puffs are procedural cloud sprites (fractal noise with
   cauliflower edges), in two lightings:
     warm  lit orange from below by the flame (fresh smoke)
     cool  grey-beige, lit softly from above (aged smoke)
   and each particle cross-fades from warm to cool as it ages.

   Driven by the pinned timeline's time (setTime) for *what*
   happens — ignition, the climb — but simulated in real time,
   so once the rocket has gone the cloud keeps billowing for a
   few seconds and then slowly thins away on its own.
     t ≥ IGNITE   ground cloud bursts out from the pad
     t ≥ LIFT     exhaust column trails the real nozzle up
     t < RESET    (scrolled back) everything is cleared
===================================================== */

const IGNITE = 5.1; // engines light (the rocket shakes)
const LIFT = 5.55; // rocket leaves the pad
const CLIMB_END = 7.3; // rocket is off the top
const RESET = 5.0;

const TEX = 160; // sprite size (px)
const VARIANTS = 4;

/* ---------- noise ---------- */
function makeNoise(seed) {
  const N = 64;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const grid = new Float32Array(N * N).map(() => rnd());
  const at = (x, y) => grid[((y % N) + N) % N * N + (((x % N) + N) % N)];
  const fade = (t) => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
    return a + (b - a) * v;
  };
  return (x, y) => {
    let f = 0;
    let amp = 0.5;
    let fr = 1;
    for (let o = 0; o < 5; o++) {
      f += value(x * fr, y * fr) * amp;
      fr *= 2.03;
      amp *= 0.5;
    }
    return f; // ~0..1
  };
}

/* One billowy puff, like a cumulus: a cluster of rounded lobes, each
   lit like a sphere (so the billows read in 3D, with darker folds where
   they meet), a soft low-frequency noise texture and a frayed edge.
   warm: lit from below by the flame, orange; cool: lit from above. */
function makePuff(seed, warm) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d');
  const img = g.createImageData(TEX, TEX);
  const noise = makeNoise(seed + 1);
  let s = seed * 7919 + 17;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  // lobes in unit space (-1..1): a big core plus smaller billows round it
  const lobes = [{ x: 0, y: 0.06, r: 0.42 }];
  const count = 14 + Math.floor(rnd() * 6);
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 0.18 + rnd() * 0.42;
    lobes.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.85, r: 0.12 + rnd() * 0.18 });
  }
  // light direction (x, y, z), screen y down
  const L = warm ? [0.15, 0.75, 0.64] : [-0.35, -0.7, 0.62];
  const H = TEX / 2;

  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const ux = (x - H) / H;
      const uy = (y - H) / H;
      // the lobe whose surface is nearest the viewer here
      let best = 0;
      let nx = 0;
      let ny = 0;
      for (const l of lobes) {
        const dx = (ux - l.x) / l.r;
        const dy = (uy - l.y) / l.r;
        const q = 1 - dx * dx - dy * dy;
        if (q <= 0) continue;
        const h = Math.sqrt(q) * l.r; // height of the sphere surface
        if (h > best) {
          best = h;
          nx = dx;
          ny = dy;
        }
      }
      if (best <= 0) continue;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const n1 = noise(x / 34 + seed, y / 34 + seed * 0.7); // soft texture
      const n2 = noise(x / 12 + seed * 2, y / 12); // fine wisps at the edge
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      let l = 0.46 + diff * 0.55 + (n1 - 0.5) * 0.5;
      l = Math.min(1.2, Math.max(0.22, l));
      // frayed rim: thin where the lobe surface is low, eaten by noise
      const edge = Math.min(1, Math.max(0, (best * 6 - 0.1 + (n2 - 0.5) * 1.1) / 0.9));
      const a = edge * (0.7 + (n1 - 0.5) * 0.5);
      if (a <= 0) continue;
      const o = (y * TEX + x) * 4;
      if (warm) {
        img.data[o] = Math.min(255, 255 * l);
        img.data[o + 1] = Math.min(255, 160 * l);
        img.data[o + 2] = Math.min(255, 88 * l);
      } else {
        img.data[o] = Math.min(255, 216 * l);
        img.data[o + 1] = Math.min(255, 206 * l);
        img.data[o + 2] = Math.min(255, 194 * l);
      }
      img.data[o + 3] = Math.min(255, a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const soft = document.createElement('canvas');
  soft.width = soft.height = TEX;
  const sg = soft.getContext('2d');
  sg.filter = 'blur(2.5px)';
  sg.drawImage(c, 0, 0);
  return soft;
}

function glowSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,214,150,0.9)');
  grd.addColorStop(0.35, 'rgba(255,140,50,0.45)');
  grd.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return c;
}

const rand = (a, b) => a + Math.random() * (b - a);

export function createLaunchSmoke(canvas, getNozzle) {
  const ctx = canvas.getContext('2d');
  const cool = Array.from({ length: VARIANTS }, (_, i) => makePuff(i * 7 + 3, false));
  const warm = Array.from({ length: VARIANTS }, (_, i) => makePuff(i * 7 + 3, true));
  const glow = glowSprite();

  let W = 0;
  let H = 0;
  let dpr = 1;
  const resize = () => {
    // soft smoke doesn't need full resolution: render small, let the
    // browser scale it up (far fewer pixels to fill per frame)
    dpr = 0.6;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  };
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);

  let parts = [];
  let time = 0; // timeline time (scroll)
  let lastTime = 0;
  let burst = false;
  let lastNoz = null;
  let emitAcc = 0;
  let raf = 0;
  let last = 0;
  let heat = 0; // pad glow

  const spawn = (p) => {
    const v = Math.floor(Math.random() * VARIANTS);
    parts.push({
      age: -(p.delay || 0),
      v,
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.25, 0.25),
      ...p,
    });
  };

  // ground cloud: rolls out sideways along the pad, low and wide
  const padBurst = (n) => {
    for (let i = 0; i < 52; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const speed = rand(80, 900) * (0.35 + 0.65 * Math.random());
      spawn({
        x: n.x + rand(-20, 20),
        y: n.y + rand(-10, 30),
        vx: dir * speed,
        vy: rand(-120, 0),
        r0: rand(30, 60),
        r1: rand(150, 300),
        grow: rand(1.4, 2.8),
        life: rand(6, 9),
        peak: rand(0.8, 1),
        delay: rand(0, 0.8),
        buoy: rand(8, 26),
      });
    }
  };

  // exhaust: left behind along the flight path, spreading slowly
  const exhaust = (x, y, strong) => {
    spawn({
      x: x + rand(-8, 8),
      y: y + rand(0, 20),
      vx: rand(-55, 55),
      vy: rand(20, 110),
      r0: rand(22, 38),
      r1: rand(90, 175) * (strong ? 1.35 : 1),
      grow: rand(1.6, 3.2),
      life: rand(5, 8),
      peak: rand(0.7, 0.92),
      buoy: rand(-4, 8),
    });
  };

  const step = (dt) => {
    const n = getNozzle();
    const forward = time > lastTime + 1e-4;

    if (time < RESET) {
      parts = [];
      burst = false;
      lastNoz = null;
      heat = 0;
    } else {
      if (time >= IGNITE && !burst && n) {
        padBurst(n);
        burst = true;
      }
      // thrust building on the pad: a steady roll of fresh smoke
      if (n && time >= IGNITE && time < LIFT + 0.2 && forward) {
        emitAcc += dt * 18;
        while (emitAcc > 1) {
          emitAcc -= 1;
          spawn({
            x: n.x + rand(-14, 14),
            y: n.y + rand(0, 20),
            vx: rand(-1, 1) * rand(80, 260),
            vy: rand(-40, 10),
            r0: rand(22, 40),
            r1: rand(90, 170),
            grow: rand(1.4, 2.4),
            life: rand(5, 7),
            peak: rand(0.7, 0.9),
            buoy: rand(6, 18),
          });
        }
      }
      // the climb: a puff every ~24px of nozzle travel (no gaps on
      // fast scrolls), only while moving forward and on screen
      const climbing = n && time >= LIFT && time < CLIMB_END && n.y > -120;
      if (climbing && forward) {
        if (!lastNoz) {
          exhaust(n.x, n.y, true);
          lastNoz = n;
        } else {
          const dx = n.x - lastNoz.x;
          const dy = n.y - lastNoz.y;
          const k = Math.min(24, Math.floor(Math.hypot(dx, dy) / 24));
          for (let i = 1; i <= k; i++) exhaust(lastNoz.x + (dx * i) / k, lastNoz.y + (dy * i) / k, time < LIFT + 0.6);
          if (k) lastNoz = n; // advance only once a puff was laid
        }
      } else if (!climbing) {
        // on the pad (or gone): track it so the column starts at the pad
        lastNoz = n && time >= IGNITE && time < LIFT ? n : null;
      }
      heat += ((time >= IGNITE && time < LIFT + 0.5 ? 1 : 0) - heat) * Math.min(1, dt * 3);
    }
    lastTime = time;

    for (const p of parts) {
      p.age += dt;
      if (p.age < 0) continue;
      const drag = Math.exp(-dt * 1.6);
      p.vx *= drag;
      p.vy = p.vy * drag - p.buoy * dt; // warm smoke rises a little
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    parts = parts.filter((p) => p.age < p.life);
  };

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const n = getNozzle();
    if (heat > 0.01 && n) {
      const s = 420 * heat;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * heat;
      ctx.drawImage(glow, n.x - s / 2, n.y - s * 0.35, s, s * 0.7);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const p of parts) {
      if (p.age < 0) continue;
      const t = p.age / p.life;
      const r = p.r0 + (p.r1 - p.r0) * (1 - Math.exp(-p.age / p.grow));
      // quick fade-in, long hold, slow dissolve
      const a = Math.min(1, p.age / 0.25) * (1 - smooth(0.45, 1, t)) * p.peak;
      if (a < 0.005) continue;
      const w = 1 - smooth(0, 0.5, t); // warm → cool as it ages
      ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
      ctx.rotate(p.rot);
      ctx.globalAlpha = a * (1 - w * 0.6);
      ctx.drawImage(cool[p.v], -r, -r, r * 2, r * 2);
      if (w > 0.02) {
        ctx.globalAlpha = a * w;
        ctx.drawImage(warm[p.v], -r, -r, r * 2, r * 2);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    draw();
    const live = parts.length > 0 || heat > 0.01 || (time >= IGNITE && time < CLIMB_END);
    raf = live ? requestAnimationFrame(frame) : 0;
  };

  const wake = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  return {
    setTime(t) {
      time = t;
      if (t >= IGNITE || parts.length) wake();
      else if (t < RESET && !raf) {
        parts = [];
        burst = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    },
  };
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
