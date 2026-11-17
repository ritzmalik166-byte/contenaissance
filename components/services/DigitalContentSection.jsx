
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { ArrowUpRight } from '../Icons';
import './DigitalContentSection.css';

const formats = [
  {
    id: 'story',
    label: 'STORY · 9:16',
    image: '/assets/G1.jpg',
    alt: 'Digital story creative',
    className: 'digital-card--story',
  },
  {
    id: 'feed',
    label: 'FEED · 4:5',
    image: '/assets/G2.jpg',
    alt: 'AI powered social feed creative',
    className: 'digital-card--feed',
  },
  {
    id: 'reel',
    label: 'REEL · 9:16',
    image: '/assets/G3.jpg',
    alt: 'Digital reel campaign creative',
    className: 'digital-card--reel',
  },
  {
    id: 'web',
    label: 'WEB · 16:9',
    image: '/assets/G4.jpg',
    alt: 'Digital website campaign creative',
    className: 'digital-card--web',
  },
];

const capabilities = [
  'Platform-Specific Content',
  'AI-Driven Content Creation',
  'Contextually Relevant Content',
  'Performance Optimization with AI Analytics',
];

function DigitalCard({ item }) {
  const handleMove = (event) => {
    if (event.pointerType !== 'mouse') return;

    const rect = event.currentTarget.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const rotateX = (0.5 - y) * 12;
    const rotateY = (x - 0.5) * 12;

    event.currentTarget.style.setProperty(
      '--card-rx',
      `${rotateX}deg`
    );

    event.currentTarget.style.setProperty(
      '--card-ry',
      `${rotateY}deg`
    );
  };

  const handleLeave = (event) => {
    event.currentTarget.style.setProperty('--card-rx', '0deg');
    event.currentTarget.style.setProperty('--card-ry', '0deg');
  };

  return (
    <div
      className={`digital-card ${item.className}`}
      data-digital-card
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <span className="digital-card-label mono">
        {item.label}
      </span>

      <div className="digital-card-image">
        <img
          src={item.image}
          alt={item.alt}
          draggable="false"
          loading="lazy"
        />
      </div>

      <span className="digital-card-shine" />
    </div>
  );
}

export default function DigitalContentSection() {
  const root = useRef(null);
  const visual = useRef(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray(
        '[data-digital-card]',
        root.current
      );

      const entrance = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top 72%',
          toggleActions: 'play none none reverse',
        },
      });

      entrance
        .fromTo(
          '.digital-kicker',
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
          }
        )
        .fromTo(
          '.digital-card',
          {
            opacity: 0,
            y: 100,
            scale: 0.82,
            rotateX: 15,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            stagger: 0.13,
            duration: 1.1,
            ease: 'power4.out',
          },
          '-=0.3'
        )
        .fromTo(
          '.digital-right > *',
          { opacity: 0, y: 45 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.8'
        );

      // Different scroll speeds for the floating cards
      cards.forEach((card, index) => {
        const direction = index % 2 === 0 ? -1 : 1;

        gsap.fromTo(
          card,
          { y: 0 },
          {
            y: direction * (55 + index * 12),
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.5,
            },
          }
        );
      });

      // Ambient orbit movement
      gsap.to('.digital-orbit', {
        rotate: 360,
        duration: 55,
        repeat: -1,
        ease: 'none',
      });

      gsap.to('.digital-orbit-dot', {
        scale: 1.5,
        opacity: 0.35,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Background light movement
      gsap.to('.digital-glow', {
        x: 55,
        y: -35,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

    },
    { scope: root }
  );

  return (
    <section
      className="digital-content"
      id="digital-content"
      ref={root}
    >
      <div className="digital-grid-bg" />
      <div className="digital-glow" />

      <div className="digital-inner">

        {/* LEFT VISUAL EXPERIENCE */}
        <div className="digital-visual" ref={visual}>

          <p className="digital-kicker mono">
            02 / DIGITAL-FIRST CONTENT
          </p>

          <div className="digital-canvas">

            {/* Orbit */}
            <div className="digital-orbit">
              <span className="digital-orbit-dot" />
            </div>

            {/* Floating Story */}
            <DigitalCard item={formats[0]} />

            {/* Feed */}
            <DigitalCard item={formats[1]} />

            {/* Reels */}
            <DigitalCard item={formats[2]} />

            {/* Website */}
            <DigitalCard item={formats[3]} />

            {/* Notification */}
            <div className="digital-notification">
              <span className="digital-notification-icon">
                ✦
              </span>

              <div>
                <strong>New drop is live</strong>
                <span>Platform-native · AI-crafted</span>
              </div>

              <span className="digital-notification-dot" />
            </div>

            {/* Floating indicator */}
            <div className="digital-scroll-label mono">
              SCROLL-STOPPER
            </div>

          </div>

          <div className="digital-visual-footer mono">
            <span>↳ LAYERS DRIFT AT DIFFERENT SCROLL SPEEDS</span>
          </div>

        </div>

        {/* RIGHT CONTENT */}
        <div className="digital-right">


          <div className="digital-stage-row">

            {/* Large outlined 02 */}
            <div className="digital-content-number">
              02
            </div>

            {/* Stage information */}
            <div className="digital-stage mono">
              <span>02 / 04</span>

              <span className="digital-stage-label">
                <i />
                STAGE 02
              </span>
            </div>

          </div>

          <h2 className="digital-title">
            Digital-First
            <br />
            Content
          </h2>

          <p className="digital-tagline">
            Made for the Scroll.
            <br />
            Built to Make an Impact.
          </p>

          <p className="digital-description">
            We create platform-native, AI-powered content
            designed to stop the scroll, spark conversations,
            and connect brands with audiences across today's
            digital landscape.
          </p>

          <div className="digital-capabilities">
            {capabilities.map((item, index) => (
              <span
                className="digital-capability"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>

          <Link
            href="/portfolio"
            className="digital-cta"
          >
            <span>Explore Digital Content</span>
          </Link>

        </div>

      </div>
    </section>
  );
}
