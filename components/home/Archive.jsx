'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, isTouch, ScrollTrigger } from '@/lib/user/gsap';
import { useLenis } from '@/components/SmoothScrollProvider';
import { getUniverse } from '@/lib/user/universe';
import { archive } from '@/lib/user/content';
import Video from '../Video';
import { getVideoUrl, getPosterUrl } from '@/lib/user/video-assets';
import { openVideo } from '../VideoModal';
import { ArrowUpRight } from '../Icons';
import Split from '../Split';
import RocketSprite from './journey/RocketSprite';
import Button from '../common/Button';
import './MissionArchive.css';

/* =====================================================
   05 / MISSION ARCHIVE — the rocket's flight path.

   A real CSS-3D scene (one perspective, one camera):
   a glowing trajectory snakes away into deep space and
   the rocket flies along it as you scroll. Each film is
   a station on the route — it lies folded flat on its
   launch pad and stands up as the rocket arrives, plays
   while the rocket passes, then swings away past the
   camera. The route ends at a portal ring: the rocket
   climbs through it and the archive CTA opens.

   Everything is driven by one number, T (route position,
   in stations), so scroll up / down is perfectly
   reversible. Only the station in front plays video.
===================================================== */

/* Card → Azure asset (lib/user/video-assets.js), keyed by card title */
const ASSET_BY_TITLE = {
  'Brand Films': 'video07',
  'AI Video Commercials': 'showreel',
  'Music Videos': 'video04',
  'Social Reels': 'automotive',
  'Cinematic Brand Films': 'video08',
};

/** Azure URL for a card; falls back to the local file if unmapped */
const workVideoUrl = (item) => getVideoUrl(ASSET_BY_TITLE[item.title]) ?? item.video.src;

const pad = (n) => String(n).padStart(2, '0');
const clamp01 = gsap.utils.clamp(0, 1);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = gsap.parseEase('power3.out');
const easeInOut = gsap.parseEase('power2.inOut');

const DOTS_PER_STATION = 18;
const FILM_LIFT = 28; // films hover this far above their pads (matches the pad offset in CSS)
const T_START = -1.3; // route position before the section arrives (rocket below frame)
const T_PIN = -0.35; // route position when the pin starts

function Film({ item, index, isActive, onReady }) {
  const url = workVideoUrl(item);
  const portrait = item.ratio?.startsWith('9');

  return (
    <div className={`astation${portrait ? ' astation--portrait' : ''}${isActive ? ' is-on' : ''}`}>
      {/* launch pad on the route floor */}
      <span className="astation__pad" aria-hidden="true">
        <i />
      </span>

      <button
        className="afilm"
        style={{ '--ratio': item.ratio }}
        data-index={index}
        /* clicks are handled on .archive__viewport (see onFilmClick) */
        aria-label={isActive ? `Play ${item.title}` : `Go to ${item.title}`}
      >
        {/* The edge must come BEFORE the frame: GSAP sets opacity on .afilm,
            which flattens its 3D, and flattened children paint in DOM order —
            after the frame it would cover the video and poster entirely. */}
        <span className="afilm__edge" aria-hidden="true" />
        <span className="afilm__frame">
          {/* GSAP owns play / pause: only the station in front plays */}
          <Video
            src={url}
            poster={getPosterUrl(ASSET_BY_TITLE[item.title]) ?? item.video.poster}
            className="afilm__video"
            fit="cover"
            autoPlay={false}
            pauseWhenHidden={false}
            preload="metadata"
            lazy={false} /* the 3D route confuses "near the viewport" checks; metadata only, so it stays light */
            placeholder={false}
            showPlayButton="never"
            respectReducedMotion={false}
            respectDataSaver={false}
            onReady={(video) => onReady(index, video)}
            fallback={<span>Video unavailable</span>}
          />
          <span className="afilm__scan" />
          <span className="afilm__shade" />
          <span className="afilm__glare" />
          <span className="mono afilm__tag">{item.tag}</span>
          <span className="mono afilm__num">ST-{pad(index + 1)}</span>
          <span className="afilm__play" aria-hidden="true">
            <ArrowUpRight />
          </span>
          <i className="afilm__c afilm__c--tl" />
          <i className="afilm__c afilm__c--tr" />
          <i className="afilm__c afilm__c--bl" />
          <i className="afilm__c afilm__c--br" />
        </span>
        <span className="afilm__title">{item.title}</span>
      </button>
    </div>
  );
}

