'use client';

import { useId } from 'react';

/* The homepage rocket as one compact SVG, styled after the 3D hero
   rocket: a cream ceramic nose cone with the cockpit pilot, a graphite
   fuselage with metallic shading and brand-orange stage rings, gold
   ringed portholes, shaded orange fins, a machined nozzle bell and a
   layered, glowing flame. Used by the Mission Archive flight and the
   CTA docking (same footprint: viewBox -40 0 184 330, flame group
   `.rsprite__flame` scaled from its top). Ids are unique per instance
   so several can share a page. */
export default function RocketSprite({ className = '' }) {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `rs-${n}-${uid}`;

  return (
    <svg className={`rsprite ${className}`} viewBox="-40 0 184 330" aria-hidden="true">
      <defs>
        <clipPath id={id('clip')}>
          <circle cx="52" cy="92" r="15" />
        </clipPath>
        <clipPath id={id('hull')}>
          <path d="M52 2C80 32 100 82 102 150V234H2V150C4 82 24 32 52 2Z" />
        </clipPath>
        {/* cylinder shading: dark rim, lit flank, specular, falloff */}
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#07080a" />
          <stop offset="0.18" stopColor="#1d2226" />
          <stop offset="0.34" stopColor="#3a4248" />
          <stop offset="0.42" stopColor="#262c31" />
          <stop offset="0.75" stopColor="#111417" />
          <stop offset="1" stopColor="#050607" />
        </linearGradient>
        <linearGradient id={id('nose')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f7c58" />
          <stop offset="0.22" stopColor="#e6dcc4" />
          <stop offset="0.36" stopColor="#fbf6ea" />
          <stop offset="0.6" stopColor="#d2c4a2" />
          <stop offset="1" stopColor="#6e5e40" />
        </linearGradient>
        <linearGradient id={id('ring')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a3a12" />
          <stop offset="0.3" stopColor="#f19a4a" />
          <stop offset="0.45" stopColor="#ffc38a" />
          <stop offset="0.7" stopColor="#c8621f" />
          <stop offset="1" stopColor="#5e2a0c" />
        </linearGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#f2c94c" />
          <stop offset="1" stopColor="#9c6a14" />
        </linearGradient>
        <linearGradient id={id('fin')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f39a4c" />
          <stop offset="1" stopColor="#8e3f10" />
        </linearGradient>
        <linearGradient id={id('finDark')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4672a" />
          <stop offset="1" stopColor="#5a240a" />
        </linearGradient>
        <linearGradient id={id('bell')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a2d31" />
          <stop offset="0.35" stopColor="#9ea4ab" />
          <stop offset="0.5" stopColor="#d6dade" />
          <stop offset="0.75" stopColor="#5d6268" />
          <stop offset="1" stopColor="#1b1d20" />
        </linearGradient>
        <radialGradient id={id('glass')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3b4a58" />
          <stop offset="0.6" stopColor="#0b1016" />
          <stop offset="1" stopColor="#020304" />
        </radialGradient>
        <linearGradient id={id('flameOut')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.35" stopColor="#ff7a2e" />
          <stop offset="1" stopColor="#ff3c1e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('flameIn')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#fff2b8" />
          <stop offset="1" stopColor="#ffd060" stopOpacity="0" />
        </linearGradient>
        <filter id={id('blur')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* flame (scaled by .rsprite__flame from its top edge) */}
      <g className="rsprite__flame">
        <ellipse cx="52" cy="262" rx="30" ry="40" fill="#ff8a3c" opacity="0.55" filter={`url(#${id('blur')})`} />
        <path d="M30 238h44l-7 48c-4 26-9 40-15 44-6-4-11-18-15-44Z" fill={`url(#${id('flameOut')})`} />
        <path d="M40 238h24l-4 30c-2 16-5 24-8 26-3-2-6-10-8-26Z" fill={`url(#${id('flameIn')})`} />
      </g>

      {/* rear fins (behind the hull), shaded */}
      <path d="M4 186 L-34 246 Q-36 258 -26 258 L4 236 Z" fill={`url(#${id('fin')})`} />
      <path d="M100 186 L138 246 Q140 258 130 258 L100 236 Z" fill={`url(#${id('finDark')})`} />

      {/* nozzle bell */}
      <path d="M34 232h36l6 14H28Z" fill={`url(#${id('bell')})`} />
      <path d="M28 246h48" stroke="#0b0c0e" strokeWidth="2" />

      {/* hull: fuselage + nose cone, shaded as one body */}
      <g clipPath={`url(#${id('hull')})`}>
        <rect x="0" y="140" width="104" height="96" fill={`url(#${id('body')})`} />
        <path d="M52 2C80 32 100 82 102 150H2C4 82 24 32 52 2Z" fill={`url(#${id('nose')})`} />
        {/* panel seam + a few rivets on the fuselage */}
        <line x1="2" y1="192" x2="102" y2="192" stroke="#000" strokeOpacity="0.55" strokeWidth="1.2" />
        {[16, 34, 70, 88].map((x) => (
          <circle key={x} cx={x} cy="198" r="1.2" fill="#6b737a" />
        ))}
        {/* brand stage rings */}
        <rect x="0" y="146" width="104" height="7" fill={`url(#${id('ring')})`} />
        <rect x="0" y="226" width="104" height="7" fill={`url(#${id('ring')})`} />
        {/* long specular streak down the lit flank */}
        <rect x="27" y="10" width="6" height="226" fill="#fff" opacity="0.14" />
        <rect x="35" y="30" width="2" height="206" fill="#fff" opacity="0.18" />
        {/* soft shadow on the far side */}
        <rect x="74" y="0" width="30" height="236" fill="#000" opacity="0.18" />
      </g>

      {/* fuselage portholes: gold bezel, dark glass, highlight */}
      {[172, 212].map((cy) => (
        <g key={cy}>
          <circle cx="52" cy={cy} r="9.5" fill={`url(#${id('gold')})`} />
          <circle cx="52" cy={cy} r="6.5" fill={`url(#${id('glass')})`} />
          <ellipse cx="49.5" cy={cy - 2.5} rx="2.6" ry="1.6" fill="#fff" opacity="0.55" />
        </g>
      ))}

      {/* cockpit: gold bezel, the pilot behind glass */}
      <circle cx="52" cy="92" r="20" fill={`url(#${id('gold')})`} />
      <circle cx="52" cy="92" r="16.5" fill="#05070a" />
      <image
        href="/Animated Astronaut Blink Cycle.gif"
        x="37"
        y="77"
        width="30"
        height="30"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${id('clip')})`}
      />
      <circle cx="52" cy="92" r="15" fill={`url(#${id('glass')})`} opacity="0.35" />
      <path d="M41 86a12 12 0 0 1 9-8" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* centre fin, edge-on toward the viewer */}
      <path d="M48 200 L56 200 L58 252 Q52 258 46 252 Z" fill={`url(#${id('finDark')})`} />
      <path d="M50 202 L52 202 L52 252 L49 250 Z" fill="#ffb774" opacity="0.5" />
    </svg>
  );
}
