
'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { formats } from '@/lib/user/content';
import { openVideo } from '../VideoModal';
import Video from '../Video';
import { getVideoUrl } from '@/lib/user/video-assets';
import { getUniverse } from '@/lib/user/universe';

/* Card → Azure asset (lib/user/video-assets.js). Same clips as the
   previous local /videos/NN.mp4 files (durations match), keyed by the
   card title so each video stays in its exact position. */
const ASSET_BY_TITLE = {
  'Brand Films': 'video01',   // was /videos/01.mp4
  Commercials: 'video03',     // was /videos/03.mp4
  'Social Content': 'video09', // was /videos/09.mp4
  'Music Videos': 'video12',  // was /videos/12.mp4
  Documentary: 'video10',     // was /videos/10.mp4
};

/** Azure URL for a card; falls back to the local file if unmapped */
const cardVideoUrl = (f) =>
  getVideoUrl(ASSET_BY_TITLE[f?.title]) ?? f?.video?.full ?? f?.video?.preview ?? null;

export default function Solutions() {
  const root = useRef(null);
  const [active, setActive] = useState(0);
  // the card GSAP wants playing (read by <Video onReady>)
  const activeRef = useRef(0);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray(
        '.flip > .flip__card',
        root.current
      );
      const videos = cards.map((card) => card.querySelector('video'));

      let currentIndex = -1;

      // Play only the active card's video
      const activateVideo = (index) => {
        index = Math.max(0, Math.min(index, videos.length - 1));

        if (currentIndex === index) return;

        currentIndex = index;
        activeRef.current = index;

        videos.forEach((video, i) => {
          if (!video) return;

          if (i === index) {
            video.muted = true;
            video.loop = true;
            video.playsInline = true;

            video.play().catch(() => { });
          } else {
            video.pause();
          }
        });

        setActive(index);
      };

      // Initial card setup
      gsap.set(cards, {
        rotateY: 105,
        opacity: 0,
        force3D: true,
        backfaceVisibility: 'hidden',
      });

      gsap.set(cards[0], {
        rotateY: 0,
        opacity: 1,
        force3D: true,
      });

      activateVideo(0);

      // Flip animation
      const tl = gsap.timeline({
        defaults: {
          ease: 'power2.inOut',
        },
      });

      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;

        // Animate current card out
        tl.to(
          card,
          {
            rotateY: -90,
            z: -160,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
          },
          i + 0.25
        );

        // Animate next card in
        tl.fromTo(
          cards[i + 1],
          {
            rotateY: 90,
            z: -160,
            opacity: 0,
          },
          {
            rotateY: 0,
            z: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
            immediateRender: false,
          },
          i + 0.75
        );
      });

      tl.to({}, { duration: 0.4 });

      /* ---------- Showreel → Solutions (journey) ----------
         This section slides in transparent over the end of the
         Showreel pin (see .solutions-wrap) while the showreel film
         swings in 3D and shrinks into the first card's spot
         (Showreel.jsx). The real card fades in exactly there, then
         the orange atmosphere blooms out from the card and the rest
         of the content rises out of depth. On the way out it all
         folds back and the atmosphere collapses into the card. */
      const section = root.current;
      const q = gsap.utils.selector(section);
      const stage = q('.solutions__stage');
      const marquee = q('.solutions__marquee');
      const copy = q('.solutions__label, .solutions__count, .solutions__list, .solutions__desc');
      const atmo = { v: 0 };
      const ENTRY = 0.9;
      const EXIT = 0.25;

      const renderAtmo = () => {
        section.style.setProperty('--atmo', atmo.v.toFixed(4));
        // fully orange and filling the screen → the universe can rest
        const r = section.getBoundingClientRect();
        getUniverse()?.setOccluded(
          'solutions',
          atmo.v >= 0.999 && r.top <= 0.5 && r.bottom >= window.innerHeight - 0.5
        );
      };
      renderAtmo();

      // approach: the card appears as the docking film lands on it
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
        .fromTo(stage, { autoAlpha: 0 }, { autoAlpha: 0, duration: 0.9 })
        .to(stage, { autoAlpha: 1, duration: 0.1 });

      // Scroll animation
      const total = ENTRY + tl.duration() + EXIT;
      const master = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * 3.2 * (total / tl.duration())}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },

        onUpdate() {
          const index = Math.min(
            cards.length - 1,
            Math.max(0, Math.round(this.time() - ENTRY - 0.25))
          );

          activateVideo(index);
          renderAtmo();
        },
      });

      const flipDur = tl.duration();

      master
        // atmosphere blooms out of the card
        .fromTo(atmo, { v: 0 }, { v: 1, duration: ENTRY, ease: 'power2.in' }, 0)
        // the card gives a small 3D bow as it takes over from the film
        .fromTo(
          '.sel-frame',
          { rotateY: 0, rotateZ: 0, y: 0, z: 0 },
          { rotateY: -14, z: 60, duration: ENTRY * 0.5, ease: 'power2.out' },
          0
        )
        .to('.sel-frame', { rotateY: 0, z: 0, duration: ENTRY * 0.5, ease: 'power2.inOut' }, ENTRY * 0.5)
        // giant marquee flies forward out of depth behind the card
        .fromTo(
          marquee,
          { autoAlpha: 0, z: -1400, rotateX: 50, yPercent: -50, xPercent: 0, transformPerspective: 1000 },
          { autoAlpha: 1, z: 0, rotateX: 0, duration: ENTRY * 0.7, ease: 'power3.out' },
          ENTRY * 0.3
        )
        // copy rises and tips up into place
        .fromTo(
          copy,
          { autoAlpha: 0, y: 50, rotateX: -70, transformPerspective: 800, transformOrigin: '50% 100%' },
          { autoAlpha: 1, y: 0, rotateX: 0, duration: ENTRY * 0.45, stagger: 0.06, ease: 'power3.out' },
          ENTRY * 0.45
        )
        .add(tl, ENTRY)
        .to(marquee, { xPercent: -50, ease: 'none', duration: flipDur }, ENTRY)
        .to('.sel-frame', { rotateZ: 4, y: -40, ease: 'none', duration: flipDur }, ENTRY)
        // exit: no fade-out — the section stays whole and slides off to
        // the left as the Mission Archive pans in from the right
        // (Archive.jsx), so there's never an empty screen in between.
        // A short hold lets the last card settle first.
        .to({}, { duration: EXIT }, ENTRY + flipDur);

    },
    { scope: root }
  );

  const words = Array.from({ length: 4 });

  return (
    // Overlaps the last viewport of the Showreel pin so the film can
    // dock straight into the first card (see Showreel.jsx)
    <div className="solutions-wrap">
    <section
      ref={root}
      className={`solutions ${formats[active]?.title === 'Documentary' ? 'solutions--documentary' : ''}`}
      id="solutions"
    >
      {/* Orange atmosphere, revealed by a radial mask that grows
          out of the card (--atmo) */}
      <div className="solutions__atmo" aria-hidden="true">
        <div className="solutions__noise" />
      </div>

      <p className="solutions__label">
        04 / AI services
      </p>

      <p className="solutions__count">
        {String(active + 1).padStart(2, '0')} /{' '}
        {String(formats.length).padStart(2, '0')}
      </p>

      <div className="solutions__marquee" aria-hidden="true">
        {words.map((_, i) => (
          <span key={i} className={i % 2 ? 'o' : ''}>
            AI SOLUTIONS
          </span>
        ))}
      </div>

      <div className="solutions__stage">
        <div className="sel-frame">
          <i />
          <i />
          <i />
          <i />

          <div
            className="flip"
            onClick={() => {
              const videoSrc = cardVideoUrl(formats[active]);

              if (videoSrc) {
                openVideo(videoSrc);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Watch ${formats[active]?.title || 'video'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();

                const videoSrc = cardVideoUrl(formats[active]);

                if (videoSrc) openVideo(videoSrc);
              }
            }}
          >

            {formats.map((f, i) => (
              <figure className="flip__card" key={f.title}>
                {/* GSAP (activateVideo) owns play/pause: no autoplay and no
                    visibility pausing here, exactly as before. Buffers fully
                    (preload="auto") once the section is a viewport away. */}
                <Video
                  src={cardVideoUrl(f)}
                  poster={f.video.poster}
                  autoPlay={false}
                  pauseWhenHidden={false}
                  preload="auto"
                  rootMargin="100% 0px"
                  placeholder={false}
                  showPlayButton="never"
                  respectReducedMotion={false}
                  respectDataSaver={false}
                  style={{ backgroundColor: 'transparent' }}
                  disablePictureInPicture
                  onReady={(video) => {
                    // the source attaches after GSAP's first play() call —
                    // start the active card as soon as it can play
                    if (i === activeRef.current && video.paused) {
                      video.play().catch(() => {});
                    }
                  }}
                />

                <figcaption>
                  <strong>{f.title}</strong>
                  <span>{f.sub}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* <span className="sel-frame__size">
            {formats[active]?.title || ''} · 1080 × 1350
          </span> */}
        </div>
      </div>

      <ul className="solutions__list">
        {formats.map((f, i) => (
          <li
            key={f.title}
            className={i === active ? 'is-on' : ''}
          >
            {f.title}
          </li>
        ))}
      </ul>

      <p className="solutions__desc">
        AI-powered creative solutions for brands that
        think beyond the ordinary.
      </p>
    </section>
    </div>
  );
}
