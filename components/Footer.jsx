'use client';

import { useRef, useState } from 'react';
import { LegalPolicyModal } from './LegalPolicyModal';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { site } from '@/lib/user/content';
import FooterWord from './FooterWord';

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
              <img src="/images/logo.png" alt="Contenaissance" />
              <p>Human stories. Uncharted possibilities.</p>
            </div>

            <div className="footer__cols">
              <div className="footer__col">
                <p>Explore</p>
                <Link href="/home">Home</Link>
                <Link href="/portfolio">Portfolio</Link>
                <Link href="/services">Services</Link>
                <Link href="/blog">Blog</Link>
              </div>
              <div className="footer__col">
                <p>Connect</p>
                <Link href="/contact">Contact Us</Link>
                <a href={site.social.instagram} target="_blank" rel="noreferrer">
                  Instagram
                </a>
                <a href={site.social.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                <a href={site.social.youtube} target="_blank" rel="noreferrer">
                  Youtube
                </a>
                {/* <a href={site.social.facebook} target="_blank" rel="noreferrer">
                Facebook
              </a> */}
              </div>
              <div className="footer__col">
                <p>Reach</p>
                <a href={`mailto:${site.email}`}>{site.email}</a>
                <a href={site.phoneHref}>{site.phone}</a>
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
