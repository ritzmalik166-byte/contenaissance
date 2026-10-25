'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/gsap';
import { onSiteReady } from '@/lib/ready';
import Split from '../Split';
import { ArrowRight } from '../Icons';

export default function Hero() {
  const root = useRef(null);
  const canvasWrap = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      let scene;
      let disposed = false;

      import('../three/HeroScene').then(({ createHeroScene }) => {
        if (disposed) return;
        scene = createHeroScene(canvasWrap.current);
      });

      const chars = root.current.querySelectorAll('.hero__title .split-char');
      gsap.set(chars, { yPercent: 120, rotateX: -90, opacity: 0, transformOrigin: '50% 100% -40px' });
      gsap.set('.hero__fade', { y: 30, opacity: 0 });

      const intro = contextSafe(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.to(chars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, stagger: 0.025 })
          .to('.hero__fade', { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.5)
          .fromTo('.hero__rays, .hero__glow', { opacity: 0 }, { opacity: 1, duration: 2.4, ease: 'power2.out' }, 0);
        const s = { v: 0 };
        tl.to(s, { v: 1, duration: 2.6, ease: 'power3.out', onUpdate: () => scene && (scene.state.intro = s.v) }, 0);
      });
      const off = onSiteReady(intro);

      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=110%',
          scrub: true,
          pin: true,
          onUpdate: (self) => scene && (scene.state.progress = self.progress),
        },
      })
        .to('.hero__content', { scale: 1.45, opacity: 0, filter: 'blur(8px)', ease: 'power2.in' }, 0)
        .to('.hero__foot', { opacity: 0, y: 40 }, 0)
        .to('.hero__rays', { opacity: 0, scale: 1.3 }, 0);

      const move = (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        scene?.setPointer(x, y);
        gsap.to('.hero__title', { rotateY: x * 6, rotateX: y * 4, duration: 1.2, ease: 'power3.out' });
      };
      window.addEventListener('pointermove', move);

      return () => {
        disposed = true;
        off();
        window.removeEventListener('pointermove', move);
        scene?.destroy();
      };
    },
    { scope: root }
  );

  return (
    <section ref={root} className="hero" id="top">
      <div ref={canvasWrap} className="hero__canvas" />
      <div className="hero__glow" />
      <div className="hero__rays" />
      <div className="hero__vignette" />

      <div className="hero__content">
        <h1 className="hero__eyebrow hero__fade">
          <i /> AI Story Telling Agency &amp; AI Creative Studio
        </h1>
        <Split as="h2" className="display hero__title" lines={['Our AI Stages.', 'One Launch.']} />
        <p className="hero__sub hero__fade">
          Each stage of the rocket is one of our AI services. Use one stage, or fire all four together.
        </p>
        <div className="hero__actions hero__fade">
          <Link href="/portfolio" className="btn btn--light">
            Explore The Work <ArrowRight />
          </Link>
          <Link href="/contact" className="btn btn--ghost">
            Start a mission
          </Link>
        </div>
      </div>

      <div className="hero__foot">
        <p className="hero__ticker hero__fade">
          “AI is changing so fast in 2026.” <em>But are you?</em>
        </p>
        <div className="scroll-cue hero__fade">
          Scroll to explore <span className="scroll-cue__line" />
        </div>
      </div>
    </section>
  );
}
