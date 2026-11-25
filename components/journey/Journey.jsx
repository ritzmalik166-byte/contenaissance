'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isTouch, prefersReducedMotion } from '@/lib/user/gsap';
import { useReveal } from './hooks';
import Loader from './ui/Loader';
import Navigation from './ui/Navigation';
import Cursor from './ui/Cursor';
import { EarthChapter, CloudsChapter, PadChapter, LaunchChapter, ShowreelChapter, WorldsChapter, GalaxyChapter, ToolsChapter, TrinityChapter, ClientsChapter, LogoChapter } from './Chapters';
import { Blog, Footer } from './Closing';
import { projects, tools } from '@/lib/journey/data';
import './journey.css';

/* =====================================================
   CONTENAISSANCE — EARTH → ROCKET → SPACE → AI UNIVERSE
   A real website (HTML content, links, video, SEO) laid
   over one fixed WebGL world that the scroll travels
   through. The engine (three.js) is loaded after first
   paint, so the page itself stays light.
===================================================== */
export default function Journey({ posts = [] }) {
  const root = useRef(null);
  const canvas = useRef(null);
  const [ready, setReady] = useState(false);
  const [gl, setGl] = useState('pending');
  useReveal(root);
  const onDone = useCallback(() => setReady(true), []);

  useEffect(() => {
    let world = null;
    let cancelled = false;
    const mobile = window.matchMedia('(max-width: 760px)').matches || isTouch() || (navigator.hardwareConcurrency || 8) <= 4;
    import('@/lib/journey/engine').then(({ createJourney }) => {
      if (cancelled) return;
      world = createJourney({ canvas: canvas.current, root: root.current, mobile, reduced: prefersReducedMotion(), projects, tools });
      setGl(world ? 'on' : 'off');
    });
    return () => {
      cancelled = true;
      world?.dispose();
    };
  }, []);

  return (
    <div ref={root} className={`journey${ready ? ' is-ready' : ''} gl-${gl}`}>
      <a href="#about" className="m-skip">
        Skip to content
      </a>
      <canvas ref={canvas} className="j-canvas" aria-hidden="true" />
      <div className="j-veil" data-veil aria-hidden="true" />
      <div className="j-grain" aria-hidden="true" />
      <Loader onDone={onDone} />
      <Cursor />
      <Navigation />
      <aside className="j-hud" aria-hidden="true">
        <span className="j-hud__bar">
          <i data-hud="bar" />
        </span>
        <span className="j-hud__text">
          <b data-hud="chapter">01</b>
          <span data-hud="name">Earth</span>
          <small>
            <span data-hud="phase">Orbit</span>
            <span data-hud="alt" />
          </small>
        </span>
      </aside>
      <main className="j-main">
        <EarthChapter />
        <CloudsChapter />
        <PadChapter />
        <LaunchChapter />
        <ShowreelChapter />
        <WorldsChapter />
        <GalaxyChapter />
        <ToolsChapter />
        <TrinityChapter />
        <ClientsChapter />
        <Blog posts={posts} />
        <LogoChapter />
      </main>
      <Footer />
    </div>
  );
}
