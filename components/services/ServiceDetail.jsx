
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/gsap';
import { services } from '@/lib/content';
import LazyVideo from '../LazyVideo';
import Cta from '../Cta';
import CompactEnquiryForm from '../CompactEnquiryForm';
import { ArrowRight, ArrowUpRight } from '../Icons';
import './service-detail.css';

const slugify = (title = '') =>
  title.toLowerCase().trim().replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function ServiceDetail({ service }) {
  const root = useRef(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  const related = services
    .filter(item => item.title !== service?.title)
    .slice(0, 3);

  useGSAP(() => {
    gsap.from('.sd-title > *, .sd-description, .sd-video, .sd-enquiry', {
      y: 20, opacity: 0, duration: 0.7, stagger: 0.1,
      ease: 'power2.out'
    });

    gsap.utils.toArray('.sd-reveal').forEach(el => {
      gsap.from(el, {
        y: 20, opacity: 0, duration: 0.65,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  }, { scope: root });

  if (!service) return null;

  return (
    <main ref={root} className="sd-page">

      <section className="container sd-hero-layout">
        <div className="sd-hero-main">
          <header className="sd-header">
            <Link href="/services" className="sd-back">
              <ArrowRight /> All Services
            </Link>

            <div className="sd-title">
              <p className="sd-label">{service.kicker}</p>
              <h1 className="display">{service.title}</h1>
            </div>

            <p className="sd-description">{service.paragraphs?.[0]}</p>

            <a href="#sd-overview" className="sd-link">
              Explore service <ArrowUpRight />
            </a>
          </header>

          <section className="sd-video">
            <LazyVideo src={service.video.preview} poster={service.video.poster} />
          </section>
        </div>

        {/* Single enquiry form for desktop and mobile */}
        <aside className={`sd-enquiry ${enquiryOpen ? 'is-open' : ''}`}>
          <div className="sd-enquiry-inner">
            <button
              className="sd-enquiry-close"
              onClick={() => setEnquiryOpen(false)}
              aria-label="Close enquiry form"
            >
              ×
            </button>
            <CompactEnquiryForm variant="sidebar" />
          </div>
        </aside>
      </section>

      {/* Mobile / Tablet trigger */}
      <button
        className="sd-enquiry-trigger"
        onClick={() => setEnquiryOpen(true)}
        aria-label="Open enquiry form"
        aria-expanded={enquiryOpen}
      >
        <ArrowUpRight />
        <span>Enquire</span>
      </button>

      {/* Overview */}
      <section id="sd-overview" className="container sd-overview sd-reveal">
        <div className="sd-section-heading">
          <p className="sd-label">ABOUT THE SERVICE</p>
          <h2 className="display">Our approach</h2>
        </div>

        <div className="sd-copy">
          {service.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </section>

      {/* Related services */}
      {related.length > 0 && (
        <section className="container sd-related">
          <div className="sd-related-heading sd-reveal">
            <div>
              <p className="sd-label">DISCOVER MORE</p>
              <h2 className="display">Related services</h2>
            </div>
            <Link href="/services" className="sd-link">
              All services <ArrowUpRight />
            </Link>
          </div>

          <div className="sd-related-grid">
            {related.map(item => (
              <Link
                key={item.title}
                href={`/services/${slugify(item.title)}`}
                className="sd-card sd-reveal"
              >
                <div className="sd-card-top">
                  <span className="sd-label">{item.kicker}</span>
                  <ArrowUpRight />
                </div>
                <h3>{item.title}</h3>
                <p>{item.paragraphs?.[0]}</p>
                <span className="sd-card-bottom">
                  Explore service <ArrowRight />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="sd-cta"><Cta /></div>
    </main>
  );
}
