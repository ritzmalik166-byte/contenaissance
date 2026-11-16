
'use client';

import { useEffect, useRef } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import './DigitalInnovationSection.css';

export default function DigitalInnovationSection() {
  const root = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);

  // -----------------------------------------
  // CINEMATIC GSAP ANIMATIONS
  // -----------------------------------------

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: '(min-width: 901px)',
          mobile: '(max-width: 900px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { desktop, mobile, reduceMotion } = context.conditions;

          if (reduceMotion) return;

          // Intro animation. Content remains visible before this runs.
          const intro = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 75%',
              once: true,
            },
          });

          intro
            .fromTo(
              '.di-eyebrow',
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: 'power3.out',
              }
            )
            .fromTo(
              '.di-heading-line',
              { y: 75, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                stagger: 0.15,
                duration: 1.1,
                ease: 'power4.out',
              },
              '-=0.3'
            )
            .fromTo(
              '.di-description, .di-meta',
              { y: 25, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                stagger: 0.15,
                duration: 0.9,
                ease: 'power3.out',
              },
              '-=0.65'
            );

          // Giant typography scroll movement.
          if (desktop) {
            gsap.fromTo(
              '.di-mega-text',
              { x: 35 },
              {
                x: -95,
                ease: 'none',
                scrollTrigger: {
                  trigger: section,
                  start: 'top top',
                  end: 'bottom top',
                  scrub: 1.5,
                },
              }
            );

            gsap.fromTo(
              '.di-field-label',
              { y: 25, opacity: 0 },
              {
                y: -15,
                opacity: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: section,
                  start: 'top 60%',
                  end: 'bottom 30%',
                  scrub: 1,
                },
              }
            );

            // Background parallax.
            gsap.to('.di-gradient', {
              yPercent: 8,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom top',
                scrub: 1.5,
              },
            });

            // Network parallax.
            gsap.to('.di-network', {
              yPercent: -5,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom top',
                scrub: 1.5,
              },
            });
          } else if (mobile) {
            gsap.to('.di-mega-text', {
              x: -35,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom top',
                scrub: 1,
              },
            });
          }

          // Bottom line reveal.
          gsap.fromTo(
            '.di-bottom-line',
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 1.2,
              ease: 'power3.inOut',
              scrollTrigger: {
                trigger: section,
                start: 'top 65%',
                once: true,
              },
            }
          );

          // Subtle heading parallax.
          if (desktop) {
            gsap.to('.di-heading', {
              y: -18,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom top',
                scrub: 1,
              },
            });
          }
        }
      );

      return () => mm.revert();
    },
    { scope: root }
  );

  // -----------------------------------------
  // INTERACTIVE CANVAS NETWORK
  // -----------------------------------------

  useEffect(() => {
    const section = root.current;
    const canvas = canvasRef.current;

    if (!section || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let nodes = [];

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
    };

    const createNodes = () => {
      nodes = [];

      const count = Math.min(
        65,
        Math.max(24, Math.round(width / 27))
      );

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;

        nodes.push({
          x,
          y,
          originX: x,
          originY: y,
          radius: Math.random() > 0.78 ? 4.2 : 2.5,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.7,
          drift: 9 + Math.random() * 17,
        });
      }
    };

    const resize = () => {
      const rect = section.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createNodes();
    };

    const draw = (time) => {
      frame = requestAnimationFrame(draw);

      // Limit unnecessary redraws on reduced-motion devices.
      if (reducedMotion && time - lastTime < 100) return;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const timeValue = reducedMotion ? 0 : time * 0.00035;

      const positions = nodes.map((node) => {
        let x =
          node.originX +
          Math.sin(timeValue * node.speed + node.phase) *
            node.drift;

        let y =
          node.originY +
          Math.cos(timeValue * node.speed + node.phase) *
            node.drift;

        // Mouse repulsion.
        if (mouse.active && !reducedMotion) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 220 && distance > 0) {
            const force = (1 - distance / 220) * 36;
            x += (dx / distance) * force;
            y += (dy / distance) * force;
          }
        }

        return {
          x: node.x + (x - node.x) * 0.07,
          y: node.y + (y - node.y) * 0.07,
          radius: node.radius,
        };
      });

      positions.forEach((node, i) => {
        for (let j = i + 1; j < positions.length; j++) {
          const other = positions[j];
          const distance = Math.hypot(
            node.x - other.x,
            node.y - other.y
          );

          if (distance < 235) {
            const alpha = (1 - distance / 235) * 0.34;

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(28, 17, 8, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }

        // Cursor connections.
        if (mouse.active) {
          const distance = Math.hypot(
            node.x - mouse.x,
            node.y - mouse.y
          );

          if (distance < 200) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(20, 12, 5, ${
              (1 - distance / 200) * 0.65
            })`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Node circles.
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.radius > 3) {
          ctx.fillStyle = '#090705';
          ctx.fill();
        } else {
          ctx.fillStyle = '#f3e9d8';
          ctx.fill();
          ctx.strokeStyle = 'rgba(20, 12, 5, 0.9)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      });
    };

    const handlePointerMove = (event) => {
      const rect = section.getBoundingClientRect();

      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;

      // Follow light.
      section.style.setProperty('--di-mouse-x', `${mouse.x}px`);
      section.style.setProperty('--di-mouse-y', `${mouse.y}px`);

      if (cursorRef.current) {
        cursorRef.current.style.opacity = '1';
        cursorRef.current.style.transform =
          `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
      }
    };

    const handlePointerLeave = () => {
      mouse.active = false;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = '0';
      }
    };

    resize();

    if (reducedMotion) {
      draw(0);
      cancelAnimationFrame(frame);
    } else {
      frame = requestAnimationFrame(draw);
    }

    section.addEventListener('pointermove', handlePointerMove);
    section.addEventListener('pointerleave', handlePointerLeave);

    const observer = new ResizeObserver(resize);
    observer.observe(section);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      section.removeEventListener('pointermove', handlePointerMove);
      section.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <section
      ref={root}
      className="digital-innovation"
      id="digital-innovation"
    >
      {/* Background */}
      <div className="di-gradient" />
      <div className="di-spotlight" />
      <div className="di-grain" />

      {/* Network */}
      <canvas
        ref={canvasRef}
        className="di-network"
        aria-hidden="true"
      />

      {/* Custom cursor */}
      <div ref={cursorRef} className="di-cursor">
        <span />
      </div>

      {/* Main content */}
      <div className="di-top">
        <div className="di-left">
          <span className="di-eyebrow">
            <span className="di-eyebrow-dot" />
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
            We push the boundaries of what's possible, bringing
            together human imagination and emerging technology
            to create meaningful brand experiences.
          </p>

          <div className="di-meta">
            <span>HUMAN IMAGINATION</span>
            <span className="di-meta-cross">×</span>
            <span>EMERGING TECHNOLOGY</span>
          </div>
        </div>
      </div>

      {/* Oversized typography */}
      <div className="di-visual">
        <div className="di-mega-clip">
          <div className="di-mega-text">
            <span>CREATIVITY</span>
            <span className="di-cross">×</span>
          </div>
        </div>

        <div className="di-field-label">
          <span className="di-field-ring">
            <span />
          </span>
          <span className="di-field-line" />
          <span className="di-field-box">
            CURSOR-REACTIVE FIELD
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="di-bottom">
        <span>CONTENAISSANCE / DIGITAL INNOVATION</span>
        <span className="di-bottom-center">IDEAS IN MOTION</span>
        <span>HUMAN × MACHINE</span>
      </div>

      <div className="di-bottom-line" />
    </section>
  );
}
