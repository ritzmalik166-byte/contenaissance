import { notFound } from 'next/navigation';
import Article from '@/components/blog/Article';
import Cta from '@/components/Cta';
import { getPosts, getPost, getNeighbours } from '@/lib/user/blog';

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const posts = await getPosts();
    return (posts || []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const title = post.title || 'Journal Article | Contenaissance';
  const description = post.description || post.excerpt || '';
  const images = post.image ? [post.image] : [];

  return {
    title,
    description,
    alternates: { canonical: slug },
    openGraph: {
      title,
      description,
      images,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

const strip = (p) => (p ? (({ html, toc, description, ...rest }) => rest)(p) : null);

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { next, related } = await getNeighbours(slug);

  return (
    <>
      <Article
        post={post}
        next={next ? strip(next) : null}
        related={(related || []).map(strip).filter(Boolean)}
      />
      <Cta />
    </>
  );
}
