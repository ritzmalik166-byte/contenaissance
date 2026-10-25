'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { testimonials, aiTools } from '@/lib/content';
import { useVelocityMarquee } from '../useVelocityMarquee';
import Split from '../Split';

const initials = (name) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

function Voice({ t }) {
  return (
    <figure className="voice">
      <blockquote>“{t.quote}”</blockquote>
      <figcaption className="voice__who">
        <span className="voice__avatar">{initials(t.company)}</span>
        <span>
          <h4>{t.company}</h4>
          <span>{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export default function Testimonials() {
  const root = useRef(null);
  const rowA = useRef(null);
  const rowB = useRef(null);

  useVelocityMarquee(rowA, { speed: 0.5, direction: -1 });
  useVelocityMarquee(rowB, { speed: 0.5, direction: 1 });

  useGSAP(
    () => {
      gsap.from('.voices__head .split-char', {
        yPercent: 110,
        duration: 1,
        stagger: 0.015,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.voices__head', start: 'top 80%' },
      });
      gsap.from('.voices__rows', {
        rotateX: 35,
        y: 120,
        opacity: 0,
        transformPerspective: 1200,
        transformOrigin: '50% 0%',
        ease: 'power2.out',
        scrollTrigger: { trigger: '.voices__rows', start: 'top 95%', end: 'top 50%', scrub: 1 },
      });
      gsap.from('.tools__row img', {
        y: 30,
        opacity: 0,
        stagger: 0.07,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.tools', start: 'top 85%' },
      });
    },
    { scope: root }
  );

  const loop = [...testimonials, ...testimonials];
  const loopB = [...testimonials.slice(2), ...testimonials.slice(0, 2)];

  return (
    <section ref={root} className="voices" id="testimonials">
      <div className="container voices__head">
        <p className="kicker">07 / Transmissions received</p>
        <Split as="h2" className="display h-lg" lines={['AI Driven Creative Excellence']} />
      </div>

      <div className="voices__rows">
        <div ref={rowA} className="voices__row">
          {loop.map((t, i) => (
            <Voice t={t} key={`a${i}`} />
          ))}
        </div>
        <div ref={rowB} className="voices__row">
          {[...loopB, ...loopB].map((t, i) => (
            <Voice t={t} key={`b${i}`} />
          ))}
        </div>
      </div>

      <div className="container tools">
        <p className="mono">Powered by the tools shaping the future</p>
        <div className="tools__row">
          {aiTools.map((name) => (
            <img key={name} src={`/images/${name}.png`} alt={name} loading="lazy" />
          ))}
        </div>
      </div>
    </section>
  );
}
