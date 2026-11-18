
'use client';

import { useRef, useState, useEffect } from 'react';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { openVideo } from '../VideoModal';
import { ArrowUpRight } from '../Icons';
import './ServiceList.css';

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


function ServiceRow({ item, index, onActivate }) {
  const playVideo = (e) => {
    e.stopPropagation();

    if (item.video?.src) {
      openVideo(item.video.src);
    }
  };

  return (
    <article
      className="services-row"
      id={`service-${index + 1}`}
      onPointerEnter={() => onActivate(index)}
      onPointerLeave={() => onActivate(null)}
      onClick={playVideo}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playVideo(e);
        }
      }}
      aria-label={`Play ${item.title}`}
    >
      <div className="services-row-info">
        <span className="services-row-number">
          {item.number}
        </span>

        <span className="services-row-code mono">
          {item.code}
        </span>
      </div>

      <div className="services-row-main">
        <h3 className="services-row-title">
          {item.title}
        </h3>

        <p className="services-row-description">
          {item.description}
        </p>
      </div>

      <button
        type="button"
        className="services-row-arrow"
        onClick={playVideo}
        aria-label={`Play ${item.title} video`}
      >
        <ArrowUpRight />
      </button>
    </article>
  );
}

export default function ServiceList() {
  const root = useRef(null);
  const previewRef = useRef(null);
  const videoRefs = useRef([]);
  const activeLayerRef = useRef(0);
  const activeIndexRef = useRef(0);
  const transitionTokenRef = useRef(0);

  const moveX = useRef(null);
  const moveY = useRef(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const activeItem = services[activeIndex];

  // Smooth cursor-follow animation
  useGSAP(
    () => {
      const preview = previewRef.current;

      if (!preview) return;

      gsap.set(preview, {
        xPercent: -50,
        yPercent: -50,
        scale: 0.8,
        opacity: 0,
      });

      moveX.current = gsap.quickTo(preview, 'x', {
        duration: 0.65,
        ease: 'power3.out',
      });

      moveY.current = gsap.quickTo(preview, 'y', {
        duration: 0.65,
        ease: 'power3.out',
      });

      const rows = gsap.utils.toArray(
        '.services-row',
        root.current
      );

      rows.forEach((row) => {
        gsap.fromTo(
          row,
          { y: 70, opacity: 0 },
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
        { y: 50, opacity: 0 },
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

  // Change video without closing the floating preview
  // Initialize first video
  useEffect(() => {
    const video = videoRefs.current[0];

    if (!video) return;

    video.src = services[0].video.preview;
    video.load();

    const startVideo = () => {
      video.play().catch(() => { });
    };

    video.addEventListener('canplay', startVideo, { once: true });

    return () => {
      video.removeEventListener('canplay', startVideo);
      transitionTokenRef.current++;
      videoRefs.current.forEach((v) => {
        v?.pause();
      });
    };
  }, []);

  // Follow the cursor
  const handlePointerMove = (e) => {
    if (!moveX.current || !moveY.current) return;

    moveX.current(e.clientX + 35);
    moveY.current(e.clientY + 25);
  };

  // Show preview
const handleActivate = (index) => {
  if (index === null) {
    setPreviewVisible(false);

    videoRefs.current.forEach((video) => {
      video?.pause();
    });

    if (previewRef.current) {
      gsap.to(previewRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    return;
  }

  transitionVideo(index);

  setPreviewVisible(true);

  if (previewRef.current) {
    gsap.to(previewRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }
};

  // Hide only when leaving the entire section
  const handleSectionLeave = () => {
    setPreviewVisible(false);

    if (videoRef.current) {
      videoRef.current.pause();
    }

    if (previewRef.current) {
      gsap.to(previewRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const transitionVideo = (index) => {
    if (index === activeIndexRef.current) return;

    const currentLayer = activeLayerRef.current;
    const nextLayer = currentLayer === 0 ? 1 : 0;

    const currentVideo = videoRefs.current[currentLayer];
    const nextVideo = videoRefs.current[nextLayer];

    if (!currentVideo || !nextVideo) return;

    const token = ++transitionTokenRef.current;
    const nextItem = services[index];

    // Prepare incoming video
    nextVideo.pause();
    nextVideo.src = nextItem.video.preview;
    nextVideo.poster = nextItem.video.poster;
    nextVideo.load();

    nextVideo.oncanplay = () => {
      if (token !== transitionTokenRef.current) return;

      nextVideo.oncanplay = null;

      nextVideo.play().catch(() => { });

      // Incoming video starts below the current video
      gsap.set(nextVideo, {
        yPercent: 100,
        zIndex: 2,
        opacity: 1,
      });

      gsap.set(currentVideo, {
        yPercent: 0,
        zIndex: 1,
      });

      // Bottom-to-top cinematic reveal
      gsap.timeline({
        onComplete: () => {
          if (token !== transitionTokenRef.current) return;

          currentVideo.pause();

          activeLayerRef.current = nextLayer;
          activeIndexRef.current = index;

          setActiveIndex(index);
        },
      })
        .to(nextVideo, {
          yPercent: 0,
          duration: 0.75,
          ease: 'power3.inOut',
        }, 0)
        .to(currentVideo, {
          yPercent: -12,
          duration: 0.75,
          ease: 'power3.inOut',
        }, 0);
    };
  };

  return (
    <section
      className="services-list-section"
      ref={root}
      onPointerMove={handlePointerMove}
      onPointerLeave={handleSectionLeave}
    >
      <div className="services-list-container">

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

        <div className="services-rows">
          {services.map((item, index) => (
            <ServiceRow
              key={item.number}
              item={item}
              index={index}
              onActivate={handleActivate}
            />
          ))}
        </div>
      </div>

      {/* ONE SHARED FLOATING VIDEO PREVIEW */}
      <div
        ref={previewRef}
        className={`services-floating-preview ${previewVisible ? 'is-visible' : ''
          }`}
        aria-hidden="true"
      >
        <span className="services-preview-label mono">
          REEL · 9:16
        </span>

<div className="services-video-stack">
  {[0, 1].map((layer) => (
    <video
      key={layer}
      ref={(el) => {
        videoRefs.current[layer] = el;
      }}
      className="services-preview-video"
      muted
      loop
      playsInline
      preload="auto"
    />
  ))}
</div>

        <span className="services-preview-index mono">
          {activeItem.number} / 04
        </span>

        <span className="services-preview-view mono">
          VIEW
        </span>
      </div>
    </section>
  );
}
