'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap, Flip, useGSAP } from '@/lib/gsap';
import { ArrowUpRight } from '../Icons';

export default function BlogIndex({ posts = [], topics = [] }) {
  const root = useRef(null);
  const gridRef = useRef(null);
  const pendingScroll = useRef(false);
  const preview = useRef(null);
  const flipState = useRef(null);
  const [topic, setTopic] = useState('all');
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState(-1);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const featured = posts?.[0] || null;
  const rest = useMemo(() => (posts && posts.length > 1 ? posts.slice(1) : []), [posts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return new Set(
      rest
        .filter((p) => {
          const pTopics = p.topics || [];
          const matchTopic = topic === 'all' || pTopics.includes(topic);
          const matchQuery = !q || `${p.title || ''} ${p.excerpt || ''}`.toLowerCase().includes(q);
          return matchTopic && matchQuery;
        })
        .map((p) => p.slug)
    );
  }, [rest, topic, query]);

  const filteredPosts = useMemo(
    () => rest.filter((p) => visible.has(p.slug)),
    [rest, visible]
  );

  const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);

  const currentPage = Math.min(page, Math.max(1, totalPages));

  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    if (!pendingScroll.current) return;

    pendingScroll.current = false;

    const grid = gridRef.current;
    if (!grid) return;

    const top =
      grid.getBoundingClientRect().top + window.scrollY - 24;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [topic, query]);

  const update = (fn) => {
    if (!root.current) {
      fn();
      return;
    }
    const rows = root.current.querySelectorAll('.jrow');
    if (rows.length > 0) {
      flipState.current = Flip.getState(rows);
    }
    fn();
  };

  useLayoutEffect(() => {
    if (!flipState.current) return;
    Flip.from(flipState.current, {
      duration: 0.7,
      ease: 'power3.inOut',
      absolute: true,
      stagger: 0.02,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, y: -20, duration: 0.4 }),
    });
    flipState.current = null;
  }, [visible]);

  useGSAP(
    (ctx, contextSafe) => {
      if (featured) {
        gsap
          .timeline({ scrollTrigger: { trigger: '.jfeat', start: 'top 80%' } })
          .from('.jfeat__copy > *', { y: 50, opacity: 0, duration: 1, stagger: 0.08, ease: 'power3.out' }, 0.3);
      }

      if (rest.length > 0) {
        gsap.from('.jrow', {
          y: 80,
          opacity: 0,
          rotateX: -30,
          transformOrigin: '50% 0%',
          duration: 1,
          ease: 'power3.out',
          stagger: 0.05,
          scrollTrigger: { trigger: '.jlist', start: 'top 85%' },
        });
      }

      // if (isTouch() || !preview.current) return;
      // const el = preview.current;
      // const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
      // const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
      // const rTo = gsap.quickTo(el, 'rotate', { duration: 0.9, ease: 'power3.out' });
      // let lastX = 0;
      // const move = contextSafe((e) => {
      //   xTo(e.clientX);
      //   yTo(e.clientY);
      //   rTo(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.6));
      //   lastX = e.clientX;
      // });
      // window.addEventListener('pointermove', move);
      // return () => window.removeEventListener('pointermove', move);
    },
    { scope: root }
  );

  // useGSAP(() => {
  //   if (isTouch() || !preview.current) return;
  //   gsap.to(preview.current, {
  //     scale: hovered >= 0 ? 1 : 0,
  //     opacity: hovered >= 0 ? 1 : 0,
  //     duration: 0.5,
  //     ease: hovered >= 0 ? 'back.out(1.6)' : 'power3.out',
  //     overwrite: 'auto',
  //   });
  // }, [hovered]);

  if (!featured) {
    return (
      <section ref={root} className="journal">
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <p className="lead" style={{ opacity: 0.7 }}>
            No journal articles found at the moment. Please check back later.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} className="journal">
      <div className="container">

        <div className="journal__hero">
          <span className="journal__eyebrow">Insights &amp; Stories</span>

          <h1>Contenaissance <span>Journal</span></h1>

          <p>
            Where AI, creativity, and cinematic storytelling
            shape the future of digital innovation.
          </p>
        </div>

        {/* <Link href={`/blog/${featured.slug}`} className="jfeat" data-cursor="Read"> */}
        <Link href={`/blog/${featured.slug}`} className="jfeat">
          <div className="jfeat__media" data-reveal="media">
            <img src={featured.image || '/images/logo.png'} alt={featured.title || ''} data-parallax="6" />
          </div>
          <div className="jfeat__copy">
            <h2 className="kicker">Latest Article</h2>
            <p className="jmeta">
              <span>{featured.date}</span>
              <span>{featured.author || 'Contenaissance Team'}</span>
              <span>{featured.readTime || '5 min'} read</span>
            </p>
            <h3 className="display h-md">{featured.title}</h3>
            <p className="lead">{featured.excerpt}</p>
            <span className="btn btn--light">
              Read article <ArrowUpRight />
            </span>
          </div>
        </Link>

        <div className="jbar">
          <div className="jchips" role="tablist" aria-label="Filter articles">
            {[{ id: 'all', label: 'All' }, ...(topics || [])].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={topic === t.id}
                className={`jchip${topic === t.id ? ' is-active' : ''}`}
                onClick={() => update(() => setTopic(t.id))}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="jsearch">
            <span className="mono">Search</span>
            <input
              type="search"
              value={query}
              placeholder="Real estate, AI films…"
              onChange={(e) => {
                const val = e.target.value;
                update(() => setQuery(val));
              }}
            />
            <span className="jcount">{String(visible.size).padStart(2, '0')}</span>
          </label>
        </div>

        {/* <div className="jlist" onPointerLeave={() => setHovered(-1)}> */}

        <div className="jgrid" ref={gridRef}>
          {paginatedPosts.map((p, i) => {
            const categoryId = p.topics?.[0];
            const category =
              topics.find((t) => t.id === categoryId)?.label ||
              categoryId ||
              'Insights';

            return (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className={`jcard${visible.has(p.slug) ? '' : ' is-hidden'}`}
              >
                <div className="jcard__media">
                  <img
                    src={p.image || '/images/logo.png'}
                    alt={p.title || ''}
                    loading="lazy"
                  />
                </div>

                <div className="jcard__body">
                  <div className="jcard__meta">
                    <span className="jcard__category">{category}</span>
                    <span className="jcard__date">{p.date}</span>
                  </div>

                  <h3 className="jcard__title">{p.title}</h3>

                  <p className="jcard__excerpt">
                    {p.excerpt || 'Explore this article for insights, ideas, and practical guidance.'}
                  </p>

                  <div className="jcard__footer">
                    <span>READ ARTICLE</span>
                    <span className="jcard__arrow">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {visible.size === 0 && rest.length > 0 && (
            <p className="jempty">
              No articles match that search — try another keyword.
            </p>
          )}
        </div>


        {totalPages > 1 && (
          <nav className="jpagination" aria-label="Blog pagination">
            <button
              type="button"
              className="jpagination__arrow"
              disabled={currentPage === 1}
              onClick={() => {
                if (currentPage === 1) return;
                pendingScroll.current = true;
                setPage(currentPage - 1);
              }}
            >
              ← Previous
            </button>

            <div className="jpagination__pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`jpagination__number${currentPage === n ? ' is-active' : ''
                    }`}
                  aria-current={currentPage === n ? 'page' : undefined}
                  onClick={() => {
                    if (currentPage === n) return;
                    pendingScroll.current = true;
                    setPage(n);
                  }}
                >
                  {String(n).padStart(2, '0')}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="jpagination__arrow"
              disabled={currentPage === totalPages}
              onClick={() => {
                if (currentPage === totalPages) return;
                pendingScroll.current = true;
                setPage(currentPage + 1);
              }}
            >
              Next →
            </button>
          </nav>
        )}

      </div>

      {/* <div ref={preview} className="jpreview" aria-hidden="true">
        {rest.map((p, i) => (
          <img
            key={p.slug}
            src={p.image || '/images/logo.png'}
            alt=""
            loading="lazy"
            className={i === hovered ? 'is-on' : ''}
          />
        ))}
      </div> */}
    </section>
  );
}
