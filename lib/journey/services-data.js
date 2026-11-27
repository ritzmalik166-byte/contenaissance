/* =====================================================
   SERVICES PAGE CONTENT (the services WebGL journey)
   Six services, six worlds of one solar system. The order
   here is the order the camera visits them, and matches
   SYSTEM in lib/journey/services-system.js.
===================================================== */

import { services as serviceDetails } from '@/lib/user/content';

const slugify = (s = '') =>
  s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// detail pages live at /services/[slug], slug = slugified kicker (see app/(user)/services/[slug]/page.js)
const hrefOf = (i) => `/services/${slugify(serviceDetails[i]?.kicker || '')}`;

export const intro = {
  kicker: ['Services', 'Six worlds · One universe'],
  title: ['A Universe of', 'Creative', 'Possibilities.'],
  sub: 'From AI-powered films to immersive brand experiences, discover the creative worlds we bring to life.',
  cta: 'Explore the six worlds',
};

export const worlds = [
  {
    planet: 'Mars',
    stage: 'S1 / Booster',
    title: 'AI Brand Films',
    tagline: ['Stories That Feel Real.', 'Worlds Beyond Imagination.'],
    body: 'We craft AI-powered brand films that pair cinematic storytelling with generative technology, so your brand gets a story built for the big screen without big-screen limits.',
    caps: [
      { title: 'AI-Powered Brand Films', body: 'Cinematic films that blend live action with AI-built worlds, made for launches, campaigns and brand moments.' },
      { title: 'Generative AI Storytelling', body: 'Narratives shaped with generative tools, from first treatment to final frame, without losing the human idea at the centre.' },
      { title: 'Interactive Brand Experiences', body: 'Stories your audience can step into: interactive films and immersive pieces that turn viewers into participants.' },
      { title: 'AI Cinematic Marketing', body: 'Corporate presentations, digital ads and social films with a cinematic finish, cut for every channel they run on.' },
    ],
    show: 'film',
  },
  {
    planet: 'Neptune',
    stage: 'S2 / Stage',
    title: 'Digital-First Content',
    tagline: ['Made for the Scroll.', 'Built to Make an Impact.'],
    body: 'We create platform-native, AI-powered content designed to stop the scroll, spark conversations, and connect brands with audiences across today’s digital landscape.',
    caps: [
      { title: 'Platform-Specific Content', body: 'Reels, feeds, stories and shorts, each built for the platform’s format, rhythm and audience behaviour.' },
      { title: 'AI-Driven Content Creation', body: 'Generative production that keeps a steady flow of on-brand visuals and video moving without slowing the team down.' },
      { title: 'Contextually Relevant Content', body: 'Content tuned to moments, trends and cultural context, so it lands while the conversation is still happening.' },
      { title: 'Performance Optimization with AI Analytics', body: 'Engagement and audience data feed every new round, so the content keeps getting sharper over time.' },
    ],
    show: 'phones',
  },
  {
    planet: 'Jupiter',
    stage: 'S3 / Stage',
    title: 'AI-Powered Campaigns',
    tagline: ['Creative Intelligence.', 'Measurable Impact.'],
    body: 'We blend AI-powered creativity, audience intelligence, and performance-driven strategies to build smarter campaigns that connect with the right people and deliver meaningful results.',
    caps: [
      { title: 'Maximize Marketing Impact', body: 'Creative and media planned together, so every rupee of spend works harder across the channels that matter.' },
      { title: 'Data-Driven Decisions', body: 'Predictive analytics and audience insight guide what we make, who sees it and when.' },
      { title: 'Market Analysis & Optimization', body: 'We read behaviour, competition and campaign signals continuously, and optimise while the campaign is live.' },
      { title: 'Scalable AI Campaigns', body: 'Variants generated, tested and scaled quickly, from one market to many, without losing the brand’s voice.' },
    ],
    show: 'campaign',
  },
  {
    planet: 'Venus',
    stage: 'S4 / Payload',
    title: 'Visual Identity Systems',
    tagline: ['More Than a Look.', 'A Language of Your Own.'],
    body: 'We build distinctive identity systems, from AI-driven branding frameworks to custom design systems, so every touchpoint speaks the same visual language.',
    caps: [
      { title: 'AI-Driven Branding Frameworks', body: 'Scalable brand frameworks that define how your brand looks and behaves, today and as it grows.' },
      { title: 'Custom Design Systems', body: 'Logo architecture, colour, typography and iconography assembled into one system your teams can use.' },
      { title: 'Visual Identity Solutions', body: 'Logotypes, palettes, typographic hierarchies, packaging imagery and brand collateral that stay consistent everywhere.' },
      { title: 'UI/UX & Interactive Assets', body: 'Interface components, motion graphics and interactive assets that carry the identity into digital products.' },
    ],
    show: 'identity',
  },
  {
    planet: 'Saturn',
    stage: 'S5 / Module',
    title: 'AI Creative Services',
    tagline: ['Generative Craft for', 'Every Touchpoint.'],
    body: 'We create engaging social media creatives, website visuals, digital campaigns, branded content and marketing assets that connect brands with their target audiences.',
    caps: [
      { title: 'AI-Powered Advertisements', body: 'Ad creatives produced with generative tools and finished by designers, ready for every placement and size.' },
      { title: 'Social Media Campaigns', body: 'Campaign worlds for social: hero assets, cut-downs and always-on content that feel like one story.' },
      { title: 'E-commerce Creatives', body: 'Product visuals, lifestyle scenes and catalogue imagery generated at scale and polished to sell.' },
      { title: 'Website Visuals', body: 'Hero imagery, motion and visual content that make a website feel alive and on-brand.' },
    ],
    show: 'creative',
  },
  {
    planet: 'Earth',
    planetSub: 'Night side',
    stage: 'S6 / Network',
    title: 'Digital Marketing Services',
    tagline: ['Reach the Right Orbit.', 'Grow With Every Signal.'],
    body: 'From search and paid media to social and performance marketing, we connect creative work to the channels where your audience already spends its time.',
    caps: [
      { title: 'SEO & Search Visibility', body: 'Technical SEO, content and authority building that help the right people find you on search and AI answers.' },
      { title: 'Paid Media · Meta & Google', body: 'Search, social and display campaigns planned, launched and optimised for qualified leads and return on spend.' },
      { title: 'Social Media Marketing', body: 'Social management, content calendars and community building that keep your brand present and talked about.' },
      { title: 'Performance Analytics', body: 'Clear reporting on what is working, with the insight to move budget and creative where results are.' },
    ],
    show: 'network',
  },
].map((w, i) => ({ ...w, index: i, code: String(i + 1).padStart(2, '0'), href: hrefOf(i) }));

