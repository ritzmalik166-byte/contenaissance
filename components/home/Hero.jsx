'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { onSiteReady } from '@/lib/user/ready';
import Split from '../Split';
import { ArrowRight, Play } from '../Icons';

/* =====================================================
   HERO — centred headline over the 3D space backdrop
   (three/HeroScene: gold infinity, planets, Earth's horizon,
   nebulae), with the 3D rocket launching on the right.

   The rocket itself is drawn by journey/RocketFlight.jsx
   into `.hero__stage`'s box; on scroll it flies into the
   Rocket section while this copy folds away in 3D and the
   Rocket section's heading rises into place.
===================================================== */

export default function Hero() {
  const root = useRef(null);
  const canvasWrap = useRef(null);

  useGSAP(
    (ctx, contextSafe) => {
      const q = gsap.utils.selector(root);
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
          // the 3D infinity grows into place and the scene settles
          .to(s, { v: 1, duration: 2.6, ease: 'power3.out', onUpdate: () => scene && (scene.state.intro = s.v) }, 0)
          .to(chars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.4, stagger: 0.025 })
          .to(fades, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.5)
          .fromTo(q('.hero__halo'), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 2.4, ease: 'power2.out' }, 0);
      });
      const off = onSiteReady(intro);

      /* ---------- scroll: hero → Rocket section ---------- */
      const next = root.current.nextElementSibling; // .rocket-sec
      const nextHead = next?.querySelectorAll('.rocket-copy__head .kicker, .rocket-copy__head h2') || [];
      const nextPanel = next?.querySelector('.rocket-panels');
      const nextBars = next?.querySelector('.rocket-progress');

      if (next) gsap.set(next, { opacity: 0 });

      // Held in place until the Rocket section reaches the top — the
      // 3D rocket lands on it at exactly that moment.
      const tl = gsap.timeline({
        defaults: { ease: 'none', immediateRender: false },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${root.current.offsetHeight}`,
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
          { rotateX: 0, z: 0 },
          { rotateX: 18, z: -260, ease: 'power1.in', duration: 0.5 },
          0
        )
        // headline words flip back over, one after another (words, not
        // letters: the letters belong to the intro tween)
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
        .to(root.current, { autoAlpha: 0, duration: 0.05 }, 0.5);

      if (next) {
        tl.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.3);

        // The Rocket section's copy rises out of depth as the rocket lands
        if (nextHead.length) {
          tl.fromTo(
            nextHead,
            { y: 70, rotateX: -75, opacity: 0, transformPerspective: 800, transformOrigin: '50% 100%' },
            { y: 0, rotateX: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: 'power3.out' },
            0.55
          );
        }
        const rest = [nextPanel, nextBars].filter(Boolean);
        if (rest.length) {
          tl.fromTo(
            rest,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.25, stagger: 0.06, ease: 'power3.out' },
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

      <div className="hero__inner">
        <div className="hero__content">
          <p className="hero__eyebrow hero__fade">
            <Star /> AI Storytelling Agency &amp; AI Creative Studio
          </p>

          <div className="hero__headline">
            <Split as="p" className="display hero__title" lines={['Our AI Stages.', 'One Launch.']} />
          </div>

          <h1 className="hero__sub hero__fade">
            AI Creative Agency in India for Brand Films, Advertising &amp; Digital Experiences.
          </h1>

          <div className="hero__actions hero__fade">
            <Link href="/portfolio" className="btn hero__btn hero__btn--gold">
              Explore The Work <ArrowRight />
            </Link>
            <Link href="/contact" className="btn hero__btn hero__btn--outline">
              <span className="hero__play">
                <Play size={12} />
              </span>
              Start a mission
            </Link>
          </div>
        </div>

        {/* Box the 3D rocket (journey/RocketFlight) is fitted into */}
        <div className="hero__stage" aria-hidden="true">
          <span className="hero__halo" />
        </div>
      </div>

      <div className="hero__foot">
        <p className="hero__ticker hero__fade">
          “AI is changing so fast in 2026.” <em>But are you?</em>
        </p>
        <div className="scroll-cue hero__fade">
          Scroll to explore <Chevrons />
        </div>
      </div>
    </section>
  );
}

const Star = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6L12 2Z" />
  </svg>
);

const Chevrons = () => (
  <svg className="scroll-cue__chev" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="m3 3 4 4 4-4M3 7.5l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
