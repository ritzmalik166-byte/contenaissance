/* =====================================================
   PORTFOLIO PAGE CONTENT (the portfolio WebGL journey)
   Chapter 03 · The Missions — every project is a "mission"
   with a CT code. Media is the studio's own work already in
   /public (videos, previews, posters).

   NOTE: titles and one-line summaries are WORKING COPY,
   written from what each piece shows. Replace them with the
   final client / case-study names when they are cleared.
   Codes are the archive index: CT-01 is the most recent.
===================================================== */

const media = (name) => ({ preview: `/previews/${name}.mp4`, full: `/videos/${name}.mp4`, poster: `/posters/${name}.webp` });
const still = (src) => ({ poster: src });

export const CATEGORIES = [
  { id: 'brand', label: 'AI Brand Films', one: 'AI brand film' },
  { id: 'campaign', label: 'Creative Campaigns', one: 'Creative campaign' },
  { id: 'content', label: 'Digital Content', one: 'Digital content' },
  { id: 'identity', label: 'Visual Identity', one: 'Visual identity' },
  { id: 'experience', label: 'AI Experiences', one: 'AI experience' },
];
const ONE = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.one]));

// size = the tile's height in the archive grid (tall / mid)
const RAW = [
  { title: 'Mzha Nhi Aaya', cat: 'brand', ...media('mzha'), summary: 'A cinematic AI film built shot by shot: real-world grit, generative worlds and a story cut to the beat.' },
  { title: 'Festival of Lights', cat: 'campaign', ...media('14'), summary: 'A festive campaign led by animated characters, made to feel handcrafted and travel across every platform.' },
  { title: 'Digital Dhamaal', cat: 'content', ...media('next-gen-stories'), summary: 'AI, 3D and CGI combined into a bold, scroll-stopping series built for social first.' },
  { title: 'Beauty in Detail', cat: 'brand', ...media('01'), size: 'tall', summary: 'Macro beauty storytelling: skin, light and texture rendered with a premium, tactile finish.' },
  { title: 'Golden Hour Shot Study', cat: 'experience', ...media('03'), size: 'mid', summary: 'One character, one look, many lenses: an AI shot-language study across close, mid and wide frames.' },
  { title: 'Temple Flame', cat: 'brand', ...media('10'), size: 'mid', summary: 'A heritage film lit by fire and stone, where tradition meets generative craft.' },
  { title: 'Eye of the Storm', cat: 'content', ...media('12'), size: 'tall', summary: 'Weather as spectacle: a swirling, high-drama visual made for vertical screens.' },
  { title: 'Ancient Roots', cat: 'brand', ...media('04'), size: 'tall', summary: 'An illustrated world of forest temples and old stories, animated with AI.' },
  { title: 'Human × Machine', cat: 'identity', ...still('/images/identity-application.jpg'), size: 'mid', summary: 'An identity world exploring the meeting point of human touch and machine intelligence.' },
  { title: 'The Island Giant', cat: 'content', ...media('15'), size: 'mid', summary: 'A myth-scale creature reveal designed to stop the scroll in the first second.' },
  { title: 'Cosmic Genesis', cat: 'experience', ...media('09'), size: 'tall', summary: 'Particles, light and space: a generative piece about how every idea begins.' },
  { title: 'The Emerald Promise', cat: 'campaign', ...media('02'), size: 'mid', summary: 'A jewellery story told in close-ups, with a quiet, luxurious pace.' },
  { title: 'Every Move Matters', cat: 'experience', ...media('3d-website-experience'), size: 'mid', summary: 'An immersive 3D web hero where each scroll is a move on the board.' },
  { title: 'Noir', cat: 'brand', ...media('08'), size: 'tall', summary: 'A moody, high-contrast fashion film with texture you can almost feel.' },
  { title: 'A Way Ahead', cat: 'campaign', ...media('auto'), size: 'mid', summary: 'A playful brand spot that turns an everyday ride into a statement.' },
  { title: 'Into the Deep', cat: 'campaign', ...still('/images/campaign-variant-a.jpg'), size: 'tall', summary: 'Campaign key visual exploring weightlessness, light and water.' },
  { title: 'Marigold', cat: 'content', ...media('13'), size: 'mid', summary: 'Colour, ritual and celebration, packed into a short-form social cut.' },
  { title: 'Orbit Interface', cat: 'experience', ...media('webgl-interface'), size: 'tall', summary: 'A depth-rich WebGL interface where the brand mark becomes a living orbit.' },
  { title: 'Amber Noir', cat: 'identity', ...still('/images/campaign-variant-c.jpg'), size: 'mid', summary: 'Product imagery with a signature amber-and-gold look, built as a reusable visual system.' },
  { title: 'Night Plot Reveal', cat: 'campaign', ...media('07'), size: 'mid', summary: 'A real-estate launch film that lights up the site, plot by plot, after dark.' },
  { title: 'Desert Rhythm', cat: 'content', ...media('motion-website-reel'), size: 'tall', summary: 'Folk music and animation meet in a warm, rhythmic motion reel.' },
  { title: 'The Blueprint', cat: 'identity', ...media('ai-visual-showcase'), size: 'mid', summary: 'From blueprint to skyline: an architectural visual language for a property brand.' },
];

export const missions = RAW.map((m, i) => ({
  ...m,
  index: i,
  code: `CT-${String(i + 1).padStart(2, '0')}`,
  category: ONE[m.cat],
  size: m.size || 'mid',
}));

export const featured = missions.slice(0, 3);
export const archive = missions.slice(3);
export const nextCode = `CT-${String(missions.length + 1).padStart(2, '0')}`;

export const hero = {
  kicker: ['Portfolio', 'Chapter 03 · The Missions'],
  title: 'Our Work.',
  accent: 'Beyond Imagination.',
  sub: 'Explore cinematic stories, AI-powered campaigns, and creative experiences built for tomorrow.',
  // RA / Dec of the Orion Nebula: the archive's "home" in the sky
  coords: 'RA 05h 35m 17s · DEC −05° 23′ 28″',
};

// constellations in the hero (hero-view units, see lib/journey/portfolio-space.js)
export const constellations = [
  { code: 'CT-01', label: 'Brand films', at: [-100, 48], pts: [[0, 14], [-26, 2], [-14, -30], [16, -34], [30, -8], [0, 14]] },
  { code: 'CT-02', label: 'Campaigns', at: [104, 52], pts: [[0, 12], [-30, 18], [-12, -6], [14, -40]] },
  // label: which side of the first star the label sits on
  { code: 'CT-03', label: 'Digital content', at: [132, -2], align: 'left', pts: [[0, 0], [12, 14], [26, 6], [34, 24]] },
];

export const archiveCopy = {
  kicker: '02 / Mission archive',
  title: ['Navigate the', 'Mission Archive.'],
  body: 'Filter by world. Every mission is plotted with its own code and coordinates.',
};

export const finale = {
  kicker: `Mission ${nextCode} · Awaiting launch`,
  title: ['Your Brand Could Be', 'Our Next Great Mission.'],
  button: 'Let’s collaborate',
  href: '/contact',
};
