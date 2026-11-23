'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, Flip, useGSAP, isTouch, prefersReducedMotion } from '@/lib/user/gsap';
import { getPortfolioScene } from '@/lib/user/portfolioScene';
import { pfArchive, pfArchiveMore, pfCategories } from '@/lib/user/portfolio-content';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';
import { ArrowUpRight, Play } from '../Icons';
import Split from '../Split';

const TABS = [{ id: 'all', label: 'All' }, ...pfCategories];

function Card({ item, hidden, extra }) {
  const open = () => (item.video ? openVideo(item.video.src) : window.open(item.image, '_blank', 'noopener'));
  const hover = (on) => getPortfolioScene()?.hover(on ? item.id : null);

  return (
    <article
      className={`pf-card pf-card--${item.layout || 'grid'}${item.featured ? ' is-featured' : ''}${hidden ? ' is-hidden' : ''}${extra ? ' is-extra' : ''}`}
      data-flip-id={item.id}
      data-star={item.id}
      onPointerEnter={() => hover(true)}
      onPointerLeave={() => hover(false)}
    >
      <button
        type="button"
        className="pf-card__media"
        onClick={open}
        onFocus={() => hover(true)}
        onBlur={() => hover(false)}
        aria-label={`${item.video ? 'Play' : 'View'} ${item.title}`}
        data-cursor={item.video ? 'Play' : 'View'}
        tabIndex={hidden ? -1 : 0}
      >
        {item.video ? (
          <LazyVideo src={item.video.preview} poster={item.video.poster} />
        ) : (
          <img src={item.image} alt="" loading="lazy" />
        )}
        <span className="pf-card__glare" aria-hidden="true" />
        <span className="mono pf-card__tag">{item.tag}</span>
        {item.tagRight && <span className="mono pf-card__tag pf-card__tag--right">{item.tagRight}</span>}
        {item.featured && (
          <span className="pf-card__reel" aria-hidden="true">
            <Play size={20} />
            <em>Play reel</em>
          </span>
        )}
        <span className="pf-card__arrow" aria-hidden="true">
          <ArrowUpRight />
        </span>
      </button>
      <div className="pf-card__foot">
        <h3>{item.title}</h3>
        <span className="mono">Visual exploration</span>
      </div>
    </article>
  );
}

