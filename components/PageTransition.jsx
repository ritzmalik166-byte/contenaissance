'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { announceReady } from '@/lib/ready';

const COLS = 5;

const labelFor = (path) => {
  if (path === '/') return 'Home';
  if (path.startsWith('/blog/')) return 'Article';
  const map = { '/services': 'Services', '/portfolio': 'Portfolio', '/blog': 'Journal', '/contact': 'Contact' };
  return map[path] || 'Contenaissance';
};

const scrollToHash = (hash, immediate) => {
  const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return false;
  if (window.__lenis) window.__lenis.scrollTo(target, { offset: -100, immediate, duration: 1.6 });
  else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
  return true;
};

export default function PageTransition() {
  const root = useRef(null);
  const pending = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const [label, setLabel] = useState('');

  useEffect(() => {
    const el = root.current;
    gsap.set(el.querySelectorAll('.ptrans__col'), { scaleY: 0 });

    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      e.preventDefault();
      e.stopPropagation();

      if (url.pathname === window.location.pathname) {
        if (!scrollToHash(url.hash, false)) window.__lenis?.scrollTo(0, { duration: 1.6 });
        if (url.hash) window.history.replaceState(null, '', url.hash);
        return;
      }
      if (pending.current) return;

      const href = url.pathname + url.search + url.hash;
      pending.current = { href, hash: url.hash };
      setLabel(labelFor(url.pathname));
      window.__siteReady = false;
      window.__lenis?.stop();

      if (prefersReducedMotion()) {
        router.push(href, { scroll: false });
        return;
      }
      gsap
        .timeline()
        .set(el, { visibility: 'visible' })
        .set('.ptrans__col', { transformOrigin: '50% 100%' })
        .to('.ptrans__col', { scaleY: 1, duration: 0.7, ease: 'power4.inOut', stagger: { each: 0.06, from: 'start' } })
        .fromTo('.ptrans__center > *', { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, 0.35)
        .add(() => router.push(href, { scroll: false }));
    };

    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [router]);

  useEffect(() => {
    const job = pending.current;
    if (!job) return;
    const el = root.current;

    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);

    const reveal = () => {
      ScrollTrigger.refresh();
      window.__lenis?.start();
      announceReady();
      if (job.hash) setTimeout(() => scrollToHash(job.hash, false), 500);
      pending.current = null;
    };

    if (prefersReducedMotion()) {
      reveal();
      return;
    }

    const tl = gsap
      .timeline({ delay: 0.15 })
      .to('.ptrans__center > *', { yPercent: -120, opacity: 0, duration: 0.45, ease: 'power3.in', stagger: 0.05 })
      .set('.ptrans__col', { transformOrigin: '50% 0%' })
      .add(reveal)
      .to('.ptrans__col', { scaleY: 0, duration: 0.8, ease: 'power4.inOut', stagger: { each: 0.06, from: 'end' } })
      .set(el, { visibility: 'hidden' });
    return () => tl.progress(1);
  }, [pathname]);

  return (
    <div ref={root} className="ptrans" aria-hidden="true">
      {Array.from({ length: COLS }, (_, i) => (
        <span className="ptrans__col" key={i} />
      ))}
      <div className="ptrans__center">
        <img src="/images/logo.png" alt="" />
        <span className="ptrans__label">{label}</span>
      </div>
    </div>
  );
}
