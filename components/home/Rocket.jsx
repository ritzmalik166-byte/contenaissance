'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { stages } from '@/lib/user/content';
import { StageIcon, ArrowRight } from '../Icons';

const finalPanel = {
  num: 'All stages',
  title: 'Fire all four together.',
  body: 'Brand films, digital-first content, AI-powered campaigns and visual identity — one crew, one launch, one story told everywhere.',
};

export default function Rocket() {
  const root = useRef(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const modules = q('.rocket__module').reverse(); // S1 first
      const labels = q('.stage-label').reverse();
      const panels = q('.rocket-panel');
      const bars = q('.rocket-progress i');
      const flame = q('.rocket__flame')[0];
      gsap.set(flame, {
        scaleY: 0.55,
        transformOrigin: '50% 0%',
      });
      const noseAt = modules.length; // 5
      const finalAt = noseAt + 0.7;
      gsap.set(panels, { pointerEvents: 'none' });
      gsap.set(panels[0], { opacity: 1, pointerEvents: 'auto' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      modules.forEach((m, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        tl.addLabel(`s${i}`, i)
          .from(m, { x: side * 220, y: -60, rotate: side * 28, opacity: 0, duration: 0.8 }, i)
          .to(bars[i], { scaleX: 1, duration: 1, ease: 'none' }, i);
      });

      tl.addLabel('nose', noseAt)
        .from(
          q('.rocket__nose'),
          { y: -260, opacity: 0, duration: 0.6 },
          noseAt
        )
        .to(
          bars[5],
          { scaleX: 1, duration: 1, ease: 'none' },
          noseAt
        )
        .from(q('.rocket__fins'), { scaleX: 0.2, opacity: 0, duration: 0.5 }, 0.2)
        .addLabel('final', finalAt)
        .to(flame, {
          scaleY: 1.35,
          duration: 0.5,
          ease: 'power2.in',
        }, 4.8)
        .to(q('.rocket'), { x: '+=3', yoyo: true, repeat: 7, duration: 0.06, ease: 'none' }, 5.1)
        .to(q('.rocket__smoke'), { opacity: 1, scale: 1.6, duration: 0.8 }, 5.2)
        .to(q('.rocket'), { y: () => -window.innerHeight * 1.3, duration: 1.6, ease: 'power2.in' }, 5.6)
        .to(flame, {
          scaleY: 1.8,
          duration: 1.2,
        }, 5.6)
        .to(q('.orbit--1'), { scale: 1.6, opacity: 0, duration: 1.6, ease: 'power2.in' }, 5.6)
        .to(q('.orbit--2'), { scale: 0.5, opacity: 0, duration: 1.6, ease: 'power2.in' }, 5.6)
        .to(q('.rocket__smoke'), { opacity: 0, duration: 0.8 }, 6.4)
        .to({}, { duration: 0.4 });

      const markers = [
        0.6,  // S1
        1.6,  // S2
        2.6,  // S3
        3.6,  // S4
        4.6,  // S5
        5.6,  // S6 (nose cone)
        6.3,  // Final panel
      ];
      let active = 0;
      const setActive = (idx) => {
        if (idx === active) return;
        gsap.to(panels[active], { opacity: 0, y: -18, pointerEvents: 'none', duration: 0.35, overwrite: true });
        gsap.fromTo(
          panels[idx],
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.5, delay: 0.1, overwrite: true }
        );
        active = idx;
      };

      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * 6}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
        onUpdate() {
          const time = this.time();
          let idx = 0;
          markers.forEach((m, i) => time >= m && (idx = i));
          setActive(idx);
          modules.forEach((m, i) => m.classList.toggle('is-on', time >= i + 0.6));
          labels.forEach((l, i) => {
            l.classList.toggle('is-on', time >= i + 0.6);
          });
        },
      }).add(tl);

      gsap.to(q('.orbit--1'), { rotate: 360, duration: 40, repeat: -1, ease: 'none' });
    },
    { scope: root }
  );

  // S6 becomes the nose cone.
  // Only S5, S4, S3, S2, S1 are rectangular modules.
  const stack = stages
    .filter((s) => s.id !== 'S6')
    .reverse();

  return (
    <section ref={root} className="rocket-sec" id="stages">
      <div className="rocket-sec__grid grid-bg" />
      <div className="container rocket-sec__inner">
        <div className="rocket-stage">
          <div className="orbit orbit--1">
            <i className="orbit__sat" />
          </div>
          <div className="orbit orbit--2" />

          <div className="rocket">

            <div className="rocket__nose-wrap">

              <svg
                className="rocket__nose"
                viewBox="0 0 104 150"
                aria-hidden="true"
              >
                <defs>
                  {/* Circular cockpit clipping */}
                  <clipPath id="rocket-window-clip">
                    <circle cx="52" cy="88" r="17" />
                  </clipPath>

                  {/* Glass reflection */}
                  <linearGradient id="cockpit-glass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity=".3" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity=".12" />
                  </linearGradient>
                </defs>

                {/* Rocket body */}
                <path
                  d="M52 0C80 30 100 80 102 150H2C4 80 24 30 52 0Z"
                  fill="#e7eee9"
                />

                {/* Cockpit background */}
                <circle
                  cx="52"
                  cy="88"
                  r="19"
                  fill="#080b0b"
                />

                {/* Real astronaut pilot image */}
                <image
                  href="/images/rocket-pilot.png"
                  x="35"
                  y="71"
                  width="34"
                  height="34"
                  preserveAspectRatio="xMidYMid slice"
                  clipPath="url(#rocket-window-clip)"
                />

                {/* Glass overlay */}
                <circle
                  cx="52"
                  cy="88"
                  r="17"
                  fill="url(#cockpit-glass)"
                  pointerEvents="none"
                />

                {/* Cockpit neon border */}
                <circle
                  cx="52"
                  cy="88"
                  r="19"
                  fill="none"
                  stroke="#f2e21b"
                  strokeWidth="4"
                />

                {/* S6 label */}
                <text
                  x="8"
                  y="143"
                  fill="#53615a"
                  fontSize="10"
                  fontWeight="600"
                >
                  S6
                </text>
              </svg>

              {/* S6 Stage Label */}
              <div className="stage-label stage-label--left">
                <span className="stage-label__line" />
                <span className="stage-label__txt">
                  <small>STAGE 06</small>
                  <strong>Your Sixth Stage</strong>
                </span>
              </div>
            </div>

            {stack.map((s, i) => (
              <div className="rocket__module" key={s.id} data-stage={s.id}>
                <small>{s.id}</small>
                <StageIcon name={s.icon} />
                <div className={`stage-label stage-label--${i % 2 === 0 ? 'right' : 'left'}`}>
                  <span className="stage-label__line" />
                  <span className="stage-label__txt">
                    <small>{s.label}</small>
                    <strong>{s.title}</strong>
                  </span>
                </div>
              </div>
            ))}

            <div className="rocket__nozzle" />


            <svg
              className="rocket__flame"
              viewBox="0 0 80 160"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="fireOuter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff8a0" />
                  <stop offset="15%" stopColor="#ffcf46" />
                  <stop offset="45%" stopColor="#ff7926" />
                  <stop offset="78%" stopColor="#ff4224" />
                  <stop offset="100%" stopColor="#c91d16" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="fireCore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor="#ffffb0" />
                  <stop offset="75%" stopColor="#e5ff68" />
                  <stop offset="100%" stopColor="#ffb52b" stopOpacity="0" />
                </linearGradient>

                <filter id="fireDistortion" x="-60%" y="-20%" width="220%" height="150%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.035 0.09"
                    numOctaves="2"
                    seed="4"
                    result="noise"
                  >
                    <animate
                      attributeName="baseFrequency"
                      values="0.035 0.09;0.05 0.12;0.025 0.07;0.045 0.1"
                      dur="0.7s"
                      repeatCount="indefinite"
                    />
                  </feTurbulence>

                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale="13"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  >
                    <animate
                      attributeName="scale"
                      values="9;16;11;18;9"
                      dur="0.55s"
                      repeatCount="indefinite"
                    />
                  </feDisplacementMap>
                </filter>
              </defs>

              <g className="flame3">

                {/* Turbulent outer exhaust */}
                <path
                  className="fire-outer"
                  d="
        M15 0
        C9 24 18 35 8 60
        C-2 88 14 119 40 160
        C66 118 82 88 72 60
        C62 35 71 24 65 0
        C57 17 53 23 40 30
        C28 22 23 12 15 0Z
      "
                  fill="url(#fireOuter)"
                  filter="url(#fireDistortion)"
                />

                {/* Moving orange tongues */}
                <path
                  className="fire-tongue fire-tongue--left"
                  d="M18 0 C-2 33 23 47 13 78 C34 55 29 25 18 0Z"
                  fill="#ff9a25"
                />

                <path
                  className="fire-tongue fire-tongue--right"
                  d="M62 0 C83 32 57 52 68 79 C46 54 51 24 62 0Z"
                  fill="#ff6124"
                />

                {/* Hot yellow exhaust */}
                <path
                  className="fire-yellow"
                  d="
        M27 0
        C21 30 34 43 25 75
        C19 102 33 127 40 139
        C51 112 63 91 54 67
        C48 40 58 19 52 0
        C47 20 43 29 39 40
        C35 23 33 11 27 0Z
      "
                  fill="#d5fa62"
                />

                {/* Bright inner core */}
                <path
                  className="fire-hot"
                  d="
        M34 0
        C29 27 39 43 34 66
        C30 89 38 108 40 117
        C48 89 50 69 44 47
        C42 27 43 12 34 0Z
      "
                  fill="url(#fireCore)"
                />

              </g>
            </svg>

            <div className="rocket__smoke" />
          </div>
        </div>

        <div className="rocket-copy">
          <div className="rocket-copy__head">
            <p className="kicker">01 / Our AI Stages</p>
            <h2 className="display h-md">
              Not more content.{" "}
              <br />
              More possibility.
            </h2>
          </div>

          <div className="rocket-panels">
            {stages.map((s) => (
              <article className="rocket-panel" key={s.id}>
                <p className="rocket-panel__num">{s.label}</p>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
            <article className="rocket-panel rocket-panel--final">
              <p className="rocket-panel__num">{finalPanel.num}</p>
              <h3>{finalPanel.title}</h3>
              <p>{finalPanel.body}</p>
              <Link href="/services" className="btn btn--ghost rocket-panel__button" style={{ marginTop: 22 }}>
                See every stage <ArrowRight />
              </Link>
            </article>
          </div>

          <div className="rocket-progress" aria-hidden="true">
            {stages.map((s) => (
              <span key={s.id}>
                <i />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