export default function PfArchive() {
  const root = useRef(null);
  const flipState = useRef(null);
  const [filter, setFilter] = useState('all');
  const [more, setMore] = useState(false);

  // Capture layout before a filter / load-more change, animate after.
  const change = (fn) => {
    if (root.current && !prefersReducedMotion()) {
      flipState.current = Flip.getState(root.current.querySelectorAll('.pf-card, .pf-archive__info'));
    }
    fn();
  };

  const showAll = () => {
    change(() => {
      setFilter('all');
      setMore(true);
    });
    const grid = document.getElementById('pf-archive-grid');
    if (grid && window.__lenis) window.__lenis.scrollTo(grid, { offset: -120, duration: 1.4 });
  };

  useEffect(() => {
    const onFilter = (e) => change(() => setFilter(e.detail || 'all'));
    window.addEventListener('pf:filter', onFilter);
    return () => window.removeEventListener('pf:filter', onFilter);
  }, []);

  useEffect(() => {
    getPortfolioScene()?.setFilter(filter);
  }, [filter]);

  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;

    Flip.from(state, {
      duration: 0.9,
      ease: 'power3.inOut',
      absolute: true,
      nested: true,
      prune: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, y: 80, rotateX: 22, scale: 0.92, transformPerspective: 1400 },
          { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.9, stagger: 0.07, ease: 'power3.out' }
        ),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.4, ease: 'power2.in' }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  }, [filter, more]);

  useGSAP(
    (ctx, contextSafe) => {
      gsap.from('.pf-archive__title .split-char', {
        yPercent: 110,
        opacity: 0,
        duration: 1,
        stagger: 0.02,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.pf-archive__head', start: 'top 80%' },
      });
      gsap.from(['.pf-archive__side', '.pf-archive__tabs'], {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.pf-archive__head', start: 'top 75%' },
      });

      if (prefersReducedMotion()) return;

      // Cards rise out of depth as they scroll in.
      gsap.utils.toArray('.pf-card:not(.is-extra), .pf-archive__info', root.current).forEach((card) => {
        gsap.from(card, {
          y: 120,
          z: -220,
          rotateX: 18,
          opacity: 0,
          transformPerspective: 1400,
          ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 95%', end: 'top 60%', scrub: 1 },
        });
      });

      if (isTouch()) return;

      // 3D tilt + glare per card, and the featured card's "Play reel"
      // disc follows the cursor. Delegated so load-more cards work too.
      const grid = root.current.querySelector('.pf-archive__grid');
      const tilts = new WeakMap();
      const tiltOf = (media) => {
        if (!tilts.has(media)) {
          tilts.set(media, {
            rx: gsap.quickTo(media, 'rotationX', { duration: 0.6, ease: 'power3.out' }),
            ry: gsap.quickTo(media, 'rotationY', { duration: 0.6, ease: 'power3.out' }),
          });
        }
        return tilts.get(media);
      };
      let current = null;

      const move = contextSafe((e) => {
        const media = e.target.closest?.('.pf-card__media');
        if (current && current !== media) leaveMedia(current);
        current = media;
        if (!media) return;
        const r = media.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const t = tiltOf(media);
        t.ry((px - 0.5) * 9);
        t.rx(-(py - 0.5) * 9);
        media.style.setProperty('--gx', `${px * 100}%`);
        media.style.setProperty('--gy', `${py * 100}%`);
        const reel = media.querySelector('.pf-card__reel');
        if (reel) gsap.to(reel, { x: (px - 0.5) * r.width * 0.35, y: (py - 0.5) * r.height * 0.35, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
      });

      const leaveMedia = contextSafe((media) => {
        const t = tiltOf(media);
        t.rx(0);
        t.ry(0);
        const reel = media.querySelector('.pf-card__reel');
        if (reel) gsap.to(reel, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
      });

      const leaveGrid = () => {
        if (current) leaveMedia(current);
        current = null;
      };

      grid.addEventListener('pointermove', move);
      grid.addEventListener('pointerleave', leaveGrid);
      return () => {
        grid.removeEventListener('pointermove', move);
        grid.removeEventListener('pointerleave', leaveGrid);
      };
    },
    { scope: root }
  );

  const visible = (item) => filter === 'all' || item.cat === filter;

  return (
    <section ref={root} className="pf-archive" id="pf-archive">
      <div className="container">
        <div className="pf-archive__head">
          <div>
            <p className="kicker">02 / Mission archive</p>
            <Split as="h2" className="display pf-archive__title" lines={['Explore the archive']} />
          </div>
          <p className="pf-archive__side">Concept imagery / a glimpse of our visual language</p>
        </div>

        <div className="pf-archive__tabs">
          <div role="tablist" aria-label="Filter the archive">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filter === t.id}
                className={filter === t.id ? 'is-active' : ''}
                onClick={() => filter !== t.id && change(() => setFilter(t.id))}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="pf-archive__link" onClick={showAll}>
            Explore the archive <ArrowUpRight size={12} />
          </button>
        </div>

        <div
          id="pf-archive-grid"
          className={`pf-archive__grid${filter !== 'all' ? ' is-filtered' : ''}`}
        >
          {pfArchive.map((item) => (
            <Card key={item.id} item={item} hidden={!visible(item)} />
          ))}
          {pfArchiveMore.map((item) => (
            <Card key={item.id} item={item} hidden={!more || !visible(item)} extra />
          ))}

          <div className="pf-archive__info" data-flip-id="info">
            <p className="kicker">Archive</p>
            <h3 className="display">A glimpse of the possible.</h3>
            <div className="pf-archive__actions">
              <button type="button" className="pf-archive__more" onClick={() => change(() => setMore((m) => !m))}>
                {more ? 'Show less' : 'Load more'}
              </button>
              <button type="button" className="pf-archive__link" onClick={showAll}>
                Explore the archive <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
