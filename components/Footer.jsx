'use client';

import { useRef, useState } from 'react';
import { LegalPolicyModal } from './LegalPolicyModal';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { site } from '@/lib/user/content';
import FooterWord from './FooterWord';


const SocialIcon = ({ platform }) => {
  const paths = {
    facebook: (
      <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8z" />
    ),

    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="18" cy="6" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),

linkedin: (
  <path
    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.99 9H3.68v11.452h3.31z"
    fill="currentColor"
    stroke="none"
  />
),

    twitter: (
      <path
        d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.4L1.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"
        fill="currentColor"
        stroke="none"
      />
    ),

    youtube: (
      <>
        <path d="M22 12s0-4-1-5-2-1-9-1-8 0-9 1-1 5-1 5 0 4 1 5 2 1 9 1 8 0 9-1 1-5 1-5Z" />
        <path d="m10 9 5 3-5 3z" />
      </>
    ),
  };

  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[platform]}
    </svg>
  );
};

export default function Footer() {
  const root = useRef(null);
  const [activePolicy, setActivePolicy] = useState(null);
  useGSAP(
    () => {
      gsap.fromTo(
        '.footer__inner',
        { yPercent: -28, opacity: 0.3 },
        {
          yPercent: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
        }
      );
      gsap.from('.footer__col > *, .footer__brand > *', {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.04,
        scrollTrigger: { trigger: root.current, start: 'top 75%' },
      });
    },
    { scope: root }
  );

  const toTop = () => {
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 2.2 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer ref={root} className="footer">
        <div className="container footer__inner">
          <div className="footer__top">
            <div className="footer__brand">
              <Link href="/" className="footer__logo-link" aria-label="Go to homepage">
                <img src="/images/logo.png" alt="Contenaissance" />
              </Link>
              <p>Human stories. Uncharted possibilities.</p>
            </div>

            <div className="footer__cols">

              {/* Explore */}
              <div className="footer__col">
                <p>Explore</p>
                <Link href="/">Home</Link>
                <Link href="/portfolio">Portfolio</Link>
                <Link href="/services">Services</Link>
                <Link href="/blog">Blog</Link>
                <Link href="/career">Career</Link>
              </div>

              {/* Reach */}
              <div className="footer__col">
                <p>Reach</p>
                <a href={`mailto:${site.email}`}>{site.email}</a>
                <a href={site.phoneHref}>{site.phone}</a>
              </div>

              {/* Follow Us */}
              <div className="footer__col footer__social-col">
                <p>Follow Us</p>

                <div className="footer__social-links">
                  {Object.entries(site.social).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={platform}
                      title={platform}
                    >
                      <SocialIcon platform={platform} />
                    </a>
                  ))}
                </div>
              </div>

            </div>

          </div>

          <FooterWord />

          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} Contenaissance. All rights reserved.</span>
            <div className="footer__legal">
              <button
                type="button"
                onClick={() => setActivePolicy('privacy')}
              >
                Privacy Policy
              </button>

              <button
                type="button"
                onClick={() => setActivePolicy('cookies')}
              >
                Cookies Policy
              </button>
            </div>
            <button className="footer__top-link" onClick={toTop}>
              End of transmission / Back to top ↑
            </button>
          </div>
        </div>
      </footer>
      <LegalPolicyModal
        policyId={activePolicy}
        onClose={() => setActivePolicy(null)}
      />
    </>
  );
}
