'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { openVideo } from '@/components/VideoModal';
import { useJStep, useJActive, scrollToProgress } from './hooks';
import Button from './ui/Button';
import { Kicker } from './ui/Text';
import { hero, about, reels, services, showreel, projects, tools, clients, cta, site, stats } from '@/lib/journey/data';

/* =====================================================
   The HTML layer of the journey. Each chapter is a tall
   section (data-ch) with a sticky stage. The WebGL engine
   fades the [data-in]/[data-out] beats from the chapter's
   scroll progress and places [data-anchor] elements on
   3D points, so text and world move as one.
===================================================== */

const pad2 = (n) => String(n).padStart(2, '0');

/* 01 — EARTH */
export function EarthChapter() {
  return (
    <section className="j-ch j-earth" data-ch="earth" aria-labelledby="j-hero-title">
      <div className="j-stage">
        <div className="j-beat j-hero" data-in="-1" data-out="0.24">
          <Kicker>{hero.kicker}</Kicker>
          <h1 id="j-hero-title" className="j-hero__title">
            <span className="j-display j-display--xl">
              The next chapter
              <br />
              of creativity.
            </span>
          </h1>
          <span className="j-hero__sub">{hero.sub}</span>
          <p className="j-scrollhint" aria-hidden="true">
            <i /> Scroll to begin the journey
          </p>
        </div>
        <p className="j-beat j-center j-tag" data-in="0.3" data-out="0.55" aria-hidden="true">
          <span className="j-display j-display--md">Enter the atmosphere.</span>
        </p>
        <div className="j-beat j-center" data-in="0.6" data-out="0.86">
          <p className="j-display j-display--lg">
            Every great idea
            <br />
            starts somewhere.
          </p>
        </div>
      </div>
    </section>
  );
}

