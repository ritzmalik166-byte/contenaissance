'use client';

import { useEffect, useRef } from 'react';

/** a muted preview that only loads and plays while `live` (decorative: hidden from AT) */
export default function LiveVideo({ src, poster, live, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (live) {
      if (!v.getAttribute('src')) v.src = src;
      v.play().catch(() => {});
    } else v.pause();
  }, [live, src]);
  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />;
}
