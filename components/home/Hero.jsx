'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { onSiteReady } from '@/lib/user/ready';
import Split from '../Split';
import { ArrowUpRight } from '../Icons';

/* =====================================================
   HERO — copy on the left, a rocket climbing out of
   Earth's sunrise on the right.

   - three/HeroScene: deep space, the diagonal Earth horizon
     with its sunrise bloom, a crescent moon, stars.
   - journey/RocketFlight: the 3D rocket, fitted into
     `.hero__stage`, leaning into its climb.

   On scroll the rocket blasts off into the Rocket section
   while this copy folds away in 3D.
===================================================== */

export default function Hero() {
  const root = useRef(null);
  const canvasWrap = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      const q = gsap.utils.selector(root);
      const hero = root.current;
      const chars = q('.hero__title .split-char');
      const fades = q('.hero__fade');

      /* ---------- 3D backdrop (loaded lazily, client only) ---------- */
      let scene = null;
      let dead = false;

      import('../three/HeroScene').then(({ createHeroScene }) => {
        if (dead || !canvasWrap.current) return;
        scene = createHeroScene(canvasWrap.current);
      });

      gsap.set(chars, {
        yPercent: 120,
        rotateX: -90,
        opacity: 0,
        transformOrigin: '50% 100% -40px',
      });
      gsap.set(fades, { y: 30, opacity: 0 });

      const intro = contextSafe(() => {
        const s = { v: 0 };
        gsap
          .timeline({ defaults: { ease: 'power4.out' } })
          // the horizon rises and the sunrise blooms
          .to(s, { v: 1, duration: 2.6, ease: 'power3.out', onUpdate: () => scene && (scene.state.intro = s.v) }, 0)
          .to(chars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, stagger: 0.025 }, 0.1)
          .to(fades, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.5)
          .fromTo(q('.hero__halo'), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 2.4, ease: 'power2.out' }, 0)
          .fromTo(q('.hero__bars i'), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 1);
      });
      const off = onSiteReady(intro);

      /* ---------- scroll: hero → Rocket section ---------- */
      const next = hero.nextElementSibling; // .rocket-sec
      const nextHead = next?.querySelectorAll('.rocket-copy__head .kicker, .rocket-copy__head h2') || [];
      const nextPanel = next?.querySelector('.rocket-panels');
      const nextBars = next?.querySelector('.rocket-progress');

      if (next) gsap.set(next, { opacity: 0 });

      // Held in place until the Rocket section reaches the top — the
      // 3D rocket lands on it at exactly that moment.
      const tl = gsap.timeline({
        defaults: { ease: 'none', immediateRender: false },
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: () => `+=${hero.offsetHeight}`,
          scrub: 1,
          pin: true,
          pinSpacing: false,
          invalidateOnRefresh: true,
          // the 3D camera flies forward through the scene as you scroll
          onUpdate: (self) => scene && (scene.state.progress = self.progress),
        },
      });

      tl
        // the whole copy block tips back into depth
        .fromTo(
          q('.hero__content'),
          { rotateY: 0, rotateX: 0, z: 0 },
          { rotateY: 14, rotateX: 10, z: -260, ease: 'power1.in', duration: 0.5 },
          0
        )
        // headline words flip back over, one after another
        .fromTo(
          q('.hero__title .split-word'),
          { yPercent: 0, rotateX: 0, opacity: 1 },
          {
            yPercent: -40,
            rotateX: 90,
            opacity: 0,
            transformOrigin: '50% 100%',
            duration: 0.3,
            stagger: { amount: 0.16 },
            ease: 'power2.in',
          },
          0
        )
        .fromTo(
          fades,
          { y: 0, rotateX: 0, opacity: 1 },
          { y: -50, rotateX: 50, opacity: 0, duration: 0.24, stagger: 0.04, ease: 'power2.in' },
          0.04
        )
        .fromTo(q('.hero__halo'), { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.6, duration: 0.5 }, 0)
        // the hero's sky dissolves into the shared universe behind it (no
        // hard cut) while the rocket swoops on into the next section
        .fromTo(q('.hero__canvas, .hero__vignette'), { opacity: 1 }, { opacity: 0, duration: 0.32, ease: 'power1.inOut' }, 0.26)
        .to(hero, { autoAlpha: 0, duration: 0.02 }, 0.6);

      if (next) {
        tl.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.3);

        // The Rocket section's copy rises out of depth as the rocket lands.
        // immediateRender: start hidden from the first frame — otherwise
        // the copy shows while the section scrolls up, then snaps back
        // to hidden and comes in again (a visible "come, re-come" stutter).
        if (nextHead.length) {
          tl.fromTo(
            nextHead,
            { y: 70, rotateX: -75, opacity: 0, transformPerspective: 800, transformOrigin: '50% 100%' },
            { y: 0, rotateX: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: 'power3.out', immediateRender: true },
            0.55
          );
        }
        const rest = [nextPanel, nextBars].filter(Boolean);
        if (rest.length) {
          tl.fromTo(
            rest,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.25, stagger: 0.06, ease: 'power3.out', immediateRender: true },
            0.72
          );
        }
      }

      // Pointer: the headline leans toward the cursor, the 3D scene parallaxes
      const move = (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -((e.clientY / window.innerHeight) * 2 - 1);
        gsap.to(q('.hero__title'), { rotateY: x * 6, rotateX: y * 4, duration: 1.2, ease: 'power3.out' });
        scene?.setPointer(x, y);
      };
      window.addEventListener('pointermove', move, { passive: true });

      return () => {
        dead = true;
        off();
        window.removeEventListener('pointermove', move);
        scene?.destroy();
      };
    },
    { scope: root }
  );

  return (
    <section ref={root} className="hero" id="top">
      {/* 3D backdrop — three/HeroScene renders into this */}
      <div ref={canvasWrap} className="hero__canvas" aria-hidden="true" />

      <div className="hero__vignette" />

      {/* Box the 3D rocket (journey/RocketFlight) is fitted into */}
      <div className="hero__stage" aria-hidden="true">
        <span className="hero__halo" />
      </div>

      <div className="hero__inner">
        <div className="hero__content">
          <p className="hero__eyebrow hero__fade">
            <span className="hero__eyebrow-line" aria-hidden="true" />
            AI Storytelling Studio
          </p>

          <div className="hero__headline">
            <Split as="p" className="hero__title" lines={['Our AI Stages.', 'One Launch.']} />
          </div>

          <h1 className="hero__sub hero__fade">
            AI Creative Agency in India for Brand Films, Advertising &amp; Digital Experiences.
          </h1>

          <div className="hero__actions hero__fade">
            <Link href="/portfolio" className="btn hero__btn hero__btn--gold">
              Explore The Work <ArrowUpRight size={14} />
            </Link>
            <Link href="/contact" className="hero__mission">
              <span className="hero__mission-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M3.5 1.8v10.4L12 7 3.5 1.8Z" fill="currentColor" />
                </svg>
              </span>
              Start a mission
            </Link>
          </div>
        </div>
      </div>

      <div className="hero__foot">
        <div className="hero__count hero__fade" aria-hidden="true">
          <span className="hero__count-num">01 / 04</span>
          <span className="hero__bars">
            <i />
            <b />
            <b />
            <b />
          </span>
        </div>
        <div className="scroll-cue hero__fade">
          Scroll to explore
          <span className="hero__cue-sep" aria-hidden="true" />
          <span className="hero__mouse" aria-hidden="true">
            <i />
          </span>
        </div>
      </div>
    </section>
  );
}
