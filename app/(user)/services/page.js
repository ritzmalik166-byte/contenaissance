
import Cta from '@/components/Cta';
import DigitalContentSection from '@/components/services/DigitalContentSection';
import DigitalInnovationSection from '@/components/services/DigitalInnovationSection';
import ServiceCampaigns from '@/components/services/ServiceCampaigns';
import ServiceDetail from '@/components/services/ServiceDetail';
import ServiceIdentity from '@/components/services/ServiceIdentity';
import ServiceList from '@/components/services/ServiceList';
import ServicesHero from '@/components/services/ServicesHero';
import ServiceShowreel from '@/components/services/ServiceShowreel';
import StorytellingShowreel from '@/components/services/StorytellingShowreel';

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
      <ServicesHero />
      <ServiceList />
      <ServiceDetail />
      <ServiceShowreel />
      <DigitalContentSection />
      <StorytellingShowreel />
      <ServiceCampaigns />
      <ServiceIdentity />
      <DigitalInnovationSection />
      <Cta />
    </>
  );
}