/* 02 — ATMOSPHERE / ABOUT */
export function CloudsChapter() {
  return (
    <section id="about" className="j-ch j-clouds" data-ch="clouds" aria-labelledby="j-about-title">
      <div className="j-stage">
        <p className="j-beat j-center j-ink-dark" data-in="0.06" data-out="0.3">
          <span className="j-display j-display--xl">Ours starts here.</span>
        </p>
        <div className="j-beat j-left j-glass" data-in="0.34" data-out="0.64">
          <Kicker>{about.kicker}</Kicker>
          <h2 id="j-about-title" className="j-display j-display--lg">
            {about.title[0]}
            <br />
            {about.title[1]}
          </h2>
          <p className="j-lead">{about.body}</p>
          <ul className="j-pills">
            {about.pillars.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="j-beat j-right j-glass" data-in="0.66" data-out="0.95">
          <ul className="j-stats">
            {stats.map((s) => (
              <li key={s.label}>
                <b>
                  {s.value}
                  {s.suffix}
                </b>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
          <blockquote className="j-quote">“{about.quote}”</blockquote>
          <ul className="j-caps" aria-label="Capabilities">
            {about.capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* 03 — LAUNCH COMPLEX / AI REELS as transmissions from the rocket */
export function PadChapter() {
  const ref = useRef(null);
  const step = useJStep(ref, -1);
  const live = useJActive(ref) && step >= 0;
  const active = Math.max(0, step);
  const r = reels[active];
  return (
    <section id="reels" ref={ref} className="j-ch j-pad" data-ch="pad" aria-labelledby="j-pad-title">
      <div className="j-stage">
        <div className="j-beat j-left j-top" data-in="0.03" data-out="0.27">
          <Kicker>Launch complex · AI reels</Kicker>
          <h2 id="j-pad-title" className="j-display j-display--lg">
            Prepare
            <br />
            for launch.
          </h2>
          <p className="j-lead">Our work, received as transmissions from the rocket. Scroll to move between its modules.</p>
        </div>

        <div className="j-anchor" data-anchor="reel" aria-hidden={step < 0}>
          <div className="j-beat j-holo" data-in="0.31" data-out="9">
            <span className="j-holo__line" aria-hidden="true" />
            <div className="j-holo__panel" key={r.title}>
              <p className="j-holo__label">
                <i className="j-live" aria-hidden="true" /> AI transmission {pad2(active + 1)} · Module {pad2(active + 1)}
              </p>
              <button type="button" className="j-holo__media" onClick={() => openVideo(r.full)} data-cursor="PLAY" aria-label={`Play ${r.title}, ${r.duration}`}>
                {live ? <video src={r.preview} poster={r.poster} muted loop playsInline autoPlay preload="auto" aria-hidden="true" tabIndex={-1} /> : <img src={r.poster} alt="" decoding="async" />}
                <span className="j-holo__scan" aria-hidden="true" />
                <span className="j-holo__play" aria-hidden="true">
                  ▶ {r.duration}
                </span>
              </button>
              <h3 className="j-h3">{r.title}</h3>
              <p className="j-small">{r.category}</p>
            </div>
          </div>
        </div>

        <ol className="j-beat j-modules" data-in="0.31" data-out="9" aria-label="Reels">
          {reels.map((m, i) => (
            <li key={m.title}>
              <button type="button" className={i === active ? 'is-active' : ''} aria-current={i === active ? 'step' : undefined} onClick={() => scrollToProgress(ref.current, 0.3 + (i / 4) * 0.7)} data-cursor="OPEN">
                <span>{pad2(i + 1)}</span> {m.title}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* 04 — LAUNCH */
export function LaunchChapter() {
  return (
    <section className="j-ch j-launch" data-ch="launch" aria-label="Launch">
      <div className="j-stage">
        <div className="j-beat j-count" data-in="0.02" data-out="0.8" aria-hidden="true">
          <span data-hud="count">T − 10</span>
          <small data-hud="lphase">Systems check</small>
        </div>
        <p className="j-beat j-center j-top" data-in="-1" data-out="0.14">
          <span className="j-display j-display--lg">Ignition sequence.</span>
        </p>
        <p className="j-beat j-center j-top" data-in="0.42" data-out="0.58">
          <span className="j-display j-display--xl">Liftoff.</span>
        </p>
        <p className="j-beat j-center j-top" data-in="0.6" data-out="0.75">
          <span className="j-display j-display--lg">Creativity has no gravity.</span>
        </p>
        <p className="j-beat j-center" data-in="0.86" data-out="9">
          <span className="j-display j-display--lg">We’re just getting started.</span>
        </p>
      </div>
    </section>
  );
}

/* 05 — SHOWREEL, seen from orbit */
export function ShowreelChapter() {
  const vid = useRef(null);
  const [hot, setHot] = useState(false);
  const enter = () => {
    setHot(true);
    const v = vid.current;
    if (!v) return;
    if (!v.src) v.src = showreel.preview;
    v.play().catch(() => { });
  };
  const leave = () => {
    setHot(false);
    vid.current?.pause();
  };
  return (
    <section className="j-sec j-showreel" data-ch="showreel" aria-labelledby="j-showreel-title">
      <div className="j-wrap j-center">
        <Kicker>Showreel · {showreel.duration}</Kicker>
        <h2 id="j-showreel-title" className="j-display j-display--lg">
          {showreel.title[0]} {showreel.title[1]}
        </h2>
        <p className="j-lead">{showreel.copy}</p>
        <button
          type="button"
          className={`j-reel${hot ? ' is-hot' : ''}`}
          onClick={() => openVideo(showreel.full)}
          onPointerEnter={enter}
          onPointerLeave={leave}
          onFocus={enter}
          onBlur={leave}
          data-cursor="PLAY"
          aria-label={`Play the Contenaissance showreel, ${showreel.duration}`}
        >
          <img src={showreel.poster} alt="" loading="lazy" decoding="async" />
          <video ref={vid} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
          <span className="j-reel__play" aria-hidden="true">
            <i>▶</i> Play showreel
          </span>
        </button>
      </div>
    </section>
  );
}

/* 06 — SERVICES as worlds */
export function WorldsChapter() {
  const ref = useRef(null);
  const step = useJStep(ref, 0);
  const s = services[Math.max(0, step)];
  return (
    <section id="services" ref={ref} className="j-ch j-worlds" data-ch="worlds" aria-labelledby="j-services-title" style={{ '--n': services.length }}>
      <div className="j-stage">
        <header className="j-beat j-left j-top" data-in="-1" data-out="0.1">
          <Kicker>Our AI stages · Services</Kicker>
          <h2 id="j-services-title" className="j-display j-display--lg">
            Welcome to
            <br />
            the AI universe.
          </h2>
        </header>
        <div className="j-beat j-left j-panel j-world" data-in="0.08" data-out="9" aria-live="polite">
          <div key={s.code}>
            <Kicker gold={false}>
              Planet {s.code} · {s.planet.name}
            </Kicker>
            <p className="j-world__stage">{s.title}</p>
            <h3 className="j-h3">{s.heading}</h3>
            <p className="j-body j-clamp">{s.body}</p>
            <ul className="j-caps">
              {s.caps.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <Link href={s.href} className="j-link" data-cursor="EXPLORE">
              Explore service
            </Link>
          </div>
        </div>
        <ol className="j-beat j-dots" data-in="0.08" data-out="9" aria-label="Service worlds">
          {services.map((x, i) => (
            <li key={x.code}>
              <button type="button" className={i === step ? 'is-active' : ''} aria-current={i === step ? 'step' : undefined} onClick={() => scrollToProgress(ref.current, i / (services.length - 1))} data-cursor="VISIT">
                <span>{x.code}</span>
                <b>{x.title}</b>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* 07 — PORTFOLIO GALAXY */
export function GalaxyChapter() {
  const ref = useRef(null);
  const step = useJStep(ref, -1);
  const p = projects[Math.max(0, step)];
  const n = projects.length;
  return (
    <section id="work" ref={ref} className="j-ch j-galaxy" data-ch="galaxy" aria-labelledby="j-work-title" style={{ '--n': n }}>
      <div className="j-stage">
        <header className="j-beat j-center j-top" data-in="-1" data-out="0.1">
          <Kicker>Portfolio galaxy</Kicker>
          <h2 id="j-work-title" className="j-display j-display--lg">
            Mission archive.
          </h2>
          <p className="j-lead">Every project, a star system. Scroll to fly between them.</p>
        </header>
        <div className="j-anchor" data-anchor="frame">
          <button type="button" className="j-beat j-target" data-in="0.1" data-out="9" onClick={() => openVideo(p.full)} data-cursor="VIEW" aria-label={`View project: ${p.title}`} />
        </div>
        <div className="j-beat j-right j-panel j-mission" data-in="0.1" data-out="9" aria-live="polite">
          <div key={p.code}>
            <p className="j-mission__count" aria-hidden="true">
              <b>{p.code}</b> / {pad2(n)}
            </p>
            <Kicker gold={false}>
              Mission {p.code} · {p.category}
            </Kicker>
            <h3 className="j-h3">{p.title}</h3>
            <p className="j-body">{p.body}</p>
            <div className="j-row">
              <button type="button" className="j-link" onClick={() => openVideo(p.full)} data-cursor="VIEW">
                View project · {p.duration}
              </button>
              <Link href="/portfolio" className="j-link j-link--quiet" data-cursor="EXPLORE">
                Full archive
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 08 — AI TOOL CONSTELLATION */
export function ToolsChapter() {
  return (
    <section className="j-ch j-tools" data-ch="tools" aria-labelledby="j-tools-title">
      <div className="j-stage">
        <header className="j-beat j-center j-top" data-in="-1" data-out="0.5">
          <Kicker>The AI universe</Kicker>
          <h2 id="j-tools-title" className="j-display j-display--lg">
            AI × creativity.
          </h2>
          <p className="j-lead">Powered by the tools shaping the future.</p>
        </header>
        <p className="j-beat j-center j-top" data-in="0.6" data-out="9" aria-hidden="true">
          <span className="j-display j-display--md">{tools.length} tools. One orbit.</span>
        </p>
        <ul className="j-sr" aria-label="AI tools we work with">
          {tools.map((t) => (
            <li key={t.id}>{t.name}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 09 — HUMAN × AI × STORY */
const TRIO = [
  { word: 'Human', pillar: about.pillars[0] },
  { word: 'AI', pillar: about.pillars[1] },
  { word: 'Story', pillar: about.pillars[2] },
];
export function TrinityChapter() {
  return (
    <section className="j-ch j-trinity" data-ch="trinity" aria-labelledby="j-trinity-title">
      <div className="j-stage">
        <h2 id="j-trinity-title" className="j-sr">
          Human × AI × Story: creativity, Contenaissance
        </h2>
        <header className="j-beat j-center j-top" data-in="-1" data-out="0.16" aria-hidden="true">
          <Kicker>Our creative philosophy</Kicker>
          <p className="j-display j-display--lg">Human × AI × Story</p>
        </header>
        {TRIO.map((t, i) => (
          <div key={t.word} className="j-anchor" data-anchor={`ring-${i}`}>
            <p className="j-beat j-ringlabel" data-in={0.08 + i * 0.04} data-out="0.62" aria-hidden="true">
              <b>{t.word}</b>
              <small>{t.pillar}</small>
            </p>
          </div>
        ))}
        <div className="j-anchor" data-anchor="core">
          <p className="j-beat j-coreword" data-in="0.6" data-out="0.8" aria-hidden="true">
            Creativity
          </p>
          <p className="j-beat j-coreword j-coreword--brand" data-in="0.84" data-out="9" aria-hidden="true">
            Contenaissance
          </p>
        </div>
      </div>
    </section>
  );
}

/* 10 — CLIENT SIGNALS */
const STAR = [
  [16, 34],
  [34, 66],
  [52, 26],
  [66, 60],
  [84, 38],
];
export function ClientsChapter() {
  const ref = useRef(null);
  const step = useJStep(ref, 0);
  const [pick, setPick] = useState(null);
  const n = clients.length;
  const active = pick ?? Math.max(0, step);
  const c = clients[active];
  const go = (i) => {
    setPick(null);
    scrollToProgress(ref.current, (i + 0.5) / n);
  };
  return (
    <section ref={ref} className="j-ch j-clients" data-ch="clients" aria-labelledby="j-clients-title" style={{ '--n': n }} onPointerLeave={() => setPick(null)}>
      <div className="j-stage">
        <header className="j-beat j-left j-top" data-in="-1" data-out="9">
          <Kicker>Client constellation</Kicker>
          <h2 id="j-clients-title" className="j-display j-display--md">
            Signals from our clients.
          </h2>
        </header>
        <ul className="j-beat j-stars" data-in="-1" data-out="9" aria-label="Clients">
          {clients.map((cl, i) => (
            <li key={cl.company} className={i === active ? 'is-active' : ''} style={{ '--x': `${STAR[i % 5][0]}%`, '--y': `${STAR[i % 5][1]}%` }}>
              <button type="button" aria-pressed={i === active} onClick={() => go(i)} onPointerEnter={() => setPick(i)} data-cursor="TRANSMIT">
                <i aria-hidden="true" />
                <span>{cl.company}</span>
              </button>
            </li>
          ))}
          <svg className="j-stars__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={STAR.map(([x, y]) => `${x},${y}`).join(' ')} />
          </svg>
        </ul>
        <figure className="j-beat j-right j-panel j-transmission" data-in="-1" data-out="9" aria-live="polite">
          <div key={c.company}>
            <p className="j-holo__label">
              <i className="j-live" aria-hidden="true" /> Incoming transmission · {pad2(active + 1)} / {pad2(n)}
            </p>
            <blockquote>
              <p>“{c.quote}”</p>
            </blockquote>
            <figcaption>
              <b>{c.company}</b>
              <span>{c.role}</span>
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}

/* 12 — LOGO + CALL TO ACTION */
export function LogoChapter() {
  return (
    <section id="contact" className="j-ch j-logo" data-ch="logo" aria-labelledby="j-cta-title">
      <div className="j-stage">
        <p className="j-beat j-hint" data-in="0.02" data-out="0.6" aria-hidden="true">
          Keep scrolling · the mark is forming
        </p>
        <div className="j-beat j-cta" data-in="0.84" data-out="9">
          <Kicker>Start a mission</Kicker>
          <h2 id="j-cta-title" className="j-display j-display--lg">
            {cta.title[0]} {cta.title[1]}
          </h2>
          <p className="j-lead">{cta.body}</p>
          <div className="j-cta__actions">
            <Button href={cta.href} cursor="LAUNCH">
              {cta.button}
            </Button>
          </div>
          <p className="j-cta__direct">
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <span aria-hidden="true">·</span>
            <a href={site.phoneHref}>{site.phone}</a>
          </p>
        </div>
      </div>
    </section>
  );
}
