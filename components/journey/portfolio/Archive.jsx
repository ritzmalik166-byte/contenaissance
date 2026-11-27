'use client';

import { useMemo, useState } from 'react';
import { openVideo } from '@/components/VideoModal';
import LiveVideo from '../ui/LiveVideo';
import { archive, archiveCopy, CATEGORIES } from '@/lib/journey/portfolio-data';

/* =====================================================
   05 — THE MISSION ARCHIVE. An ordinary (non-sticky)
   section the camera holds still behind, so the grid
   reads. Filter by world, flip the order, load six more.
   Tiles enter with a short fade + rise every time the
   set changes (the list is re-keyed on filter / sort).
===================================================== */

const PAGE = 9;
const MORE = 6;

function Tile({ m, i }) {
  const [hover, setHover] = useState(false);
  const isVideo = !!m.full;
  const inner = (
    <>
      <img src={m.poster} alt="" loading="lazy" decoding="async" />
      {isVideo && <LiveVideo src={m.preview} poster={m.poster} live={hover} />}
      <span className="ms-tile__shade" aria-hidden="true" />
      <span className="ms-tile__code">{m.code}</span>
      <i className="ms-tile__dot" aria-hidden="true" />
      {isVideo && <span className="ms-tile__play" aria-hidden="true" />}
      <span className="ms-tile__text">
        <span className="ms-tile__line">{m.summary}</span>
        <span className="ms-tile__cat">{m.category}</span>
        <span className="ms-tile__row">
          <span className="ms-tile__title">{m.title}</span>
          {isVideo && <span className="ms-tile__view">View mission →</span>}
        </span>
      </span>
    </>
  );
  const events = {
    onPointerEnter: () => setHover(true),
    onPointerLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  };
  return (
    <li className={`ms-tile ms-tile--${m.size}`} style={{ '--i': i }}>
      {isVideo ? (
        <button type="button" className="ms-tile__card" onClick={() => openVideo(m.full, m.poster)} data-cursor="VIEW" aria-label={`${m.title}, ${m.category}. Play`} {...events}>
          {inner}
        </button>
      ) : (
        <figure className="ms-tile__card" {...events}>
          {inner}
        </figure>
      )}
    </li>
  );
}

export default function Archive() {
  const [filter, setFilter] = useState('all');
  const [newest, setNewest] = useState(true);
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(() => {
    const l = filter === 'all' ? archive : archive.filter((m) => m.cat === filter);
    // codes are the archive index: CT-01 is the most recent
    return newest ? l : [...l].reverse();
  }, [filter, newest]);
  const visible = list.slice(0, shown);
  const pick = (id) => {
    setFilter(id);
    setShown(PAGE);
  };

  return (
    <section id="archive" className="ms-archive" data-ch="archive" aria-labelledby="ms-archive-title">
      <div className="j-wrap">
        <header className="ms-archive__head">
          <div>
            <p className="m-kicker m-kicker--gold">{archiveCopy.kicker}</p>
            <h2 id="ms-archive-title" className="j-display j-display--lg" data-reveal>
              {archiveCopy.title[0]}
              <br />
              {archiveCopy.title[1]}
            </h2>
          </div>
          <p className="ms-archive__body" data-reveal>
            {archiveCopy.body}
          </p>
        </header>

        <div className="ms-filters">
          <div className="ms-filters__bar" role="group" aria-label="Filter missions by world">
            {[{ id: 'all', label: 'All projects' }, ...CATEGORIES].map((c) => (
              <button key={c.id} type="button" aria-pressed={filter === c.id} className={filter === c.id ? 'is-on' : ''} onClick={() => pick(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <button type="button" className="ms-sort" onClick={() => setNewest((n) => !n)} aria-label={`Sort: ${newest ? 'newest' : 'oldest'} first. Change order`}>
            <i aria-hidden="true" /> Sort · {newest ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        <ul key={`${filter}-${newest}`} className="ms-grid" aria-live="polite">
          {visible.map((m, i) => (
            <Tile key={m.code} m={m} i={i % MORE} />
          ))}
        </ul>
        {!visible.length && <p className="ms-empty">No missions in this world yet.</p>}

        <div className="ms-archive__foot">
          <p className="ij-mono" aria-hidden="true">
            {visible.length ? `+ ${visible[0].code} → ${visible[visible.length - 1].code}` : ''}
          </p>
          {shown < list.length && (
            <button type="button" className="ms-more" onClick={() => setShown((s) => s + MORE)} data-cursor="MORE">
              Load more missions <span aria-hidden="true">+</span>
            </button>
          )}
          <p className="ij-mono" aria-hidden="true">
            {String(visible.length).padStart(2, '0')} / {String(list.length).padStart(2, '0')} shown
          </p>
        </div>
      </div>
    </section>
  );
}
