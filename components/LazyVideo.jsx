'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Force the muted state on the DOM node. React does not reliably apply the
 * `muted` prop (notably after SSR hydration), and browsers block autoplay of
 * a video that isn't muted — play() then rejects silently.
 */
export function forceMuted(video) {
  if (!video) return;
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.playsInline = true;
}

/**
 * Muted looping video that only downloads once near the viewport and pauses when off-screen.
 */
const LazyVideo = forwardRef(function LazyVideo(
  { src, poster, className, eager = false, keepPlaying, ...rest },
  ref
) {
  const el = useRef(null);
  useImperativeHandle(ref, () => el.current);

  // read through a ref so a new callback identity doesn't re-run the effect
  const keepRef = useRef(keepPlaying);
  keepRef.current = keepPlaying;

  useEffect(() => {
    const video = el.current;
    if (!video) return;

    let visible = false;
    forceMuted(video);

    // `keepPlaying()` lets a parent hold playback on while the
    // IntersectionObserver is unreliable (pinned / transformed / clipped)
    const held = () => !!keepRef.current?.();

    const load = () => {
      if (!video.getAttribute('src')) {
        video.preload = 'auto';
        video.src = src;
      }
    };

    const tryPlay = () => {
      if (!(visible || held()) || document.hidden || !video.paused) return;
      load();
      forceMuted(video);
      video.play().catch(() => {
        /* retried on canplay / loadeddata / visibility / next intersection */
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          load();
          tryPlay();
        } else if (!held()) {
          video.pause();
        }
      },
      { rootMargin: eager ? '100% 0px' : '25% 0px' }
    );
    io.observe(video);

    // play() issued before data arrived can reject — retry once it's playable
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('canplay', tryPlay);
    document.addEventListener('visibilitychange', tryPlay);
    // parents can nudge playback (e.g. from a ScrollTrigger update)
    video.addEventListener('lazyvideo:play', tryPlay);

    return () => {
      io.disconnect();
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('canplay', tryPlay);
      document.removeEventListener('visibilitychange', tryPlay);
      video.removeEventListener('lazyvideo:play', tryPlay);
    };
  }, [src, eager]);

  return <video ref={el} className={className} poster={poster} muted loop playsInline preload="none" {...rest} />;
});

export default LazyVideo;
