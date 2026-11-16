
'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import './StorytellingShowreel.css';

export default function StorytellingShowreel() {
  const root = useRef(null);
  const stage = useRef(null);
  const frame = useRef(null);
  const videoRef = useRef(null);

  const timeRef = useRef(null);
  const durationRef = useRef(null);
  const progressRef = useRef(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: '(min-width: 701px)',
          mobile: '(max-width: 700px)',
        },
        (context) => {
          const { desktop } = context.conditions;

          const startWidth = desktop ? '78vw' : '92vw';
          const startHeight = desktop ? '70svh' : '58svh';

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: desktop ? '+=150%' : '+=120%',
              scrub: 1,
              pin: stage.current,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          // Expand the cinematic video frame
          tl.fromTo(
            frame.current,
            {
              width: startWidth,
              height: startHeight,
              borderRadius: desktop ? 5 : 4,
            },
            {
              width: '100vw',
              height: '100svh',
              borderRadius: 0,
              ease: 'none',
              duration: 1,
            }
          );

          // Cinematic title transitions
          tl.to(
            '.story-title',
            {
              scale: desktop ? 1.06 : 1,
              opacity: 0.75,
              ease: 'none',
              duration: 0.7,
            },
            0.2
          );

          // Top camera metadata fades
          tl.to(
            '.story-topbar',
            {
              opacity: 0,
              y: -15,
              ease: 'none',
              duration: 0.25,
            },
            0.78
          );

          // Bottom information fades
          tl.to(
            '.story-footer',
            {
              opacity: 0,
              y: 15,
              ease: 'none',
              duration: 0.25,
            },
            0.78
          );

          // Cinematic accent line
          tl.fromTo(
            '.story-accent-line',
            {
              scaleX: 0,
            },
            {
              scaleX: 1,
              ease: 'none',
              duration: 0.5,
            },
            0
          );

          return () => tl.scrollTrigger?.kill();
        }
      );

      return () => mm.revert();
    },
    { scope: root }
  );

  const formatTime = (value) => {
    if (!Number.isFinite(value)) return '00:00';

    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);

    return `${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  };

  const handleTimeUpdate = (event) => {
    const video = event.currentTarget;

    if (timeRef.current) {
      timeRef.current.textContent = formatTime(
        video.currentTime
      );
    }

    if (progressRef.current && video.duration) {
      progressRef.current.style.transform = `scaleX(${
        video.currentTime / video.duration
      })`;
    }
  };

  const handleMetadata = (event) => {
    const video = event.currentTarget;

    if (durationRef.current) {
      durationRef.current.textContent = formatTime(
        video.duration
      );
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const enableSound = () => {
    const video = videoRef.current;

    if (!video) return;

    video.muted = false;
    setIsMuted(false);
  };

  const disableSound = () => {
    const video = videoRef.current;

    if (!video) return;

    video.muted = true;
    setIsMuted(true);
  };

  return (
    <section
      ref={root}
      className="story-showreel"
      id="storytelling-showreel"
    >
      <div
        ref={stage}
        className="story-stage"
      >
        <div
          ref={frame}
          className="story-frame"
          onMouseEnter={enableSound}
          onMouseLeave={disableSound}
        >

          {/* VIDEO */}

          <video
            ref={videoRef}
            className="story-video"
            src="/videos/02.mp4"
            poster="/assets/G1.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedMetadata={handleMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* CINEMATIC OVERLAY */}

          <div className="story-overlay" />

          <div className="story-vignette" />

          {/* TOP CAMERA BAR */}

          <div className="story-topbar mono">
            <span>SCENE 02</span>

            <div className="story-camera-info">
              <span className="story-rec-dot" />
              <span>TAKE 01</span>
              <span>24 FPS</span>
            </div>
          </div>

          {/* HERO TITLE */}

          <div className="story-hero">

            <p className="story-kicker mono">
              02 / CINEMATIC EXCELLENCE
            </p>

            <h2 className="story-title">
              Experience the <span>Future</span>
              <br />
              of Storytelling.
            </h2>

            <div className="story-accent-line" />

          </div>

          {/* CENTER PLAY CONTROL */}

          <button
            type="button"
            className="story-play-button"
            onClick={togglePlayback}
            aria-label={
              isPlaying ? 'Pause video' : 'Play video'
            }
          >
            {isPlaying ? 'Ⅱ' : '▶'}
          </button>

          {/* BOTTOM BAR */}

          <div className="story-footer mono">

            <div className="story-footer-top">
              <span>
                CONTENAISSANCE / STORYTELLING IN MOTION
              </span>

              <span className="story-sound-hint">
                {isMuted
                  ? '( HOVER TO UNMUTE )'
                  : '( SOUND ON )'}
              </span>
            </div>

            <div className="story-timeline">
              <span
                ref={progressRef}
                className="story-progress"
              />
            </div>

            <div className="story-time">
              <span ref={timeRef}>00:00</span>
              <span>/</span>
              <span ref={durationRef}>00:00</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
