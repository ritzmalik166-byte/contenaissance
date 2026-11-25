'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, isTouch } from '@/lib/user/gsap';
import { nav, site } from '@/lib/journey/data';

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [solid, setSolid] = useState(false);
  const logo = useRef(null);

  useEffect(() => {
    const el = logo.current;
    if (!el || isTouch()) return undefined;
    const x = gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3.out' });
    const move = (e) => {
      const b = el.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2);
      const dy = e.clientY - (b.top + b.height / 2);
      const k = Math.max(0, 1 - Math.hypot(dx, dy) / 360);
      x(dx * 0.07 * k);
      y(dy * 0.07 * k);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' },
    );
    nav.forEach((n) => {
      const el = document.getElementById(n.href.slice(1));
      if (el) io.observe(el);
    });
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
    const key = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);

  const go = (href) => (e) => {
    e.preventDefault();
    setOpen(false);
    const t = document.querySelector(href);
    setTimeout(() => {
      if (window.__lenis) window.__lenis.scrollTo(t, { duration: 1.5, offset: 0 });
      else t?.scrollIntoView({ behavior: 'smooth' });
    }, open ? 80 : 0);
  };

  return (
    <>
      <header className={`m-nav${solid ? ' is-solid' : ''}${open ? ' is-open' : ''}`}>
        <Link href="/" className="m-nav__brand" aria-label="Contenaissance, home" data-cursor="HOME">
          <img ref={logo} src="/images/logo.png" alt="Contenaissance — Ritz GenAI Storytelling Studios" width="274" height="133" />
        </Link>
        <p className="m-nav__status" aria-hidden="true">
          <i /> System online
        </p>
        <nav className="m-nav__links" aria-label="Primary">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={go(n.href)} className={current === n.href.slice(1) ? 'is-current' : ''} aria-current={current === n.href.slice(1) ? 'location' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        <Link href="/contact" className="m-nav__cta" data-cursor="LAUNCH">
          Start a project
        </Link>
        <button type="button" className="m-nav__menu" aria-expanded={open} aria-controls="m-menu" onClick={() => setOpen((o) => !o)}>
          <span>{open ? 'Close' : 'Menu'}</span>
          <i aria-hidden="true" />
        </button>
      </header>
      <div id="m-menu" className={`m-menu${open ? ' is-open' : ''}`} inert={!open} role="dialog" aria-modal="true" aria-label="Menu">
        <ul>
          {nav.map((n, i) => (
            <li key={n.href} style={{ '--i': i }}>
              <a href={n.href} onClick={go(n.href)}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="m-menu__contact">
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <a href={site.phoneHref}>{site.phone}</a>
        </p>
      </div>
    </>
  );
}
