'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { formats } from '@/lib/content';
import LazyVideo from '../LazyVideo';

export default function Solutions() {
  const root = useRef(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray('.flip__card', root.current);
      gsap.set(cards, { rotateY: 105, opacity: 0 });
      gsap.set(cards[0], { rotateY: 0, opacity: 1 });

      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        tl.to(card, { rotateY: -90, z: -160, duration: 0.5, ease: 'power2.in' }, i + 0.25)
          .set(card, { opacity: 0 }, i + 0.75)
          .fromTo(
            cards[i + 1],
            { rotateY: 90, z: -160, opacity: 1 },
            { rotateY: 0, z: 0, duration: 0.5, ease: 'power2.out', immediateRender: false },
            i + 0.75
          );
      });
      tl.to({}, { duration: 0.4 });

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
          setActive(Math.min(cards.length - 1, Math.max(0, Math.round(this.time() - 0.25))));
        },
      });
      master
        .add(tl, 0)
        .fromTo('.solutions__marquee', { xPercent: 0 }, { xPercent: -50, ease: 'none', duration: tl.duration() }, 0)
        .fromTo('.sel-frame', { rotateZ: -4, y: 40 }, { rotateZ: 4, y: -40, ease: 'none', duration: tl.duration() }, 0);

      gsap.from('.solutions__label, .solutions__count', {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 70%' },
      });
    },
    { scope: root }
  );

  const words = Array.from({ length: 4 });

  return (
    <section ref={root} className="solutions" id="solutions">
      <div className="solutions__noise" />
      <p className="solutions__label">AI services</p>
      <p className="solutions__count">
        {String(active + 1).padStart(2, '0')} / {String(formats.length).padStart(2, '0')}
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
          <div className="flip">
            {formats.map((f) => (
              <figure className="flip__card" key={f.title}>
                <LazyVideo src={f.video.preview} poster={f.video.poster} eager />
                <figcaption>
                  <strong>{f.title}</strong>
                  <span>{f.sub}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <span className="sel-frame__size">{formats[active].title} · 1080 × 1350</span>
        </div>
      </div>

      <ul className="solutions__list">
        {formats.map((f, i) => (
          <li key={f.title} className={i === active ? 'is-on' : ''}>
            {f.title}
          </li>
        ))}
      </ul>

      <p className="solutions__desc">
        AI-powered creative solutions for campaigns, content, branding, &amp; digital experiences.
      </p>
    </section>
  );
}
