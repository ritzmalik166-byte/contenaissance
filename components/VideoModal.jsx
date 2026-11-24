
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Close } from './Icons';

export const openVideo = (src) => {
  window.dispatchEvent(
    new CustomEvent('video:open', { detail: src })
  );
};

export default function VideoModal() {
  const [src, setSrc] = useState(null);
  const video = useRef(null);
  const isOpen = useRef(false);

  // Mark closed right away: popstate arrives asynchronously, so a second
  // call in the same click (the × button, then the backdrop it bubbles
  // to) would otherwise call history.back() twice and leave the site.
  const closeModal = useCallback(() => {
    if (!isOpen.current) return;
    isOpen.current = false;
    setSrc(null);
    // drop the history entry the modal added (so Back doesn't reopen it)
    if (window.history.state?.videoModal) window.history.back();
  }, []);

  useEffect(() => {
    const open = (e) => {
      if (!e.detail || isOpen.current) return;

      isOpen.current = true;

      window.history.pushState(
        { ...window.history.state, videoModal: true },
        '',
        window.location.href
      );

      setSrc(e.detail);
    };

    const handleBack = () => {
      if (isOpen.current) {
        isOpen.current = false;
        setSrc(null);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };

    window.addEventListener('video:open', open);
    window.addEventListener('popstate', handleBack);
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('video:open', open);
      window.removeEventListener('popstate', handleBack);
      window.removeEventListener('keydown', handleKey);
    };
  }, [closeModal]);

  useEffect(() => {
    if (src) {
      document.body.style.overflow = 'hidden';
      window.__lenis?.stop();
      video.current?.play().catch(() => {});
    } else {
      document.body.style.overflow = '';
      window.__lenis?.start();

      if (video.current) {
        video.current.pause();
        video.current.currentTime = 0;
      }
    }

    return () => {
      if (src) {
        video.current?.pause();
      }
    };
  }, [src]);

  return (
    <div
      className={`vmodal${src ? ' is-open' : ''}`}
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-hidden={!src}
    >
      {src && (
        <>
          <button
            type="button"
            className="vmodal__close"
            onClick={(e) => {
              e.stopPropagation(); // don't also trigger the backdrop's close
              closeModal();
            }}
            aria-label="Close video"
          >
            <Close />
          </button>

          <div
            className="vmodal__content"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={video}
              key={src}
              src={src}
              controls
              autoPlay
              playsInline
              preload="auto"
            />
          </div>
        </>
      )}
    </div>
  );
}
