'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/user/gsap';
import { announceReady } from '@/lib/user/ready';
import Header from './Header';
import Footer from './Footer';
import Cursor from './Cursor';
import VideoModal from './VideoModal';
import PageTransition from './PageTransition';
import Motion from './Motion';

export default function Shell({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    const fallback = setTimeout(announceReady, 800);
    document.fonts.ready.then(() => {
      clearTimeout(fallback);
      if (!window.__siteReady) announceReady();
    });
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time) => {
      lenis.raf(time * 1000);
      // the home page's WebGL journey renders in the same tick, after the scroll moved
      window.__journeyFrame?.(performance.now());
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  useEffect(() => {
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    const id = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => clearTimeout(id);
  }, [pathname]);

  // The home and services pages are immersive WebGL journeys with their own
  // navigation, cursor and footer (components/journey), so the standard chrome steps aside.
  const immersive = pathname === '/' || pathname === '/services';

  return (
    <>
      <PageTransition />
      <Motion />
      {!immersive && <Cursor />}
      {!immersive && <Header />}
      <main>{children}</main>
      {!immersive && <Footer />}
      <VideoModal />
    </>
  );
}
