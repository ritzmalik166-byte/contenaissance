'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Muted looping video that only downloads once near the viewport and pauses when off-screen.
 */
const LazyVideo = forwardRef(function LazyVideo({ src, poster, className, eager = false, ...rest }, ref) {
  const el = useRef(null);
  useImperativeHandle(ref, () => el.current);

  useEffect(() => {
    const video = el.current;
    if (!video) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) video.src = src;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: eager ? '100% 0px' : '25% 0px' }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src, eager]);

  return <video ref={el} className={className} poster={poster} muted loop playsInline preload="none" {...rest} />;
});

export default LazyVideo;
