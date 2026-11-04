
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
        lines={['AI Creative, Content Production', '& Digital Experiences']}
        text="We bring together human creativity, AI technology and strategic storytelling to create compelling brand films, digital content, advertising campaigns and visual experiences. From the first idea to the final execution, we help brands turn ambitious ideas into meaningful creative work."
        video={v('15')}
      />

      <ServiceList />

      <Cta />
    </>
  );
}
