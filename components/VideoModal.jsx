'use client';

import { useEffect, useRef, useState } from 'react';
import { Close } from './Icons';

export const openVideo = (src) => window.dispatchEvent(new CustomEvent('video:open', { detail: src }));

export default function VideoModal() {
  const [src, setSrc] = useState(null);
  const video = useRef(null);

  useEffect(() => {
    const open = (e) => setSrc(e.detail);
    const key = (e) => e.key === 'Escape' && setSrc(null);
    window.addEventListener('video:open', open);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('video:open', open);
      window.removeEventListener('keydown', key);
    };
  }, []);

  useEffect(() => {
    if (src) {
      window.__lenis?.stop();
      video.current?.play().catch(() => {});
    } else {
      window.__lenis?.start();
      video.current?.pause();
    }
  }, [src]);

  return (
    <div className={`vmodal${src ? ' is-open' : ''}`} onClick={() => setSrc(null)} role="dialog" aria-modal="true">
      {src && (
        <video ref={video} src={src} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
      )}
      <button className="vmodal__close" onClick={() => setSrc(null)} aria-label="Close video">
        <Close />
      </button>
    </div>
  );
}
