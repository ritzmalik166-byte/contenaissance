'use client';

import { useRef, useState } from 'react';
import { openVideo } from '@/components/VideoModal';
import { useJStep, useJActive } from '../hooks';
import Button from '../ui/Button';
import { Kicker } from '../ui/Text';
import LiveVideo from '../ui/LiveVideo';
import { hero, constellations, featured, missions, finale } from '@/lib/journey/portfolio-data';

/* =====================================================
   The HTML layer of the portfolio journey (Chapter 03 ·
   The Missions). Same grammar as home and services: tall
   [data-ch] sections with a sticky stage, beats faded by
   the engine, [data-anchor] labels pinned to constellations,
   [data-progress] giving --p for the parallax layers.
===================================================== */

const pad2 = (n) => String(n).padStart(2, '0');

/** four gold corner brackets around whatever they wrap */
export const Corners = () => (
  <span className="ms-corners" aria-hidden="true">
    <i />
    <i />
    <i />
    <i />
  </span>
);

/* 01 — THE GUIDING STAR */
export function HeroChapter() {
  return (
    <section className="j-ch ms-hero" data-ch="hero" aria-labelledby="ms-title">
      <div className="j-stage">
        <span className="j-beat ms-viewfinder" data-in="-1" data-out="0.38" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>

        {constellations.map((c, i) => (
          <div key={c.code} className="j-anchor" data-anchor={`c-${i}`}>
            <p className={`j-beat ms-const${c.align === 'left' ? ' ms-const--left' : ''}`} data-in="-1" data-out="0.38" aria-hidden="true">
              {c.code} <span>·</span> {c.label}
            </p>
          </div>
        ))}

        <div className="j-beat j-center ms-hero__copy" data-in="-1" data-out="0.36">
          <Kicker>
            {hero.kicker[0]} <span className="ij-sep" aria-hidden="true" /> {hero.kicker[1]}
          </Kicker>
          <h1 id="ms-title" className="j-display ms-hero__title">
            {hero.title}
            <span className="ms-accent">{hero.accent}</span>
          </h1>
          <p className="j-lead">{hero.sub}</p>
        </div>

        <p className="j-beat ms-readout ms-readout--l" data-in="-1" data-out="0.36" aria-hidden="true">
          {hero.coords}
        </p>
        <p className="j-beat ms-readout ms-readout--r" data-in="-1" data-out="0.36" aria-hidden="true">
          Archive index · {pad2(missions.length)} missions logged
        </p>

        <div className="j-beat j-center" data-in="0.44" data-out="0.72">
          <p className="j-display j-display--lg">
            Every Mission,
            <br />a Star of its Own.
          </p>
        </div>
        <p className="j-beat j-center ij-transit" data-in="0.76" data-out="0.97" aria-hidden="true">
          <span>Plotting course</span> Mission {featured[0].code}
        </p>
      </div>
    </section>
  );
}

/* 02–04 — FEATURED MISSIONS */
export function MissionChapter({ m, k }) {
  const ref = useRef(null);
  const step = useJStep(ref, 0);
  const active = useJActive(ref);
  const [hover, setHover] = useState(false);
  const on = step >= 1;
  const side = k % 2 === 0 ? 'media-left' : 'media-right';
  const id = `ms-m${k}`;
  const play = () => openVideo(m.full, m.poster);
  return (
    <section ref={ref} id={`mission-${m.code}`} className={`j-ch ms-mission ms-mission--${side}${on ? ' is-on' : ''}`} data-ch={`mission-${k}`} aria-labelledby={id}>
      <div className="j-stage">
        {k === 0 && (
          <header className="j-beat j-center ms-mission__intro" data-in="-1" data-out="0.07">
            <Kicker>01 / Mission highlights</Kicker>
            <h2 className="j-display j-display--lg">Featured Missions.</h2>
          </header>
        )}
        <p className="j-beat ms-mission__kicker" data-in="0.06" data-out="0.96" aria-hidden="true">
          01 / Mission highlights <span>·</span> {pad2(k + 1)} / {pad2(featured.length)}
        </p>

        {/* the visual drifts on a slower parallax layer than the copy (--p from the engine) */}
        <div className="j-beat ms-mission__media" data-in="0.06" data-out="0.96" data-f="0.08" data-progress>
          <div className="ms-shot">
            <span className="ms-shot__ghost" aria-hidden="true" />
            <Corners />
            <button
              type="button"
              className="ms-shot__frame"
              onClick={play}
              onPointerEnter={() => setHover(true)}
              onPointerLeave={() => setHover(false)}
              onFocus={() => setHover(true)}
              onBlur={() => setHover(false)}
              data-cursor="PLAY"
              aria-label={`Play ${m.title}`}
            >
              <img src={m.poster} alt="" loading="lazy" decoding="async" />
              {m.preview && <LiveVideo src={m.preview} poster={m.poster} live={active && on && hover} />}
              <span className="ms-shot__code">
                {m.code} <span>·</span> {pad2(k + 1)} / {pad2(featured.length)}
              </span>
              <span className="ms-pill">
                <i aria-hidden="true" /> <span className="ms-pill__hover">Preview · Hover</span>
                <span className="ms-pill__tap">Tap to play</span>
              </span>
            </button>
          </div>
        </div>

        <div className="j-beat ms-mission__copy" data-in="0.12" data-out="0.96" data-progress>
          <p className="ms-mission__code">Mission {m.code}</p>
          <span className="ms-mission__num" aria-hidden="true">
            {pad2(k + 1)}
          </span>
          <h2 id={id} className="ms-mission__title">
            {m.title}
          </h2>
          <p className="ms-mission__cat">{m.category}</p>
          <p className="ms-mission__body">{m.summary}</p>
          <button type="button" className="ij-explore" onClick={play} data-cursor="PLAY">
            Explore mission <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* 06 — THE NEXT MISSION: a launch beam rises */
export function FinaleChapter() {
  return (
    <section id="launch" className="j-ch ms-finale" data-ch="finale" aria-labelledby="ms-finale-title">
      <div className="j-stage">
        <div className="j-beat j-center ms-finale__inner" data-in="0.3" data-out="9">
          <Kicker>{finale.kicker}</Kicker>
          <h2 id="ms-finale-title" className="j-display j-display--lg">
            {finale.title[0]}
            <br />
            {finale.title[1]}
          </h2>
          <div className="ms-finale__cta">
            <Button href={finale.href} cursor="LAUNCH">
              {finale.button}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
