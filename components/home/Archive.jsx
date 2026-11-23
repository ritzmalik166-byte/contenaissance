
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, isTouch } from '@/lib/user/gsap';
import { archive } from '@/lib/user/content';
import LazyVideo from '../LazyVideo';
import { openVideo } from '../VideoModal';
import { ArrowUpRight } from '../Icons';
import Split from '../Split';
import './MissionArchive.css';

function Work({ item }) {
  return (
    <button
      className={`work work--${item.size}`}
      onClick={() => openVideo(item.video.src)}
      aria-label={`Play ${item.title}`}
    >
      <div
        className="work__media"
        style={{ aspectRatio: item.ratio }}
      >
        <span className="mono work__tag">{item.tag}</span>

        <LazyVideo
          src={item.video.preview}
          poster={item.video.poster}
        />

        <span className="work__arrow">
          <ArrowUpRight />
        </span>
      </div>

      <div className="work__foot">
        <p>{item.title}</p>
        <span className="mono">Visual exploration</span>
      </div>
    </button>
  );
}

export default function Archive() {
  const root = useRef(null);

  // The space backdrop is the shared homepage universe
  // (components/home/journey/UniverseCanvas.jsx).

  // GSAP animations
  useGSAP((ctx, contextSafe) => {
    // Journey: the camera is pulling back out of Mars' atmosphere
    // (end of Solutions) — the archive settles in from slightly
    // oversized, like the lens zooming out.
    gsap.fromTo(
      '.archive__head',
      { scale: 1.18, opacity: 0, filter: 'blur(6px)' },
      {
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'power2.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top bottom',
          end: 'top 35%',
          scrub: true,
        },
      }
    );

    gsap.from('.archive__title .split-char', {
      yPercent: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.02,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: '.archive__head',
        start: 'top 80%',
      },
    });

    gsap.utils.toArray('.work', root.current).forEach((card) => {
      gsap.from(card, {
        y: 100,
        opacity: 0,
        rotationX: 15,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
          end: 'top 55%',
          scrub: 1,
        },
      });
    });

    if (window.innerWidth > 760) {
      gsap.fromTo(
        '.archive__col:last-child',
        { y: 60 },
        {
          y: -60,
          ease: 'none',
          scrollTrigger: {
            trigger: '.archive__grid',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    }

    if (isTouch()) return;

    const cards = gsap.utils.toArray('.work__media', root.current);

    const cleanups = cards.map((card) => {
      const rotateX = gsap.quickTo(card, 'rotationX', {
        duration: 0.5,
        ease: 'power2.out',
      });

      const rotateY = gsap.quickTo(card, 'rotationY', {
        duration: 0.5,
        ease: 'power2.out',
      });

      const move = contextSafe((e) => {
        const rect = card.getBoundingClientRect();

        rotateY(((e.clientX - rect.left) / rect.width - 0.5) * 8);
        rotateX(-((e.clientY - rect.top) / rect.height - 0.5) * 8);
      });

      const leave = () => {
        rotateX(0);
        rotateY(0);
      };

      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);

      return () => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, { scope: root });

  return (
    <section ref={root} className="archive" id="work">

      <div className="container">

        <div className="archive__head">
          <div>
            <p className="kicker">05 / Mission archive</p>

            <Split
              as="h2"
              className="display h-lg archive__title"
              lines={['Stories beyond the ordinary']}
              style={{ marginTop: 18 }}
            />
          </div>

          <p>
            A window into our creative universe.
            Film, form and feeling, explored through AI.
          </p>
        </div>

        <div className="archive__grid" data-skew>
          <div className="archive__col">
            {[0, 2, 4].map((i) => (
              <Work key={i} item={archive[i]} />
            ))}
          </div>

          <div className="archive__col">
            {[1, 3].map((i) => (
              <Work key={i} item={archive[i]} />
            ))}
          </div>
        </div>

        <div className="archive__foot">
          <span>
            Concept imagery / A glimpse of our visual language
          </span>

          <Link href="/portfolio">
            Explore the archive <ArrowUpRight size={12} />
          </Link>
        </div>

      </div>
    </section>
  );
}
