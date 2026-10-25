import PageHero from '@/components/PageHero';
import Gallery from '@/components/portfolio/Gallery';
import Experiences from '@/components/portfolio/Experiences';
import Cta from '@/components/Cta';
import { v } from '@/lib/content';

export const metadata = {
  title: 'Creative Portfolio | Contenaissance AI Studio',
  description:
    'Explore AI-generated campaigns, digital content, visual storytelling, and creative experiences built for modern brands.',
};

export default function PortfolioPage() {
  return (
    <>
      <PageHero
        kicker="Portfolio"
        lines={['AI Creative', 'Experiences']}
        text="Explore AI-generated campaigns, digital content, visual storytelling, and creative experiences built for modern brands."
        video={v('mzha')}
      />
      <Gallery />
      <Experiences />
      <Cta />
    </>
  );
}
