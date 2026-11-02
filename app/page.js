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
import { getPosts } from '@/lib/blog';

export const revalidate = 3600;

export default async function Home() {
  const posts = await getPosts();
  const latest = (posts || [])
    .slice(0, 3)
    .map(({ slug, title, image, date, readTime }) => ({ slug, title, image, date, readTime }));

  return (
    <>
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
    </>
  );
}
