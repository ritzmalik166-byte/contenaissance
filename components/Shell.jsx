'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { announceReady } from '@/lib/ready';
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

    const tick = (time) => lenis.raf(time * 1000);
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

  return (
    <>
      <PageTransition />
      <Motion />
      <Cursor />
      <Header />
      <main>{children}</main>
      <Footer />
      <VideoModal />
    </>
  );
}
