import Journey from '@/components/journey/Journey';
import { getPosts, normalizePost } from '@/lib/user/blog';
import blogSnapshot from '@/lib/user/blog.json';
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
  // homepage share tags (a page's openGraph replaces the layout's entirely,
  // so the placeholder text in app/(user)/layout.js never reaches this page)
  openGraph: {
    type: "website",
    url: "https://www.contenaissance.com/",
    siteName: "Contenaissance",
    locale: "en_IN",
    title: "Contenaissance | AI Creative Agency in India",
    description:
      "AI brand films, commercials and digital campaigns. Contenaissance blends human storytelling with generative AI to create cinematic work for brands.",
    images: [
      {
        url: "/og/home.jpg",
        width: 1200,
        height: 630,
        alt: "Contenaissance — AI creative agency in India. The next chapter of creativity.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contenaissance | AI Creative Agency in India",
    description:
      "AI brand films, commercials and digital campaigns, made where human storytelling meets generative AI.",
    images: ["/og/home.jpg"],
  },
};

export default async function Home() {
  let posts = [];
  try {
    posts = await getPosts();
  } catch {
    posts = [];
  }
  // the homepage always shows field notes: fall back to the bundled snapshot
  if (!posts?.length) posts = (blogSnapshot?.data || []).map(normalizePost).filter(Boolean);
  const latest = (posts || [])
    .slice(0, 4)
    .map(({ slug, title, image, date, readTime, excerpt, description }) => ({
      slug,
      title,
      image,
      date,
      readTime,
      excerpt: excerpt || description || '',
    }));

  return <Journey posts={latest} />;
}
