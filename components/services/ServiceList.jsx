'use client';

import { Fragment, useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { services } from '@/lib/content';
import LazyVideo from '../LazyVideo';
import Banner from '../Banner';

const interludes = {
  1: { title: 'Cinematic Excellence', sub: 'Experience the future of storytelling' },
  3: { title: 'Digital Innovation', sub: 'Where Creativity Meets Technology', direction: 1 },
};

export default function ServiceList() {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.utils.toArray('.svc', root.current).forEach((sec, i) => {
        const media = sec.querySelector('.svc__media video');
        gsap.fromTo(
          media,
          { rotateY: i % 2 ? -18 : 18, scale: 1.2 },
          {
            rotateY: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: sec, start: 'top bottom', end: 'center center', scrub: true },
          }
        );
        gsap.from(sec.querySelectorAll('.svc__copy > *'), {
          y: 50,
          opacity: 0,
          stagger: 0.1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: sec, start: 'top 70%' },
        });
      });
    },
    { scope: root }
  );

  return (
    <div ref={root}>
      {services.map((s, i) => (
        <Fragment key={s.title}>
          <section className="svc">
            <div className="container svc__grid">
              <div className="svc__media">
                <LazyVideo src={s.video.preview} poster={s.video.poster} />
              </div>
              <div className="svc__copy">
                <p className="svc__num">0{i + 1} / 04</p>
                <h2 className="display h-md">{s.kicker}</h2>
                <h3>{s.title}</h3>
                {s.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </div>
          </section>
          {interludes[i] && <Banner {...interludes[i]} />}
        </Fragment>
      ))}
    </div>
  );
}
