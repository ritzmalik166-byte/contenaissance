import * as THREE from 'three';

/* Small math + asset helpers shared by every part of the journey. */

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** 0..1 across [a, b] */
export const seg = (p, a, b) => clamp((p - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** rises over [a, b] then falls over [c, d] */
export const band = (p, a, b, c, d) => smooth(seg(p, a, b)) * (1 - smooth(seg(p, c, d)));

/** deterministic pseudo random from an integer seed */
export function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** stepped travel: dwell on each integer stop, glide between */
export function dwell(s, hold = 0.32) {
  const i = Math.floor(s);
  const f = s - i;
  return i + smoother(seg(f, hold, 1 - hold));
}

const loader = typeof window !== 'undefined' ? new THREE.TextureLoader() : null;
const cache = new Map();

let upload = null;
/** renderer.initTexture: textures go to the GPU as soon as they decode, not on first sight */
export function setTextureUpload(fn) {
  upload = fn;
}

/** cached texture; colour maps are sRGB */
export function tex(url, { srgb = true, repeat = false, aniso = 4, onLoad } = {}) {
  const key = url;
  if (cache.has(key)) return cache.get(key);
  const t = loader.load(url, (tt) => {
    upload?.(tt);
    onLoad?.(tt);
  });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(key, t);
  return t;
}

export function disposeTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

/** soft round sprite drawn once on a canvas */
export function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.25)', size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const h = size / 2;
  const grd = g.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, mid);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** sample the opaque pixels of an image into points (x right, y up, centred, width = w) */
export function sampleImage(img, w, step = 2, threshold = 110) {
  const W = Math.round(img.naturalWidth * 2);
  const H = Math.round(img.naturalHeight * 2);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > threshold;
  const k = w / W;
  const out = [];
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (!on(x, y)) continue;
      const i = (y * W + x) * 4;
      const edge = !on(x - 3, y) || !on(x + 3, y) || !on(x, y - 3) || !on(x, y + 3);
      out.push({ x: (x - W / 2) * k, y: (H / 2 - y) * k, r: d[i] / 255, g: d[i + 1] / 255, b: d[i + 2] / 255, edge });
    }
  }
  return out;
}
