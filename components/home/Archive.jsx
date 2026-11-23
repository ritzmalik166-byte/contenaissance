'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, isTouch } from '@/lib/user/gsap';
import { useLenis } from '@/components/SmoothScrollProvider';
import { archive } from '@/lib/user/content';
import Video from '../Video';
import { getVideoUrl } from '@/lib/user/video-assets';
import { openVideo } from '../VideoModal';
import { ArrowUpRight } from '../Icons';
import Split from '../Split';
import './MissionArchive.css';

/* =====================================================
   05 / MISSION ARCHIVE — a flight corridor of films.

   The films hang in space along the depth axis, alternating
   left / right. Scrolling (pinned) flies the viewer forward
   past them one by one; the corridor ends at a portal to
   the full archive.

   Hand-off from Solutions: Solutions folds its card away
   into depth at the centre of the screen, so the archive
   arrives the same way — every film starts stacked far
   away at the centre and fans out into the corridor as
   the section scrolls in.

   Pure CSS 3D (one transform per card per scroll update),
   and only the film in front plays.
===================================================== */

/* Card → Azure asset (lib/user/video-assets.js), keyed by card title */
const ASSET_BY_TITLE = {
  'Brand Films': 'video04',
  'AI Video Commercials': 'video07',
  'Music Videos': 'video08',
  'Social Reels': 'automotive',
  'Cinematic Brand Films': 'video06',
};

/** Azure URL for a card; falls back to the local file if unmapped */
const workVideoUrl = (item) => getVideoUrl(ASSET_BY_TITLE[item.title]) ?? item.video.src;

const pad = (n) => String(n).padStart(2, '0');
const clamp01 = gsap.utils.clamp(0, 1);
const easeInOut = gsap.parseEase('power2.inOut');

const APPROACH = 1.6; // corridor distance flown while the section scrolls in

function Film({ item, index, isActive, onSelect, onReady }) {
  const url = workVideoUrl(item);
  const portrait = item.ratio?.startsWith('9');

  return (
    <button
      className={`afilm${portrait ? ' afilm--portrait' : ''}${isActive ? ' is-on' : ''}`}
      style={{ '--ratio': item.ratio }}
      onClick={() => (isActive ? openVideo(url) : onSelect(index))}
      aria-label={isActive ? `Play ${item.title}` : `Go to ${item.title}`}
    >
      <span className="afilm__frame">
        {/* GSAP owns play / pause: only the film in front plays */}
        <Video
          src={url}
          poster={item.video.poster}
          className="afilm__video"
          fit="cover"
          autoPlay={false}
          pauseWhenHidden={false}
          preload="metadata"
          rootMargin="100% 0px"
          placeholder={false}
          showPlayButton="never"
          respectReducedMotion={false}
          respectDataSaver={false}
          onReady={(video) => onReady(index, video)}
          fallback={<span>Video unavailable</span>}
        />
        <span className="afilm__shade" />
        <span className="mono afilm__tag">{item.tag}</span>
        <span className="mono afilm__num">{pad(index + 1)}</span>
        <span className="afilm__play" aria-hidden="true">
          <ArrowUpRight />
        </span>
        <i className="afilm__c afilm__c--tl" />
        <i className="afilm__c afilm__c--br" />
      </span>
      <span className="afilm__title">{item.title}</span>
    </button>
  );
}

