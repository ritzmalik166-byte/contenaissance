import { v } from './content';

/* =====================================================
   Portfolio page content (Figma: design/portfolio/*.png).
   Copy is kept verbatim from the design. Media reuses the
   videos/posters already in /public.
===================================================== */

// Same showreel as the homepage (components/home/Showreel.jsx); falls
// back to the local cut when the assets CDN isn't configured.
export const SHOWREEL_SRC = process.env.NEXT_PUBLIC_ASSETS_URL
  ? `${process.env.NEXT_PUBLIC_ASSETS_URL}/Mzha%20Nhi%20Aaya-02.1.mp4`
  : '/videos/mzha.mp4';

export const pfHero = {
  crumb: 'Home / Portfolio',
  title: 'Stories beyond the ordinary.',
  text: 'A window into our creative universe. Film, form and feeling — explored through AI.',
  // Images riding the hero orbit (rendered in WebGL, see heroSet.js).
  cards: [
    { id: 'hero-1', title: 'Brand Films', image: '/posters/01.webp', video: v('01') },
    { id: 'hero-2', title: 'Social Reels', image: '/posters/auto.webp', video: v('auto') },
    { id: 'hero-3', title: 'Commercials', image: '/posters/03.webp', video: v('03') },
    { id: 'hero-4', title: 'Music Videos', image: '/posters/12.webp', video: v('12') },
  ],
};

// Archive filter categories (the hero bar shows the first four).
export const pfCategories = [
  { id: 'brand', label: 'Brand Films' },
  { id: 'commercial', label: 'Commercials' },
  { id: 'music', label: 'Music Videos' },
  { id: 'social', label: 'Social Reels' },
  { id: 'concept', label: 'Concept Imagery' },
];

/* `layout` places a card in the Figma bento (see portfolio.css):
   wide / tall / tall-left / feature / full / half. */
export const pfArchive = [
  { id: 'a1', title: 'Brand Films', cat: 'brand', tag: 'Motion / AI', layout: 'wide', video: v('01') },
  { id: 'a2', title: 'Social Reels', cat: 'social', tag: 'Motion / AI', layout: 'tall', video: v('auto') },
  { id: 'a3', title: 'Concept Imagery', cat: 'concept', tag: 'Motion / AI', layout: 'tall-left', image: '/images/identity-application.jpg' },
  { id: 'a4', title: 'Commercials', cat: 'commercial', tag: 'Motion / AI', layout: 'feature', video: v('03'), featured: true },
  { id: 'a5', title: 'Music Videos', cat: 'music', tag: 'Archive / Sound', tagRight: 'Motion / AI', layout: 'full', video: v('12') },
  { id: 'a6', title: 'Commercials', cat: 'commercial', tag: 'Motion / AI', layout: 'half', video: v('13') },
];

// Revealed by "Load more".
export const pfArchiveMore = [
  { id: 'm1', title: 'Brand Films', cat: 'brand', tag: 'Motion / AI', video: v('10') },
  { id: 'm2', title: 'Social Reels', cat: 'social', tag: 'Motion / AI', video: v('09') },
  { id: 'm3', title: 'Commercials', cat: 'commercial', tag: 'Motion / AI', video: v('14') },
  { id: 'm4', title: 'Music Videos', cat: 'music', tag: 'Archive / Sound', video: v('15') },
  { id: 'm5', title: 'Concept Imagery', cat: 'concept', tag: 'Motion / AI', image: '/images/campaign-variant-a.jpg' },
  { id: 'm6', title: 'Concept Imagery', cat: 'concept', tag: 'Motion / AI', image: '/images/campaign-variant-c.jpg' },
];

export const pfMarquee = {
  solid: ['Brand Films', 'Commercials', 'Music Videos', 'Social Reels'],
  outline: ['Concept Imagery', 'Motion', 'AI Campaigns', 'Visual Identity'],
};

export const pfStages = {
  kicker: '03 / Our AI Stages',
  title: ['Our AI Stages.', 'One Launch.'],
  text: 'Each Stage Of The Rocket Is One Of Our AI Services. Use One Stage, Or Fire All Four Together.',
  items: [
    { id: 'S1', label: 'Stage 01 · Booster', title: 'AI Brand Films', href: '/services#service-detail-1' },
    { id: 'S2', label: 'Stage 02', title: 'Digital-First Content', href: '/services#service-detail-2' },
    { id: 'S3', label: 'Stage 03', title: 'AI-Powered Campaigns', href: '/services#service-detail-3' },
    { id: 'S4', label: 'Stage 04', title: 'Visual Identity Systems', href: '/services#service-detail-4' },
  ],
};

export const pfQuote = {
  kicker: '04 / A note from the studio',
  text: 'The most interesting thing about AI isn’t what it can generate. It’s what it allows us to imagine together.',
  name: 'Contenaissance',
  role: 'Our creative point of view',
};

export const pfCta = {
  kicker: '10 / Open a new flight plan',
  title: ['What’s your', 'next big story?'],
  button: 'Let’s make it happen',
  href: '/contact',
  text: 'Bring the spark. We’ll help you find a world it can live in.',
};
