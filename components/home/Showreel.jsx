
'use client';

import { useRef, useEffect } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { applyHolo, lerpHolo, holoMid, holoFull } from '@/lib/user/journey';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';
import { Play } from '../Icons';
import './Showreel.css';

const videoUrl = `${process.env.NEXT_PUBLIC_ASSETS_URL}/Mzha%20Nhi%20Aaya-02.1.mp4`;

export default function Showreel() {
  const root = useRef(null);
  const spaceWrap = useRef(null);
  const spaceSceneRef = useRef(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = videoUrl;
    document.head.appendChild(link);

    return () => link.remove();
  }, []);

  // Initialize 3D space scene
  useEffect(() => {
    let disposed = false;

    import('../three/ShowreelScene').then(({ createShowreelScene }) => {
      if (disposed || !spaceWrap.current) return;

      spaceSceneRef.current = createShowreelScene(spaceWrap.current);
    });

    return () => {
      disposed = true;
      spaceSceneRef.current?.destroy();
      spaceSceneRef.current = null;
    };
  }, []);

  // Cinematic scroll animation
  useGSAP(() => {
    const section = root.current;

    if (!section) return;

    const frame = section.querySelector('.reel__frame');
    const video = section.querySelector('.reel__frame video');
    const head = section.querySelectorAll('.reel__head span');
    const ui = section.querySelector('.reel__ui');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=180%',
        pin: true,
        // no lag: the hologram hand-off with JourneyActors must stay
        // locked to the scroll position (Lenis already smooths it)
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Video cinematic reveal — the astronaut's wrist hologram (a
    // floating 16:9 panel, see lib/user/journey.js) expands into the
    // full-bleed showreel and loses its holographic look.
    const holo = { k: 0 };
    const renderHolo = () =>
      applyHolo(frame, lerpHolo(holoMid(), holoFull(frame), holo.k), 0);
    renderHolo();

    tl.fromTo(
      holo,
      { k: 0 },
      {
        k: 1,
        ease: 'power2.inOut',
        duration: 1,
        onUpdate() {
          renderHolo();
          spaceSceneRef.current?.setParallax(this.progress());
        },
      }
    );

    // The section's own planets fade in around the growing panel
    // (hidden while the astronaut presents the hologram).
    tl.fromTo(
      section.querySelector('.reel__space'),
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: 'none' },
      0.05
    );

    // Heading exits in opposite directions
    tl.to(head[0], {
      xPercent: -80,
      opacity: 0,
      filter: 'blur(12px)',
      ease: 'power2.in',
      duration: 0.8,
    }, 0);

    tl.to(head[1], {
      xPercent: 80,
      opacity: 0,
      filter: 'blur(12px)',
      ease: 'power2.in',
      duration: 0.8,
    }, 0);

    // Video camera zoom
    if (video) {
      tl.fromTo(
        video,
        { scale: 1.5 },
        { scale: 1, ease: 'none', duration: 1 },
        0
      );
    }

    // Show video controls
    tl.fromTo(
      ui,
      {
        opacity: 0,
        y: 30,
        filter: 'blur(8px)',
      },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.5,
      },
      0.7
    );

    tl.to({}, { duration: 0.3 });

    // Initial cinematic entrance
    gsap.fromTo(
      '.reel__num',
      { opacity: 0, x: -25 },
      { opacity: 1, x: 0, duration: 1.2, delay: 0.2 }
    );

    return () => tl.scrollTrigger?.kill();

  }, { scope: root });

  // Interactive space movement
  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    spaceSceneRef.current?.setPointer(x, y);
  };

  // Hover cinematic effects
  const handlePointerEnter = () => {
    const section = root.current;
    if (!section) return;

    const frame = section.querySelector('.reel__frame');
    const play = section.querySelector('.reel__play');

    spaceSceneRef.current?.pulse();

    gsap.to(frame, {
      boxShadow: '0 0 90px rgba(238, 177, 53, 0.18)',
      duration: 1,
      ease: 'power2.out',
    });

    gsap.to(play, {
      scale: 1.12,
      duration: 0.6,
      ease: 'back.out(2)',
    });
  };

  const handlePointerLeave = () => {
    const section = root.current;
    if (!section) return;

    const frame = section.querySelector('.reel__frame');
    const play = section.querySelector('.reel__play');

    spaceSceneRef.current?.setPointer(0, 0);

    gsap.to(frame, {
      boxShadow: '0 0 0px rgba(238, 177, 53, 0)',
      duration: 1,
      ease: 'power2.out',
    });

    gsap.to(play, {
      scale: 1,
      duration: 0.5,
      ease: 'power2.out',
    });
  };

  const watch = () => openVideo(videoUrl);

  return (
    <section
      ref={root}
      className="reel"
      id="showreel"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={spaceWrap}
        className="reel__space"
        aria-hidden="true"
      />

      <p className="kicker reel__num">
        03 / Transmission incoming
      </p>

      <h2
        className="reel__head"
        aria-label="Transmission incoming"
      >
        <span>Transmission </span>
        <span>Incoming</span>
      </h2>

      <div className="reel__stage">
        <div className="reel__frame">
          <LazyVideo src={videoUrl} eager />

          <div className="reel__ui">
            <div className="reel__ui-top">
              <span>Contenaissance / Showreel</span>

              <button
                onClick={watch}
                onPointerEnter={() => spaceSceneRef.current?.pulse()}
                data-cursor-hover
              >
                [ Full screen ↗ ]
              </button>
            </div>

            <div className="reel__ui-bottom">
              <span>A glimpse of the possible.</span>

              <button
                className="sound-btn is-on"
                onClick={watch}
              >
                <span className="sound-btn__bars">
                  <i />
                  <i />
                  <i />
                </span>
                Watch with sound
              </button>
            </div>
          </div>

          <button
            className="reel__play"
            onClick={watch}
            onPointerEnter={() => spaceSceneRef.current?.pulse()}
            aria-label="Play showreel"
            data-cursor="Play"
          >
            <Play />
          </button>
        </div>
      </div>
    </section>
  );
}
