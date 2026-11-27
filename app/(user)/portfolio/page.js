import PortfolioJourney from '@/components/journey/portfolio/PortfolioJourney';
import { missions } from '@/lib/journey/portfolio-data';

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

// the work as a structured list for search engines
const portfolioSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Contenaissance portfolio",
  url: "https://www.contenaissance.com/portfolio",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: missions.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      // CreativeWork, not VideoObject: a VideoObject needs an uploadDate we don't have
      item: { "@type": "CreativeWork", name: m.title, description: m.summary, image: `https://www.contenaissance.com${m.poster}`, genre: m.category },
    })),
  },
};

export default function PortfolioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(portfolioSchema) }} />
      <PortfolioJourney />
    </>
  );
}