export const process = {
  kicker: 'Mission plan · Our creative process',
  title: ['From Imagination', 'to Launch.'],
  body: 'Every project runs as a five-stage mission. You always know which stage we’re in, what’s next, and when we’re ready for lift-off.',
  steps: [
    { title: 'Discover', body: 'We study your brand, audience and goals to find the story worth telling.' },
    { title: 'Imagine', body: 'Concepts, worlds and treatments take shape around one clear idea.' },
    { title: 'Create', body: 'Human craft and AI tools build the films, visuals and assets.' },
    { title: 'Refine', body: 'We review, iterate and polish until every frame earns its place.' },
    { title: 'Launch', body: 'The work goes live across the platforms that matter to you.' },
  ],
};

export const finale = {
  kicker: 'Open a new flight plan',
  title: 'Have a Vision?',
  accent: 'Let’s Take It Beyond the Ordinary.',
  button: 'Start your mission',
  href: '/contact',
};

// showcase media (all already in /public)
export const media = {
  film: [
    { preview: '/previews/mzha.mp4', full: '/videos/mzha.mp4', poster: '/posters/mzha.webp' },
    { poster: '/posters/01.webp' },
    { poster: '/posters/03.webp' },
  ],
  phones: [
    { preview: '/previews/14.mp4', poster: '/posters/14.webp', label: 'Feed · 4:5', caption: 'Every year, they wait for…' },
    { preview: '/previews/12.mp4', poster: '/posters/12.webp', label: 'Story · 9:16' },
    { preview: '/previews/15.mp4', poster: '/posters/15.webp', label: 'Reel · 9:16' },
  ],
  campaign: ['/images/campaign-variant-a.jpg', '/images/campaign-variant-b.jpg', '/images/campaign-variant-c.jpg'],
  identity: '/images/identity-application.jpg',
  creative: ['/posters/10.webp', '/posters/09.webp'],
};
