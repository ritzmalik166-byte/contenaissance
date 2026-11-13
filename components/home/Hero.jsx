'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { onSiteReady } from '@/lib/user/ready';
import Split from '../Split';
import { ArrowRight } from '../Icons';

export default function Hero() {
  const root = useRef(null);
  const canvasWrap = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      let scene;
      let disposed = false;

      // Load Three.js scene
      import('../three/HeroScene').then(({ createHeroScene }) => {
        if (disposed || !canvasWrap.current) return;

        scene = createHeroScene(canvasWrap.current);
      });

      // Hero title animation
      const chars = root.current.querySelectorAll(
        '.hero__title .split-char'
      );

      gsap.set(chars, {
        yPercent: 120,
        rotateX: -90,
        opacity: 0,
        transformOrigin: '50% 100% -40px',
      });

      gsap.set('.hero__fade', {
        y: 30,
        opacity: 0,
      });

      const intro = contextSafe(() => {
        const tl = gsap.timeline({
          defaults: {
            ease: 'power4.out',
          },
        });

        tl.to(chars, {
          yPercent: 0,
          rotateX: 0,
          opacity: 1,
          duration: 1.4,
          stagger: 0.025,
        })
          .to(
            '.hero__fade',
            {
              y: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.1,
            },
            0.5
          )
          .fromTo(
            '.hero__rays, .hero__glow',
            {
              opacity: 0,
            },
            {
              opacity: 1,
              duration: 2.4,
              ease: 'power2.out',
            },
            0
          );

        const s = { v: 0 };

        tl.to(
          s,
          {
            v: 1,
            duration: 2.6,
            ease: 'power3.out',
            onUpdate: () => {
              if (scene) {
                scene.state.intro = s.v;
              }
            },
          },
          0
        );
      });

      const off = onSiteReady(intro);

      // Next section
      const nextSection = root.current.nextElementSibling;

      if (nextSection) {
        gsap.set(nextSection, {
          opacity: 0,
        });
      }

      // Hero scroll animation
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=45%',
          scrub: 1,
          pin: true,
          pinSpacing: false,
          invalidateOnRefresh: true,

          onUpdate: (self) => {
            if (scene) {
              scene.state.progress = self.progress;
            }
          },
        },
      });

      heroTl
        .to(
          '.hero__content',
          {
            opacity: 0,
            scale: 1.3,
            filter: 'blur(8px)',
            ease: 'none',
          },
          0
        )
        .to(
          '.hero__foot',
          {
            opacity: 0,
            ease: 'none',
          },
          0
        )
        .to(
          root.current,
          {
            opacity: 0,
            ease: 'none',
          },
          0.3
        );

      if (nextSection) {
        heroTl.to(
          nextSection,
          {
            opacity: 1,
            ease: 'none',
          },
          0.3
        );
      }

      // Pointer movement
      const move = (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);

        scene?.setPointer(x, y);

        gsap.to('.hero__title', {
          rotateY: x * 6,
          rotateX: y * 4,
          duration: 1.2,
          ease: 'power3.out',
        });
      };

      window.addEventListener('pointermove', move);

      // Cleanup
      return () => {
        disposed = true;

        off();

        window.removeEventListener('pointermove', move);

        scene?.destroy();
      };
    },
    {
      scope: root,
    }
  );

  return (
    <section ref={root} className="hero" id="top">
      <div ref={canvasWrap} className="hero__canvas" />

      <div className="hero__glow" />
      <div className="hero__rays" />
      <div className="hero__vignette" />

      <div className="hero__content">
        <p className="hero__eyebrow hero__fade">
          <i /> AI Storytelling Agency &amp; AI Creative Studio
        </p>

        <Split
          as="p"
          className="display hero__title"
          lines={['Our AI Stages.', 'One Launch.']}
        />

        <h1 className="hero__sub hero__fade">
          AI Creative Agency in India for Brand Films, Advertising &amp;
          Digital Experiences
        </h1>

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