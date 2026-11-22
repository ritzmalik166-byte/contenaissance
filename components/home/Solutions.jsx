
'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { formats } from '@/lib/user/content';
import { openVideo } from '../VideoModal';
import { getUniverse } from '@/lib/user/universe';

export default function Solutions() {
  const root = useRef(null);
  const [active, setActive] = useState(0);

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

      /* ---------- Mars atmosphere (journey) ----------
         The section is see-through while it scrolls in: the camera
         dives onto Mars in the shared universe. Once pinned, the
         orange "atmosphere" blooms out from Mars on screen, the
         content arrives, the cards flip, and on the way out the
         atmosphere contracts back into Mars as the camera pulls away
         toward the Archive. */
      const section = root.current;
      const content = gsap.utils.toArray(
        '.solutions__label, .solutions__count, .solutions__marquee, .solutions__stage, .solutions__list, .solutions__desc',
        section
      );
      const atmo = { v: 0 };
      const dive = { v: 0 };
      const ENTRY = 0.9;
      const EXIT = 0.9;

      const renderAtmo = () => {
        const m = getUniverse()?.getMarsNDC();
        const onScreen = m && m.z < 1;
        const ax = onScreen ? ((m.x + 1) / 2) * 100 : 62;
        const ay = onScreen ? ((1 - m.y) / 2) * 100 : 55;
        section.style.setProperty('--ax', `${gsap.utils.clamp(-20, 120, ax).toFixed(2)}%`);
        section.style.setProperty('--ay', `${gsap.utils.clamp(-20, 120, ay).toFixed(2)}%`);
        section.style.setProperty('--atmo', atmo.v.toFixed(4));
        // fully orange and filling the screen → the universe can rest
        const r = section.getBoundingClientRect();
        getUniverse()?.setOccluded(
          'solutions',
          atmo.v >= 0.999 && r.top <= 0.5 && r.bottom >= window.innerHeight - 0.5
        );
      };
      const pushDive = () => getUniverse()?.setDive(dive.v);
      renderAtmo();

      // approach: Showreel has sliced open, Solutions scrolls in unseen
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      }).fromTo(dive, { v: 0 }, { v: 0.65, ease: 'power1.in', onUpdate: pushDive });

      // Scroll animation
      const total = ENTRY + tl.duration() + EXIT;
      const master = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * 3.2 * (total / tl.duration())}`,
          pin: true,
          scrub: true, // atmosphere must track Mars without lag
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

      master
        // atmosphere entry: the last of the dive, then the bloom
        .fromTo(dive, { v: 0.65 }, { v: 1, duration: ENTRY * 0.6, ease: 'power2.out', onUpdate: pushDive }, 0)
        .fromTo(atmo, { v: 0 }, { v: 1, duration: ENTRY, ease: 'power2.in' }, 0)
        .fromTo(content, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: ENTRY * 0.5, ease: 'power2.out' }, ENTRY * 0.55)
        .add(tl, ENTRY)
        .fromTo(
          '.solutions__marquee',
          { xPercent: 0 },
          {
            xPercent: -50,
            ease: 'none',
            duration: tl.duration(),
          },
          ENTRY
        )
        .fromTo(
          '.sel-frame',
          { rotateZ: -4, y: 40 },
          {
            rotateZ: 4,
            y: -40,
            ease: 'none',
            duration: tl.duration(),
          },
          ENTRY
        )
        // exit: content leaves, atmosphere collapses back into Mars,
        // camera pulls out toward the Archive
        .to(content, { autoAlpha: 0, scale: 0.94, duration: EXIT * 0.4, ease: 'power2.in' }, ENTRY + tl.duration())
        .to(atmo, { v: 0, duration: EXIT, ease: 'power2.inOut' }, ENTRY + tl.duration())
        .to(dive, { v: 0, duration: EXIT, ease: 'power2.inOut', onUpdate: pushDive }, ENTRY + tl.duration() + EXIT * 0.25);

      // Mars keeps drifting (camera easing, pointer parallax) even when
      // the scroll is still — keep the bloom centred on it.
      const follow = () => {
        if (atmo.v > 0 && atmo.v < 1) renderAtmo();
      };
      gsap.ticker.add(follow);
      return () => gsap.ticker.remove(follow);

    },
    { scope: root }
  );

  const words = Array.from({ length: 4 });

  return (
    <section
      ref={root}
      className={`solutions ${formats[active]?.title === 'Documentary' ? 'solutions--documentary' : ''}`}
      id="solutions"
    >
      {/* Mars atmosphere: the orange gradient, revealed by a radial
          mask that grows from Mars' screen position (--ax/--ay/--atmo) */}
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
              const currentFormat = formats[active];
              const videoSrc =
                currentFormat?.video?.full ||
                currentFormat?.video?.preview;

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

                const currentFormat = formats[active];
                const videoSrc =
                  currentFormat?.video?.full ||
                  currentFormat?.video?.preview;

                if (videoSrc) openVideo(videoSrc);
              }
            }}
          >

            {formats.map((f) => (
              <figure className="flip__card" key={f.title}>
                <video
                  src={f.video.preview}
                  poster={f.video.poster}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  disablePictureInPicture
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
  );
}
