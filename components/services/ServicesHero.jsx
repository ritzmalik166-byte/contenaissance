
'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './ServicesHero.css';

const services = [
  { number: 'S1', title: 'AI Brand Films', href: '#service-1' },
  { number: 'S2', title: 'Digital-First Content', href: '#service-2' },
  { number: 'S3', title: 'AI-Powered Campaigns', href: '#service-3' },
  { number: 'S4', title: 'Visual Identity Systems', href: '#service-4' },
];

export default function ServicesHero() {
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      tl.fromTo(
        '.services-breadcrumb',
        { y: 35, opacity: 0, filter: 'blur(10px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.2,
        }
      )
        .fromTo(
          '.services-bottom-line',
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.2,
            transformOrigin: 'left center',
          },
          '-=0.5'
        )
        .fromTo(
          '.service-nav-item',
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.15,
            duration: 0.8,
          },
          '-=0.5'
        )
        .fromTo(
          '.services-scroll',
          { x: 15, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.8 },
          '-=0.5'
        );

      gsap.to('.scroll-mouse-wheel', {
        y: 10,
        opacity: 0.3,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const scrollDown = () => {
    document.querySelector('#service-1')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <section className="services-hero" ref={heroRef}>

      {/* Background Video */}
      <div className="services-video-wrapper">
        <video
          className="services-bg-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/services-poster.jpg"
          aria-hidden="true"
        >
          <source
            src="/videos/02.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Video overlays */}
      <div className="services-video-overlay" />
      <div className="services-video-glow" />

      {/* Center breadcrumb */}
      <div className="services-hero-content">
        <div className="services-breadcrumb">
          <a href="/">HOME</a>
          <span className="breadcrumb-slash">/</span>
          <span className="breadcrumb-current">SERVICES</span>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="services-hero-bottom">

        <div className="services-bottom-line" />

        <nav
          className="services-navigation"
          aria-label="Our services"
        >
          {services.map((service) => (
            <a
              href={service.href}
              className="service-nav-item"
              key={service.number}
            >
              <span className="service-nav-number">
                {service.number}
              </span>

              <span className="service-nav-title">
                {service.title}
              </span>
            </a>
          ))}
        </nav>

        {/* Scroll indicator */}
        <button
          type="button"
          className="services-scroll"
          onClick={scrollDown}
          aria-label="Scroll to services"
        >
          <span className="services-scroll-text">
            SCROLL
          </span>

          <span className="scroll-mouse">
            <span className="scroll-mouse-wheel" />
          </span>
        </button>

      </div>
    </section>
  );
}
