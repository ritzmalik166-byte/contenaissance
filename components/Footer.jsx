'use client';

import { useEffect, useRef, useState } from 'react';
import { LegalPolicyModal } from './LegalPolicyModal';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/user/gsap';
import { site } from '@/lib/user/content';
import FooterWord from './FooterWord';

/* =====================================================
   FOOTER — deep space: the homepage hero's Earth (night
   side, golden sunrise on the limb) rising under the gold
   CONTENAISSANCE wordmark, and its crescent moon top right.
   The scene is three/HeroScene, re-laid-out through its
   getLayout option so the limb sits under the letters.
===================================================== */

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

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M3 5.5h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm.9 2.1v.2l8.1 5.6 8.1-5.6v-.2H3.9Zm16.2 2.5-7.5 5.2a1 1 0 0 1-1.2 0l-7.5-5.2v6.4h16.2v-6.4Z" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1L6.6 10.8Z" />
  </svg>
);

// NDC y (-1 bottom … 1 top) of the line the gold wordmark stands on, so
// Earth's sunrise limb sits right under the letters at any screen size.
// offsetTop (not getBoundingClientRect) so the scroll parallax on
// .footer__inner doesn't skew it.
const wordBaseline = (footer) => {
  const row = footer.querySelector('.fword__row');
  if (!row || !footer.offsetHeight) return -0.4;
  let y = 0;
  for (let n = row; n && n !== footer; n = n.offsetParent) y += n.offsetTop;
  const base = y + row.offsetHeight * 0.9;
  return 1 - (2 * base) / footer.offsetHeight;
};

export default function Footer() {
  const root = useRef(null);
  const space = useRef(null);
  const [activePolicy, setActivePolicy] = useState(null);

  /* ---------- Earth + moon backdrop ---------- */
  useEffect(() => {
    const footer = root.current;
    const wrap = space.current;
    if (!footer || !wrap) return undefined;
    let scene = null;
    let dead = false;
    let intro = null;

    // HeroScene draws the visible limb a little above gy (it's seen from
    // above), more so on tall phone footers — pull it back onto the letters
    const getLayout = (aspect, mobile) => ({
      gx: 0,
      gy: wordBaseline(footer) - (mobile ? 0.1 : 0.04),
      tilt: 0,
      moon: mobile
        ? { x: 0.74, y: 0.74, r: Math.min(0.3, 0.34 * aspect) }
        : { x: 0.92, y: 0.8, r: Math.min(0.38, 0.3 * aspect) },
    });

    const boot = () => {
      import('./three/HeroScene').then(({ createHeroScene }) => {
        if (dead || !space.current) return;
        scene = createHeroScene(space.current, {
          getLayout,
          drift: false,
          sunUp: 0.2, // enough daylight along the limb to light the clouds
          res: '4k', // the cloud deck is seen up close here
          realClouds: true,
        });
        if (!scene) return;
        // the horizon rises into place as the footer scrolls in
        intro = gsap.to(scene.state, {
          intro: 1,
          ease: 'power2.out',
          scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: 1 },
        });
        document.fonts?.ready.then(() => !dead && scene.resize());
      });
    };

    // three.js only loads once the footer is getting close
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        boot();
      },
      { rootMargin: '800px 0px' }
    );
    near.observe(footer);

    // the moon leans gently with the cursor
    const onMove = (e) => {
      if (!scene) return;
      const r = footer.getBoundingClientRect();
      scene.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    footer.addEventListener('pointermove', onMove);

    return () => {
      dead = true;
      near.disconnect();
      footer.removeEventListener('pointermove', onMove);
      intro?.scrollTrigger?.kill();
      intro?.kill();
      scene?.destroy();
    };
  }, []);

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
        <div ref={space} className="footer__space" aria-hidden="true" />
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
                <a className="footer__reach" href={`mailto:${site.email}`}>
                  <MailIcon />
                  <span>{site.email}</span>
                </a>
                <a className="footer__reach" href={site.phoneHref}>
                  <PhoneIcon />
                  <span>{site.phone}</span>
                </a>
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
              <button type="button" onClick={() => setActivePolicy('privacy')}>
                Privacy Policy
              </button>

              <span className="footer__legal-sep" aria-hidden="true">|</span>

              <button type="button" onClick={() => setActivePolicy('cookies')}>
                Cookies Policy
              </button>
            </div>
            <button className="footer__top-link" onClick={toTop}>
              <span>Back to Top</span>
              <span className="footer__top-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </footer>
      <LegalPolicyModal policyId={activePolicy} onClose={() => setActivePolicy(null)} />
    </>
  );
}
