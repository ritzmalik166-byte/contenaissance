'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/gsap';
import Split from '../Split';
import { ArrowUpRight } from '../Icons';

export default function Journal({ posts }) {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.from('.hjournal__title .split-char', {
        yPercent: 115,
        rotateX: -60,
        duration: 1.2,
        stagger: 0.02,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.hjournal__title', start: 'top 85%' },
      });

      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', () => {
        const cards = gsap.utils.toArray('.hjournal__card');
        gsap.fromTo(
          cards,
          {
            xPercent: (i) => (1 - i) * 100,
            yPercent: 30,
            rotate: (i) => (i - 1) * 9,
            rotateY: (i) => (i - 1) * -25,
            z: (i) => -Math.abs(i - 1) * 120,
            scale: 0.82,
          },
          {
            xPercent: 0,
            yPercent: 0,
            rotate: 0,
            rotateY: 0,
            z: 0,
            scale: 1,
            ease: 'power2.out',
            scrollTrigger: { trigger: '.hjournal__grid', start: 'top 95%', end: 'center 55%', scrub: 1 },
          }
        );
      });
      mm.add('(max-width: 899px)', () => {
        gsap.from('.hjournal__card', {
          y: 80,
          opacity: 0,
          rotateX: -25,
          duration: 1,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.hjournal__grid', start: 'top 85%' },
        });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="hjournal">
      <div className="container">
        <div className="hjournal__head">
          <div>
            <p className="kicker">08 / Field notes</p>
            <Split as="h2" className="display h-lg hjournal__title" lines={['From the', 'Journal']} />
          </div>
          <Link href="/blog" className="btn btn--ghost">
            Read the journal <ArrowUpRight />
          </Link>
        </div>

        <div className="hjournal__grid">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="hjournal__card jcard" data-tilt="8" data-cursor="Read">
              <div className="jcard__img">
                <img src={p.image} alt="" loading="lazy" />
              </div>
              <p className="jmeta">
                <span>{p.date}</span>
                <span>{p.readTime}</span>
              </p>
              <h3>{p.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
