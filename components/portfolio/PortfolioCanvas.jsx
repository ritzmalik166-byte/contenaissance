'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger, isTouch, prefersReducedMotion } from '@/lib/user/gsap';
import { measure, sample } from '@/lib/user/portfolioStations';
import { setPortfolioScene } from '@/lib/user/portfolioScene';
import { pfHero } from '@/lib/user/portfolio-content';
import { openVideo } from '../VideoModal';

/* Portfolio sections ("chambers"), in page order. `veil` dims the
   world behind text-heavy sections. Names match FACTORIES in
   components/three/portfolio/PortfolioScene.js. */
const STATIONS = [
  { name: 'hero', sel: '.pf-hero', veil: 0 },
  { name: 'reel', sel: '.pf-reel', veil: 0.05 },
  { name: 'archive', sel: '.pf-archive', veil: 0.25 },
  { name: 'marquee', sel: '.pf-marquee', veil: 0 },
  { name: 'stages', sel: '.pf-stages', veil: 0.15 },
  { name: 'quote', sel: '.pf-quote', veil: 0.05 },
  { name: 'cta', sel: '.pf-cta', veil: 0.1 },
];

const DRIFT = 0.2; // must match PortfolioScene

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export default function PortfolioCanvas() {
  const wrap = useRef(null);
  const veil = useRef(null);

  useEffect(() => {
    const container = wrap.current;
    const page = container?.closest('.pf');
    if (!container || !page) return;

    // Static fallback: CSS backdrop + DOM stand-ins (see portfolio.css).
    if (prefersReducedMotion() || !webglAvailable()) {
      page.classList.add('is-static');
      return () => page.classList.remove('is-static');
    }

    let disposed = false;
    let scene = null;
    let trigger = null;
    let keys = [];

    const stations = STATIONS.map((s) => ({ ...s, el: document.querySelector(s.sel) }));
    const present = stations.filter((s) => s.el);

    const veilAt = (pos) => {
      const i = Math.min(Math.floor(pos), present.length - 1);
      const a = present[i]?.veil ?? 0;
      const b = present[Math.min(i + 1, present.length - 1)]?.veil ?? a;
      return a + (b - a) * (pos - i);
    };

    let lastVeil = -1;
    const update = (y) => {
      const pos = sample(keys, y);
      scene?.setProgress(pos);
      const v = Math.round(veilAt(pos) * 100) / 100;
      if (v !== lastVeil && veil.current) {
        veil.current.style.opacity = v;
        lastVeil = v;
      }
    };

    const mobile = window.innerWidth < 761 || isTouch();

    import('../three/portfolio/PortfolioScene').then(({ createPortfolioScene }) => {
      if (disposed || !wrap.current) return;

      scene = createPortfolioScene(wrap.current, {
        stations: present.map((s) => s.name),
        mobile,
        heroCards: pfHero.cards,
        onSelect: (card) => openVideo(card.video.src),
      });
      setPortfolioScene(scene);
      page.classList.add('has-world');

      // refreshPriority -1: measure after every section created its
      // pins, so pin-spacers already have their final size.
      trigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        refreshPriority: -1,
        onRefresh: () => {
          keys = measure(present, DRIFT);
          update(window.scrollY);
        },
        onUpdate: (self) => update(self.scroll()),
      });
      keys = measure(present, DRIFT);
      update(window.scrollY);
    });

    /* ---------- pointer: cursor light, parallax, 3D hover / click ---------- */
    const hero = document.querySelector('.pf-hero');
    let cursorOn = false;

    const onPointer = (e) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      // Hovering a 3D card over empty hero space → play cursor.
      const over = !!scene?.getRayHover() && !e.target.closest('a, button');
      if (over !== cursorOn && hero) {
        cursorOn = over;
        if (over) hero.setAttribute('data-cursor', 'Play');
        else hero.removeAttribute('data-cursor');
        hero.style.cursor = over ? 'pointer' : '';
      }
    };
    const onLeave = () => scene?.pointerLeave();

    // Every click sends a gold shockwave through the world; a click on
    // empty hero space over a 3D card opens that film.
    const onClick = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      const onHero = !!e.target.closest('.pf-hero') && !e.target.closest('a, button');
      scene?.click({ onHero });
    };

    // The CTA button spins up the 3D flight-plan orbit.
    const ctaBtn = document.querySelector('.pf-cta__btn');
    const ctaOn = () => scene?.hover('cta');
    const ctaOff = () => scene?.hover(null);

    const touch = isTouch();
    const root = document.documentElement;
    if (!touch) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      root.addEventListener('pointerleave', onLeave);
      ctaBtn?.addEventListener('pointerenter', ctaOn);
      ctaBtn?.addEventListener('pointerleave', ctaOff);
    }
    page.addEventListener('click', onClick);

    return () => {
      disposed = true;
      if (!touch) {
        window.removeEventListener('pointermove', onPointer);
        root.removeEventListener('pointerleave', onLeave);
        ctaBtn?.removeEventListener('pointerenter', ctaOn);
        ctaBtn?.removeEventListener('pointerleave', ctaOff);
      }
      page.removeEventListener('click', onClick);
      hero?.removeAttribute('data-cursor');
      trigger?.kill();
      setPortfolioScene(null);
      scene?.destroy();
      scene = null;
      page.classList.remove('has-world');
    };
  }, []);

  return (
    <div className="pf-world" aria-hidden="true">
      <div ref={wrap} className="pf-world__view" />
      <div ref={veil} className="pf-world__veil" />
    </div>
  );
}
