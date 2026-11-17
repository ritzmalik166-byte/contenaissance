
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { ArrowUpRight } from '../Icons';
import './ServiceDetail.css';

const capabilities = [
  {
    number: '01',
    title: 'AI-Powered Brand Films',
    detail:
      'Cinematic brand films crafted with AI-assisted production, original visual direction and compelling storytelling.',
  },
  {
    number: '02',
    title: 'Generative AI Storytelling',
    detail:
      'Transform ideas into distinctive visual narratives using generative imagery, motion and intelligent creative workflows.',
  },
  {
    number: '03',
    title: 'Interactive Brand Experiences',
    detail:
      'Create immersive and engaging brand experiences that connect audiences with your story.',
  },
  {
    number: '04',
    title: 'AI Cinematic Marketing',
    detail:
      'Develop cinematic marketing content designed to capture attention and communicate your brand message.',
  },
];

const stars = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 53 + 7) % 100}%`,
  delay: `${(index % 7) * -0.7}s`,
  duration: `${3 + (index % 5)}s`,
  size: `${2 + (index % 3)}px`,
}));

export default function ServiceDetail() {
  const root = useRef(null);
  const numberRef = useRef(null);
  const [activeItem, setActiveItem] = useState(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      const number = numberRef.current;
      const q = gsap.utils.selector(section);

      const entrance = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 76%',
          toggleActions: 'play none none reverse',
        },
      });

      entrance
        .fromTo(
          '.detail-number',
          {
            autoAlpha: 0,
            y: 100,
            scale: 0.75,
            rotateX: 35,
            filter: 'blur(12px)',
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            filter: 'blur(0px)',
            duration: 1.35,
            ease: 'power4.out',
          }
        )
        .fromTo(
          '.detail-meta',
          {
            autoAlpha: 0,
            x: -25,
          },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.85'
        )
        .fromTo(
          '.detail-heading-content',
          {
            autoAlpha: 0,
            y: 65,
            filter: 'blur(8px)',
          },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1,
            ease: 'power3.out',
          },
          '-=0.65'
        )
        .fromTo(
          '.detail-right-content',
          {
            autoAlpha: 0,
            y: 55,
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
          },
          '-=0.7'
        )
        .fromTo(
          '.detail-accordion-item',
          {
            autoAlpha: 0,
            x: 35,
          },
          {
            autoAlpha: 1,
            x: 0,
            stagger: 0.13,
            duration: 0.7,
            ease: 'power3.out',
          },
          '-=0.55'
        )
        .fromTo(
          '.detail-cta',
          {
            autoAlpha: 0,
            y: 25,
            scale: 0.96,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: 'back.out(1.5)',
          },
          '-=0.3'
        );

      // Gentle floating movement for the large outlined number.
      if (number) {
        gsap.to(number, {
          y: -10,
          duration: 3.5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }

      // Subtle continuous orbital movement.
      gsap.to('.detail-orbit-one', {
        rotation: 360,
        duration: 38,
        repeat: -1,
        ease: 'none',
        transformOrigin: 'center center',
      });

      gsap.to('.detail-orbit-two', {
        rotation: -360,
        duration: 52,
        repeat: -1,
        ease: 'none',
        transformOrigin: 'center center',
      });

      // Reveal the background atmosphere as the section enters.
      gsap.fromTo(
        '.detail-planet-glow',
        { scale: 0.65, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Hover response for the oversized number.
      const handleNumberEnter = () => {
        gsap.to(number, {
          scale: 1.035,
          color: 'rgba(235, 189, 64, 0.08)',
          duration: 0.5,
          ease: 'power2.out',
        });
      };

      const handleNumberLeave = () => {
        gsap.to(number, {
          scale: 1,
          color: 'transparent',
          duration: 0.6,
          ease: 'power2.out',
        });
      };

      number?.addEventListener('pointerenter', handleNumberEnter);
      number?.addEventListener('pointerleave', handleNumberLeave);

      return () => {
        number?.removeEventListener('pointerenter', handleNumberEnter);
        number?.removeEventListener('pointerleave', handleNumberLeave);
      };
    },
    { scope: root }
  );

  const toggleItem = (index) => {
    setActiveItem((current) => (current === index ? null : index));
  };

  const handlePointerMove = (event) => {
    const section = root.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    section.style.setProperty('--mouse-x', `${x}px`);
    section.style.setProperty('--mouse-y', `${y}px`);

    const normalizedX = (x / rect.width - 0.5) * 2;
    const normalizedY = (y / rect.height - 0.5) * 2;

    section.style.setProperty('--parallax-x', `${normalizedX * 8}px`);
    section.style.setProperty('--parallax-y', `${normalizedY * 6}px`);
  };

  const handlePointerLeave = () => {
    const section = root.current;
    if (!section) return;

    section.style.setProperty('--parallax-x', '0px');
    section.style.setProperty('--parallax-y', '0px');
  };

  const createRipple = (event) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();

    const ripple = document.createElement('span');
    ripple.className = 'detail-click-ripple';
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;

    button.appendChild(ripple);

    ripple.addEventListener(
      'animationend',
      () => ripple.remove(),
      { once: true }
    );
  };

  return (
    <section
      className="service-detail"
      id="service-detail-1"
      ref={root}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Space atmosphere */}
      <div className="detail-space-bg" aria-hidden="true">
        <div className="detail-planet-glow" />

        <div className="detail-orbit detail-orbit-one">
          <span className="detail-orbit-dot" />
        </div>

        <div className="detail-orbit detail-orbit-two">
          <span className="detail-orbit-dot detail-orbit-dot-two" />
        </div>

        <div className="detail-stars">
          {stars.map((star) => (
            <span
              key={star.id}
              className="detail-star"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                animationDuration: star.duration,
              }}
            />
          ))}
        </div>

        <div className="detail-space-grid" />
        <div className="detail-mouse-glow" />
      </div>

      <div className="service-detail-inner">
        {/* LEFT COLUMN */}
        <div className="detail-left">
          <div className="detail-number-wrapper">
            <span className="detail-number">
              01
            </span>

            {/* <span className="detail-number-caption">
              CREATIVE ORBIT / 001
            </span> */}
          </div>

          <div className="detail-meta">
            <span className="detail-meta-count">01 / 04</span>

            <span className="detail-stage">
              <i />
              STAGE 01 · BOOSTER
            </span>
          </div>

          <div className="detail-heading-content">
            <span className="detail-heading-kicker">
              <span className="detail-kicker-line" />
              BEYOND THE ORDINARY
            </span>

            <h2 className="detail-title">
              AI Brand Films
            </h2>

            <p className="detail-tagline">
              Stories That Feel Real.
              <br />
              Worlds Beyond Imagination.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="detail-right">
          <div className="detail-right-content">
            <p className="detail-category">
              <span className="detail-category-dot" />
              THE FILM STUDIO
            </p>

            <p className="detail-description">
              We combine cinematic storytelling, generative
              AI, and imaginative visual worlds to create
              extraordinary brand films that capture attention,
              build emotional connections, and make brands
              unforgettable.
            </p>

            {/* Capabilities */}
            <div className="detail-accordion">
              {capabilities.map((item, index) => {
                const isOpen = activeItem === index;

                return (
                  <div
                    className={`detail-accordion-item ${
                      isOpen ? 'is-open' : ''
                    }`}
                    key={item.number}
                  >
                    <button
                      type="button"
                      className="detail-accordion-trigger"
                      onClick={(event) => {
                        createRipple(event);
                        toggleItem(index);
                      }}
                      aria-expanded={isOpen}
                    >
                      <span className="detail-accordion-number">
                        {item.number}
                      </span>

                      <span className="detail-accordion-title">
                        {item.title}
                      </span>

                      <span className="detail-accordion-icon">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>

                    <div
                      className="detail-accordion-content"
                      aria-hidden={!isOpen}
                    >
                      <div>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <Link
              href="/portfolio"
              className="detail-cta"
              onClick={createRipple}
            >
              <span>Explore AI Brand Films</span>
              <ArrowUpRight />
              <span className="detail-cta-glow" />
            </Link>

            {/* <div className="detail-footer-note">
              <span className="detail-footer-line" />
              <span>IMAGINATION HAS NO LIMITS</span>
              <span className="detail-footer-line" />
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
}
