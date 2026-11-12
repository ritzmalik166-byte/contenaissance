
import PageHero from '@/components/PageHero';
import ServiceList from '@/components/services/ServiceList';
import Cta from '@/components/Cta';
import { v } from '@/lib/user/content';

export const metadata = {
  title: "AI Creative & Video Production Agency | Contenaissance",
  description:
    "Contenaissance offers AI brand films, AI video production, digital content, creative campaigns, brand identity and digital marketing services in India.",
  keywords: [
    "AI creative agency", " AI video production", " AI brand films", " AI content creation", " AI advertising agency", " AI-powered creative services", " digital content creation", " creative campaign development", " brand identity design", " AI visual production", " digital marketing services", " AI storytelling", " creative production agency"
  ],
  alternates: {
    canonical: "https://www.contenaissance.com/services",
  },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        lines={['AI Creative, Content Production', '& Digital Experiences']}
        text="We bring together human creativity, AI technology and strategic storytelling to create compelling brand films, digital content, advertising campaigns and visual experiences. From the first idea to the final execution, we help brands turn ambitious ideas into meaningful creative work."
        video={v('interactive-product-flow')}
      />

      <ServiceList />

      <Cta />
    </>
  );
}
