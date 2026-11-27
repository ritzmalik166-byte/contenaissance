'use client';

import { useEffect, useRef, useState } from 'react';
import { openVideo } from '@/components/VideoModal';
import { media } from '@/lib/journey/services-data';

/* =====================================================
   One small "proof" object per world, sitting between the
   copy and the planet. Each is only animated (videos play,
   counters tick, stages cycle) while its world is `live`
   (the current chapter and arrived), so off-screen worlds
   cost nothing.
===================================================== */

/** a muted preview that only loads and plays while live */
function LiveVideo({ src, poster, live }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (live) {
      if (!v.getAttribute('src')) v.src = src;
      v.play().catch(() => {});
    } else v.pause();
  }, [live, src]);
  return <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />;
}

/** a counter that ticks every `ms` while live */
function useTicker(live, ms, start = 0) {
  const [n, setN] = useState(start);
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [live, ms]);
  return n;
}

const tc = (s) => `00:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* 01 · AI brand films — a film strip, the first frame plays */
function FilmShow({ live }) {
  const t = useTicker(live, 1000, 24);
  const [a, b, c] = media.film;
  return (
    <div className="sv-film">
      <p className="sv-film__meta sv-mono">
        <i className="sv-rec" aria-hidden="true" /> REC <span>{tc(t)}</span>
        <span>2.39 : 1</span>
        <span className="sv-hide-sm">Contenaissance / AI Brand Films</span>
      </p>
      <div className="sv-film__strip">
        <button type="button" className="sv-film__frame sv-film__frame--hero" onClick={() => openVideo(a.full, a.poster)} data-cursor="PLAY" aria-label="Play an AI brand film">
          <LiveVideo src={a.preview} poster={a.poster} live={live} />
          <span className="sv-play" aria-hidden="true" />
        </button>
        <span className="sv-film__frame">
          <img src={b.poster} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="sv-film__frame">
          <img src={c.poster} alt="" loading="lazy" decoding="async" />
        </span>
      </div>
    </div>
  );
}

/* 02 · Digital-first content — three phones, feed / story / reel */
function PhonesShow({ live }) {
  return (
    <div className="sv-phones">
      <span className="sv-chip sv-phones__drop">
        <b aria-hidden="true">✦</b> New drop is live
      </span>
      {media.phones.map((m, i) => (
        <figure key={m.label} className={`sv-phone sv-phone--${i}`}>
          <div className="sv-phone__screen">
            <LiveVideo src={m.preview} poster={m.poster} live={live} />
            <span className="sv-phone__notch" aria-hidden="true" />
            <span className="sv-phone__bar" aria-hidden="true">
              <i />
            </span>
            <span className="sv-heart" aria-hidden="true">
              ♥
            </span>
            {m.caption && <span className="sv-phone__cap">{m.caption}</span>}
          </div>
          <figcaption className="sv-mono">{m.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/* 03 · AI-powered campaigns — live stages, the leading variant changes */
const STAGES = ['Launch', 'Learn', 'Optimise', 'Scale'];
const ABC = ['A', 'B', 'C'];
function CampaignShow({ live }) {
  const n = useTicker(live, 1500, 1);
  const s = n % 4;
  const lead = Math.floor(n / 4) % 3;
  const alt = (lead + 2) % 3;
  return (
    <div className="sv-camp">
      <div className="sv-camp__dash">
        <p className="sv-mono">
          <i className="sv-dot" aria-hidden="true" /> Campaign intelligence / live
        </p>
        <ol>
          {STAGES.map((x, i) => (
            <li key={x} className={`${i <= s ? 'is-on' : ''}${i === s ? ' is-cur' : ''}`}>
              <i aria-hidden="true" />
              <span>{x}</span>
            </li>
          ))}
        </ol>
      </div>
      <figure className="sv-camp__lead" key={`l${lead}`}>
        <img src={media.campaign[lead]} alt="" loading="lazy" decoding="async" />
        <figcaption className="sv-badge sv-badge--gold">Variant {ABC[lead]} · Leading</figcaption>
      </figure>
      <figure className="sv-camp__alt" key={`a${alt}`}>
        <img src={media.campaign[alt]} alt="" loading="lazy" decoding="async" />
        <figcaption className="sv-badge">Variant {ABC[alt]}</figcaption>
      </figure>
    </div>
  );
}

/* 04 · Visual identity — an application, a type specimen, the palette */
const SWATCHES = ['#f3eee4', '#e9b949', '#0b0b0b', '#8fa8ff'];
function IdentityShow() {
  return (
    <div className="sv-id">
      <span className="sv-id__grid" aria-hidden="true" />
      <figure className="sv-id__img">
        <img src={media.identity} alt="" loading="lazy" decoding="async" />
      </figure>
      <div className="sv-id__type">
        <b>Aa</b>
        <p className="sv-mono">Plus Jakarta Sans</p>
        <ul aria-label="Core colours">
          {SWATCHES.map((c, i) => (
            <li key={c} style={{ '--c': c, '--i': i }} />
          ))}
        </ul>
      </div>
      <p className="sv-id__note sv-mono">Grid 8 · Type scale 1.25 · 4 core colours</p>
    </div>
  );
}

/* 05 · AI creative services — prompt → model → frame, the image resolves */
const PIPE = ['Prompt', 'Model', 'Frame'];
function CreativeShow({ live }) {
  const n = useTicker(live, 1600, 2);
  const k = n % 3;
  return (
    <div className={`sv-gen is-k${k}`}>
      <figure className="sv-gen__card sv-gen__card--back">
        <img src={media.creative[0]} alt="" loading="lazy" decoding="async" />
      </figure>
      <figure className="sv-gen__card sv-gen__card--front">
        <img src={media.creative[1]} alt="" loading="lazy" decoding="async" />
        <span className="sv-gen__noise" aria-hidden="true" />
      </figure>
      <ol className="sv-gen__pipe">
        {PIPE.map((x, i) => (
          <li key={x} className={i === k ? 'is-cur' : i < k ? 'is-done' : ''}>
            {x}
          </li>
        ))}
      </ol>
      <p className="sv-gen__note sv-mono">Human brief → generative models → crafted final frame</p>
    </div>
  );
}

/* 06 · Digital marketing — channels signalling into one point on Earth */
const HUB = { x: 30, y: 46 };
const NODES = [
  { t: 'Search', x: 52, y: 6 },
  { t: 'Social', x: 82, y: 28 },
  { t: 'Paid media', x: 76, y: 58 },
  { t: 'Web', x: 14, y: 94 },
];
function NetworkShow() {
  return (
    <div className="sv-net">
      <svg className="sv-net__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {NODES.map((n) => (
          <line key={n.t} x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <span className="sv-net__hub" style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }} aria-hidden="true" />
      {NODES.map((n, i) => (
        <span key={n.t} className="sv-net__node sv-mono" style={{ left: `${n.x}%`, top: `${n.y}%`, '--i': i }}>
          <i aria-hidden="true" />
          {n.t}
        </span>
      ))}
      <div className="sv-net__chart">
        <p className="sv-mono">Signal growth · Illustrative</p>
        <svg viewBox="0 0 200 80" aria-hidden="true">
          <line x1="6" y1="76" x2="194" y2="76" />
          <path d="M6 72 C 50 68, 80 58, 112 46 S 162 20, 194 8" pathLength="1" />
          <circle cx="6" cy="72" r="2.6" />
          <circle cx="76" cy="60" r="2.6" />
          <circle cx="146" cy="30" r="2.6" />
          <circle cx="194" cy="8" r="2.6" />
        </svg>
      </div>
    </div>
  );
}

const SHOWS = { film: FilmShow, phones: PhonesShow, campaign: CampaignShow, identity: IdentityShow, creative: CreativeShow, network: NetworkShow };

export default function Showcase({ kind, live }) {
  const C = SHOWS[kind];
  return C ? <C live={live} /> : null;
}
