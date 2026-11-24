'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/user/gsap';
import { applyHolo, lerpHolo, holoMid, holoFull } from '@/lib/user/journey';
import Video from '../Video';
import { getVideoUrl, getPosterUrl } from '@/lib/user/video-assets';
import { openVideo } from '../VideoModal';
import { Play } from '../Icons';
import './Showreel.css';

const VIDEO_ASSET = 'video06';
const videoUrl = getVideoUrl(VIDEO_ASSET); // full-screen modal uses the same file
const posterUrl = getPosterUrl(VIDEO_ASSET);

/* =====================================================
   SHOWREEL — "Transmission incoming".

   1. The astronaut's wrist hologram (JourneyActors) is this
      section's real film: pinned, it expands to full-bleed.
   2. Exit: the film swings in 3D and shrinks into the exact
      spot of the Solutions section's first video card, which
      slides in (transparent) over this pin and takes over —
      the showreel literally becomes the first service.
===================================================== */

// Showreel timeline (units of timeline time)
const T_FULL = 1; // hologram → full-bleed film
const T_DOCK = 1.55; // film starts docking into the Solutions card
const T_DOCK_LEN = 0.95;

export default function Showreel() {
  const root = useRef(null);
  // true while the pinned section is on screen: playback must not depend
  // on the IntersectionObserver (the frame is transformed/clipped there)
  const activeRef = useRef(false);
  const keepPlaying = () => activeRef.current;

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      const frame = section.querySelector('.reel__frame');
      const video = section.querySelector('.reel__frame video');
      const head = section.querySelectorAll('.reel__head span');
      const ui = section.querySelector('.reel__ui');

      // Solutions' card (the dock target) — measured from layout, so the
      // card's own scroll transforms never skew it.
      const solutions = document.querySelector('.solutions');
      const flip = solutions?.querySelector('.flip');
      const dockTarget = () => {
        const vw = window.innerWidth;
        const w = flip?.offsetWidth || Math.min(vw * 0.26, 320);
        const h = flip?.offsetHeight || (w * 16) / 9;
        const secH = solutions?.offsetHeight || window.innerHeight;
        return { cx: vw / 2, cy: secH / 2, w, h, rx: 0, ry: 0, r: 0, fx: 0, alpha: 1 };
      };

      // ask <Video> to re-evaluate play/pause (honours keepPlaying)
      const nudgePlay = () => video?.dispatchEvent(new Event('video:sync'));

      const reduced = prefersReducedMotion();
      const holo = { k: 0 };
      const dock = { d: 0 };
      const easeDock = gsap.parseEase('power2.inOut');

      // One renderer for the frame: hologram → full-bleed → docked card
      const render = () => {
        const full = reduced ? holoFull(frame) : lerpHolo(holoMid(), holoFull(frame), holo.k);
        if (dock.d <= 0) {
          applyHolo(frame, full, 0);
          return;
        }
        const p = easeDock(Math.min(1, dock.d / 0.9));
        const s = lerpHolo(full, dockTarget(), p);
        // swing through 3D on the way: turns toward the card, then squares up
        s.ry = -34 * Math.sin(Math.PI * p);
        s.rx = 10 * Math.sin(Math.PI * p);
        // last stretch: the real Solutions card fades in on top
        s.alpha = 1 - gsap.utils.clamp(0, 1, (dock.d - 0.9) / 0.1);
        applyHolo(frame, s, 0, { beam: false });
        frame.style.setProperty('--dock', p.toFixed(3));
      };
      render();

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=330%',
          pin: true,
          // no lag: the hologram hand-off with JourneyActors and the dock
          // into Solutions must stay locked to the scroll position
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate() {
            if (video?.paused) nudgePlay();
          },
          onRefresh: render,
        },
      });

      // Playback hold window: from the moment the section starts entering
      // (the hologram already shows the film) until the pin has finished.
      const hold = ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: () => tl.scrollTrigger?.end ?? 0,
        invalidateOnRefresh: true,
        onToggle(self) {
          activeRef.current = self.isActive;
          nudgePlay();
        },
      });

      /* ---------- 1. hologram → full-bleed film ---------- */
      tl.fromTo(holo, { k: 0 }, { k: 1, ease: 'power2.inOut', duration: T_FULL, onUpdate: render }, 0);

      // Heading folds back into depth, word by word
      tl.fromTo(
        head,
        { rotateX: 0, z: 0, yPercent: 0, opacity: 1 },
        {
          rotateX: -85,
          z: -220,
          yPercent: -30,
          opacity: 0,
          transformOrigin: '0% 0%',
          ease: 'power2.in',
          duration: 0.6,
          stagger: 0.12,
        },
        0
      );
      tl.to(section.querySelector('.reel__num'), { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' }, 0);

      if (video) tl.fromTo(video, { scale: 1.5 }, { scale: 1, ease: 'none', duration: T_FULL }, 0);

      tl.fromTo(
        ui,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5 },
        0.7
      );

      /* ---------- 2. dock into the Solutions card ---------- */
      tl.to([ui, section.querySelector('.reel__play')], { opacity: 0, duration: 0.15 }, T_DOCK - 0.1).fromTo(
        dock,
        { d: 0 },
        { d: 1, duration: T_DOCK_LEN, ease: 'none', onUpdate: render, immediateRender: false },
        T_DOCK
      );

      // Initial entrance
      gsap.fromTo('.reel__num', { opacity: 0, x: -25 }, { opacity: 1, x: 0, duration: 1.2, delay: 0.2 });

      return () => {
        activeRef.current = false;
        hold.kill();
        tl.scrollTrigger?.kill();
      };
    },
    { scope: root }
  );

  // Hover: soft glow on the film
  const hover = (on) => () => {
    const section = root.current;
    if (!section) return;
    gsap.to(section.querySelector('.reel__frame'), {
      boxShadow: on ? '0 0 90px rgba(238, 177, 53, 0.18)' : '0 0 0px rgba(238, 177, 53, 0)',
      duration: 1,
      ease: 'power2.out',
    });
    gsap.to(section.querySelector('.reel__play'), {
      scale: on ? 1.12 : 1,
      duration: 0.6,
      ease: on ? 'back.out(2)' : 'power2.out',
    });
  };

  const watch = () => openVideo(videoUrl);

  return (
    <section
      ref={root}
      className="reel"
      id="showreel"
      onPointerEnter={hover(true)}
      onPointerLeave={hover(false)}
    >
      <p className="kicker reel__num">03 / Transmission incoming</p>

      <h2 className="reel__head" aria-label="Transmission incoming">
        <span>Transmission</span>
        <span>Incoming</span>
      </h2>

      <div className="reel__stage">
        <div className="reel__frame">
          {/* Loads a viewport early, always autoplays muted, the section's
              own play button opens the modal, held on while pinned. */}
          <Video
            asset={VIDEO_ASSET}
            poster={posterUrl}
            className="reel__video"
            rootMargin="100% 0px"
            keepPlaying={keepPlaying}
            placeholder={false}
            showPlayButton="never"
            respectReducedMotion={false}
            respectDataSaver={false}
          />

          <div className="reel__ui">
            <div className="reel__ui-top">
              <span>Contenaissance / Showreel</span>
              <button onClick={watch} data-cursor-hover>
                [ Full screen ↗ ]
              </button>
            </div>

            <div className="reel__ui-bottom">
              <span>A glimpse of the possible.</span>
              <button className="sound-btn is-on" onClick={watch}>
                <span className="sound-btn__bars">
                  <i />
                  <i />
                  <i />
                </span>
                Watch with sound
              </button>
            </div>
          </div>

          <button className="reel__play" onClick={watch} aria-label="Play showreel" data-cursor="Play">
            <Play />
          </button>
        </div>
      </div>
    </section>
  );
}
