'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScrollTrigger } from '@/lib/gsap';
import { nav } from '@/lib/content';
import { ArrowUpRight } from './Icons';

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        setSolid(y > 80);
        setHidden(y > 300 && self.direction === 1);
      },
    });
    return () => st.kill();
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
  }, [open]);

  return (
    <>
      <header className={`header${hidden && !open ? ' is-hidden' : ''}${solid ? ' is-solid' : ''}`}>
        <div className="container header__inner">
          <Link href="/" className="logo" aria-label="Contenaissance home">
            <img src="/images/logo.png" alt="Contenaissance — Ritz GenAI Storytelling Studios" />
          </Link>

          <nav className="nav" aria-label="Primary">
            {nav.map((item) => (
              <Link key={item.label} href={item.href} className="nav__link" data-cursor-hover>
                <span>{item.label}</span>
                <span aria-hidden="true">{item.label}</span>
              </Link>
            ))}
            <Link href="/contact" className="nav__cta" data-cursor-hover>
              Start a mission <ArrowUpRight />
            </Link>
          </nav>

          <button
            className={`burger${open ? ' is-open' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`mobile-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <Link href="/">Home</Link>
        {nav.map((item) => (
          <Link key={item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
        <Link href="/contact" style={{ color: 'var(--gold)' }}>
          Start a mission
        </Link>
      </div>
    </>
  );
}
