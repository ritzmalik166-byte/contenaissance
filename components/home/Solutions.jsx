
'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { formats } from '@/lib/user/content';
import { openVideo } from '../VideoModal';

export default function Solutions() {
  const root = useRef(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
const cards = gsap.utils.toArray(
  '.flip > .flip__card',
  root.current
);
const videos = cards.map((card) => card.querySelector('video'));


console.table(
  cards.map((card, i) => ({
    card: i,
    title: formats[i]?.title,
    videoSrc: videos[i]?.currentSrc || videos[i]?.src,
    readyState: videos[i]?.readyState,
    paused: videos[i]?.paused,
    opacity: getComputedStyle(card).opacity,
    visibility: getComputedStyle(card).visibility,
    width: videos[i]?.getBoundingClientRect().width,
    height: videos[i]?.getBoundingClientRect().height,
  }))
);

      let currentIndex = -1;

      // Play only the active card's video
const activateVideo = (index) => {
  index = Math.max(0, Math.min(index, videos.length - 1));

  if (currentIndex === index) return;

  currentIndex = index;

  videos.forEach((video, i) => {
    if (!video) return;

    if (i === index) {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  setActive(index);
};

      // Initial card setup
      gsap.set(cards, {
        rotateY: 105,
        opacity: 0,
        force3D: true,
        backfaceVisibility: 'hidden',
      });

      gsap.set(cards[0], {
        rotateY: 0,
        opacity: 1,
        force3D: true,
      });

      activateVideo(0);

      // Flip animation
      const tl = gsap.timeline({
        defaults: {
          ease: 'power2.inOut',
        },
      });

cards.forEach((card, i) => {
  if (i === cards.length - 1) return;

  // Animate current card out
  tl.to(
    card,
    {
      rotateY: -90,
      z: -160,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in',
    },
    i + 0.25
  );

  // Animate next card in
  tl.fromTo(
    cards[i + 1],
    {
      rotateY: 90,
      z: -160,
      opacity: 0,
    },
    {
      rotateY: 0,
      z: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out',
      immediateRender: false,
    },
    i + 0.75
  );
});

      tl.to({}, { duration: 0.4 });

      // Scroll animation
      const master = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * 3.2}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },

        onUpdate() {
          const index = Math.min(
            cards.length - 1,
            Math.max(0, Math.round(this.time() - 0.25))
          );

          activateVideo(index);
        },
      });

      master
        .add(tl, 0)
        .fromTo(
          '.solutions__marquee',
          { xPercent: 0 },
          {
            xPercent: -50,
            ease: 'none',
            duration: tl.duration(),
          },
          0
        )
        .fromTo(
          '.sel-frame',
          { rotateZ: -4, y: 40 },
          {
            rotateZ: 4,
            y: -40,
            ease: 'none',
            duration: tl.duration(),
          },
          0
        );

      gsap.from('.solutions__label, .solutions__count', {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
        },
      });

    },
    { scope: root }
  );

  const words = Array.from({ length: 4 });

  return (
    <section
  ref={root}
  className={`solutions ${formats[active]?.title === 'Documentary' ? 'solutions--documentary' : ''}`}
  id="solutions"
>
      <div className="solutions__noise" />

      <p className="solutions__label">
        04 / AI services
      </p>

      <p className="solutions__count">
        {String(active + 1).padStart(2, '0')} /{' '}
        {String(formats.length).padStart(2, '0')}
      </p>

      <div className="solutions__marquee" aria-hidden="true">
        {words.map((_, i) => (
          <span key={i} className={i % 2 ? 'o' : ''}>
            AI SOLUTIONS
          </span>
        ))}
      </div>

      <div className="solutions__stage">
        <div className="sel-frame">
          <i />
          <i />
          <i />
          <i />

          <div
  className="flip"
  onClick={() => {
    const currentFormat = formats[active];
    const videoSrc =
      currentFormat?.video?.full ||
      currentFormat?.video?.preview;

    if (videoSrc) {
      openVideo(videoSrc);
    }
  }}
  role="button"
  tabIndex={0}
  aria-label={`Watch ${formats[active]?.title || 'video'}`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();

      const currentFormat = formats[active];
      const videoSrc =
        currentFormat?.video?.full ||
        currentFormat?.video?.preview;

      if (videoSrc) openVideo(videoSrc);
    }
  }}
>

{formats.map((f) => (
  <figure className="flip__card" key={f.title}>
    <video
      src={f.video.preview}
      poster={f.video.poster}
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
    />

    <figcaption>
      <strong>{f.title}</strong>
      <span>{f.sub}</span>
    </figcaption>
  </figure>
))}
          </div>

          <span className="sel-frame__size">
            {formats[active]?.title || ''} · 1080 × 1350
          </span>
        </div>
      </div>

<ul className="solutions__list">
  {formats.map((f, i) => (
    <li
      key={f.title}
      className={i === active ? 'is-on' : ''}
    >
      {f.title}
    </li>
  ))}
</ul>

      <p className="solutions__desc">
        AI-powered creative solutions for brands that
        think beyond the ordinary.
      </p>
    </section>
  );
}
