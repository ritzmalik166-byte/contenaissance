'use client';

import { useId } from 'react';

/* The section-01 rocket in one compact SVG (same nose cone, cockpit
   pilot, stage colours, fins and two-tone flame) so it can return at
   the end of the page and dock into the CTA orbit. Ids are unique per
   instance so it can coexist with the original rocket's SVG. */
export default function RocketSprite({ className = '' }) {
  const uid = useId().replace(/:/g, '');
  const clip = `rs-clip-${uid}`;
  const glass = `rs-glass-${uid}`;
  const body = `rs-body-${uid}`;

  return (
    <svg className={`rsprite ${className}`} viewBox="-40 0 184 330" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="52" cy="88" r="17" />
        </clipPath>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity=".12" />
        </linearGradient>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d1012" />
          <stop offset="45%" stopColor="#1d2225" />
          <stop offset="100%" stopColor="#0b0d0e" />
        </linearGradient>
      </defs>

      {/* flame (scaled by .rsprite__flame) */}
      <g className="rsprite__flame">
        <path d="M27 232h50l-10 56c-5 26-10 40-15 42-5-2-10-16-15-42Z" fill="#ff5a3c" />
        <path d="M38 232h28l-5 38c-3 16-5 24-9 26-4-2-6-10-9-26Z" fill="#c8f04a" />
      </g>

      {/* fins */}
      <path d="M2 196 L-34 252 L-30 262 L2 238 Z" fill="#d9772b" />
      <path d="M102 196 L138 252 L134 262 L102 238 Z" fill="#d9772b" />

      {/* stage body */}
      <rect x="2" y="148" width="100" height="86" fill={`url(#${body})`} stroke="#c8f04a" strokeWidth="2" />
      <line x1="2" y1="191" x2="102" y2="191" stroke="#c8f04a" strokeOpacity=".5" strokeWidth="1.5" />
      <circle cx="52" cy="170" r="5" fill="none" stroke="#c8f04a" strokeWidth="2" />
      <rect x="40" y="203" width="24" height="16" rx="3" fill="none" stroke="#c8f04a" strokeWidth="2" />
      <rect x="30" y="232" width="44" height="8" fill="#2a2f33" />

      {/* nose cone + cockpit with the pilot */}
      <path d="M52 0C80 30 100 80 102 150H2C4 80 24 30 52 0Z" fill="#e7eee9" />
      <circle cx="52" cy="88" r="19" fill="#080b0b" />
      <image
        href="/Animated Astronaut Blink Cycle.gif"
        x="35"
        y="73"
        width="34"
        height="34"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clip})`}
      />
      <circle cx="52" cy="88" r="17" fill={`url(#${glass})`} />
      <circle cx="52" cy="88" r="19" fill="none" stroke="#f2e21b" strokeWidth="4" />
    </svg>
  );
}
