
import type { MetadataRoute } from "next";
import { promoteScheduledBlogs } from "@/lib/blog-db";
import { query } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import { services } from "@/lib/user/content";

export const dynamic = "force-dynamic";

type BlogSitemapRow = {
  slug: string;
  updated_at: Date | string | null;
  published_at: Date | string | null;
};

function toDate(value: Date | string | null | undefined): Date {
  if (!value) return new Date();

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function slugifyService(title = "") {
  return title
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Dynamic service detail pages
  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${siteUrl}/services/${slugifyService(service.title)}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  try {
    // Publish scheduled blogs
    await promoteScheduledBlogs();

    // Fetch published blogs
    const blogs = await query<BlogSitemapRow>(
      `SELECT slug, updated_at, published_at
       FROM blogs
       WHERE status = 'published'
       ORDER BY published_at DESC, created_at DESC`
    );

    // Dynamic blog detail pages
    const blogRoutes: MetadataRoute.Sitemap = blogs.map((blog) => ({
      url: `${siteUrl}/blog/${blog.slug}`,
      lastModified: toDate(blog.updated_at ?? blog.published_at),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    // Return all URLs
    return [
      ...staticRoutes,
      ...serviceRoutes,
      ...blogRoutes,
    ];

  } catch (error) {
    console.error("[sitemap] Failed to load blog URLs:", error);

    // Return static and service URLs even if database fails
    return [
      ...staticRoutes,
      ...serviceRoutes,
    ];
  }
}
