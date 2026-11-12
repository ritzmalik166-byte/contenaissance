'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import Split from '../Split';
import { ArrowUpRight } from '../Icons';
import "./Journal.css";

export default function Journal({ posts = [] }) {
  const root = useRef(null);
  const items = posts || [];

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
        if (cards.length > 0) {

          gsap.fromTo(
            cards,
            {
              xPercent: (i) => (i - 1) * 12,
              yPercent: 18,
              rotate: (i) => (i - 1) * 4,
              rotateY: (i) => (i - 1) * -8,
              z: (i) => -Math.abs(i - 1) * 50,
              scale: 0.94,
            },
            {
              xPercent: 0,
              yPercent: 0,
              rotate: 0,
              rotateY: 0,
              z: 0,
              scale: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: '.hjournal__grid',
                start: 'top 90%',
                end: 'center 55%',
                scrub: 1,
              },
            }
          );
        }
      });
      mm.add('(max-width: 899px)', () => {
        const cards = gsap.utils.toArray('.hjournal__card');
        if (cards.length > 0) {
          gsap.from('.hjournal__card', {
            y: 80,
            opacity: 0,
            rotateX: -25,
            duration: 1,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.hjournal__grid', start: 'top 85%' },
          });
        }
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="hjournal">
      <div className="container">
        <div className="hjournal__head">
          <div>
            <p className="kicker">07 / Field notes</p>
            <Split as="h2" className="display h-lg hjournal__title" lines={['From the ', 'Journal']} />
          </div>
          <Link href="/blog" className="btn btn--ghost">
            Read the Blog <ArrowUpRight />
          </Link>
        </div>

        <div className="hjournal__grid">
          {items.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="hjournal__card jcard" data-tilt="8" data-cursor="Read">
              <div className="jcard__img">
                <img src={p.image || '/images/logo.png'} alt={p.title || ''} loading="lazy" />
              </div>
              <p className="jmeta">
                <span>{p.date}</span>
                {/* <span>{p.readTime}</span> */}
              </p>
              <h3>{p.title}</h3>
              {p.excerpt && (
                <p className="jcard__description">
                  {p.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

