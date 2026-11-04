import PageHero from '@/components/PageHero';
import Gallery from '@/components/portfolio/Gallery';
import Experiences from '@/components/portfolio/Experiences';
import Cta from '@/components/Cta';
import { v } from '@/lib/content';

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
    <>
      <PageHero
        lines={['AI Creative', 'Portfolio']}
        text="Explore Contenaissance’s creative world, where cinematic storytelling, AI-powered visuals, and immersive digital experiences bring brands to life."
        video={v('mzha')}
      />
      <Gallery />
      <Experiences />
      <Cta />
    </>
  );
}
