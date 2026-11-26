'use client';

import { useEffect, useRef, useState } from 'react';

/* Branded loader. Gold points assemble the real logo while a thin line
   tracks loading; it waits until the WebGL Earth has actually drawn
   (the engine fires `journey:ready`), then everything dissolves in one
   eased fade so the globe is simply there when the curtain lifts. */
export default function Loader({ onDone }) {
  const canvas = useRef(null);
  const bar = useRef(null);
  const mark = useRef(null);
  const [gone, setGone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    const g = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.min(274, window.innerWidth * 0.6);
    const H = W * (133 / 274);
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const pts = [];
    const t0 = performance.now();
    let raf;
    let ready = false;
    let finished = false;
    let shown = 0;

    const img = new Image();
    img.onload = () => {
      const s = document.createElement('canvas');
      s.width = Math.round(W);
      s.height = Math.round(H);
      const sg = s.getContext('2d');
      sg.drawImage(img, 0, 0, s.width, s.height);
      const d = sg.getImageData(0, 0, s.width, s.height).data;
      for (let y = 0; y < s.height; y += 2) {
        for (let x = 0; x < s.width; x += 2) {
          const i = (y * s.width + x) * 4;
          if (d[i + 3] > 120) {
            const a = Math.random() * Math.PI * 2;
            const r = 80 + Math.random() * 220;
            pts.push({ x, y, sx: W / 2 + Math.cos(a) * r, sy: H / 2 + Math.sin(a) * r, c: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, k: Math.random() * 0.45 });
          }
        }
      }
    };
    img.src = '/images/logo.png';

    const onReady = () => (ready = true);
    window.addEventListener('journey:ready', onReady);
    // never hold the page hostage: no WebGL or a slow network still opens it
    const fallback = setTimeout(onReady, 4000);

    const draw = (now) => {
      const elapsed = (now - t0) / 1000;
      // the logo assembles over ~1.6s with a long ease-out
      const t = Math.min(1, elapsed / 1.1);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      for (const q of pts) {
        let e = Math.min(1, Math.max(0, (t - q.k) / (1 - q.k)));
        e = 1 - Math.pow(1 - e, 4);
        g.fillStyle = q.c;
        g.globalAlpha = 0.25 + e * 0.75;
        g.fillRect(q.sx + (q.x - q.sx) * e, q.sy + (q.y - q.sy) * e, 1.4, 1.4);
      }
      // once the points have settled, the real logo image takes over
      if (mark.current) {
        const m = Math.min(1, Math.max(0, (elapsed - 0.9) / 0.35));
        mark.current.style.opacity = m.toFixed(3);
        c.style.opacity = (1 - m * 0.85).toFixed(3);
      }
      // progress: creeps toward 90% while loading, completes when ready
      const target = ready ? 1 : 0.9 * (1 - Math.exp(-elapsed / 2.2));
      shown += (target - shown) * 0.12;
      if (bar.current) bar.current.style.transform = `scaleX(${shown.toFixed(4)})`;
      if (!finished && ready && t >= 1 && shown > 0.97) {
        finished = true;
        setGone(true);
        onDone?.();
        setTimeout(() => setRemoved(true), 1600);
        return;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      window.removeEventListener('journey:ready', onReady);
    };
  }, [onDone]);

  if (removed) return null;
  return (
    <div className={`m-loader j-loader${gone ? ' is-gone' : ''}`} role="status" aria-label="Loading Contenaissance">
      <div className="j-loader__inner">
        <span className="j-loader__logo">
          <canvas ref={canvas} aria-hidden="true" />
          <img ref={mark} src="/images/logo@2x.png" alt="" width="274" height="133" />
        </span>
        <span className="j-loader__bar" aria-hidden="true">
          <i ref={bar} />
        </span>
      </div>
    </div>
  );
}
