'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { formats, webExperiences } from '@/lib/content';
import { openVideo } from '../VideoModal';

const reel = [...formats, ...webExperiences.slice(0, 3)];

export default function Gallery() {
  const root = useRef(null);

  useGSAP(
    () => {
      const track = root.current.querySelector('.hgallery__track');
      const distance = () => track.scrollWidth - window.innerWidth;

      const scroll = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      gsap.utils.toArray('.hcard', track).forEach((card) => {
        gsap.fromTo(
          card,
          { rotateY: -28, z: -160, opacity: 0.4 },
          {
            rotateY: 0,
            z: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: scroll, start: 'left right', end: 'center center', scrub: true },
          }
        );
        gsap.to(card, {
          rotateY: 22,
          z: -120,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: { trigger: card, containerAnimation: scroll, start: 'center center', end: 'right left', scrub: true },
        });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="hgallery">
      <div className="hgallery__head">
        <div>
          <p className="kicker">Brand films</p>
          <h2 className="display h-md" style={{ marginTop: 14 }}>
            Hover any card to preview the reel.
          </h2>
        </div>
        <p>Click to open the cinematic player.</p>
      </div>

      <div className="hgallery__track">
        {reel.map((item, i) => (
          <article
            key={item.title}
            className="hcard"
            onClick={() => openVideo(item.video.src)}
            onPointerEnter={(e) => {
              const el = e.currentTarget.querySelector('video');
              if (!el.src) el.src = item.video.preview;
              el.play().catch(() => {});
            }}
            onPointerLeave={(e) => e.currentTarget.querySelector('video').pause()}
            data-cursor="Play"
          >
            <video poster={item.video.poster} muted loop playsInline preload="none" />
            <div className="hcard__info">
              <span>{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.sub}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