export default function Archive() {
  const root = useRef(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const playingRef = useRef(false);
  const jumpRef = useRef(null);
  const { getLenis } = useLenis();
  const n = archive.length;
  const T_END = n + 1.25; // route position at the end of the pin
  const dotCount = Math.round((n + 1 - T_START + 0.3) * DOTS_PER_STATION);

  // A film's source attaches lazily — start it if it's the one in front
  const onReady = (index, video) => {
    if (index === activeRef.current && playingRef.current && video.paused) {
      video.muted = true;
      video.play().catch(() => {});
    }
  };

  /* Film clicks. Chrome mis-hit-tests the nested 3D transforms (the real
     click lands on .archive__cam, not the film it draws on top), so find
     the film from its on-screen box instead. Keyboard clicks (Enter /
     Space on the button) still arrive with the film as the target. */
  const onFilmClick = (e) => {
    let film = e.target.closest?.('.afilm');
    if (!film) {
      const { clientX: x, clientY: y } = e;
      const hits = [...root.current.querySelectorAll('.afilm')].filter((f) => {
        if (f.style.pointerEvents === 'none' || f.closest('.astation').style.visibility === 'hidden') return false;
        const r = f.querySelector('.afilm__frame').getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
      film = hits.find((f) => +f.dataset.index === activeRef.current) ?? hits[0];
    }
    if (!film) return;
    const index = +film.dataset.index;
    if (index === activeRef.current) openVideo(workVideoUrl(archive[index]));
    else jumpRef.current?.(index);
  };

  useGSAP(
    (ctx, contextSafe) => {
      const q = gsap.utils.selector(root);
      const section = root.current;
      const world = q('.archive__world')[0];
      const cam = q('.archive__cam')[0];
      const stations = q('.astation');
      const films = stations.map((s) => s.querySelector('.afilm'));
      const shades = stations.map((s) => s.querySelector('.afilm__shade'));
      const pads = stations.map((s) => s.querySelector('.astation__pad'));
      const dots = q('.archive__dot');
      const rocket = q('.archive__rocket')[0];
      const transit = q('.archive__transit')[0];
      const flame = [rocket, transit].map((el) => el.querySelector('.rsprite__flame'));
      const engineLight = [rocket, transit].map((el) => el.querySelector('.rsprite__enginelight'));
      const sprites = [rocket, transit].map((el) => el.querySelector('.rsprite'));
      const glow = q('.archive__rocket-glow')[0];
      const ring = q('.archive__ring')[0];
      const head = q('.archive__head')[0];
      const hud = q('.archive__hud')[0];
      const tele = q('.archive__tele')[0];
      const meter = q('.archive__tele-dist')[0];
      const mapDot = q('.archive__map-rocket')[0];
      const mapTrail = q('.archive__map-trail')[0];
      const portal = q('.archive__portal')[0];

      /* ---------- layout (all in px, world space) ---------- */
      const L = {};
      const measure = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        L.mobile = vw < 760;
        L.persp = L.mobile ? 900 : 1200;
        L.gap = L.mobile ? 900 : 1000; // depth between stations
        L.amp = L.mobile ? 60 : Math.min(220, vw * 0.14); // route swing
        L.floor = L.mobile ? vh * 0.34 : Math.min(300, vh * 0.34);
        L.back = L.mobile ? 620 : 720; // camera distance behind the rocket
        L.rocketY = L.mobile ? L.floor + 10 : L.floor - 150;
        L.filmW = films[0]?.offsetWidth || 800;
        L.filmX = L.mobile ? 0 : L.filmW * 0.5 + 70;
        // on mobile the films sit centred over the route, so they hover
        // higher and the rocket passes underneath them
        L.filmY = L.floor - FILM_LIFT - (L.mobile ? 170 : 0);
        L.ringY = L.floor - (L.mobile ? 380 : 470);
        L.portalAt = n + 1;
        L.camStop = n + 0.62;
        world.parentElement.style.perspective = `${L.persp}px`;
      };

      const side = (i) => (L.mobile ? 0 : i % 2 ? 1 : -1);
      const xAt = (t) => L.amp * Math.sin(Math.PI * (t - 0.5));
      const zAt = (t) => -t * L.gap;
      const stationT = (i) => i + 1;
      const dotT = (k) => T_START + 0.3 + k / DOTS_PER_STATION;

      /* ---------- static placement (on refresh only) ---------- */
      const place = () => {
        measure();
        stations.forEach((st, i) => {
          const t = stationT(i);
          const x = L.mobile ? 0 : side(i) * L.filmX;
          st.dataset.x = x;
          st.dataset.z = zAt(t);
        });
        dots.forEach((d, k) => {
          const t = dotT(k);
          d.style.transform = `translate3d(${xAt(t)}px, ${L.floor}px, ${zAt(t)}px) rotateX(90deg)`;
        });
        lit = -1;
        hidden = -1;
      };

      /* ---------- playback ---------- */
      let playing = -2;
      const play = (idx) => {
        if (idx === playing) return;
        playing = idx;
        playingRef.current = idx >= 0;
        films.forEach((film, i) => {
          const v = film.querySelector('video');
          if (!v) return;
          if (i === idx) {
            v.muted = true;
            v.preload = 'auto'; // buffer the film in front fully
            const attempt = () => v.play().catch(() => {});
            attempt();
            // if it couldn't start yet (still buffering), try again once
            // enough data has arrived
            if (v.readyState < 3) v.addEventListener('canplay', () => playing === i && v.paused && attempt(), { once: true });
          } else {
            if (!v.paused) v.pause();
            // stop buffering films that left the front so they don't hold
            // the browser's few connections to the video host
            v.preload = 'metadata';
          }
        });
      };

      /* ---------- render: T → whole scene ---------- */
      const S = { a: 0, p: 0 };
      let lit = -1;
      let hidden = -1;
      let lastIdx = -1;
      let lastT = null;
      let boost = 0;
      let panX = 0; // the archive panel's sideways offset during the Solutions → Archive pan

      const render = () => {
        const T = S.p > 0 ? T_PIN + S.p * (T_END - T_PIN) : T_START + S.a * (T_PIN - T_START);
        if (lastT !== null) boost = Math.min(1, boost + Math.abs(T - lastT) * 6);
        lastT = T;

        /* camera: trails the rocket, leans toward the station in focus */
        const ct = gsap.utils.clamp(T_PIN, L.camStop, T);
        let bias = 0;
        if (!L.mobile) {
          for (let i = 0; i < n; i++) {
            const d = (ct - stationT(i)) / 0.6;
            bias += side(i) * L.filmW * 0.3 * Math.exp(-d * d);
          }
        }
        const finale = smooth(n - 0.1, L.camStop, ct);
        const camX = (xAt(ct) * 0.35 + bias) * (1 - finale) + xAt(L.portalAt) * finale;
        const camY = (L.ringY + 120) * finale * 0.85;
        const camZ = zAt(ct) + L.back;
        world.style.transform = `translate3d(${-camX}px, ${-camY}px, ${-camZ}px)`;

        /* trajectory: lit behind the rocket, hidden behind the camera */
        const litTo = Math.floor((T - (T_START + 0.3)) * DOTS_PER_STATION);
        const hideTo = Math.floor((ct - L.back / L.gap + 0.12 - (T_START + 0.3)) * DOTS_PER_STATION);
        // past the last film there's nothing left to fly to: the route
        // fades away while the rocket climbs to the portal
        section.style.setProperty('--route-a', (1 - smooth(n + 0.3, n + 0.75, T)).toFixed(3));
        // the route draws in once the panel has mostly slid into view
        const draw = clamp01((S.a - 0.62) / 0.38);
        const shown = S.p > 0 ? dots.length : Math.floor(draw * dots.length);
        if (litTo !== lit || hideTo !== hidden || shown !== render.shown) {
          dots.forEach((d, k) => {
            d.classList.toggle('is-lit', k <= litTo);
            d.classList.toggle('is-gone', k <= hideTo || k >= shown);
          });
          lit = litTo;
          hidden = hideTo;
          render.shown = shown;
        }

        /* stations: fold up as the rocket nears, swing away as it passes */
        stations.forEach((st, i) => {
          const t = stationT(i);
          const s = side(i);
          const x = +st.dataset.x;
          const z = +st.dataset.z;
          const rel = z - camZ; // < 0 → in front of the camera
          const rise = easeOut(clamp01((T - (t - 1.15)) / 0.75));
          const passed = clamp01((rel + 520) / 420); // 0 → 1 as it slides past the camera
          // fades as it nears the camera, and clears the way for the portal
          const fade = (1 - clamp01((rel + 260) / 160)) * (1 - smooth(n + 0.2, n + 0.55, T));
          const vis = rel < L.persp * 0.6 && fade > 0.01 && rise > 0.01;
          st.style.visibility = vis ? 'visible' : 'hidden';
          if (!vis) return;

          const lift = (1 - rise) * 30;
          // Phones: the films sit centred over the route, so instead of
          // flying straight into the lens they glide aside as the rocket
          // passes — alternately left and right — turning away a little.
          const ms = L.mobile ? (i % 2 ? 1 : -1) : 0;
          const glide = easeInOut(passed);
          const dx = L.mobile ? ms * glide * window.innerWidth * 0.9 : s * passed * 160;
          const ry = L.mobile ? -ms * glide * 34 : -s * (16 + passed * 46);
          films[i].style.transform =
            `translate(-50%, -100%) translate3d(${dx}px, ${-lift}px, 0) ` +
            `rotateY(${ry}deg) rotateX(${(1 - rise) * 84}deg)`;
          films[i].style.opacity = (Math.min(1, rise * 1.6) * fade).toFixed(3);
          films[i].style.pointerEvents = rise > 0.9 && fade > 0.6 ? 'auto' : 'none';
          st.style.transform = `translate3d(${x}px, ${L.filmY}px, ${z}px)`;
          // further down the route = darker; the one in focus is clean
          const depth = clamp01((-rel - L.back - 120) / (L.gap * 1.6));
          shades[i].style.opacity = (depth * 0.7).toFixed(3);
          pads[i].style.opacity = (rise * fade).toFixed(3);
          st.classList.toggle('is-near', Math.abs(T - t) < 0.5);
        });

        /* rocket: flies in from the left across Solutions during the
           sideways pan, turns into the route, rides it, climbs through
           the ring */
        const rt = gsap.utils.clamp(T_PIN, L.portalAt + 0.25, T);
        const climb = smooth(n + 0.2, L.portalAt, T);
        const through = smooth(L.portalAt - 0.08, L.portalAt + 0.12, T);
        // fly ∈ 0..1 over the pan: screen-space sweep from off the left
        // edge to the rocket's resting spot in the (sliding) archive panel
        const fly = S.p > 0 ? 1 : easeInOut(S.a);
        const ry = L.rocketY + (L.ringY - L.rocketY) * climb;
        // Nose along the route as it appears on screen: project the
        // rocket's position and a point a little further down the route
        // through the camera, and aim along the line between them (the
        // route curves left/right and recedes toward the next film).
        // Measured along the glowing route on the floor (where receding
        // into depth reads clearly on screen), looking well ahead, and
        // capped so it banks believably instead of lying sideways.
        const proj = (t) => {
          const k = L.persp / (L.persp + (camZ - zAt(t)));
          return { x: (xAt(t) - camX) * k, y: (L.floor - camY) * k };
        };
        const pa = proj(rt);
        const pb = proj(rt + 0.4);
        const headDeg = gsap.utils.clamp(-50, 50, (Math.atan2(pb.x - pa.x, pa.y - pb.y) * 180) / Math.PI);
        rocket.style.transform =
          `translate3d(${xAt(rt)}px, ${ry}px, ${zAt(rt)}px) translate(-50%, -50%) ` +
          `rotateZ(${headDeg * (1 - climb)}deg) scale(${1 - through * 0.6})`;
        if (fly < 1) {
          // The crossing happens in flat screen space (3D perspective
          // distorts badly that far off-axis): a twin sprite flies in
          // from beyond the left edge and lands exactly on the 3D
          // rocket's resting spot, measured live, then hands over.
          rocket.style.opacity = '0';
          const W = window.innerWidth;
          const sec = section.getBoundingClientRect();
          const rest = rocket.getBoundingClientRect();
          const ex = rest.left + rest.width / 2;
          const ey = rest.top + rest.height / 2;
          const sx = -W * 0.18 + (ex + W * 0.18) * fly;
          const sy = ey + (1 - fly) * 40 - Math.sin(Math.PI * fly) * 80;
          // nose right → turns to the route heading the 3D rocket takes over at
          const turn = 90 + (headDeg - 90) * smooth(0.62, 1, fly);
          const scale = rest.height / (transit.offsetHeight || 1);
          transit.style.visibility = 'visible';
          transit.style.transform =
            `translate(${sx - sec.left}px, ${sy - sec.top}px) translate(-50%, -50%) rotate(${turn}deg) scale(${scale})`;
          boost = Math.max(boost, 0.8); // full burn while crossing
        } else {
          transit.style.visibility = 'hidden';
          rocket.style.opacity = (1 - through).toFixed(3);
        }
        glow.style.transform = `translate3d(${xAt(rt)}px, ${L.floor}px, ${zAt(rt)}px) translate(-50%, -50%) rotateX(90deg)`;
        glow.style.opacity = ((1 - climb) * smooth(0.7, 1, fly) * 0.9).toFixed(3);

        /* the portal ring at the end of the route */
        const ringIn = smooth(n - 0.6, n + 0.2, T);
        const flash = smooth(L.portalAt - 0.05, L.portalAt + 0.2, T);
        ring.style.transform =
          `translate3d(${xAt(L.portalAt)}px, ${L.ringY}px, ${zAt(L.portalAt)}px) translate(-50%, -50%) ` +
          `scale(${0.6 + ringIn * 0.4 + flash * 0.12}) rotateZ(${T * 20}deg)`;
        ring.style.opacity = ringIn.toFixed(3);
        ring.classList.toggle('is-open', flash > 0.5);

        /* 2D overlays */
        const headOut = smooth(0.1, 0.55, T);
        head.style.opacity = (1 - headOut).toFixed(3);
        head.style.transform = `translate3d(0, ${-headOut * 40}px, 0)`;
        const hudIn = smooth(0.35, 0.75, T) * (1 - smooth(n + 0.05, n + 0.45, T));
        hud.style.opacity = hudIn.toFixed(3);
        hud.style.visibility = hudIn > 0.01 ? 'visible' : 'hidden';
        tele.style.opacity = (smooth(-0.6, -0.1, T) * (1 - smooth(n + 0.6, n + 0.9, T))).toFixed(3);
        const portalIn = smooth(L.portalAt + 0.02, L.portalAt + 0.22, T);
        portal.style.opacity = portalIn.toFixed(3);
        portal.style.transform = `translate(-50%, -50%) scale(${0.9 + portalIn * 0.1})`;
        portal.style.visibility = portalIn > 0.01 ? 'visible' : 'hidden';

        /* telemetry */
        const prog = clamp01(T / L.portalAt);
        meter.textContent = (Math.max(0, T) * 1.618).toFixed(2);
        mapDot.style.left = `${prog * 100}%`;
        mapTrail.style.transform = `scaleX(${prog})`;

        /* active station */
        const idx = gsap.utils.clamp(0, n - 1, Math.round(T - 1));
        if (idx !== lastIdx) {
          if (lastIdx >= 0) getUniverse()?.pulse(0.25);
          lastIdx = idx;
          activeRef.current = idx;
          setActive(idx);
        }
        play(S.a > 0.6 && T > 0.25 && T < n + 0.5 ? idx : -1);
      };

      /* flame burns hotter while the route is moving */
      const burn = () => {
        boost *= 0.9;
        // set directly: GSAP's SVG origin math fights the CSS origin
        // (Universe.css .rsprite__flame) and detaches the flame
        const s = `scale(1, ${(0.85 + boost * 0.9).toFixed(3)})`;
        flame.forEach((el) => el && (el.style.transform = s));
        // engine light on the hull brightens with the burn, and the
        // airframe buzzes a little under thrust (the CSS `translate`
        // property composes with the transform the route sets)
        engineLight.forEach((el) => el && (el.style.opacity = (0.45 + boost * 0.55).toFixed(3)));
        const j = boost * 1.1;
        sprites.forEach((el) => {
          if (el) el.style.translate = `${((Math.random() - 0.5) * j).toFixed(2)}px ${((Math.random() - 0.5) * j).toFixed(2)}px`;
        });
      };
      gsap.ticker.add(burn);

      /* ---------- Solutions → Archive: a sideways pan ----------
         While the archive would normally scroll up into view, both
         sections are held level (their vertical scroll cancelled with
         the CSS `translate` property, which composes with GSAP's
         transforms) and slid left instead: Solutions exits left, the
         archive arrives from the right. Driven by the raw scroll so the
         vertical cancel never lags. */
      const sol = document.querySelector('.solutions');
      const clearPan = () => {
        section.style.translate = '';
        section.style.overflow = '';
        section.classList.remove('is-panfix');
        if (sol) {
          sol.style.translate = '';
          sol.style.removeProperty('--panfix-top');
          sol.classList.remove('is-panfix');
          delete sol.dataset.panning;
        }
      };
      // Phones scroll natively (Lenis only smooths the wheel), so the
      // page moves on the compositor before this script can cancel it:
      // the vertical cancel lagged and both panels jumped up and down.
      // There, both panels are held fixed on screen for the pan instead
      // (their pin-spacers keep the layout) and only slide sideways.
      const fixPan = () => window.innerWidth < 760;
      const applyPan = (p) => {
        const W = window.innerWidth;
        const vh = window.innerHeight;
        if (p <= 0 || p >= 1) {
          clearPan();
          panX = p >= 1 ? 0 : W;
        } else {
          const e = easeInOut(p); // sideways travel
          const s = p * vh; // how far the page has scrolled — cancelled
          panX = (1 - e) * W;
          const fixed = fixPan();
          section.classList.toggle('is-panfix', fixed);
          section.style.translate = fixed ? `${panX}px 0px` : `${panX}px ${s - vh}px`;
          // the rocket flies in across Solutions, outside this panel
          section.style.overflow = 'visible';
          if (sol) {
            if (fixed) {
              // Solutions can be taller than a phone screen (min-height):
              // keep its bottom on the screen's bottom, where it ended
              sol.style.setProperty('--panfix-top', `${Math.min(0, vh - sol.offsetHeight)}px`);
              sol.classList.add('is-panfix');
              sol.style.translate = `${-e * W}px 0px`;
            } else {
              sol.classList.remove('is-panfix');
              sol.style.translate = `${-e * W}px ${s}px`;
            }
            sol.dataset.panning = '1';
          }
          // Solutions' full-screen orange let the universe rest; it's
          // sliding away now, so the sky behind must render again
          getUniverse()?.setOccluded('solutions', false);
        }
        render();
      };
      // measure layouts without the pan offsets
      ScrollTrigger.addEventListener('refreshInit', clearPan);
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'top top',
        onUpdate: (self) => applyPan(self.progress),
        onRefresh: (self) => applyPan(self.progress),
      });

      /* ---------- scroll-in: the rocket crosses over, route draws ---------- */
      const chars = q('.archive__title .split-char');
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top top',
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(S, { a: 0 }, { a: 1, duration: 1, ease: 'none', onUpdate: render }, 0)
        .fromTo(cam, { rotationX: 24 }, { rotationX: 0, duration: 1, ease: 'power2.out' }, 0)
        .fromTo(
          q('.archive__kicker'),
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
          0.35
        )
        .fromTo(
          chars,
          { yPercent: 110, rotateX: -80, opacity: 0, transformOrigin: '50% 100%' },
          { yPercent: 0, rotateX: 0, opacity: 1, duration: 0.4, stagger: { amount: 0.2 }, ease: 'power3.out' },
          0.4
        )
        .fromTo(
          q('.archive__lede'),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
          0.7
        );

      /* ---------- pinned flight ---------- */
      const flight = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${window.innerHeight * (n + 1.6) * 0.8}`,
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
          onRefresh: () => {
            place();
            render();
          },
        },
      });
      flight.fromTo(S, { p: 0 }, { p: 1, duration: 1, ease: 'none', onUpdate: render });

      // Clicking a station further down the route flies there
      jumpRef.current = (i) => {
        const st = flight.scrollTrigger;
        if (!st) return;
        const p = (stationT(i) - T_PIN) / (T_END - T_PIN);
        const y = st.start + p * (st.end - st.start) + 1;
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { duration: 1.6 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      };

      place();
      render();

      /* ---------- pointer: the whole scene leans with the cursor ---------- */
      if (isTouch()) {
        return () => {
          gsap.ticker.remove(burn);
          ScrollTrigger.removeEventListener('refreshInit', clearPan);
          clearPan();
          play(-1);
        };
      }
      const tiltX = gsap.quickTo(cam, 'rotationX', { duration: 1.2, ease: 'power3.out' });
      const tiltY = gsap.quickTo(cam, 'rotationY', { duration: 1.2, ease: 'power3.out' });
      const move = contextSafe((e) => {
        if (S.a < 1) return; // the scroll-in owns the tilt until it's done
        tiltY((e.clientX / window.innerWidth - 0.5) * 5);
        tiltX(-(e.clientY / window.innerHeight - 0.5) * 3);
      });
      section.addEventListener('pointermove', move);

      return () => {
        section.removeEventListener('pointermove', move);
        gsap.ticker.remove(burn);
        ScrollTrigger.removeEventListener('refreshInit', clearPan);
        clearPan();
        play(-1);
      };
    },
    { scope: root }
  );

  const current = archive[active];

  return (
    <section ref={root} className="archive" id="work">
      {/* twin of the route rocket for the flat-screen crossing over Solutions */}
      <div className="archive__transit" aria-hidden="true">
        <RocketSprite />
      </div>
      <div className="archive__viewport" onClick={onFilmClick}>
        <div className="archive__cam">
          <div className="archive__world">
            {Array.from({ length: dotCount }, (_, k) => (
              <i className="archive__dot" key={k} />
            ))}

            {archive.map((item, i) => (
              <Film
                key={item.title}
                item={item}
                index={i}
                isActive={i === active}
                onReady={onReady}
              />
            ))}

            <div className="archive__ring" aria-hidden="true">
              <i className="archive__ring-a" />
              <i className="archive__ring-b" />
              <i className="archive__ring-core" />
            </div>

            <span className="archive__rocket-glow" aria-hidden="true" />
            <div className="archive__rocket" aria-hidden="true">
              <RocketSprite />
            </div>
          </div>
        </div>

        <header className="archive__head">
          <p className="kicker archive__kicker">05 / Mission archive</p>
          <Split as="h2" className="display archive__title" lines={['Stories beyond', 'the ordinary']} />
          <p className="archive__lede">
            A window into our creative universe. Film, form and feeling, explored through AI. Scroll to fly the route.
          </p>
        </header>

        <div className="archive__hud" aria-live="polite">
          <div className="archive__hud-body" key={active}>
            <span className="archive__index">{pad(active + 1)}</span>
            <div>
              <p className="mono archive__hud-tag">
                <b /> Station {pad(active + 1)} · {current.tag}
              </p>
              <h3 className="archive__hud-title">{current.title}</h3>
              <button className="archive__hud-play" onClick={() => openVideo(workVideoUrl(current))}>
                Play film <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="archive__tele" aria-hidden="true">
          <div className="archive__tele-row mono">
            <span>Mission archive</span>
            <span>
              <b className="archive__tele-dist">0.00</b> LY
            </span>
          </div>
          <div className="archive__map">
            <span className="archive__map-line" />
            <span className="archive__map-trail" />
            {archive.map((item, i) => (
              <button
                key={item.title}
                className={`archive__map-stop${i === active ? ' is-on' : ''}`}
                style={{ left: `${((i + 1) / (n + 1)) * 100}%` }}
                onClick={() => jumpRef.current?.(i)}
                aria-label={`Go to ${item.title}`}
                tabIndex={-1}
              />
            ))}
            <span className="archive__map-stop archive__map-stop--end" style={{ left: '100%' }} />
            <span className="archive__map-rocket" />
          </div>
          <div className="archive__tele-row mono">
            <span>
              ST {pad(active + 1)} / {pad(n)}
            </span>
            <span>Portal</span>
          </div>
        </div>

        <div className="archive__portal">
          <p className="mono archive__portal-kicker">End of transmission</p>
          <h3 className="display archive__portal-title">More stories wait inside.</h3>
          <Button href="/portfolio" variant="light">
            Explore the archive
          </Button>
          <p className="mono archive__portal-note">Concept imagery / A glimpse of our visual language</p>
        </div>
      </div>
    </section>
  );
}
