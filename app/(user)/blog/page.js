import PageHero from '@/components/PageHero';
import BlogIndex from '@/components/blog/BlogIndex';
import Cta from '@/components/Cta';
import { getPosts, topics } from '@/lib/user/blog';
import { v } from '@/lib/user/content';
import { Suspense } from 'react';

export const metadata = {
  title: "Creative Agency Blog & AI Insights | Contenaissance",
  description: "Read the latest insights on AI video production, creative agencies, branding, real estate marketing and digital strategy from Contenaissance, India.",
  keywords: [
    "creative agency blog", " AI creative insights", " AI video production", " AI content creation", " creative agency India", " digital marketing insights", " branding trends", " AI filmmaking", " brand storytelling", " creative advertising", " real estate marketing", " digital marketing strategy", " AI-powered creativity"
  ],
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
      <Suspense fallback={<div className="journal" />}>
        <BlogIndex posts={posts} topics={topics} />
      </Suspense>
      <Cta />
    </>
  );
}
