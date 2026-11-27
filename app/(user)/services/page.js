import ServicesJourney from '@/components/journey/services/ServicesJourney';
import { worlds } from '@/lib/journey/services-data';

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

// the six services as a structured list for search engines
const servicesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Contenaissance services",
  itemListElement: worlds.map((w, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Service",
      name: w.title,
      description: w.body,
      url: `https://www.contenaissance.com${w.href}`,
      provider: { "@type": "Organization", name: "Contenaissance", url: "https://www.contenaissance.com/" },
      areaServed: "IN",
    },
  })),
};

export default function ServicesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }} />
      <ServicesJourney />
    </>
  );
}
