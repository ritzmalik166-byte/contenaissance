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
  const targetRef = useRef(null);
  const graphPath = useRef(null);
  const graphArea = useRef(null);
  const chartClipRect = useRef(null);

  const [activeVariant, setActiveVariant] = useState('B');
  const targetXTo = useRef(null);
  const targetYTo = useRef(null);
  const tiltXTo = useRef(null);
  const tiltYTo = useRef(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // 1. TOP INTRO SCROLLTRIGGER
        const introTl = gsap.timeline({
          scrollTrigger: {
            trigger: q('.campaign-top'),
            start: 'top 82%',
            toggleActions: 'play none none reverse',
          },
        });

        introTl
          .fromTo(
            q('.campaign-stage'),
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
          )
          .fromTo(
            q('.campaign-title'),
            { opacity: 0, y: 48 },
            { opacity: 1, y: 0, duration: 0.95, ease: 'power4.out' },
            '-=0.45'
          )
          .fromTo(
            q('.campaign-tagline'),
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
            '-=0.55'
          )
          .fromTo(
            q('.campaign-big-number'),
            { opacity: 0, scale: 0.84, y: 30 },
            { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: 'power3.out' },
            '-=0.75'
          )
          .fromTo(
            q('.campaign-intro-right > *'),
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' },
            '-=0.75'
          );

        // Subtle parallax scrub on the Big Number "03"
        gsap.to(q('.campaign-big-number'), {
          yPercent: -15,
          ease: 'none',
          scrollTrigger: {
            trigger: q('.campaign-top'),
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        });

        // 2. MAIN VISUAL & DASHBOARD SCROLLTRIGGER
        const mainTl = gsap.timeline({
          scrollTrigger: {
            trigger: q('.campaign-main'),
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });

        mainTl
          .fromTo(
            q('.campaign-visual-card'),
            { opacity: 0, y: 48, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1, duration: 1.05, ease: 'power3.out' }
          )
          .fromTo(
            q('.campaign-dashboard'),
            { opacity: 0, y: 48, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1, duration: 1.05, ease: 'power3.out' },
            '-=0.8'
          );

        // 3. ANALYTICS GRAPH DRAWING WITH CLIP-PATH & DATA POINTS
        if (graphPath.current && chartClipRect.current) {
          const length = graphPath.current.getTotalLength();
          gsap.set(graphPath.current, {
            strokeDasharray: length,
            strokeDashoffset: length,
          });
          gsap.set(chartClipRect.current, { attr: { width: 0 } });
          gsap.set(q('.chart-point'), {
            scale: 0,
            transformOrigin: 'center center',
            opacity: 0,
          });

          const graphTl = gsap.timeline({
            scrollTrigger: {
              trigger: q('.campaign-dashboard'),
              start: 'top 78%',
              once: true,
            },
          });

          graphTl
            .to(graphPath.current, {
              strokeDashoffset: 0,
              duration: 2.2,
              ease: 'power2.inOut',
            })
            .to(
              chartClipRect.current,
              {
                attr: { width: 500 },
                duration: 2.2,
                ease: 'power2.inOut',
              },
              0
            )
            .to(
              q('.chart-point'),
              {
                scale: 1,
                opacity: 1,
                duration: 0.45,
                stagger: 0.42,
                ease: 'back.out(2)',
              },
              0.3
            );
        }

        // 4. SCAN LINE SWEEP
        gsap.fromTo(
          q('.campaign-scan-line'),
          { top: '0%', opacity: 0 },
          {
            keyframes: [
              { top: '5%', opacity: 0.85, duration: 0.4, ease: 'sine.in' },
              { top: '92%', opacity: 0.85, duration: 2.6, ease: 'none' },
              { top: '100%', opacity: 0, duration: 0.4, ease: 'sine.out' },
            ],
            duration: 3.4,
            repeat: -1,
            yoyo: true,
            ease: 'none',
          }
        );

        // 5. ANIMATED TARGETING RINGS
        gsap.to(q('.campaign-target-ring'), {
          rotation: 360,
          duration: 22,
          repeat: -1,
          ease: 'none',
          transformOrigin: 'center center',
        });

        gsap.to(q('.campaign-target-inner'), {
          rotation: -360,
          duration: 14,
          repeat: -1,
          ease: 'none',
          transformOrigin: 'center center',
        });

        gsap.to(q('.campaign-target-dot'), {
          scale: 1.35,
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          transformOrigin: 'center center',
        });

        // 6. AUDIENCE CLUSTER DOTS
        gsap.to(q('.audience-dot'), {
          opacity: 0.3,
          duration: 0.9,
          stagger: {
            each: 0.07,
            repeat: -1,
            yoyo: true,
          },
        });

        // 7. BOTTOM CAPABILITIES SCROLLTRIGGER
        const capTl = gsap.timeline({
          scrollTrigger: {
            trigger: q('.campaign-capabilities'),
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });

        capTl.fromTo(
          q('.campaign-capability'),
          { opacity: 0, y: 38 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.12,
            ease: 'power3.out',
          }
        );

        // QuickTo setup for targeting HUD and 3D tilt
        if (targetRef.current && visual.current) {
          targetXTo.current = gsap.quickTo(targetRef.current, 'left', {
            duration: 0.6,
            ease: 'power2.out',
          });
          targetYTo.current = gsap.quickTo(targetRef.current, 'top', {
            duration: 0.6,
            ease: 'power2.out',
          });
          tiltXTo.current = gsap.quickTo(visual.current, 'rotationY', {
            duration: 0.7,
            ease: 'power2.out',
          });
          tiltYTo.current = gsap.quickTo(visual.current, 'rotationX', {
            duration: 0.7,
            ease: 'power2.out',
          });
        }
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  const handleVariant = (id) => {
    setActiveVariant(id);

    // Tactical HUD lock pulse animation
    if (root.current) {
      gsap.fromTo(
        root.current.querySelector('.campaign-signal'),
        { scale: 1.05, filter: 'drop-shadow(0 0 12px rgba(235, 189, 64, 0.7))' },
        { scale: 1, filter: 'none', duration: 0.45, ease: 'power2.out' }
      );
    }
  };

  const handlePointerMove = (event) => {
    if (!visual.current || typeof window === 'undefined' || window.matchMedia('(hover: none)').matches) {
      return;
    }

    const rect = visual.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    visual.current.style.setProperty('--mouse-x', `${x * 100}%`);
    visual.current.style.setProperty('--mouse-y', `${y * 100}%`);

    // Smooth targeting reticle follow
    if (targetXTo.current && targetYTo.current) {
      const clampedX = Math.max(18, Math.min(82, x * 100));
      const clampedY = Math.max(22, Math.min(78, y * 100));
      targetXTo.current(`${clampedX}%`);
      targetYTo.current(`${clampedY}%`);
    }

    // Subtle 3D perspective tilt
    if (tiltXTo.current && tiltYTo.current) {
      tiltXTo.current((x - 0.5) * 5);
      tiltYTo.current((y - 0.5) * -5);
    }
  };

  const handlePointerLeave = () => {
    if (targetXTo.current && targetYTo.current) {
      targetXTo.current('48%');
      targetYTo.current('43%');
    }
    if (tiltXTo.current && tiltYTo.current) {
      tiltXTo.current(0);
      tiltYTo.current(0);
    }
  };

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
              {/* <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 19L19 5M8 5H19V16"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg> */}
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
            onPointerLeave={handlePointerLeave}
          >

            {/* Interactive variants crossfade */}
            {variants.map((v) => (
              <img
                key={v.id}
                className={`campaign-main-image ${
                  activeVariant === v.id ? 'is-active' : ''
                }`}
                src={v.image}
                alt={`AI generated luxury fragrance campaign - ${v.name}`}
              />
            ))}

            <div className="campaign-image-overlay" />

            <div className="campaign-grid-overlay" />

            <div className="campaign-context">
              CONTEXT: EVENING · MOBILE
            </div>

            {/* Targeting system */}
            <div
              ref={targetRef}
              className="campaign-target"
            >
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
                      stopOpacity=".18"
                    />
                    <stop
                      offset="100%"
                      stopColor="#e9bd47"
                      stopOpacity=".01"
                    />
                  </linearGradient>

                  <clipPath id="campaignGraphClip">
                    <rect
                      ref={chartClipRect}
                      x="0"
                      y="0"
                      width="0"
                      height="210"
                    />
                  </clipPath>
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

                {/* Area with animated clip-path */}
                <path
                  ref={graphArea}
                  clipPath="url(#campaignGraphClip)"
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
                  <g key={index} className="chart-point-group">
                    {index === 3 && (
                      <circle
                        cx={x}
                        cy={y}
                        r="13"
                        className="chart-beacon-ring"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={index === 3 ? 5.5 : 4.8}
                      className={`chart-point ${index === 3 ? 'is-peak' : ''}`}
                    />
                  </g>
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
                    className={`variant-row ${isActive ? 'is-active' : ''}`}
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
                          className="variant-progress-bar"
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
                <span className="capability-num">{item.number}</span>

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
