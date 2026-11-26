
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { nav, site } from '@/lib/journey/data';

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  // this nav only lives on the home page, so Home is the current item.
  // (The old scroll-spy matched /services and /blog to the #services and
  // #blog sections, lighting "Services" up while scrolling the planets.)
  const isCurrent = (href) => href === '/';

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 40);

      if (Math.abs(y - lastY) < 6) return;

      setHidden(y > 80 && y > lastY);
      lastY = y;
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();

    const key = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', key);

    return () => {
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  // Home: we're already here, so glide back to the top.
  // Other items are real pages: let the Link navigate, just close the menu.
  const go = (href) => (e) => {
    setOpen(false);
    if (href !== '/') return;
    e.preventDefault();
    setTimeout(() => {
      if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.5 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, open ? 80 : 0);
  };

  return (
    <>
      <header
        className={`m-nav${solid ? ' is-solid' : ''}${hidden && !open ? ' is-hidden' : ''}${open ? ' is-open' : ''}`}
      >
        <Link
          href="/"
          className="m-nav__brand"
          aria-label="Contenaissance, home"
          data-cursor="HOME"
        >
          <img
            src="/images/logo-400.webp"
            alt="Contenaissance — Ritz GenAI Storytelling Studios"
            width="274"
            height="133"
          />
        </Link>

        <p className="m-nav__status" aria-hidden="true">
          <i /> System online
        </p>

        <nav className="m-nav__links" aria-label="Primary">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={go(n.href)}
              className={isCurrent(n.href) ? 'is-current' : ''}
              aria-current={isCurrent(n.href) ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link href="/contact" className="m-nav__cta" data-cursor="LAUNCH">
          Start a project
        </Link>

        <button
          type="button"
          className="m-nav__menu"
          aria-expanded={open}
          aria-controls="m-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {/* <span>{open ? 'Close' : 'Menu'}</span> */}
          <i aria-hidden="true" />
        </button>
      </header>

      <div
        id="m-menu"
        className={`m-menu${open ? ' is-open' : ''}`}
        inert={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <ul>
          {nav.map((n, i) => (
            <li key={n.href} style={{ '--i': i }}>
              <Link href={n.href} onClick={go(n.href)} aria-current={isCurrent(n.href) ? 'page' : undefined}>
                {n.label}
              </Link>
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
