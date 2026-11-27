'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useJStep, useJActive, scrollToProgress } from '../hooks';
import Button from '../ui/Button';
import { Kicker } from '../ui/Text';
import Showcase from './Showcases';
import { intro, worlds, process, finale } from '@/lib/journey/services-data';
import { site } from '@/lib/journey/data';

/* =====================================================
   The HTML layer of the services journey. Same grammar as
   the home chapters: tall [data-ch] sections with a sticky
   stage; [data-in]/[data-out] beats are faded by the engine
   from the chapter's progress; [data-anchor] elements are
   pinned to planets; [data-progress] gets --p (0..1).
===================================================== */

const pad2 = (n) => String(n).padStart(2, '0');
const goWorld = (i) => scrollToProgress(document.querySelector(`[data-ch="world-${i}"]`), 0.18);

/* 01 — THE UNIVERSE (overview, then the dive to the first world) */
export function IntroChapter() {
  return (
    <section className="j-ch sv-intro" data-ch="intro" aria-labelledby="sv-title">
      <div className="j-stage">
        <div className="j-beat sv-hero" data-in="-1" data-out="0.3">
          <Kicker>
            {intro.kicker[0]} <span className="sv-sep" aria-hidden="true" /> {intro.kicker[1]}
          </Kicker>
          <h1 id="sv-title" className="j-display j-display--xl sv-hero__title">
            {intro.title[0]}
            <br />
            {intro.title[1]}
            <br />
            {intro.title[2]}
          </h1>
          <p className="j-lead sv-hero__sub">{intro.sub}</p>
          <div className="sv-hero__cta">
            <Button onClick={() => goWorld(0)} cursor="DIVE">
              {intro.cta}
            </Button>
          </div>
        </div>

        {/* labels pinned to the six worlds of the overview */}
        {worlds.map((w, i) => (
          <div key={w.code} className="j-anchor sv-tag-anchor" data-anchor={`p-${i}`}>
            <button type="button" className="j-beat sv-tag" data-in="-1" data-out="0.32" onClick={() => goWorld(i)} data-cursor="VISIT" tabIndex={-1} aria-hidden="true">
              <i aria-hidden="true" />
              <span>{w.code}</span> {w.title}
            </button>
          </div>
        ))}

        <div className="j-beat j-center" data-in="0.4" data-out="0.66">
          <p className="j-display j-display--lg">
            Six Worlds.
            <br />
            One Creative Universe.
          </p>
        </div>
        <p className="j-beat j-center sv-transit" data-in="0.7" data-out="0.97" aria-hidden="true">
          <span>First stop</span> Planet 01 · {worlds[0].planet}
        </p>
      </div>
    </section>
  );
}

