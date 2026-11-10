'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import Split from '../Split';

export default function Quote() {
  const root = useRef(null);

  useGSAP(
    () => {
      gsap.fromTo(
        root.current,
        { clipPath: 'inset(12% 8% 12% 8% round 40px)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 25%', scrub: true },
        }
      );
      gsap.to('.quote__text .w', {
        opacity: 1,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: { trigger: '.quote__text', start: 'top 75%', end: 'bottom 50%', scrub: true },
      });
      gsap.from('.quote__mark', {
        scale: 0,
        rotate: -40,
        duration: 1.2,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: root.current, start: 'top 60%' },
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="quote">
      <div className="container quote__grid">
        <div>
          <h2 className="kicker">08 / A note from the studio</h2>
          <div className="quote__mark">“</div>
        </div>
        <div>
          <Split
            as="p"
            by="words"
            className="quote__text"
            text="At Contenaissance, we blend human creativity and AI innovation to create extraordinary brand films, campaigns and digital experiences."
          />
<div className="quote__sign">
<div className="quote__sign-mark">
<svg
  viewBox="0 0 48 48"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="goldShine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#8F5B00" />
      <stop offset="25%" stopColor="#FFD966" />
      <stop offset="50%" stopColor="#FFF2B0" />
      <stop offset="75%" stopColor="#D49A22" />
      <stop offset="100%" stopColor="#8F5B00" />
    </linearGradient>

    <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <circle
    cx="24"
    cy="24"
    r="22"
    stroke="url(#goldShine)"
    strokeWidth="1.5"
  />

  <path
    d="M24 24C19 18 14 15 10 20C6 25 11 32 16 30C19 29 21 26 24 24C27 22 29 19 32 18C37 16 42 23 38 28C34 33 29 30 24 24Z"
    stroke="url(#goldShine)"
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    filter="url(#goldGlow)"
  />
</svg>
</div>

  <span>
    <strong>Contenaissance</strong>
    <span>Our creative point of view</span>
  </span>
</div>
        </div>
      </div>
    </section>
  );
}
