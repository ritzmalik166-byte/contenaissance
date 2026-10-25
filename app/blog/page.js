import PageHero from '@/components/PageHero';
import BlogIndex from '@/components/blog/BlogIndex';
import Cta from '@/components/Cta';
import { posts, topics } from '@/lib/blog';
import { v } from '@/lib/content';

export const metadata = {
  title: 'Creative Agency Blogs, Branding & Marketing | Contenaissance',
  description:
    'Contenaissance Journal — where AI, creativity, and cinematic storytelling shape the future of digital innovation.',
};

export default function BlogPage() {
  const list = posts.map(({ html, toc, description, ...p }) => p);
  return (
    <>
      <PageHero
        kicker="Contenaissance Journal"
        lines={['Stories from the', 'edge of AI.']}
        text="Where AI, creativity, and cinematic storytelling shape the future of digital innovation."
        video={v('13')}
      />
      <BlogIndex posts={list} topics={topics} />
      <Cta />
    </>
  );
}
