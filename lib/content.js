export const site = {
  name: 'Contenaissance',
  tagline: 'Ritz GenAI Storytelling Studios',
  email: 'info@ritzmediaworld.com',
  phone: '+91-9220516777',
  phoneHref: 'tel:+919220516777',
  address:
    'Unit No. 404, 4th Floor, Corporate Park Tower A1, Sector 142, Noida, Uttar Pradesh 201305, India',
  social: {
    instagram: 'https://www.instagram.com/contenaissance/',
    linkedin: 'https://www.linkedin.com/company/contenaissance/',
  },
};

export const nav = [
  { label: 'Work', href: '/portfolio' },
  { label: 'Story', href: '/#about' },
  { label: 'Our Approach', href: '/services' },
  { label: 'Journal', href: '/blog' },
];

export const v = (name) => ({
  src: `/videos/${name}.mp4`,
  preview: `/videos/preview/${name}.mp4`,
  poster: `/posters/${name}.jpg`,
});

export const stages = [
  {
    id: 'S1',
    label: 'Stage 01 · Booster',
    title: 'AI Brand Films',
    icon: 'camera',
    body: 'Discover how to turn your brand story into a cinematic experience via AI-driven 3D technology. We use generative AI to make brand films with dynamic live action in a synthetic environment that boosts your brand and captures imagination!',
  },
  {
    id: 'S2',
    label: 'Stage 02',
    title: 'Digital-First Content',
    icon: 'play',
    body: 'Create high-performing AI-generated content for social media, advertising, reels, digital campaigns, branded storytelling, audience engagement, and multi-platform brand experiences across modern digital ecosystems.',
  },
  {
    id: 'S3',
    label: 'Stage 03',
    title: 'AI-Powered Campaigns',
    icon: 'target',
    body: 'Enhance marketing campaigns with AI-driven creative strategy, automated content production, audience targeting, and performance-focused digital advertising.',
  },
  {
    id: 'S4',
    label: 'Stage 04',
    title: 'Visual Identity Systems',
    icon: 'star',
    body: "Create your brand's AI-driven visual identity system. We design brand frameworks that are memorable and scalable and apply the necessary look and feel to brand touchpoints in an AI-enabled world.",
  },
];

export const capabilities = ['AI Filmmaking', 'Brand Worlds', 'Campaigns', 'Digital Experiences'];

export const formats = [
  { title: 'Brand Films', sub: 'Cinematic storytelling', video: v('01') },
  { title: 'Commercials', sub: 'Ad campaigns that convert', video: v('03') },
  { title: 'Social Content', sub: 'Viral-worthy reels', video: v('09') },
  { title: 'Music Videos', sub: 'Visual rhythms', video: v('mzha') },
  { title: 'Documentary', sub: 'Stories that matter', video: v('10') },
];

export const archive = [
  { title: 'Brand Films', tag: 'Motion / AI', video: v('01'), size: 'tall' },
  { title: 'Commercials', tag: 'Motion / AI', video: v('03'), size: 'short' },
  { title: 'Music Videos', tag: 'Archive / Sound', video: v('mzha'), size: 'short' },
  { title: 'Social Reels', tag: 'Motion / AI', video: v('09'), size: 'tall' },
];

export const webExperiences = [
  { title: '3D Website Experience', sub: 'Immersive hero motion', video: v('12') },
  { title: 'Interactive Product Flow', sub: 'Scroll-driven visuals', video: v('13') },
  { title: 'Cinematic Landing Page', sub: 'Premium web storytelling', video: v('14') },
  { title: 'WebGL Interface', sub: 'Depth-rich interaction', video: v('15') },
  { title: 'Motion Website Reel', sub: 'Animated brand systems', video: v('auto') },
  { title: 'AI Visual Showcase', sub: 'Reel-ready web content', video: v('ai') },
];

export const testimonials = [
  {
    quote:
      'Fast, creative, and incredibly consistent their AI content workflow completely changed how we scale campaigns.',
    company: 'Fairfox IT Infra',
    role: 'Marketing Head',
  },
  {
    quote:
      'The quality felt premium from day one. Their AI-powered creatives gave our brand a much stronger digital identity.',
    company: 'Eldeco Group',
    role: 'Managing Director',
  },
  {
    quote:
      'What impressed us most was how quickly they turned ideas into high-performing digital campaigns.',
    company: 'Madhusudhan Ghee',
    role: 'Managing Director',
  },
  {
    quote:
      'Their AI-driven approach helped us create engaging content for social media, ads, and brand launches effortlessly.',
    company: 'Escorts Tractor',
    role: 'Chief Communication Officer',
  },
  {
    quote:
      'The team understood both creativity and performance marketing, which made every campaign more effective.',
    company: 'Saya Group',
    role: 'Director',
  },
];

