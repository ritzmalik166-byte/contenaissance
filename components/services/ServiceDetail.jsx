
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

export default function ServiceDetail() {
  const root = useRef(null);
  const [activeItem, setActiveItem] = useState(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });

      tl.fromTo(
        '.detail-number',
        {
          opacity: 0,
          y: 80,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: 'power4.out',
        }
      )
        .fromTo(
          '.detail-meta',
          {
            opacity: 0,
            y: 25,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.7'
        )
        .fromTo(
          '.detail-heading-content',
          {
            opacity: 0,
            y: 70,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
          },
          '-=0.7'
        )
        .fromTo(
          '.detail-right-content',
          {
            opacity: 0,
            y: 45,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
          },
          '-=0.65'
        )
        .fromTo(
          '.detail-accordion-item',
          {
            opacity: 0,
            x: 30,
          },
          {
            opacity: 1,
            x: 0,
            stagger: 0.12,
            duration: 0.65,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .fromTo(
          '.detail-cta',
          {
            opacity: 0,
            y: 20,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
          },
          '-=0.3'
        );
    },
    { scope: root }
  );

  const toggleItem = (index) => {
    setActiveItem((current) =>
      current === index ? null : index
    );
  };

  return (
    <section
      className="service-detail"
      id="service-detail-1"
      ref={root}
    >
      <div className="service-detail-inner">

        {/* LEFT COLUMN */}
        <div className="detail-left">

          {/* Large outlined number */}
          <div className="detail-number-wrapper">
            <span className="detail-number">01</span>
          </div>

          {/* Metadata: positioned in middle of left column */}
          <div className="detail-meta">
            <span className="detail-meta-count">
              01 / 04
            </span>

            <span className="detail-stage">
              <i />
              STAGE 01 · BOOSTER
            </span>
          </div>

          {/* Service title and tagline */}
          <div className="detail-heading-content">
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
                      onClick={() => toggleItem(index)}
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
            >
              <span>Explore AI Brand Films</span>
              <ArrowUpRight />
            </Link>

          </div>
        </div>

      </div>
    </section>
  );
}
