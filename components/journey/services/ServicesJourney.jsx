'use client';

import { useEffect, useRef, useState } from 'react';
import { isTouch, prefersReducedMotion } from '@/lib/user/gsap';
import { useReveal } from '../hooks';
import Navigation from '../ui/Navigation';
import Cursor from '../ui/Cursor';
import { Footer } from '../Closing';
import { IntroChapter, WorldChapter, ProcessChapter, FinaleChapter } from './Chapters';
import { worlds } from '@/lib/journey/services-data';
import '../journey.css';
import './services.css';

/* =====================================================
   CONTENAISSANCE — SERVICES: A UNIVERSE OF SIX WORLDS
   Built exactly like the home journey: real HTML chapters
   over one fixed WebGL solar system that the scroll flies
   through. Overview → dive → Mars, Neptune, Jupiter, Venus,
   Saturn, Earth (one world per service) → pull back for the
   mission plan → the orbits close around the call to action.
===================================================== */
export default function ServicesJourney() {
  const root = useRef(null);
  const canvas = useRef(null);
  const [ready, setReady] = useState(false);
  const [gl, setGl] = useState('pending');
  useReveal(root);

  useEffect(() => {
    let world = null;
    let cancelled = false;
    const onReady = () => setReady(true);
    window.addEventListener('services:ready', onReady);
    // never hold the page: nav + HUD appear even if textures are slow
    const fallback = setTimeout(onReady, 2600);
    const mobile = window.matchMedia('(max-width: 760px)').matches || isTouch() || (navigator.hardwareConcurrency || 8) <= 4;
    import('@/lib/journey/services-engine').then(({ createServicesJourney }) => {
      if (cancelled) return;
      world = createServicesJourney({
        canvas: canvas.current,
        root: root.current,
        mobile,
        reduced: prefersReducedMotion(),
        names: worlds.map((w) => `${w.planet} · ${w.title}`),
      });
      setGl(world ? 'on' : 'off');
      if (!world) setReady(true);
    });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      window.removeEventListener('services:ready', onReady);
      world?.dispose();
    };
  }, []);

  return (
    <div ref={root} className={`journey sv${ready ? ' is-ready' : ''} gl-${gl}`}>
      <a href="#worlds" className="m-skip">
        Skip to services
      </a>
      <canvas ref={canvas} className="j-canvas" aria-hidden="true" />
      <div className="j-veil sv-veil" data-veil aria-hidden="true" />
      <div className="j-grain" aria-hidden="true" />
      <Cursor />
      <Navigation />
      <aside className="j-hud" aria-hidden="true">
        <span className="j-hud__bar">
          <i data-hud="bar" />
        </span>
        <span className="j-hud__text">
          <b data-hud="chapter">01</b>
          <span data-hud="name">The universe</span>
          <small>
            <span data-hud="phase">Overview</span>
            <span data-hud="alt" />
          </small>
        </span>
      </aside>
      <main className="j-main">
        <IntroChapter />
        <div id="worlds">
          {worlds.map((w) => (
            <WorldChapter key={w.code} w={w} />
          ))}
        </div>
        <ProcessChapter />
        <FinaleChapter />
      </main>
      <Footer />
    </div>
  );
}
