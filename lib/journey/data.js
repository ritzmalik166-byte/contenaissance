/* =====================================================
   HOME PAGE CONTENT (the WebGL journey)
   Everything here comes from the existing site content
   (lib/user/content.js, lib/user/portfolio-content.js)
   and the media already in /public. Space imagery and the
   rocket model are credited in /public/textures/space/CREDITS.md.
===================================================== */

import { site, stages, services as serviceDetails, formats, testimonials, aiTools, stats, webExperiences } from '@/lib/user/content';
import { pfArchive, pfArchiveMore, SHOWREEL_SRC } from '@/lib/user/portfolio-content';

export { site, stats };

const DURATION = {
  mzha: 93, '01': 37, '03': 8, '09': 58, '12': 30, '10': 56, '04': 63, '07': 55, '08': 32, '02': 56, '13': 23, '14': 36, '15': 41, auto: 40,
  '3d-website-experience': 40, 'next-gen-stories': 66, 'interactive-product-flow': 60, 'webgl-interface': 81,
};
const fmt = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
const nameOf = (v) => v.src.split('/').pop().replace('.mp4', '');
const media = (name) => ({ preview: `/previews/${name}.mp4`, full: `/videos/${name}.mp4`, poster: `/posters/${name}.webp`, tex: `/posters/sm/${name}.webp`, duration: fmt(DURATION[name]) });
const slugify = (s = '') => s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const brand = { name: 'Contenaissance', tagline: site.tagline, logo: '/images/logo.png' };

export const nav = [
    { label: 'Home', href: '#home ' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services', href: '/services' },
  { label: 'Blog', href: '/blog' },
  // { label: 'Contact', href: '/contact' },
];

export const hero = {
  kicker: 'AI creative agency · Noida, India',
  title: ['Create', 'without', 'gravity.'],
  sub: 'AI Creative Agency in India for Cinematic Brand Films, Creative Advertising, AI-Powered Campaigns & Immersive Digital Experiences.',
  primary: { label: 'Explore', href: '#about' },
  secondary: { label: 'View our work', href: '#work' },
};

export const about = {
  kicker: 'A new creative frontier',
  title: ['Turning vision', 'into Reality.'],
  body: 'Contenaissance is where storytelling meets a new creative toolkit. We bring strategy, cinematic craft and generative AI together to make the impossible feel real, and the story feel unmistakably human.',
  pillars: ['Human-led', 'AI-powered', 'Story-first'],
  capabilities: ['AI Filmmaking', 'Brand Worlds', 'Campaigns', 'Digital Experiences', 'Visual Identity', 'Social Content'],
  quote: 'At Contenaissance, we blend human creativity and AI innovation to create extraordinary brand films, campaigns and digital experiences.',
};

export const reels = formats.map((f, i) => ({ index: i, title: f.title, category: f.sub, ...media(nameOf(f.video)) }));

const CAPS = [
  ['AI-driven 3D technology', 'Live action in virtual environments', 'Corporate presentations', 'Digital ads & social films'],
  ['Social media creatives', 'Website content', 'Digital campaigns', 'Performance-driven assets'],
  ['Predictive analytics', 'Performance marketing', 'AI audience targeting', 'Email marketing'],
  ['Logo architecture', 'Colour & typography systems', 'Brand guidelines', 'UI/UX components'],
  ['AI-powered advertisements', 'Social media campaigns', 'E-commerce creatives', 'Website visuals'],
  ['SEO & Google Ads', 'Social media management', 'Content marketing', 'Lead generation'],
];
// real planetary photographs, one world per service
// one real world per service (surface maps in lib/journey/cosmos.js WORLDS, same order)
const PLANETS = [{ name: 'Mars' }, { name: 'Neptune' }, { name: 'Jupiter' }, { name: 'Venus' }, { name: 'Saturn' }, { name: 'The Moon' }];
export const services = stages.map((s, i) => ({
  index: i,
  code: String(i + 1).padStart(2, '0'),
  title: s.title,
  heading: serviceDetails[i].title,
  body: serviceDetails[i].paragraphs[0],
  short: s.body,
  caps: CAPS[i],
  href: `/services/${slugify(serviceDetails[i].kicker)}`,
  planet: PLANETS[i],
}));

export const aiStages = stages.map((s) => ({ label: s.label.replace(/^STAGE/, 'Stage'), title: s.title, body: s.body }));

export const showreel = {
  title: ['The Contenaissance', 'Showreel.'],
  copy: 'A glimpse of the possible.',
  preview: '/previews/mzha.mp4',
  full: SHOWREEL_SRC,
  poster: '/posters/Mzha Nhi Aaya-02.1.webp',
  duration: fmt(DURATION.mzha),
};

const FORMAT_SUB = Object.fromEntries(formats.map((f) => [f.title, f.sub]));
export const projects = [
  ...[...pfArchive, ...pfArchiveMore].filter((a) => a.video).map((a) => ({ title: a.title, category: a.tag, body: FORMAT_SUB[a.title] || 'Motion / AI', name: nameOf(a.video) })),
  ...[webExperiences[0], webExperiences[5], webExperiences[3]].map((w) => ({ title: w.title, category: 'Digital experiences', body: w.sub, name: nameOf(w.video) })),
]
  .filter((p, i, arr) => arr.findIndex((q) => q.name === p.name) === i)
  .slice(0, 9)
  .map((p, i) => ({ ...p, index: i, code: String(i + 1).padStart(2, '0'), ...media(p.name) }));

const TOOL_NAME = {
  chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', copilot: 'Copilot', grok: 'Grok', pika: 'Pika', perplexity: 'Perplexity',
  deepSeek: 'DeepSeek', elevenlabs: 'ElevenLabs', 'kling-ai': 'Kling AI', 'meta-ai': 'Meta AI', midjourney: 'Midjourney', runway: 'Runway', suno: 'Suno',
};
export const tools = aiTools.map((id) => ({ id, name: TOOL_NAME[id] || id, logo: `/images/${id}.png` }));

export const clients = testimonials.map((t, i) => ({ index: i, company: t.company, role: t.role, quote: t.quote }));

export const cta = { title: ['What’s your', 'next big story?'], body: 'Bring the spark. We’ll help you find a world it can live in.', button: 'Initiate a project', href: '/contact' };

export const footerNav = [
  { label: 'Home', href: '/' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services', href: '/services' },
  { label: 'Blog', href: '/blog' },
  { label: 'Career', href: '/career' },
];
