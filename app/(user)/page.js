import Hero from '@/components/home/Hero';
import Rocket from '@/components/home/Rocket';
import About from '@/components/home/About';
import Showreel from '@/components/home/Showreel';
import Solutions from '@/components/home/Solutions';
import Archive from '@/components/home/Archive';
import Web3D from '@/components/home/Web3D';
import Testimonials from '@/components/home/Testimonials';
import Journal from '@/components/home/Journal';
import Quote from '@/components/home/Quote';
import Cta from '@/components/Cta';
import UniverseCanvas from '@/components/home/journey/UniverseCanvas';
import JourneyActors from '@/components/home/journey/JourneyActors';
import { getPosts } from '@/lib/user/blog';
export const revalidate = 3600;

export const metadata = {
  title: "AI Creative Agency in India | Contenaissance",
  description:
    "Contenaissance is an AI creative agency in India specialising in AI video production, brand films and digital campaigns.",
  keywords: [
    "AI Creative Agency in India", "AI Video Production Agency", "AI Creative Studio", "AI Advertising Agency", "AI Brand Film Production", "AI Commercial Production", "Generative AI Advertising", "AI Digital Content Creation", "Creative Production Agency", "Brand Film Production Company", "AI-Powered Video Production", "Digital Creative Agency in India", "AI Marketing Campaigns", "AI Video Creation Services", "Creative AI Solutions for Brands"
  ],
  alternates: {
    canonical: "https://www.contenaissance.com/",
  },
};

export default async function Home() {
  const posts = await getPosts();
  const latest = (posts || [])
    .slice(0, 3)
    .map(({ slug, title, image, date, readTime, excerpt, description }) => ({
      slug,
      title,
      image,
      date,
      readTime,
      excerpt: excerpt || description || '',
    }));

  return (
    <div className="journey">
      <Hero />
      <Rocket />
      <About />
      <Showreel />
      <Solutions />
      <Archive />
      <Web3D />
      <Testimonials />
      <Journal posts={latest} />
      <Quote />
      <Cta />
      {/* Shared 3D universe behind every section (fixed, z-index -1) */}
      <UniverseCanvas />
      {/* Rocket / astronaut that carry the viewer between sections */}
      <JourneyActors />
    </div>
  );
}