export default function Archive() {
  const root = useRef(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const playingRef = useRef(false); // is the corridor on screen?
  const jumpRef = useRef(null);
  const { getLenis } = useLenis();
  const n = archive.length;

  // A film's source attaches lazily — start it if it's the one in front
  const onReady = (index, video) => {
    if (index === activeRef.current && playingRef.current && video.paused) {
      video.muted = true;
      video.play().catch(() => {});
    }
  };

  useGSAP(
    (ctx, contextSafe) => {
      const q = gsap.utils.selector(root);
      const section = root.current;
      const cards = q('.afilm');
      const shades = cards.map((c) => c.querySelector('.afilm__shade'));
      const portal = q('.archive__portal')[0];
      const hud = q('.archive__hud')[0];

      gsap.set([...cards, portal], { xPercent: -50, yPercent: -50 });

      /* ---------- layout ---------- */
      let mobile = false;
      let GAP = 1000; // px between films along the corridor
      let X = 300; // px from the centre line
      let VH = 800;
      const measure = () => {
        VH = window.innerHeight;
        mobile = window.innerWidth < 760;
        GAP = mobile ? VH * 0.9 : Math.min(1100, window.innerWidth * 0.72);
        X = mobile ? 0 : Math.min(window.innerWidth * 0.2, 340);
      };
      measure();

      /* ---------- playback ---------- */
      let playing = -2;
      const play = (idx) => {
        if (idx === playing) return;
        playing = idx;
        playingRef.current = idx >= 0;
        cards.forEach((card, i) => {
          const v = card.querySelector('video');
          if (!v) return;
          if (i === idx) {
            v.muted = true;
            v.play().catch(() => {});
          } else if (!v.paused) {
            v.pause();
          }
        });
      };

      /* ---------- render: corridor position → transforms ---------- */
      const S = { a: 0, p: 0 }; // a: scroll-in 0..1, p: pinned flight 0..1
      let lastIdx = -1;

      const render = () => {
        const spread = easeInOut(S.a);
        // t = which film is in front (fractional); before the pin the
        // whole corridor is still further away, stacked at the centre
        const t = S.p * n + (S.a - 1) * APPROACH;

        cards.forEach((card, i) => {
          const side = mobile ? 0 : i % 2 ? 1 : -1;
          const z = (t - i) * GAP;
          const passed = Math.max(0, z) / GAP; // flying past the camera
          const depth = Math.max(0, -z) / GAP; // still ahead
          const alpha = z > 0 ? 1 - clamp01(z / (GAP * 0.55)) : clamp01(1 - depth * 0.24);

          gsap.set(card, {
            x: side * X * spread * (1 + passed * 1.4),
            y: (mobile ? 0 : (i % 2 ? 1 : -1) * VH * 0.025) * spread,
            z,
            rotationY: -side * (14 + passed * 38) * spread,
            autoAlpha: alpha,
            pointerEvents: alpha > 0.6 ? 'auto' : 'none',
          });
          shades[i].style.opacity = Math.min(0.8, depth * 0.32).toFixed(3);
        });

        // the portal at the end of the corridor
        const pz = (t - n) * GAP;
        const pDepth = Math.max(0, -pz) / GAP;
        gsap.set(portal, {
          z: pz,
          autoAlpha: clamp01(1 - pDepth * 0.6) * (pz > 0 ? 1 - clamp01(pz / (GAP * 0.5)) : 1),
          pointerEvents: pDepth < 0.3 ? 'auto' : 'none',
        });

        // HUD: in once the corridor has formed, out as the portal arrives
        const hudIn = clamp01((S.a - 0.75) / 0.25) * (1 - clamp01((t - (n - 1) - 0.3) / 0.4));
        gsap.set(hud, { autoAlpha: hudIn });

        const idx = gsap.utils.clamp(0, n - 1, Math.round(t));
        if (idx !== lastIdx) {
          lastIdx = idx;
          activeRef.current = idx;
          setActive(idx);
        }
        play(S.a > 0.05 && t < n - 0.45 ? idx : -1);
      };

      /* ---------- scroll-in: corridor forms out of the centre ---------- */
      const chars = q('.archive__title .split-char');
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top top',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(S, { a: 0 }, { a: 1, duration: 1, ease: 'none', onUpdate: render }, 0)
        .fromTo(
          q('.archive__kicker'),
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
          0.35
        )
        .fromTo(
          chars,
          { yPercent: 110, rotateX: -80, opacity: 0, transformOrigin: '50% 100%' },
          { yPercent: 0, rotateX: 0, opacity: 1, duration: 0.4, stagger: { amount: 0.2 }, ease: 'power3.out' },
          0.4
        )
        .fromTo(
          q('.archive__lede'),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
          0.7
        );

      /* ---------- pinned flight down the corridor ---------- */
      const flight = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * n * 0.85}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure();
            render();
          },
        },
      });
      flight.fromTo(S, { p: 0 }, { p: 1, duration: 1, ease: 'none', onUpdate: render });

      // Clicking a film further down the corridor flies there
      jumpRef.current = (i) => {
        const st = flight.scrollTrigger;
        if (!st) return;
        const y = st.start + (i / n) * (st.end - st.start) + 1;
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { duration: 1.4 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      };

      render();

      /* ---------- pointer: the corridor leans with the cursor ---------- */
      if (isTouch()) return () => play(-1);
      const world = q('.archive__world')[0];
      const tiltX = gsap.quickTo(world, 'rotationX', { duration: 1.2, ease: 'power3.out' });
      const tiltY = gsap.quickTo(world, 'rotationY', { duration: 1.2, ease: 'power3.out' });
      const move = contextSafe((e) => {
        tiltY((e.clientX / window.innerWidth - 0.5) * 6);
        tiltX(-(e.clientY / window.innerHeight - 0.5) * 4);
      });
      section.addEventListener('pointermove', move);

      return () => {
        section.removeEventListener('pointermove', move);
        play(-1);
      };
    },
    { scope: root }
  );

  const current = archive[active];
  // the HUD sits on the opposite side of the film in front
  const hudSide = active % 2 ? 'left' : 'right';

  return (
    <section ref={root} className="archive" id="work">
      <div className="archive__viewport">
        <header className="archive__head">
          <p className="kicker archive__kicker">05 / Mission archive</p>
          <Split as="h2" className="display archive__title" lines={['Stories beyond', 'the ordinary']} />
          <p className="archive__lede">
            A window into our creative universe. Film, form and feeling, explored through AI.
          </p>
        </header>

        <div className="archive__world">
          {archive.map((item, i) => (
            <Film
              key={item.title}
              item={item}
              index={i}
              isActive={i === active}
              onSelect={(idx) => jumpRef.current?.(idx)}
              onReady={onReady}
            />
          ))}

          <div className="archive__portal">
            <span className="archive__portal-ring" aria-hidden="true" />
            <p className="mono archive__portal-kicker">End of transmission</p>
            <h3 className="display archive__portal-title">More stories wait inside.</h3>
            <Link href="/portfolio" className="btn btn--light">
              Explore the archive <ArrowUpRight size={14} />
            </Link>
            <p className="mono archive__portal-note">Concept imagery / A glimpse of our visual language</p>
          </div>
        </div>

        <div className={`archive__hud archive__hud--${hudSide}`} aria-live="polite">
          <div className="archive__hud-body" key={active}>
            <span className="archive__index">{pad(active + 1)}</span>
            <div>
              <p className="mono archive__hud-tag">{current.tag}</p>
              <h3 className="archive__hud-title">{current.title}</h3>
              <button className="archive__hud-play" onClick={() => openVideo(workVideoUrl(current))}>
                Play film <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
          <div className="archive__ticks">
            {archive.map((item, i) => (
              <button
                key={item.title}
                className={i === active ? 'is-on' : ''}
                onClick={() => jumpRef.current?.(i)}
                aria-label={`Go to ${item.title}`}
              />
            ))}
            <span className="mono">
              {pad(active + 1)} / {pad(n)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
