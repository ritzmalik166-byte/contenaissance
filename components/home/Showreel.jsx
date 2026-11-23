
'use client';

import { useRef, useEffect } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/user/gsap';
import { applyHolo, lerpHolo, holoMid, holoFull } from '@/lib/user/journey';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';
import { Play } from '../Icons';
import './Showreel.css';

const videoUrl = `${process.env.NEXT_PUBLIC_ASSETS_URL}/Mzha%20Nhi%20Aaya-02.1.mp4`;
const posterUrl = '/posters/mzha.jpg';

export default function Showreel() {
  const root = useRef(null);
  const spaceWrap = useRef(null);
  const spaceSceneRef = useRef(null);
  // true while the pinned section is on screen: playback must not depend
  // on the IntersectionObserver (the frame is transformed/clipped there)
  const activeRef = useRef(false);
  const keepPlaying = () => activeRef.current;

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

    const nudgePlay = () => {
      if (video && video.paused) video.dispatchEvent(new Event('lazyvideo:play'));
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        // from the moment the section starts entering (the astronaut's
        // hologram already shows the film) until it has scrolled away
        start: 'top top',
        // 180% for the hologram → film, +150% for the slice exit
        end: '+=330%',
        pin: true,
        // no lag: the hologram hand-off with JourneyActors must stay
        // locked to the scroll position (Lenis already smooths it)
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onToggle(self) {
          activeRef.current = self.isActive;
          if (self.isActive) nudgePlay();
        },
        onUpdate: nudgePlay,
      },
    });

    // Video cinematic reveal — the astronaut's wrist hologram (a
    // floating 16:9 panel, see lib/user/journey.js) expands into the
    // full-bleed showreel and loses its holographic look.
    // Reduced motion: no astronaut/hologram — the film is simply there.
    const reduced = prefersReducedMotion();
    const holo = { k: 0 };
    const renderHolo = () =>
      applyHolo(frame, reduced ? holoFull(frame) : lerpHolo(holoMid(), holoFull(frame), holo.k), 0);
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

    /* ---------- exit: the film slices open onto Mars ----------
       A seam of light cuts the frame horizontally, then the two
       halves part like blast doors (top half = the frame itself,
       bottom half = a synced clone of the video) to reveal the
       universe behind — and Mars, which the camera dives into
       as Solutions arrives (see JourneyActors). */
    const clone = section.querySelector('.reel__slice');
    const mirror = clone?.querySelector('canvas');
    const ctx = mirror?.getContext('2d');
    const seam = section.querySelector('.reel__seam');
    const slice = { s: 0 };
    const easeSlice = gsap.parseEase('power3.inOut');
    let cloneLive = false;
    let mirrorRaf = 0;

    // The bottom half is a live canvas mirror of the ONE playing <video>
    // (not a second <video>): it can never be blank, out of sync, or
    // blocked by autoplay policy, and the 40 MB file is streamed once.
    const drawMirror = () => {
      mirrorRaf = 0;
      if (!cloneLive || !mirror || !ctx || !video) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cw = Math.round(clone.offsetWidth * dpr);
      const ch = Math.round(clone.offsetHeight * dpr);
      if (mirror.width !== cw || mirror.height !== ch) {
        mirror.width = cw;
        mirror.height = ch;
      }
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (video.readyState >= 2 && vw && vh && cw && ch) {
        // object-fit: cover — only the bottom half is visible, draw just that
        const sc = Math.max(cw / vw, ch / vh);
        const sw = cw / sc;
        const sh = ch / sc;
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;
        ctx.drawImage(video, sx, sy + sh / 2, sw, sh / 2, 0, ch / 2, cw, ch / 2);
      }
      mirrorRaf = requestAnimationFrame(drawMirror);
    };

    const startMirror = () => {
      nudgePlay(); // the film must keep playing — both halves show it
      if (!mirrorRaf) mirrorRaf = requestAnimationFrame(drawMirror);
    };
    const stopMirror = () => {
      if (mirrorRaf) cancelAnimationFrame(mirrorRaf);
      mirrorRaf = 0;
    };

    const renderSlice = () => {
      if (reduced) return; // no slice: the film just scrolls away
      const s = slice.s;
      if (s <= 0.0001) {
        if (cloneLive) {
          cloneLive = false;
          stopMirror();
          gsap.set(clone, { autoAlpha: 0 });
          gsap.set(seam, { autoAlpha: 0 });
          renderHolo(); // back to the plain full-bleed film
        }
        return;
      }
      if (!cloneLive) {
        cloneLive = true;
        drawMirror(); // paint a frame before the half is revealed
        startMirror();
        gsap.set(clone, { autoAlpha: 1 });
      }
      const h = frame.offsetHeight;
      const half = h / 2;
      // 0 → 0.25: the seam ignites; 0.2 → 1: the halves part
      const glow = Math.min(1, s / 0.15) * (1 - gsap.utils.clamp(0, 1, (s - 0.45) / 0.4));
      const open = easeSlice(gsap.utils.clamp(0, 1, (s - 0.18) / 0.82));
      const dy = open * h * 0.62;
      const tilt = open * 14;

      frame.style.clipPath = `inset(0px 0px ${half}px 0px)`;
      frame.style.transform = `translate3d(0, ${-dy}px, 0) perspective(1400px) rotateX(${tilt}deg)`;
      frame.style.opacity = '1';
      clone.style.clipPath = `inset(${half}px 0px 0px 0px)`;
      clone.style.transform = `translate3d(0, ${dy}px, 0) perspective(1400px) rotateX(${-tilt}deg)`;
      gsap.set(seam, { autoAlpha: glow, scaleX: 0.2 + Math.min(1, s / 0.12) * 0.8, y: 0 });
    };

    tl.to([ui, section.querySelector('.reel__num')], { opacity: 0, duration: 0.15 }, '>-0.05')
      .fromTo(slice, { s: 0 }, { s: 1, duration: 0.8, ease: 'none', onUpdate: renderSlice }, '<')
      .to(section.querySelector('.reel__space'), { opacity: 0, duration: 0.5, ease: 'none' }, '<+0.25')
      .to({}, { duration: 0.15 });

    // Initial cinematic entrance
    gsap.fromTo(
      '.reel__num',
      { opacity: 0, x: -25 },
      { opacity: 1, x: 0, duration: 1.2, delay: 0.2 }
    );

    return () => {
      cloneLive = false;
      stopMirror();
      activeRef.current = false;
      tl.scrollTrigger?.kill();
    };

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
          <LazyVideo src={videoUrl} poster={posterUrl} eager keepPlaying={keepPlaying} />

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

        {/* exit slice: bottom half of the film (canvas mirror) + light seam */}
        <div className="reel__slice" aria-hidden="true">
          <canvas />
        </div>
        <div className="reel__seam" aria-hidden="true" />
      </div>
    </section>
  );
}
