
'use client';

import { Fragment, useRef, useState } from 'react';
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
          // Desktop keeps the second paragraph visible.
          const isDesktopSecond =
            window.matchMedia('(min-width: 768px)').matches &&
            paragraph.classList.contains('svc__second-paragraph');

          if (isDesktopSecond) {
            gsap.set(paragraph, {
              clearProps: 'height,overflow,opacity,visibility',
            });
            return;
          }

          if (expanded) {
            gsap.set(paragraph, {
              height: 'auto',
              overflow: 'visible',
              opacity: 1,
              visibility: 'visible',
            });
          } else {
            gsap.set(paragraph, {
              height: 0,
              overflow: 'hidden',
              opacity: 0,
              visibility: 'hidden',
            });
          }
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
      const isDesktopSecond =
        window.matchMedia('(min-width: 768px)').matches &&
        paragraph.classList.contains('svc__second-paragraph');

      return !isDesktopSecond;
    });

    // Stop an in-progress animation before reversing direction.
    paragraphs.forEach((paragraph) => {
      gsap.killTweensOf(paragraph);
    });

    if (nextExpanded) {
      paragraphs.forEach((paragraph) => {
        gsap.set(paragraph, {
          height: 'auto',
          overflow: 'hidden',
          opacity: 1,
          visibility: 'visible',
        });

        const fullHeight = paragraph.offsetHeight;

        gsap.fromTo(
          paragraph,
          {
            height: 0,
            opacity: 0,
          },
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
      });
    } else {
      paragraphs.forEach((paragraph) => {
        const currentHeight = paragraph.offsetHeight;

        gsap.fromTo(
          paragraph,
          {
            height: currentHeight,
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
              gsap.set(paragraph, {
                visibility: 'hidden',
              });
            },
          }
        );
      });
    }

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
        const hasMobileExtra = s.paragraphs.length > 1;
        const hasDesktopExtra = s.paragraphs.length > 2;

        return (
          <Fragment key={s.title}>
            <section
              className={`svc ${i % 2 ? 'svc--reverse' : ''}`}
            >
              <div className="container svc__grid">
                {/* Desktop video */}
                <div className="svc__media">
                  <LazyVideo
                    src={s.video.preview}
                    poster={s.video.poster}
                  />
                </div>

                <div
                  className={[
                    'svc__copy',
                    hasMobileExtra
                      ? 'svc__copy--has-mobile-extra'
                      : '',
                    hasDesktopExtra
                      ? 'svc__copy--has-desktop-extra'
                      : '',
                    expandedItems[i] ? 'is-expanded' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <p className="svc__num">
                    {String(i + 1).padStart(2, '0')} / 04
                  </p>

                  <h2 className="display h-md">{s.kicker}</h2>

                  <h3>{s.title}</h3>

                  {/* Mobile video */}
                  <div className="svc__mobile-media">
                    <LazyVideo
                      src={s.video.preview}
                      poster={s.video.poster}
                    />
                  </div>

                  {/* Service paragraphs */}
                  {s.paragraphs.map((p, j) => (
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
                      {p}
                    </p>
                  ))}

                  {/* Read More / Read Less */}
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
                      {expandedItems[i]
                        ? 'Read Less −'
                        : 'Read More +'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {interludes[i] && (
              <Banner {...interludes[i]} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
