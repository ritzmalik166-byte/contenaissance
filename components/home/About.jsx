'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { capabilities } from '@/lib/content';
import Split from '../Split';
import { useVelocityMarquee } from '../useVelocityMarquee';

const body =
  'Contenaissance is where storytelling meets a new creative toolkit. We bring strategy, cinematic craft and generative AI together to make the impossible feel real — and the story feel unmistakably human.';

export default function About() {
  const root = useRef(null);
  const track = useRef(null);

  useVelocityMarquee(track, { speed: 0.6 });

  useGSAP(
    () => {
      gsap.from('.about__title .split-char', {
        yPercent: 110,
        rotate: 6,
        duration: 1.1,
        stagger: 0.018,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.about__title', start: 'top 82%' },
      });

      gsap.to('.about__body .w', {
        opacity: 1,
        stagger: 0.05,
        ease: 'none',
        scrollTrigger: { trigger: '.about__body', start: 'top 80%', end: 'bottom 45%', scrub: true },
      });

      gsap.from('.about__meta > *', {
        x: -30,
        opacity: 0,
        stagger: 0.12,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.about__meta', start: 'top 85%' },
      });
    },
    { scope: root }
  );

  const items = [...capabilities, ...capabilities, ...capabilities, ...capabilities];

  return (
    <section ref={root} className="about" id="about">
      <div className="container about__grid">
        <div className="about__meta">
          <p className="kicker">02 / A new creative frontier</p>
          <ul>
            <li>Human-led</li>
            <li>AI-powered</li>
            <li>Story-first</li>
          </ul>
        </div>
        <div>
          <Split as="h2" className="display about__title" lines={['Not more content.', 'More possibility.']} />
          <Split as="p" by="words" className="about__body" text={body} />
        </div>
      </div>

      <div className="caps" aria-label="Capabilities">
        <div ref={track} className="caps__track">
          {items.map((c, i) => (
            <span className="caps__item" key={i}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
