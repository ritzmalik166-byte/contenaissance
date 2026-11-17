
'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import './ServiceShowreel.css';

export default function ServiceShowreel() {
  const root = useRef(null);
  const stage = useRef(null);
  const frame = useRef(null);
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (time) => {
    if (!Number.isFinite(time) || time < 0) return '00:00';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useGSAP(() => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const isTablet = window.matchMedia(
      '(min-width: 701px) and (max-width: 1024px)'
    ).matches;

    const startWidth = isMobile
      ? '92vw'
      : isTablet
        ? '84vw'
        : '76vw';

    const startHeight = isMobile
      ? '62svh'
      : isTablet
        ? '68svh'
        : '72svh';

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root.current,
        start: 'top top',
        end: '+=140%',
        scrub: 1,
        pin: stage.current,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Expand frame while preserving the top and bottom strips.
    tl.fromTo(
      frame.current,
      {
        width: startWidth,
        height: startHeight,
        borderRadius: 8,
      },
      {
        width: '100vw',
        height: '100svh',
        borderRadius: 0,
        ease: 'none',
        duration: 1,
      }
    );

    // Animate scroll progress.
    tl.fromTo(
      progressRef.current,
      {
        scaleX: 0,
      },
      {
        scaleX: 1,
        ease: 'none',
        duration: 1,
      },
      0
    );

    // Hide center instruction.
    tl.to(
      '.showreel-hint',
      {
        opacity: 0,
        y: 12,
        ease: 'none',
        duration: 0.3,
      },
      0.65
    );

    // Hide corner brackets.
    tl.to(
      '.showreel-corners',
      {
        opacity: 0,
        ease: 'none',
        duration: 0.25,
      },
      0.8
    );
  }, { scope: root });

  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleLoadedMetadata = (e) => {
    const video = e.currentTarget;

    setDuration(
      Number.isFinite(video.duration) ? video.duration : 0
    );

    setCurrentTime(video.currentTime || 0);
  };

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  return (
    <section
      ref={root}
      className="service-showreel"
      id="service-showreel"
    >
      <div
        ref={stage}
        className="showreel-stage"
      >
        <div
          ref={frame}
          className="showreel-frame"
        >

          {/* TOP BLACK RECORDING BAR */}
          <div className="showreel-topbar">

            <span className="showreel-brand mono">
              CONTENAISSANCE / AI BRAND FILMS
            </span>

            <div className="showreel-recording mono">
              <span className="showreel-rec-dot" />

              <span>REC</span>

              <span>{formatTime(currentTime)}</span>

              <span>2.39 : 1</span>
            </div>

          </div>

          {/* VIDEO MEDIA AREA */}
          <div className="showreel-media">

            <video
              ref={videoRef}
              className="showreel-video"
              src="/videos/02.mp4"
              poster="/assets/G1.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* CINEMATIC OVERLAY */}
            <div className="showreel-overlay" />

            {/* CORNER BRACKETS */}
            <div className="showreel-corners">
              <span className="corner corner--tl" />
              <span className="corner corner--tr" />
              <span className="corner corner--bl" />
              <span className="corner corner--br" />
            </div>

            {/* CENTER PLAY BUTTON */}
            <div className="showreel-center">

              <button
                type="button"
                className="showreel-play"
                onClick={togglePlayback}
                aria-label={
                  isPlaying ? 'Pause showreel' : 'Play showreel'
                }
              >
                {isPlaying ? (
                  <span className="showreel-pause-icon">Ⅱ</span>
                ) : (
                  <span className="showreel-play-icon">▶</span>
                )}
              </button>

              <span className="showreel-hint mono">
                {isPlaying ? 'SCROLL TO EXPAND' : 'CLICK TO PLAY'}
              </span>

            </div>

            {/* BOTTOM CONTENT */}
            <div className="showreel-bottom">

              <div className="showreel-bottom-content">

                <div>
                  <h2 className="showreel-title">
                    A glimpse of the possible.
                  </h2>

                  <p className="showreel-chapter mono">
                    CHAPTER 01 — AI BRAND FILMS / SHOWREEL
                  </p>
                </div>

                <span className="showreel-duration mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

              </div>

              {/* VIDEO TIMELINE */}
              <div className="showreel-timeline">

                <span
                  ref={progressRef}
                  className="showreel-progress"
                />

                <span className="showreel-tick showreel-tick--one" />
                <span className="showreel-tick showreel-tick--two" />
                <span className="showreel-tick showreel-tick--three" />

              </div>

            </div>

          </div>

          {/* FIXED BOTTOM BLACK PADDING */}
          <div className="showreel-bottom-space" />

        </div>
      </div>
    </section>
  );
}
