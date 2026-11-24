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

/* Type: the site's two families only (loaded in app/(user)/layout.js) —
   Plus Jakarta Sans for headings, Roboto for everything else. */

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
    <div className="pf">
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
