'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getVideoUrl } from '@/lib/user/video-assets';
import { forceMuted } from './LazyVideo';
import { Play } from './Icons';
import './Video.css';

/**
 * Reusable video player for Azure-hosted (or any) MP4s.
 *
 * Sources — pass ONE of:
 *   asset="showreel"                         key from lib/user/video-assets.js
 *   src="https://…/clip.mp4"                 any URL (or an asset key)
 *   sources={{ mobile, tablet, desktop }}    per-breakpoint keys/URLs
 *
 * Sizing — pass `aspectRatio` ("16 / 9", "9 / 16", 1.777…) for an
 * intrinsic box; omit it and the player fills its parent (100% × 100%).
 *
 * Mobile / performance:
 *   - nothing downloads until the player nears the viewport (`lazy`)
 *   - pauses when scrolled away or when the tab is hidden
 *   - a smaller `sources.mobile` file is picked on small screens
 *   - Data Saver / 2G and prefers-reduced-motion skip autoplay and
 *     don't preload; a play button is shown instead
 *
 * The forwarded ref points at the underlying <video> element.
 */

const DEFAULT_BREAKPOINTS = { mobile: 767, tablet: 1199 };
const FALLBACK_ORDER = {
  mobile: ['mobile', 'tablet', 'desktop'],
  tablet: ['tablet', 'desktop', 'mobile'],
  desktop: ['desktop', 'tablet', 'mobile'],
};

/** asset key → Azure URL; anything else is treated as a URL as-is */
const resolveSource = (value) => (value ? getVideoUrl(value) ?? value : null);

const sizeFor = (width, bp) =>
  width <= bp.mobile ? 'mobile' : width <= bp.tablet ? 'tablet' : 'desktop';

/** string → itself; { mobile, tablet, desktop } → best match for `size` */
const pickForSize = (value, size) => {
  if (!value || typeof value === 'string') return value || null;
  for (const key of FALLBACK_ORDER[size]) if (value[key]) return value[key];
  return null;
};

