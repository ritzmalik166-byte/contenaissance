import { Montserrat, Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google';
import PfHero from '@/components/portfolio/PfHero';
import PfShowreel from '@/components/portfolio/PfShowreel';
import PfArchive from '@/components/portfolio/PfArchive';
import PfMarquee from '@/components/portfolio/PfMarquee';
import PfStages from '@/components/portfolio/PfStages';
import PfQuote from '@/components/portfolio/PfQuote';
import PfCta from '@/components/portfolio/PfCta';
import PfHandoff from '@/components/portfolio/PfHandoff';
import PortfolioCanvas from '@/components/portfolio/PortfolioCanvas';
import '@/components/portfolio/portfolio.css';

/* Figma typography, scoped to the portfolio page:
   display — Montserrat (headlines, card + stage titles)
   text    — Plus Jakarta Sans (copy, kickers, tabs, quote)
   marquee — Inter (giant marquee rows)
   mono    — JetBrains Mono (labels such as VISUAL EXPLORATION) */
const display = Montserrat({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--pf-display', display: 'swap' });
const text = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--pf-text', display: 'swap' });
const marquee = Inter({ subsets: ['latin'], weight: ['700', '800'], variable: '--pf-marquee', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--pf-mono', display: 'swap' });

export const metadata = {
  title: "AI Creative Portfolio & Campaigns | Contenaissance",
  description:
    "Explore Contenaissance's creative portfolio featuring AI-powered brand films, video commercials, social content and immersive digital experiences for modern brands.",
  keywords: [
    "AI creative portfolio", " AI video production", " AI brand films", " AI commercial production", " creative campaigns", " cinematic video production", " AI-generated content", " social media video production", " digital experiences", " interactive web design", " creative studio", " Contenaissance "
  ],
  alternates: {
    canonical: "https://www.contenaissance.com/portfolio",
  },
};

export default function PortfolioPage() {
  return (
    <div className={`pf ${display.variable} ${text.variable} ${marquee.variable} ${mono.variable}`}>
      <PfHero />
      <PfShowreel />
      <PfArchive />
      <PfMarquee />
      <PfStages />
      <PfQuote />
      <PfCta />
      {/* Fixed WebGL "Gilded Atelier" behind every section; sections cut
          between chambers with an aperture transition. */}
      <PortfolioCanvas />
      <PfHandoff />
    </div>
  );
}
