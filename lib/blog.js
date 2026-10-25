import raw from './blog.json';

const topicRules = [
  { id: 'ai', label: 'AI Films', test: /\bAI\b|brand film/i },
  { id: 'real-estate', label: 'Real Estate', test: /real estate/i },
  { id: 'agency', label: 'Creative Agency', test: /agency|studio/i },
  { id: 'ncr', label: 'Delhi NCR', test: /delhi|noida|ncr/i },
];

export const topics = topicRules.map(({ id, label }) => ({ id, label }));

export const posts = raw.map((p) => {
  const seen = new Set();
  const toc = p.toc.filter((t) => !seen.has(t.id) && seen.add(t.id));
  const text = `${p.title} ${p.slug}`;
  return {
    ...p,
    toc,
    topics: topicRules.filter((r) => r.test.test(text)).map((r) => r.id),
  };
});

export const getPost = (slug) => posts.find((p) => p.slug === slug);

export const getNeighbours = (slug) => {
  const i = posts.findIndex((p) => p.slug === slug);
  const next = posts[(i + 1) % posts.length];
  const related = posts
    .filter((p) => p.slug !== slug && p.slug !== next.slug)
    .map((p) => ({ p, score: p.topics.filter((t) => posts[i].topics.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ p }) => p);
  return { next, related };
};
