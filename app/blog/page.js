import PageHero from '@/components/PageHero';
import BlogIndex from '@/components/blog/BlogIndex';
import Cta from '@/components/Cta';
import { getPosts, topics } from '@/lib/blog';
import { v } from '@/lib/content';

export const metadata = {
  title: "Creative Agency Blogs, Branding & Marketing | Contenaissance",
  description: "Read practical blogs on creative advertising, branding, AI video production and digital marketing. Discover ideas to strengthen your brand with Contenaissance.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await getPosts();
  const list = (posts || []).map(({ html, toc, description, ...p }) => p);

  return (
    <>
      {/* <PageHero
        kicker="Insights & Stories"
        lines={['Contenaissance', 'Journal']}
        text="Where AI, creativity, and cinematic storytelling shape the future of digital innovation."
        video={v('13')}
      /> */}
      <BlogIndex posts={list} topics={topics} />
      <Cta />
    </>
  );
}