export const aiTools = ['chatgpt', 'claude', 'gemini', 'copilot', 'grok', 'pika'];

export const services = [
  {
    kicker: 'AI-Powered Brand Films',
    title: 'Generative AI Storytelling',
    video: v('01'),
    paragraphs: [
      "Find out how 3D technology powered by AI can change the story of your brand into the cinema. Our group employs the use of generative AI to produce amazing brand videos that mesh live-action with virtual environments to ensure a built-up visual experience. Our brand films powered by AI enhance your company's story engaging viewers with captivating visuals and creative narrative.",
      'Through our AI brand films, the audience can become emotionally attached to your brand and be more aware of it. We combine the latest AI technology with traditional storytelling to create a brand film that is better than the competition. A unique audiovisual and interactive experience leaves a lasting impression and significantly enhances your brand value.',
      "AI brand films are the marketing of the future whether you need a corporate presentation, a digital ad, or something for social media. With our creative approach, we'll ensure that your brand stands apart from the competition and is an experience to remember. AI filmmaking tells the story of your brand in the most futuristic and attention-grabbing way possible.",
    ],
  },
  {
    kicker: 'Platform-Specific Content',
    title: 'Performance Optimization with AI Analytics',
    video: v('09'),
    paragraphs: [
      'In today’s digital-first world, audiences consume content faster than ever, making high-quality AI-generated content and digital storytelling essential for modern brands. Using advanced AI-powered creative services, we create engaging visual content, social media creatives, website content, digital campaigns, branded visuals, and performance-driven marketing assets that instantly connect with your audience across every platform.',
      'From social media marketing and AI-powered advertising campaigns to website visuals, e-commerce creatives, and mobile-first digital experiences, our AI creative studio develops platform-specific content tailored to audience behavior, engagement trends, and brand identity. Every visual and campaign is strategically designed to improve audience engagement, brand visibility, and digital performance.',
      "Using AI content optimization, creative automation, and audience analytics, we continuously refine campaigns for maximum reach, engagement, and conversion rates. Whether you're launching a product, building brand awareness, scaling an e-commerce business, or running a digital marketing campaign, our AI-powered content solutions deliver impactful experiences across modern digital platforms.",
    ],
  },
  {
    kicker: 'Maximize Marketing Impact',
    title: 'Market Analysis & Optimization',
    video: v('03'),
    paragraphs: [
      'Make full use of the potential of your AI-powered marketing campaigns to drive better results, improve audience engagement, and increase profits. We use advanced AI marketing technology and data-driven marketing strategies to help brands reach their target audience with maximum precision and performance. By analyzing user behavior, campaign performance, and audience insights, we ensure your advertising budget is optimized for the highest possible ROI.',
      'Our AI-powered campaign management enhances every aspect of modern digital marketing. Using predictive analytics, performance marketing, and AI audience targeting, we analyze large-scale data to optimize campaigns across multiple digital platforms. This intelligent approach helps improve conversion rates, strengthen brand visibility, and maximize returns on ad spend.',
      'Integrating AI-driven marketing solutions into your campaigns allows businesses to scale faster and adapt to changing market trends and consumer behavior. From social media marketing and AI advertising campaigns to email marketing, digital branding, and performance-driven content strategies, our AI-powered services are designed to deliver measurable, result-oriented growth across every digital channel.',
    ],
  },
  {
    kicker: 'AI-Driven Branding Frameworks',
    title: 'UI/UX Design & Interactive Assets',
    video: v('12'),
    paragraphs: [
      'Coin a powerful AI-driven visual identity system which can precisely and strategically define your brand and its behavior in the long-term. We develop scalable branding frameworks to ensure visual consistency at all touchpoints, including the digital world, print and social media, packaging, advertising, and experiences. Each element is made so that its message is recognisable, strengthened by the brand identity selected that will operate firmly on the market.',
      "We will establish the suitable visual language, brand aesthetic, and intelligent design systems within today's AI-enabled ecosystem, in keeping with your organizational values, industry practices, and competitive landscape. All the elements, from detailed brand guidelines and visual governance frameworks to logo architecture, colour psychology, typography systems and iconography, is created to ensure consistency and adaptability as your brand evolves.",
      'We offer comprehensive visual identity solutions including logotypes, colour palettes, typographic hierarchies, digital assets, UI/UX components, packaging imagery, brand collateral, motion graphics and interactive design systems. We provide long-term brand value, connection, and recall by creating a pleasing identity through effective design that speaks to your audience and differentiates you in a crowded online and offline marketplace.',
    ],
  },
];

export const stats = [
  { value: 100, suffix: '+', label: 'Satisfied Clients' },
  { value: 500, suffix: '+', label: 'Projects Delivered' },
];
