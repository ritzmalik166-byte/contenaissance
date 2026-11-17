
'use client';

import { useEffect, useRef } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import './DigitalInnovationSection.css';

export default function DigitalInnovationSection() {
  const root = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const headlineRef = useRef(null);

  // GSAP entrance and scroll animation
useGSAP(
  () => {
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top 78%',
          toggleActions: 'play none none reverse',
        },
      });

      intro
        .from('.di-eyebrow', {
          opacity: 0,
          y: 15,
          duration: 0.8,
          ease: 'power3.out',
        })
        .from(
          '.di-heading-line',
          {
            yPercent: 105,
            opacity: 0,
            stagger: 0.18,
            duration: 1.25,
            ease: 'power4.out',
          },
          '-=0.3'
        )
        .from(
          '.di-description',
          {
            opacity: 0,
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
            duration: 0.8,
            ease: 'power2.out',
          },
          '-=0.5'
        );

      gsap.fromTo(
        '.di-mega-text',
        {
          opacity: 0,
          scale: 0.96,
          filter: 'blur(12px)',
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 65%',
            end: 'bottom 70%',
            scrub: 1.2,
          },
        }
      );

      gsap.fromTo(
        '.di-bottom-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.5,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 65%',
          },
        }
      );

      gsap.to('.di-cross', {
        rotation: 90,
        duration: 1.2,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 40%',
          end: 'bottom 50%',
          scrub: 1,
        },
      });
    }, root);

    return () => ctx.revert();
  },
  { scope: root }
);

  // Interactive canvas network
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = root.current;

    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationId;

    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
    };

    const nodes = [];

    const createNodes = () => {
      nodes.length = 0;

      const count = Math.min(
        48,
        Math.max(22, Math.floor(width / 38))
      );

      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseX: Math.random() * width,
          baseY: Math.random() * height,
          radius: Math.random() > 0.8 ? 4 : 2,
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

        let x = node.baseX + driftX;
        let y = node.baseY + driftY;

        if (mouse.active) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const radius = 230;

          if (distance < radius && distance > 0) {
            const force = (1 - distance / radius) * 25;
            x += (dx / distance) * force;
            y += (dy / distance) * force;
          }
        }

        node.x += (x - node.x) * 0.055;
        node.y += (y - node.y) * 0.055;

        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];

          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

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

        // Mouse reactive connections
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 190) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(20, 15, 5, ${
              (1 - distance / 190) * 0.55
            })`;
            ctx.stroke();
          }
        }

        // Nodes
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        ctx.fillStyle =
          node.radius > 3 ? '#090705' : '#f1eadf';

        ctx.fill();

        if (node.radius <= 3) {
          ctx.strokeStyle = 'rgba(15, 12, 8, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Cursor connection point
      if (mouse.active) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#090705';
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    const handlePointerMove = (event) => {
      const rect = section.getBoundingClientRect();

      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;

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
    animationId = requestAnimationFrame(draw);

    section.addEventListener('pointermove', handlePointerMove);
    section.addEventListener('pointerleave', handlePointerLeave);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();

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
      {/* Animated background */}
      <div className="di-gradient" />
      <div className="di-grain" />

      {/* Network canvas */}
      <canvas
        ref={canvasRef}
        className="di-network"
        aria-hidden="true"
      />

      {/* Cursor */}
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

          <h2 ref={headlineRef} className="di-heading">
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
        <div className="di-mega-wrap">
          <div className="di-mega-text" aria-label="Creativity">
            CREATIVITY
            <span className="di-cross">×</span>
          </div>
        </div>
      </div>
      <div className="di-bottom-line" />
    </section>
  );
}