const isDataConstrained = () => {
  if (typeof navigator === 'undefined') return false;
  const c = navigator.connection;
  return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''));
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Video = forwardRef(function Video(
  {
    // source
    asset,
    src,
    sources,
    poster,
    breakpoints = DEFAULT_BREAKPOINTS,

    // playback
    autoPlay = true,
    muted = true,
    loop = true,
    playsInline = true,
    controls = false,
    preload = 'metadata',

    // loading & visibility
    lazy = true,
    rootMargin = '200px 0px',
    playThreshold = 0.25,
    pauseWhenHidden = true,
    // () => boolean — while true, treat the player as visible. For
    // pinned / transformed / clipped layouts where IntersectionObserver
    // is unreliable. Dispatch `new Event('video:sync')` on the <video>
    // to make the player re-evaluate after this flips.
    keepPlaying,

    // performance / accessibility policies
    respectDataSaver = true,
    respectReducedMotion = true,

    // UI
    aspectRatio,
    fit = 'cover',
    placeholder = true,
    showPlayButton = 'auto', // 'auto' | 'always' | 'never'
    fallback,
    retries = 2,
    retryDelay = 1500,
    ariaLabel,
    decorative,
    className = '',
    videoClassName = '',
    style,

    // callbacks
    onReady,
    onPlay,
    onPause,
    onError,
    onVisibilityChange,

    ...videoProps
  },
  ref
) {
  const wrap = useRef(null);
  const el = useRef(null);
  useImperativeHandle(ref, () => el.current);

  const [size, setSize] = useState(null); // null until mounted (SSR-safe)
  const [near, setNear] = useState(!lazy);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | blocked | error
  const [restricted, setRestricted] = useState(false); // data saver / reduced motion
  const [playing, setPlaying] = useState(false);

  const inView = useRef(false);
  const userPaused = useRef(false);
  const internalPause = useRef(false);
  const attempts = useRef(0);
  const retryTimer = useRef(0);

  // keep the latest callbacks without re-running effects
  const cb = useRef({});
  cb.current = { onReady, onPlay, onPause, onError, onVisibilityChange };
  const keepRef = useRef(keepPlaying);
  keepRef.current = keepPlaying;

  const bpMobile = breakpoints.mobile;
  const bpTablet = breakpoints.tablet;

  /* ---------- responsive size ---------- */
  useEffect(() => {
    const bp = { mobile: bpMobile, tablet: bpTablet };
    const update = () => setSize(sizeFor(window.innerWidth, bp));
    update();
    const queries = [bp.mobile, bp.tablet].map((w) =>
      window.matchMedia(`(max-width: ${w}px)`)
    );
    queries.forEach((q) => q.addEventListener('change', update));
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, [bpMobile, bpTablet]);

  /* ---------- policies (data saver / reduced motion) ---------- */
  useEffect(() => {
    const update = () =>
      setRestricted(
        (respectDataSaver && isDataConstrained()) ||
          (respectReducedMotion && prefersReducedMotion())
      );
    update();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', update);
    navigator.connection?.addEventListener?.('change', update);
    return () => {
      mq.removeEventListener('change', update);
      navigator.connection?.removeEventListener?.('change', update);
    };
  }, [respectDataSaver, respectReducedMotion]);

  const autoPlayAllowed = autoPlay && !restricted;

  /* ---------- resolved URLs for the current breakpoint ---------- */
  const currentSrc = useMemo(() => {
    if (!size) return null;
    if (sources) return resolveSource(pickForSize(sources, size));
    return resolveSource(src ?? asset);
  }, [size, sources, src, asset]);

  const currentPoster = useMemo(
    () => (size ? pickForSize(poster, size) : typeof poster === 'string' ? poster : null),
    [poster, size]
  );

  /* ---------- playback control ---------- */
  const pauseInternal = useCallback(() => {
    const v = el.current;
    if (!v || v.paused) return;
    internalPause.current = true;
    v.pause();
  }, []);

  const sync = useCallback(() => {
    const v = el.current;
    if (!v || !v.getAttribute('src')) return;
    const visible = inView.current || !pauseWhenHidden || !!keepRef.current?.();
    const shouldPlay =
      autoPlayAllowed && visible && !document.hidden && !userPaused.current;

    if (shouldPlay && v.paused) {
      if (muted) forceMuted(v);
      v.play().catch((err) => {
        // autoplay blocked by the browser (e.g. Low Power Mode on iOS)
        if (err?.name === 'NotAllowedError') setStatus('blocked');
      });
    } else if (!shouldPlay && pauseWhenHidden && (!visible || document.hidden)) {
      pauseInternal();
    }
  }, [autoPlayAllowed, pauseWhenHidden, muted, pauseInternal]);

  const syncRef = useRef(sync);
  syncRef.current = sync;

  /* ---------- lazy load: start fetching near the viewport ---------- */
  useEffect(() => {
    if (!lazy) {
      setNear(true);
      return;
    }
    const node = wrap.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [lazy, rootMargin]);

  /* ---------- visibility: play/pause in and out of view ---------- */
  useEffect(() => {
    const node = wrap.current;
    if (!node) return;

    const onDocVisibility = () => syncRef.current();
    document.addEventListener('visibilitychange', onDocVisibility);

    if (typeof IntersectionObserver === 'undefined') {
      inView.current = true;
      return () => document.removeEventListener('visibilitychange', onDocVisibility);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= playThreshold;
        if (visible === inView.current) return;
        inView.current = visible;
        cb.current.onVisibilityChange?.(visible);
        syncRef.current();
      },
      { threshold: [0, playThreshold] }
    );
    io.observe(node);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onDocVisibility);
    };
  }, [playThreshold]);

  /* ---------- attach / swap the source ---------- */
  useEffect(() => {
    const v = el.current;
    if (!v || !near || !currentSrc) return;
    if (v.getAttribute('src') === currentSrc) return;

    // keep position when switching breakpoint files
    const resumeAt = v.getAttribute('src') ? v.currentTime : 0;
    clearTimeout(retryTimer.current);
    attempts.current = 0;

    if (muted) forceMuted(v);
    // data saver / reduced motion → fetch nothing until asked;
    // autoplay → buffer fully; otherwise honour the `preload` prop
    v.preload = autoPlay && restricted ? 'none' : autoPlay ? 'auto' : preload;
    v.src = currentSrc;
    setStatus(v.preload === 'none' ? 'idle' : 'loading');

    if (resumeAt > 0) {
      const restore = () => {
        try {
          v.currentTime = Math.min(resumeAt, (v.duration || resumeAt) - 0.1);
        } catch { /* not seekable */ }
      };
      v.addEventListener('loadedmetadata', restore, { once: true });
    }
    v.load();
    syncRef.current();
  }, [near, currentSrc, muted, autoPlay, restricted, preload]);

  /* ---------- re-evaluate when policies change ---------- */
  useEffect(() => {
    sync();
  }, [sync]);

  /* ---------- external nudge: `video.dispatchEvent(new Event('video:sync'))` ---------- */
  useEffect(() => {
    const v = el.current;
    if (!v) return;
    const onSync = () => syncRef.current();
    v.addEventListener('video:sync', onSync);
    return () => v.removeEventListener('video:sync', onSync);
  }, []);

  /* ---------- keep muted prop in sync ---------- */
  useEffect(() => {
    const v = el.current;
    if (!v) return;
    if (muted) forceMuted(v);
    else v.muted = false;
  }, [muted]);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  /* ---------- media events ---------- */
  const handleLoadedData = () => {
    attempts.current = 0;
    setStatus((s) => (s === 'blocked' ? s : 'ready'));
    cb.current.onReady?.(el.current);
  };

  const handlePlaying = () => setStatus('ready');

  const handlePlay = (e) => {
    userPaused.current = false;
    setPlaying(true);
    cb.current.onPlay?.(e);
  };

  const handlePause = (e) => {
    setPlaying(false);
    // a pause we didn't cause = the user paused (controls / PiP / OS)
    if (!internalPause.current && !e.currentTarget.ended) userPaused.current = true;
    internalPause.current = false;
    cb.current.onPause?.(e);
  };

  const handleError = () => {
    const v = el.current;
    if (!v || !v.getAttribute('src')) return;
    if (attempts.current < retries) {
      const delay = retryDelay * 2 ** attempts.current;
      attempts.current += 1;
      setStatus('loading');
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => {
        v.load();
        syncRef.current();
      }, delay);
      return;
    }
    setStatus('error');
    cb.current.onError?.(v.error);
  };

  /* ---------- user actions ---------- */
  const playByUser = () => {
    const v = el.current;
    if (!v) return;
    userPaused.current = false;
    if (!v.getAttribute('src') && currentSrc) {
      v.src = currentSrc;
    }
    v.preload = 'auto';
    if (muted) forceMuted(v);
    setStatus('loading');
    v.play()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('blocked'));
  };

  const retryByUser = () => {
    const v = el.current;
    if (!v) return;
    attempts.current = 0;
    setStatus('loading');
    v.load();
    playByUser();
  };

  /* ---------- render ---------- */
  const isDecorative = decorative ?? (!controls && muted && !ariaLabel);
  const showLoader = placeholder && (status === 'idle' || status === 'loading');
  const wantsButton =
    showPlayButton === 'always' ||
    (showPlayButton === 'auto' &&
      !controls &&
      !playing &&
      (status === 'blocked' || (!autoPlayAllowed && status !== 'error')));

  const ratio = typeof aspectRatio === 'number' ? String(aspectRatio) : aspectRatio;

  return (
    <div
      ref={wrap}
      className={`cvideo${ratio ? '' : ' cvideo--fill'} ${className}`.trim()}
      data-status={status}
      style={{
        ...(ratio ? { aspectRatio: ratio } : null),
        '--cvideo-fit': fit,
        ...(currentPoster ? { '--cvideo-poster': `url("${currentPoster}")` } : null),
        ...style,
      }}
    >
      <video
        ref={el}
        className={`cvideo__media ${videoClassName}`.trim()}
        poster={currentPoster || undefined}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        controls={controls}
        preload="none"
        disableRemotePlayback
        aria-hidden={isDecorative || undefined}
        aria-label={isDecorative ? undefined : ariaLabel}
        tabIndex={isDecorative && !controls ? -1 : undefined}
        onLoadedData={handleLoadedData}
        onPlaying={handlePlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        {...videoProps}
      />

      {showLoader && (
        <div className="cvideo__placeholder" aria-hidden="true">
          {placeholder === true ? (
            <span className="cvideo__shimmer" />
          ) : (
            placeholder
          )}
        </div>
      )}

      {wantsButton && status !== 'error' && (
        <button
          type="button"
          className="cvideo__play"
          onClick={playByUser}
          aria-label={ariaLabel ? `Play ${ariaLabel}` : 'Play video'}
        >
          <Play />
        </button>
      )}

      {status === 'error' && (
        <div className="cvideo__error" role="alert">
          {fallback ?? (
            <>
              <span>Video unavailable</span>
              <button type="button" onClick={retryByUser}>
                Retry
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default Video;
