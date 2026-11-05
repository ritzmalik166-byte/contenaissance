'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { v, stats } from '@/lib/user/content';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';

const items = [
  { title: 'Brand Film', name: '01' },
  { title: 'Commercial', name: '03' },
  { title: 'Social Reel', name: '09' },
  { title: 'Documentary Films', name: '10' },
  { title: '3D Website', name: '12' },
  { title: 'Product Flow', name: '13' },
  { title: 'Landing Page', name: '14' },
  { title: 'WebGL Experiences', name: '15' },
  { title: 'Automotive', name: 'auto' },
];

export default function Experiences() {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.utils.toArray('.masonry__item', root.current).forEach((el) => {
        gsap.from(el, {
          y: 120,
          rotateX: 18,
          scale: 0.92,
          opacity: 0,
          transformPerspective: 1000,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 100%', end: 'top 65%', scrub: 1 },
        });
      });

      gsap.utils.toArray('.stat strong', root.current).forEach((el) => {
        const target = Number(el.dataset.value);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = `${Math.round(obj.v)}${el.dataset.suffix}`),
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });
    },
    { scope: root }
  );

  return (
    <div ref={root}>
      <section className="masonry">
        <div className="container">
          <div className="masonry__head">
            <p className="kicker">SELECTED CREATIVE WORK</p>
            <h2 className="display h-lg" style={{ marginTop: 16 }}>
              Creative Work Across Every Medium
            </h2>
            <p className="lead">
              A collection of creative projects spanning brand films, video commercials, product photography, advertising campaigns, and digital experiences. Each project reflects our passion for visual storytelling, creative direction, and innovative production.</p>
          </div>

          <div className="masonry__grid" data-skew>
            {items.map((it) => {
              const vid = v(it.name);
              return (
                <div key={it.name} className="masonry__item" onClick={() => openVideo(vid.src)} data-cursor="Play" data-tilt="6">
                  <LazyVideo src={vid.preview} poster={vid.poster} />
                  <span>{it.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="container stats__grid">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <strong data-value={s.value} data-suffix={s.suffix}>
                0{s.suffix}
              </strong>
              <span>{s.label}</span>
            </div>
          ))}
          <div className="stats__copy">
            <h2>Have a Vision? Let's Make It Happen.</h2>
            <p>Partner with Contenaissance to create powerful brand films, engaging campaigns, and unforgettable digital experiences that move your brand forward.</p>
          </div>
        </div>
      </section>
    </div>
  );
}