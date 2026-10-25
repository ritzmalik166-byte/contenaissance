import PageHero from '@/components/PageHero';
import ServiceList from '@/components/services/ServiceList';
import Cta from '@/components/Cta';
import { v } from '@/lib/content';

export const metadata = {
  title: 'AI Content Creation & Video Production Services India | Contenaissance',
  description:
    'AI-powered brand films, platform-specific content, AI marketing campaigns and AI-driven branding frameworks from Contenaissance.',
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        kicker="Our approach / Services"
        lines={['AI Content Creation', '& Video Production']}
        text="Brand films, platform-first content, AI-powered campaigns and visual identity systems — crafted in India for brands everywhere."
        video={v('15')}
      />
      <ServiceList />
      <Cta />
    </>
  );
}
