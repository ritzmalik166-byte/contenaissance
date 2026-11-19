
'use client';

import { useEffect, useRef } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import './DigitalInnovationSection.css';

export default function DigitalInnovationSection() {
  const root = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);

  // =========================================
  // GSAP SCROLL ANIMATIONS
  // =========================================

  useGSAP(
    () => {
      const section = root.current;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // INTRO REVEAL
        const intro = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 78%',
            toggleActions: 'play none none reverse',
          },
        });

        intro
          .from('.di-eyebrow', {
            opacity: 0,
            y: 20,
            duration: 0.7,
            ease: 'power3.out',
          })
          .from(
            '.di-heading-line',
            {
              yPercent: 110,
              opacity: 0,
              stagger: 0.18,
              duration: 1.2,
              ease: 'power4.out',
            },
            '-=0.3'
          )
          .from(
            '.di-description',
            {
              opacity: 0,
              x: 35,
              filter: 'blur(8px)',
              duration: 1,
              ease: 'power3.out',
            },
            '-=0.65'
          )
          .from(
            '.di-meta',
            {
              opacity: 0,
              y: 12,
              duration: 0.7,
              ease: 'power2.out',
            },
            '-=0.5'
          );

        // BIG TYPOGRAPHY REVEAL
        gsap.fromTo(
          '.di-mega-text',
          {
            x: -100,
            opacity: 0,
            scale: 0.94,
            filter: 'blur(10px)',
          },
          {
            x: 0,
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top 55%',
              end: 'bottom 75%',
              scrub: 1.2,
              invalidateOnRefresh: true,
            },
          }
        );

        // NETWORK CANVAS REVEAL
        gsap.fromTo(
          '.di-network',
          { opacity: 0 },
          {
            opacity: 0.9,
            duration: 1.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 60%',
              toggleActions: 'play none none reverse',
            },
          }
        );

        // BOTTOM LINE
        gsap.fromTo(
          '.di-bottom-line',
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.4,
            ease: 'power3.inOut',
            scrollTrigger: {
              trigger: section,
              start: 'top 65%',
            },
          }
        );

        // CROSS ROTATION
        gsap.to('.di-cross', {
          rotation: 90,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 40%',
            end: 'bottom 50%',
            scrub: 1.2,
          },
        });

        // SUBTLE MEGA TEXT MOVEMENT
        gsap.to('.di-mega-text', {
          y: -35,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  // =========================================
  // INTERACTIVE NETWORK + SMOOTH CURSOR
  // =========================================

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = root.current;
    const cursor = cursorRef.current;

    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationId;
    let resizeObserver;

    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
    };

    const nodes = [];

    // Smooth cursor movement
    const moveX = gsap.quickTo(cursor, 'x', {
      duration: 0.45,
      ease: 'power3.out',
    });

    const moveY = gsap.quickTo(cursor, 'y', {
      duration: 0.45,
      ease: 'power3.out',
    });

    const createNodes = () => {
      nodes.length = 0;

      const count = Math.min(
        48,
        Math.max(22, Math.floor(width / 38))
      );

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;

        nodes.push({
          x,
          y,
          baseX: x,
          baseY: y,
          radius: Math.random() > 0.82 ? 4 : 2,
          speed: 0.3 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      const rect = section.getBoundingClientRect();

      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createNodes();
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);

      const t = time * 0.0003;

      nodes.forEach((node, i) => {
        const driftX =
          Math.sin(t * node.speed + node.phase) * 13;

        const driftY =
          Math.cos(t * node.speed + node.phase) * 17;

        let targetX = node.baseX + driftX;
        let targetY = node.baseY + driftY;

        // Magnetic cursor reaction
        if (mouse.active) {
          const dx = targetX - mouse.x;
          const dy = targetY - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 230 && distance > 0) {
            const force = (1 - distance / 230) * 30;
            targetX += (dx / distance) * force;
            targetY += (dy / distance) * force;
          }
        }

        // Smooth node movement
        node.x += (targetX - node.x) * 0.055;
        node.y += (targetY - node.y) * 0.055;

        // Network connections
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];

          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 230) {
            const alpha = (1 - distance / 230) * 0.38;

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(35, 20, 5, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Cursor connections
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 190) {
            const alpha = (1 - distance / 190) * 0.55;

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(20, 15, 5, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        // Node glow
        if (node.radius > 3) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 225, 160, 0.13)';
          ctx.fill();
        }

        // Node point
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle =
          node.radius > 3 ? '#090705' : '#f1eadf';
        ctx.fill();

        if (node.radius <= 3) {
          ctx.strokeStyle = 'rgba(15, 12, 8, 0.8)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // Cursor connection point
      if (mouse.active) {
        const pulse = 5 + Math.sin(time * 0.004) * 1.5;

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#090705';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(9, 7, 5, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    const handlePointerMove = (event) => {
      const rect = section.getBoundingClientRect();

      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;

      if (cursor) {
        gsap.to(cursor, {
          opacity: 1,
          duration: 0.25,
          overwrite: 'auto',
        });

        moveX(mouse.x);
        moveY(mouse.y);
      }

      // Move the background spotlight
      section.style.setProperty(
        '--di-mouse-x',
        `${mouse.x}px`
      );

      section.style.setProperty(
        '--di-mouse-y',
        `${mouse.y}px`
      );
    };

    const handlePointerLeave = () => {
      mouse.active = false;

      if (cursor) {
        gsap.to(cursor, {
          opacity: 0,
          duration: 0.3,
          overwrite: 'auto',
        });
      }
    };

    resize();
    animationId = requestAnimationFrame(draw);

    section.addEventListener('pointermove', handlePointerMove);
    section.addEventListener('pointerleave', handlePointerLeave);

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver?.disconnect();

      section.removeEventListener('pointermove', handlePointerMove);
      section.removeEventListener('pointerleave', handlePointerLeave);

      gsap.killTweensOf(cursor);
    };
  }, []);

  return (
    <section
      ref={root}
      className="digital-innovation"
      id="digital-innovation"
    >
      {/* Animated background */}
      <div className="di-gradient" />
      <div className="di-spotlight" />
      <div className="di-grain" />

      {/* Interactive network */}
      <canvas
        ref={canvasRef}
        className="di-network"
        aria-hidden="true"
      />

      {/* Smooth custom cursor */}
      <div
        ref={cursorRef}
        className="di-cursor"
        aria-hidden="true"
      >
        <span />
      </div>

      {/* Top content */}
      <div className="di-top">
        <div className="di-left">
          <span className="di-eyebrow">
            03 / DIGITAL INNOVATION
          </span>

          <h2 className="di-heading">
            <span className="di-heading-line">
              Where Creativity
            </span>

            <span className="di-heading-line">
              Meets Technology<span className="di-period">.</span>
            </span>
          </h2>
        </div>

        <div className="di-right">
          <p className="di-description">
            We push the boundaries of what's possible,
            bringing together human imagination and emerging
            technology to create meaningful brand experiences.
          </p>

          <span className="di-meta">
            HUMAN IMAGINATION <i>×</i> EMERGING TECHNOLOGY
          </span>
        </div>
      </div>

      {/* Oversized interactive typography */}
      <div className="di-visual">
        <div className="di-mega-clip">
          <div className="di-mega-text" aria-label="Creativity">
            <span>CREATIVITY</span>
            <span className="di-cross">×</span>
          </div>
        </div>
      </div>

      <div className="di-bottom-line" />
    </section>
  );
}
