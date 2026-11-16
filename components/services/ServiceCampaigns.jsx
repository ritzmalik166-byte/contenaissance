
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import './ServiceCampaigns.css';

const variants = [
  {
    id: 'A',
    name: 'Variant A',
    image: '/images/campaign-variant-a.jpg',
    performance: 62,
  },
  {
    id: 'B',
    name: 'Variant B',
    image: '/images/campaign-variant-b.jpg',
    performance: 90,
  },
  {
    id: 'C',
    name: 'Variant C',
    image: '/images/campaign-variant-c.jpg',
    performance: 48,
  },
];

const capabilities = [
  {
    number: '01',
    title: 'Maximize Marketing Impact',
  },
  {
    number: '02',
    title: 'Data-Driven Decisions',
  },
  {
    number: '03',
    title: 'Market Analysis & Optimization',
  },
  {
    number: '04',
    title: 'Scalable AI Campaigns',
  },
];

export default function ServiceCampaigns() {
  const root = useRef(null);
  const visual = useRef(null);
  const graphPath = useRef(null);
  const graphArea = useRef(null);

  const [activeVariant, setActiveVariant] = useState('B');

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const intro = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        });

        intro
          .fromTo(
            '.campaign-meta',
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.12,
            }
          )
          .fromTo(
            '.campaign-title',
            { opacity: 0, y: 55 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: 'power4.out',
            },
            '-=0.4'
          )
          .fromTo(
            '.campaign-big-number',
            { opacity: 0, scale: 0.88 },
            {
              opacity: 1,
              scale: 1,
              duration: 1.2,
              ease: 'power3.out',
            },
            '-=0.8'
          )
          .fromTo(
            '.campaign-intro-right',
            { opacity: 0, x: 35 },
            {
              opacity: 1,
              x: 0,
              duration: 0.9,
              ease: 'power3.out',
            },
            '-=0.7'
          )
          .fromTo(
            '.campaign-visual-card, .campaign-dashboard',
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              stagger: 0.18,
              ease: 'power3.out',
            },
            '-=0.5'
          )
          .fromTo(
            '.campaign-capability',
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.12,
            },
            '-=0.5'
          );

        // Animate graph drawing
        if (graphPath.current) {
          const length = graphPath.current.getTotalLength();

          gsap.set(graphPath.current, {
            strokeDasharray: length,
            strokeDashoffset: length,
          });

          gsap.to(graphPath.current, {
            strokeDashoffset: 0,
            duration: 2.3,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.campaign-dashboard',
              start: 'top 80%',
              once: true,
            },
          });
        }

        if (graphArea.current) {
          gsap.fromTo(
            graphArea.current,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 1.5,
              scrollTrigger: {
                trigger: '.campaign-dashboard',
                start: 'top 80%',
                once: true,
              },
            }
          );
        }

        // Targeting scanner animation
        gsap.to('.campaign-scan-line', {
          yPercent: 100,
          duration: 3.5,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        });

        // Scanner rotation
        gsap.to('.campaign-target-ring', {
          rotation: 360,
          duration: 24,
          repeat: -1,
          ease: 'none',
        });

        // Audience cluster animation
        gsap.to('.audience-dot', {
          opacity: 0.3,
          duration: 0.8,
          stagger: {
            each: 0.08,
            repeat: -1,
            yoyo: true,
          },
        });

        return () => intro.kill();
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  const handleVariant = (id) => {
    setActiveVariant(id);
  };

  const handlePointerMove = (event) => {
    if (!visual.current || window.matchMedia('(hover: none)').matches) {
      return;
    }

    const rect = visual.current.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    visual.current.style.setProperty('--mouse-x', `${x * 100}%`);
    visual.current.style.setProperty('--mouse-y', `${y * 100}%`);
  };

  const selectedVariant = variants.find(
    (item) => item.id === activeVariant
  );

  return (
    <section
      ref={root}
      className="campaign-section"
      id="service-campaigns"
    >
      <div className="campaign-container">

        {/* TOP INTRO */}

        <div className="campaign-top">

          <div className="campaign-heading">

            <div className="campaign-meta campaign-stage">
              <span>03 / 04</span>

              <span className="campaign-stage-label">
                <i />
                STAGE 03
              </span>
            </div>

            <h2 className="campaign-title">
              AI-Powered
              <br />
              Campaigns
            </h2>

            <p className="campaign-tagline">
              Creative Intelligence.
              <br />
              Measurable Impact.
            </p>

          </div>

          <div className="campaign-big-number" aria-hidden="true">
            03
          </div>

          <div className="campaign-intro-right">

            <p className="campaign-eyebrow">
              CREATIVE × INTELLIGENCE
            </p>

            <p className="campaign-description">
              We blend AI-powered creativity, audience
              intelligence, and performance-driven strategies
              to build smarter campaigns that connect with the
              right people and deliver meaningful results.
            </p>

            <Link
              href="/portfolio"
              className="campaign-cta"
            >
              <span>Explore AI Campaigns</span>

              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 19L19 5M8 5H19V16"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

          </div>

        </div>

        {/* MAIN VISUALS */}

        <div className="campaign-main">

          {/* CAMPAIGN KEY VISUAL */}

          <div
            ref={visual}
            className="campaign-visual-card"
            onPointerMove={handlePointerMove}
          >

            <img
              className="campaign-main-image"
              src="/images/campaign-variant-b.jpg"
              alt="AI generated luxury fragrance campaign"
            />

            <div className="campaign-image-overlay" />

            <div className="campaign-grid-overlay" />

            <div className="campaign-context">
              CONTEXT: EVENING · MOBILE
            </div>

            {/* Targeting system */}

            <div className="campaign-target">
              <span className="campaign-target-ring" />
              <span className="campaign-target-inner" />
              <span className="campaign-target-dot" />

              <span className="campaign-target-horizontal" />
              <span className="campaign-target-vertical" />
            </div>

            <div className="campaign-scan-line" />

            <div className="campaign-signal">
              <span>AUDIENCE SIGNAL · LOCKED</span>
              <span>CREATIVE VARIANT {activeVariant}</span>
            </div>

            <div className="campaign-visual-footer">
              <span>CAMPAIGN / KEY VISUAL</span>
              <span>AI-OPTIMISED CREATIVE</span>
            </div>

            <div className="campaign-visual-index">
              03 / CAMPAIGN VISUAL
            </div>

          </div>

          {/* ANALYTICS DASHBOARD */}

          <div className="campaign-dashboard">

            <div className="dashboard-header">
              <span>
                <i />
                CAMPAIGN INTELLIGENCE / LIVE
              </span>

              <span>NO. 03</span>
            </div>

            {/* GRAPH */}

            <div className="campaign-chart">

              <svg
                viewBox="0 0 500 210"
                preserveAspectRatio="none"
                role="img"
                aria-label="Illustrative campaign performance growth chart"
              >
                <defs>
                  <linearGradient
                    id="campaignGraphFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#e9bd47"
                      stopOpacity=".14"
                    />
                    <stop
                      offset="100%"
                      stopColor="#e9bd47"
                      stopOpacity=".015"
                    />
                  </linearGradient>
                </defs>

                {/* Vertical chart guides */}

                {[10, 142, 274, 406, 490].map((x) => (
                  <line
                    key={x}
                    x1={x}
                    y1="12"
                    x2={x}
                    y2="185"
                    className="chart-grid-line"
                  />
                ))}

                {/* Baseline */}

                <path
                  d="M10 160 C150 154 340 142 490 120"
                  className="chart-baseline"
                />

                {/* Area */}

                <path
                  ref={graphArea}
                  d="M10 150
                     C75 148 110 130 145 116
                     S235 88 274 63
                     S375 44 490 12
                     L490 185 L10 185 Z"
                  fill="url(#campaignGraphFill)"
                />

                {/* Natural curve */}

                <path
                  ref={graphPath}
                  d="M10 150
                     C75 148 110 130 145 116
                     S235 88 274 63
                     S375 44 490 12"
                  className="chart-main-line"
                />

                {/* Data points */}

                {[
                  [10, 150],
                  [180, 99],
                  [345, 53],
                  [490, 12],
                ].map(([x, y], index) => (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={index === 3 ? 5.5 : 4.8}
                    className="chart-point"
                  />
                ))}

              </svg>

            </div>

            <div className="chart-labels">
              <span>LAUNCH</span>
              <span>LEARN</span>
              <span>OPTIMISE</span>
              <span>SCALE</span>
            </div>

            {/* VARIANTS */}

            <div className="campaign-variants">

              <p className="variants-heading mono">
                CREATIVE VARIANTS
              </p>

              {variants.map((variant) => {
                const isActive = activeVariant === variant.id;

                return (
                  <button
                    type="button"
                    key={variant.id}
                    className={`variant-row ${
                      isActive ? 'is-active' : ''
                    }`}
                    onClick={() => handleVariant(variant.id)}
                    aria-pressed={isActive}
                  >

                    <img
                      src={variant.image}
                      alt=""
                      className="variant-thumbnail"
                    />

                    <span className="variant-info">
                      <span className="variant-name">
                        {variant.name}
                      </span>

                      <span className="variant-progress">
                        <span
                          style={{
                            width: `${variant.performance}%`,
                          }}
                        />
                      </span>
                    </span>

                    {isActive && (
                      <span className="variant-leading">
                        LEADING
                      </span>
                    )}

                  </button>
                );
              })}

            </div>

            {/* AUDIENCE CLUSTERS */}

            <div className="audience-clusters">

              <span>AUDIENCE CLUSTERS</span>

              <div className="audience-dots">
                {Array.from({ length: 20 }).map((_, i) => (
                  <i
                    key={i}
                    className={`audience-dot audience-dot-${i % 4}`}
                  />
                ))}
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM CAPABILITIES */}

        <div className="campaign-capabilities">

          {capabilities.map((item) => (
            <div
              className="campaign-capability"
              key={item.number}
            >

              <div className="capability-top">
                <span>{item.number}</span>

                <div className="capability-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>

              <h3>{item.title}</h3>

              <span className="capability-arrow">
                ↗
              </span>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
