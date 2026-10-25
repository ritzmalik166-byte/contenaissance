'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP, isTouch } from '@/lib/gsap';
import { onSiteReady } from '@/lib/ready';
import { ArrowRight } from './Icons';

export default function NotFound() {
  const root = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      gsap.set('.nf__code span', { yPercent: -140, rotateX: 90, opacity: 0 });
      gsap.set('.nf__fade', { y: 30, opacity: 0 });
      const off = onSiteReady(
        contextSafe(() => {
          gsap
            .timeline()
            .to('.nf__code span', { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, ease: 'bounce.out', stagger: 0.12 })
            .to('.nf__fade', { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, 0.6);
        })
      );
      if (isTouch()) return off;
      const move = contextSafe((e) => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        gsap.to('.nf__code span', { rotateY: x * 40, rotateX: -y * 30, x: (i) => x * (i - 1) * 40, duration: 1, ease: 'power3.out' });
      });
      window.addEventListener('pointermove', move);
      return () => {
        off();
        window.removeEventListener('pointermove', move);
      };
    },
    { scope: root }
  );

  return (
    <section ref={root} className="nf">
      <div>
        <p className="kicker nf__fade">Signal lost</p>
        <h1 className="nf__code" aria-label="404">
          <span>4</span>
          <span>0</span>
          <span>4</span>
        </h1>
        <p className="lead nf__fade">This orbit doesn’t exist — the page may have moved or never launched.</p>
        <div className="nf__fade">
          <Link href="/" className="btn btn--light">
            Return to base <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}
