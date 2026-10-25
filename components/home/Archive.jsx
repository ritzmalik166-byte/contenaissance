'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, isTouch } from '@/lib/gsap';
import { archive } from '@/lib/content';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';
import { ArrowUpRight } from '../Icons';
import Split from '../Split';

function Work({ item }) {
  return (
    <a
      href={item.video.src}
      className={`work work--${item.size}`}
      onClick={(e) => {
        e.preventDefault();
        openVideo(item.video.src);
      }}
      data-cursor="Play"
    >
      <div className="work__media">
        <span className="mono work__tag">{item.tag}</span>
        <LazyVideo src={item.video.preview} poster={item.video.poster} />
        <span className="work__arrow">
          <ArrowUpRight />
        </span>
      </div>
      <div className="work__foot">
        <h3>{item.title}</h3>
        <span className="mono">Visual exploration</span>
      </div>
    </a>
  );
}

export default function Archive() {
  const root = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      gsap.from('.archive__title .split-char', {
        yPercent: 110,
        duration: 1,
        stagger: 0.015,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.archive__head', start: 'top 80%' },
      });

      gsap.utils.toArray('.work', root.current).forEach((card) => {
        gsap.fromTo(
          card,
          { rotateX: 28, y: 160, z: -220, opacity: 0, transformOrigin: '50% 100%' },
          {
            rotateX: 0,
            y: 0,
            z: 0,
            opacity: 1,
            ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 105%', end: 'top 55%', scrub: 1 },
          }
        );
        gsap.fromTo(
          card.querySelector('video'),
          { yPercent: -6 },
          { yPercent: 6, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      });

      if (window.innerWidth > 760) {
        gsap.fromTo(
          '.archive__col:last-child',
          { y: 80 },
          { y: -80, ease: 'none', scrollTrigger: { trigger: '.archive__grid', start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      }

      if (isTouch()) return;
      const cards = gsap.utils.toArray('.work__media', root.current);
      const handlers = cards.map((media) => {
        const rx = gsap.quickTo(media, 'rotateX', { duration: 0.6, ease: 'power3' });
        const ry = gsap.quickTo(media, 'rotateY', { duration: 0.6, ease: 'power3' });
        const move = contextSafe((e) => {
          const r = media.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 8);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
        });
        const leave = contextSafe(() => {
          rx(0);
          ry(0);
        });
        media.addEventListener('pointermove', move);
        media.addEventListener('pointerleave', leave);
        return () => {
          media.removeEventListener('pointermove', move);
          media.removeEventListener('pointerleave', leave);
        };
      });
      return () => handlers.forEach((off) => off());
    },
    { scope: root }
  );

  return (
    <section ref={root} className="archive" id="work">
      <div className="container">
        <div className="archive__head">
          <div>
            <p className="kicker">06 / Mission archive</p>
            <Split as="h2" className="display h-lg archive__title" lines={['Stories beyond the ordinary.']} style={{ marginTop: 18 }} />
          </div>
          <p>A window into our creative universe. Film, form and feeling — explored through AI.</p>
        </div>

        <div className="archive__grid" data-skew>
          <div className="archive__col">
            <Work item={archive[0]} />
            <Work item={archive[2]} />
          </div>
          <div className="archive__col">
            <Work item={archive[1]} />
            <Work item={archive[3]} />
          </div>
        </div>

        <div className="archive__foot">
          <span>Concept imagery / A glimpse of our visual language</span>
          <Link href="/portfolio">
            Explore the archive <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}
