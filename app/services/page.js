
import PageHero from '@/components/PageHero';
import ServiceList from '@/components/services/ServiceList';
import Cta from '@/components/Cta';
import { v } from '@/lib/content';

export const metadata ={
  title: "AI Content Creation & Video Production Services India",
  description:
    "Discover Contenaissance's AI-powered creative services, including brand films, digital content creation, marketing campaigns and visual identity design.",
  alternates: {
    canonical: "https://www.contenaissance.com/services",
  },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        kicker="Our approach / Services"
        lines={['AI Content Creation', '& Video Production']}
        text="Brand films, platform-first content, AI-powered campaigns and visual identity systems, crafted in India for brands everywhere."
        video={v('15')}
      />

      <ServiceList />

      <Cta />
    </>
  );
}
