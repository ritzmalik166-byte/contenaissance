
'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { openVideo } from '../VideoModal';
import { ArrowUpRight } from '../Icons';
import './ServiceList.css';

// Independent Services Data
const services = [
  {
    number: '01',
    code: 'S1 / BOOSTER',
    title: 'AI Brand Films',
    description:
      'AI-Powered Brand Films · Generative AI Storytelling · Interactive Brand Experiences · AI Cinematic Marketing',

    video: {
      preview: '/videos/01.mp4',
      src: '/videos/01.mp4',
      poster: '/images/04.jpg',
    },
  },
  {
    number: '02',
    code: 'S2 / STAGE',
    title: 'Digital-First Content',
    description:
      'Platform-Specific Content · AI-Driven Content Creation · Contextually Relevant Content · AI Analytics',

    video: {
      preview: '/videos/03.mp4',
      src: '/videos/03.mp4',
      poster: '/images/05.jpg',
    },
  },
  {
    number: '03',
    code: 'S3 / STAGE',
    title: 'AI-Powered Campaigns',
    description:
      'Maximize Marketing Impact · Data-Driven Decisions · Market Analysis & Optimization · Scalable AI Campaigns',

    video: {
      preview: '/videos/3d-website.mp4',
      src: '/videos/3d-website.mp4',
      poster: '/images/06.jpg',
    },
  },
  {
    number: '04',
    code: 'S4 / PAYLOAD',
    title: 'Visual Identity Systems',
    description:
      'AI-Driven Branding Frameworks · Custom Design Systems · Visual Identity Solutions · UI/UX & Interactive Assets',

    video: {
      preview: '/videos/09.mp4',
      src: '/videos/09.mp4',
      poster: '/images/07.png',
    },
  },
];

function ServiceRow({ item, index }) {
  const videoRef = useRef(null);

  const handleEnter = () => {
    const video = videoRef.current;

    if (!video) return;

    video.play().catch(() => {});
  };

  const handleLeave = () => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  const playVideo = () => {
    if (item.video?.src) {
      openVideo(item.video.src);
    }
  };

  return (
    <article
      className="services-row"
      id={`service-${index + 1}`}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      {/* Service Number */}
      <div className="services-row-info">
        <span className="services-row-number">
          {item.number}
        </span>

        <span className="services-row-code mono">
          {item.code}
        </span>
      </div>

      {/* Service Content */}
      <div className="services-row-main">
        <h3 className="services-row-title">
          {item.title}
        </h3>

        <p className="services-row-description">
          {item.description}
        </p>
      </div>

      {/* Hover Video Preview */}

{/* Hover Video Preview */}
{item.video?.preview && (
  <button
    type="button"
    className="services-row-preview"
    onClick={playVideo}
    aria-label={`VIEW ${item.title}`}
    data-cursor="VIEW"
  >
    <span className="services-preview-label mono">
      REEL · 9:16
    </span>

    <video
      ref={videoRef}
      className="services-preview-video"
      src={item.video.preview}
      poster={item.video.poster}
      muted
      loop
      playsInline
      preload="none"
    />
  </button>
)}

      {/* Arrow */}
      <button
        type="button"
        className="services-row-arrow"
        onClick={playVideo}
        aria-label={`Open ${item.title} video`}
      >
        <ArrowUpRight />
      </button>
    </article>
  );
}

export default function ServiceList() {
  const root = useRef(null);

  useGSAP(
    () => {
      const rows = gsap.utils.toArray(
        '.services-row',
        root.current
      );

      rows.forEach((row) => {
        gsap.fromTo(
          row,
          {
            y: 70,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: row,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });

      gsap.fromTo(
        '.services-section-heading',
        {
          y: 50,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.services-section-heading',
            start: 'top 85%',
          },
        }
      );
    },
    { scope: root }
  );

  return (
    <section
      className="services-list-section"
      ref={root}
    >
      <div className="services-list-container">

        {/* Section Heading */}
        <div className="services-section-heading">

          <div className="services-heading-left">
            <p className="services-kicker mono">
              01 / OUR EXPERTISE
            </p>

            <h2 className="services-section-title">
              Four Ways to Create.
              <span>Infinite Ways to Stand Out.</span>
            </h2>
          </div>

          <div className="services-heading-right">
            <p>
              Ideas powered by imagination. Experiences
              elevated by technology. Explore how we
              transform brands through AI-driven creativity.
            </p>

            <span className="services-stages mono">
              04 STAGES / 01 LAUNCH
            </span>
          </div>

        </div>

        {/* Services */}
        <div className="services-rows">
          {services.map((item, index) => (
            <ServiceRow
              key={item.number}
              item={item}
              index={index}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
