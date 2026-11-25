'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { attachRocket } from '@/components/three/RocketModel';

/* The homepage rocket: a real 3D spacecraft (components/three/RocketModel.js)
   drawn by one shared WebGL renderer into this canvas. Used by the
   Mission Archive flight and the CTA docking. It keeps the old SVG
   sprite's footprint (viewBox -40 0 184 330) and hooks, so the scroll
   code is unchanged: `.rsprite__flame` (inline scale(1, s) = flame
   length) and `.rsprite__enginelight` (inline opacity = engine glow)
   are read by the renderer every frame. Without WebGL it falls back to
   the SVG sprite below. */
export default function RocketSprite({ className = '' }) {
  const canvas = useRef(null);
  const flame = useRef(null);
  const light = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!canvas.current) return undefined;
    const detach = attachRocket(canvas.current, { flameEl: flame.current, lightEl: light.current });
    if (!detach) {
      setFallback(true);
      return undefined;
    }
    return detach;
  }, []);

  if (fallback) return <RocketSpriteSVG className={className} />;

  return (
    <div className={`rsprite rsprite--3d ${className}`} aria-hidden="true">
      <canvas ref={canvas} className="rsprite__canvas" />
      {/* hooks driven by the scroll code, read by the 3D renderer */}
      <i ref={flame} className="rsprite__flame rsprite__hook" />
      <i ref={light} className="rsprite__enginelight rsprite__hook" />
    </div>
  );
}

function RocketSpriteSVG({ className = '' }) {
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
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        {/* turbulent plume: animated noise ripples the flame edges */}
        <filter id={id('fire')} x="-60%" y="-20%" width="220%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.11" numOctaves="2" seed="3" result="n">
            <animate attributeName="baseFrequency" dur="0.7s" repeatCount="indefinite" values="0.035 0.11;0.04 0.14;0.032 0.1;0.035 0.11" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <linearGradient id={id('plume')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb25a" />
          <stop offset="0.3" stopColor="#ff6a24" />
          <stop offset="0.75" stopColor="#c8321a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#8a1e10" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('core')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#ffd066" stopOpacity="0" />
        </linearGradient>
        {/* engine light thrown up onto the lower hull */}
        <radialGradient id={id('engineLight')} cx="0.5" cy="1" r="0.75">
          <stop offset="0" stopColor="#ff9a3c" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#ff7a2a" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dfe9ff" stopOpacity="0.55" />
          <stop offset="0.06" stopColor="#dfe9ff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#ffb070" stopOpacity="0" />
          <stop offset="1" stopColor="#ffb070" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* flame (scaled by .rsprite__flame from the nozzle exit) */}
      <g className="rsprite__flame">
        {/* wide heat bloom */}
        <ellipse cx="52" cy="272" rx="36" ry="50" fill="#ff7a2e" opacity="0.5" filter={`url(#${id('blur')})`} />
        {/* turbulent outer plume */}
        <g filter={`url(#${id('fire')})`}>
          <path d="M28 240h48l-6 40c-5 30-11 46-18 50-7-4-13-20-18-50Z" fill={`url(#${id('plume')})`} />
          <path d="M33 240h38l-6 34c-3 22-8 34-13 37-5-3-10-15-13-37Z" fill={`url(#${id('flameOut')})`} />
        </g>
        {/* white-hot core + shock diamonds */}
        <path d="M41 240h22l-4 24c-2 13-4 20-7 22-3-2-5-9-7-22Z" fill={`url(#${id('core')})`} filter={`url(#${id('soft')})`} />
        <g fill="#fff6d8" filter={`url(#${id('soft')})`}>
          <ellipse cx="52" cy="258" rx="5" ry="3.2" opacity="0.85" />
          <ellipse cx="52" cy="275" rx="4" ry="2.6" opacity="0.6" />
          <ellipse cx="52" cy="290" rx="3" ry="2" opacity="0.38" />
        </g>
      </g>

      {/* rear fins (behind the hull), shaded, lit warm at the base */}
      <path d="M4 186 L-34 246 Q-36 258 -26 258 L4 236 Z" fill={`url(#${id('fin')})`} />
      <path d="M100 186 L138 246 Q140 258 130 258 L100 236 Z" fill={`url(#${id('finDark')})`} />
      <path d="M4 186 L-34 246 Q-36 258 -26 258 L4 236 Z" fill={`url(#${id('engineLight')})`} opacity="0.7" />
      <path d="M100 186 L138 246 Q140 258 130 258 L100 236 Z" fill={`url(#${id('engineLight')})`} opacity="0.7" />
      {/* fin leading-edge highlights */}
      <path d="M4 188 L-33 246" stroke="#ffd2a6" strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
      <path d="M100 188 L137 246" stroke="#ffd2a6" strokeOpacity="0.25" strokeWidth="1.2" fill="none" />

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
        {/* rim light: cool sky on the lit edge, warm on the far edge */}
        <rect x="0" y="0" width="104" height="236" fill={`url(#${id('rim')})`} />
        {/* the engine's glow lighting the lower hull */}
        <rect className="rsprite__enginelight" x="-10" y="150" width="124" height="90" fill={`url(#${id('engineLight')})`} />
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
