'use client';

import { useEffect, useRef, useState } from 'react';
import { isTouch, prefersReducedMotion } from '@/lib/user/gsap';
import { useReveal } from '../hooks';
import Navigation from './Navigation';
import Cursor from './Cursor';
import { Footer } from '../Closing';
import '../journey.css';

/* =====================================================
   The frame every inner-page journey shares (services,
   portfolio): the fixed WebGL canvas, the veil that lifts
   when the world is ready, film grain, cursor, navigation,
   the chapter HUD, the page's chapters and the footer.

   `engine(opts)` loads and creates the page's world, e.g.
     (o) => import('@/lib/journey/services-engine').then((m) => m.createServicesJourney(o))
   and resolves to { dispose } — or null when WebGL is
   unavailable, in which case the page reads as plain HTML
   (.gl-off).
===================================================== */
export default function InnerJourney({ className = '', engine, readyEvent, skip, hud, children }) {
  const root = useRef(null);
  const canvas = useRef(null);
  const [ready, setReady] = useState(false);
  const [gl, setGl] = useState('pending');
  useReveal(root);

  useEffect(() => {
    let world = null;
    let cancelled = false;
    const onReady = () => setReady(true);
    window.addEventListener(readyEvent, onReady);
    // never hold the page: nav + HUD appear even if textures are slow
    const fallback = setTimeout(onReady, 2600);
    const mobile = window.matchMedia('(max-width: 760px)').matches || isTouch() || (navigator.hardwareConcurrency || 8) <= 4;
    engine({ canvas: canvas.current, root: root.current, mobile, reduced: prefersReducedMotion() }).then((w) => {
      if (cancelled) return w?.dispose();
      world = w;
      setGl(w ? 'on' : 'off');
      if (!w) setReady(true);
    });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      window.removeEventListener(readyEvent, onReady);
      world?.dispose();
    };
    // the engine loader is defined once per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className={`journey ${className}${ready ? ' is-ready' : ''} gl-${gl}`}>
      {skip && (
        <a href={skip.href} className="m-skip">
          {skip.label}
        </a>
      )}
      <canvas ref={canvas} className="j-canvas" aria-hidden="true" />
      <div className="j-veil ij-veil" data-veil aria-hidden="true" />
      <div className="j-grain" aria-hidden="true" />
      <Cursor />
      <Navigation />
      <aside className="j-hud" aria-hidden="true">
        <span className="j-hud__bar">
          <i data-hud="bar" />
        </span>
        <span className="j-hud__text">
          <b data-hud="chapter">{hud?.chapter}</b>
          <span data-hud="name">{hud?.name}</span>
          <small>
            <span data-hud="phase">{hud?.phase}</span>
          </small>
        </span>
      </aside>
      <main className="j-main">{children}</main>
      <Footer />
    </div>
  );
}
