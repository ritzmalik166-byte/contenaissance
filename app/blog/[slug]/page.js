import { notFound } from 'next/navigation';
import Article from '@/components/blog/Article';
import Cta from '@/components/Cta';
import { posts, getPost, getNeighbours } from '@/lib/blog';

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, images: [post.image], type: 'article' },
  };
}

const strip = ({ html, toc, description, ...p }) => p;

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { next, related } = getNeighbours(slug);

  return (
    <>
      <Article post={post} next={strip(next)} related={related.map(strip)} />
      <Cta />
    </>
  );
}