/* 02–07 — ONE WORLD PER SERVICE */
export function WorldChapter({ w }) {
  const ref = useRef(null);
  const step = useJStep(ref, 0);
  const active = useJActive(ref);
  const [open, setOpen] = useState(-1);
  const on = step >= 1;
  const side = w.index % 2 === 0 ? 'left' : 'right'; // side of the copy; the world sits opposite
  const hover = (v) => () => window.dispatchEvent(new CustomEvent('sv:hover', { detail: v ? w.index : -1 }));
  const id = `sv-w${w.code}`;
  return (
    <section
      id={`world-${w.code}`}
      ref={ref}
      className={`j-ch sv-world sv-world--${side}${on ? ' is-on' : ''}${active ? ' is-live' : ''}`}
      data-ch={`world-${w.index}`}
      aria-labelledby={id}
    >
      <div className="j-stage">
        <div className="sv-scrim" aria-hidden="true" />

        <p className="j-beat j-center sv-transit" data-in="-1" data-out="0.09" aria-hidden="true">
          <span>Approaching</span> Planet {w.code} · {w.planet}
        </p>

        <div className="j-beat sv-panel" data-in="0.1" data-out="0.96">
          <span className="sv-numeral" aria-hidden="true">
            {w.code}
          </span>
          <header className="sv-panel__head sv-r" style={{ '--i': 0 }}>
            <p className="sv-panel__planet">
              Planet {w.code} <span className="sv-sep" aria-hidden="true" /> {w.planet}
              {w.planetSub ? ` · ${w.planetSub}` : ''}
            </p>
            <p className="sv-panel__stage" aria-hidden="true">
              {w.stage}
            </p>
          </header>
          <h2 id={id} className="j-display sv-panel__title sv-r" style={{ '--i': 1 }}>
            {w.title}
          </h2>
          <p className="sv-panel__tag sv-r" style={{ '--i': 2 }}>
            {w.tagline[0]}
            <br />
            {w.tagline[1]}
          </p>
          <p className="sv-panel__body sv-r" style={{ '--i': 3 }}>
            {w.body}
          </p>
          <ul className="sv-caps">
            {w.caps.map((c, k) => {
              const cid = `${id}-c${k}`;
              const isOpen = open === k;
              return (
                <li key={c.title} className={`sv-r${isOpen ? ' is-open' : ''}`} style={{ '--i': 4 + k }}>
                  <h3>
                    <button type="button" aria-expanded={isOpen} aria-controls={cid} onClick={() => setOpen(isOpen ? -1 : k)} data-cursor={isOpen ? 'CLOSE' : 'OPEN'}>
                      <span className="sv-caps__n">{pad2(k + 1)}</span>
                      <span className="sv-caps__t">{c.title}</span>
                      <i aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={cid} className="sv-caps__body" role="region" aria-label={c.title}>
                    <div>
                      <p>{c.body}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href={w.href} className="sv-explore sv-r" style={{ '--i': 8 }} data-cursor="EXPLORE">
            Explore service <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="j-beat sv-show" data-in="0.15" data-out="0.95" onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
          <Showcase kind={w.show} live={active && on} />
        </div>

        <p className="j-beat sv-count" data-in="0.1" data-out="0.96" aria-hidden="true">
          <b>{w.code}</b> / {pad2(worlds.length)}
        </p>
      </div>
    </section>
  );
}

/* 08 — THE MISSION PLAN (process) */
// five stops on one arc (viewBox 1000 × 420): x = 500 − 470·cos(πt), y = 400 − 330·sin(πt)
const ARC = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ x: 500 - 470 * Math.cos(Math.PI * t), y: 400 - 330 * Math.sin(Math.PI * t) }));
const ARC_D = 'M30 400 A470 330 0 0 1 970 400';

export function ProcessChapter() {
  const ref = useRef(null);
  const step = useJStep(ref, 0);
  return (
    <section id="process" ref={ref} className="j-ch sv-process" data-ch="process" aria-labelledby="sv-process-title">
      <div className="j-stage">
        <header className="j-beat sv-process__head" data-in="-1" data-out="9">
          <div>
            <Kicker>{process.kicker}</Kicker>
            <h2 id="sv-process-title" className="j-display j-display--lg">
              {process.title[0]}
              <br />
              {process.title[1]}
            </h2>
          </div>
          <p className="j-lead">{process.body}</p>
        </header>
        <div className="j-beat sv-arc" data-in="0.02" data-out="9" data-progress>
          <svg className="sv-arc__svg" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
            <path className="sv-arc__track" d={ARC_D} pathLength="1" vectorEffect="non-scaling-stroke" />
            <path className="sv-arc__fill" d={ARC_D} pathLength="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="sv-arc__rail" aria-hidden="true">
            <i />
          </span>
          <ol>
            {process.steps.map((s, i) => (
              <li
                key={s.title}
                className={`${i <= step ? 'is-done' : ''}${i === step ? ' is-current' : ''}`}
                style={{ '--x': `${ARC[i].x / 10}%`, '--y': `${(ARC[i].y / 420) * 100}%` }}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className="sv-arc__node">{pad2(i + 1)}</span>
                <div className="sv-arc__text">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* 09 — THE ORBITS CLOSE: call to action */
export function FinaleChapter() {
  return (
    <section id="start" className="j-ch sv-finale" data-ch="finale" aria-labelledby="sv-finale-title">
      <div className="j-stage">
        <div className="j-beat j-center sv-finale__inner" data-in="0.22" data-out="9">
          <Kicker>{finale.kicker}</Kicker>
          <h2 id="sv-finale-title" className="j-display j-display--lg">
            {finale.title}
            <span className="sv-finale__accent">{finale.accent}</span>
          </h2>
          <div className="sv-finale__cta">
            <Button href={finale.href} cursor="LAUNCH">
              {finale.button}
            </Button>
          </div>
          <p className="sv-finale__direct">
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <span aria-hidden="true">·</span>
            <a href={site.phoneHref}>{site.phone}</a>
          </p>
        </div>
      </div>
    </section>
  );
}
