
'use client';

import { Fragment, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/gsap';
import { services } from '@/lib/content';
import LazyVideo from '../LazyVideo';
import Banner from '../Banner';

const interludes = {
  1: {
    title: 'Cinematic Excellence',
    sub: 'Experience the future of storytelling',
  },
  3: {
    title: 'Digital Innovation',
    sub: 'Where Creativity Meets Technology',
    direction: 1,
  },
};

export function slugifyService(title = '') {
  return title
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function ServiceList() {
  const root = useRef(null);
  const [expandedItems, setExpandedItems] = useState({});

  useGSAP(
    () => {
      gsap.utils.toArray('.svc', root.current).forEach((sec, i) => {
        const media = sec.querySelector('.svc__media video');

        if (media) {
          gsap.fromTo(
            media,
            { rotateY: i % 2 ? -12 : 12, scale: 1.12 },
            {
              rotateY: 0,
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: sec,
                start: 'top bottom',
                end: 'center center',
                scrub: true,
              },
            }
          );
        }

        gsap.from(sec.querySelectorAll('.svc__copy > *'), {
          y: 35,
          opacity: 0,
          stagger: 0.06,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 75%',
          },
        });
      });
    },
    { scope: root }
  );

  useGSAP(
    () => {
      const copies = gsap.utils.toArray('.svc__copy', root.current);

      copies.forEach((copy, index) => {
        const expanded = Boolean(expandedItems[index]);

        const paragraphs = copy.querySelectorAll(
          '.svc__second-paragraph, .svc__extra-text'
        );

        paragraphs.forEach((paragraph) => {
          const isDesktopSecond =
            window.matchMedia('(min-width: 768px)').matches &&
            paragraph.classList.contains('svc__second-paragraph');

          if (isDesktopSecond) {
            gsap.set(paragraph, {
              clearProps: 'height,overflow,opacity,visibility',
            });
            return;
          }

          gsap.set(paragraph, {
            height: expanded ? 'auto' : 0,
            overflow: expanded ? 'visible' : 'hidden',
            opacity: expanded ? 1 : 0,
            visibility: expanded ? 'visible' : 'hidden',
          });
        });
      });
    },
    { scope: root, dependencies: [expandedItems] }
  );

  const toggleExpanded = (index, copy, button) => {
    const nextExpanded = !expandedItems[index];

    const paragraphs = Array.from(
      copy.querySelectorAll(
        '.svc__second-paragraph, .svc__extra-text'
      )
    ).filter((paragraph) => {
      return !(
        window.matchMedia('(min-width: 768px)').matches &&
        paragraph.classList.contains('svc__second-paragraph')
      );
    });

    paragraphs.forEach((paragraph) => {
      gsap.killTweensOf(paragraph);
    });

    paragraphs.forEach((paragraph) => {
      if (nextExpanded) {
        gsap.set(paragraph, {
          height: 'auto',
          overflow: 'hidden',
          opacity: 1,
          visibility: 'visible',
        });

        const fullHeight = paragraph.offsetHeight;

        gsap.fromTo(
          paragraph,
          { height: 0, opacity: 0 },
          {
            height: fullHeight,
            opacity: 1,
            duration: 0.65,
            ease: 'power2.inOut',
            onComplete: () => {
              gsap.set(paragraph, {
                height: 'auto',
                overflow: 'visible',
              });
            },
          }
        );
      } else {
        gsap.fromTo(
          paragraph,
          {
            height: paragraph.offsetHeight,
            opacity: 1,
            overflow: 'hidden',
            visibility: 'visible',
          },
          {
            height: 0,
            opacity: 0,
            duration: 0.45,
            ease: 'power2.inOut',
            onComplete: () => {
              gsap.set(paragraph, { visibility: 'hidden' });
            },
          }
        );
      }
    });

    button.textContent = nextExpanded
      ? 'Read Less −'
      : 'Read More +';

    button.setAttribute('aria-expanded', String(nextExpanded));

    setExpandedItems((previous) => ({
      ...previous,
      [index]: nextExpanded,
    }));
  };

  return (
    <div ref={root}>
      {services.map((s, i) => {
        const slug = slugifyService(s.title);
        const hasMobileExtra = s.paragraphs.length > 1;
        const hasDesktopExtra = s.paragraphs.length > 2;

        return (
          <Fragment key={s.title}>
            <section className={`svc ${i % 2 ? 'svc--reverse' : ''}`}>
              <div className="container svc__grid">
                <div className="svc__media">
                  <Link
                    href={`/services/${slug}`}
                    aria-label={`View ${s.title} service`}
                  >
                    <LazyVideo
                      src={s.video.preview}
                      poster={s.video.poster}
                    />
                  </Link>
                </div>

                <div
                  className={[
                    'svc__copy',
                    hasMobileExtra ? 'svc__copy--has-mobile-extra' : '',
                    hasDesktopExtra ? 'svc__copy--has-desktop-extra' : '',
                    expandedItems[i] ? 'is-expanded' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <p className="svc__num">
                    {String(i + 1).padStart(2, '0')} /{' '}
                    {String(services.length).padStart(2, '0')}
                  </p>

                  <h2 className="display h-md">
                    <Link href={`/services/${slug}`}>
                      {s.kicker}
                    </Link>
                  </h2>

                  <h3>
                    <Link href={`/services/${slug}`}>
                      {s.title}
                    </Link>
                  </h3>

                  <div className="svc__mobile-media">
                    <LazyVideo
                      src={s.video.preview}
                      poster={s.video.poster}
                    />
                  </div>

                  {s.paragraphs.map((paragraph, j) => (
                    <p
                      key={j}
                      className={
                        j >= 2
                          ? 'svc__extra-text'
                          : j === 1
                            ? 'svc__second-paragraph'
                            : undefined
                      }
                    >
                      {paragraph}
                    </p>
                  ))}

                  {s.paragraphs.length > 2 && (
                    <button
                      type="button"
                      className="svc__read-more"
                      aria-expanded={Boolean(expandedItems[i])}
                      onClick={(e) =>
                        toggleExpanded(
                          i,
                          e.currentTarget.closest('.svc__copy'),
                          e.currentTarget
                        )
                      }
                    >
                      {expandedItems[i] ? 'Read Less −' : 'Read More +'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {interludes[i] && <Banner {...interludes[i]} />}
          </Fragment>
        );
      })}
    </div>
  );
}
