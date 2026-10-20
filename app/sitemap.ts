import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getPublishedPosts } from "@/lib/post-db";
import { getContent } from "@/lib/content-server";
import { serviceSlug } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "weekly"],
    ["/services", 0.9, "monthly"],
    ["/work", 0.8, "weekly"],
    ["/about", 0.7, "monthly"],
    ["/contact", 0.8, "yearly"],
    ["/blog", 0.7, "weekly"],
    ["/internship", 0.6, "monthly"],
    ["/careers", 0.5, "monthly"],
    ["/verify", 0.4, "yearly"],
    ["/privacy", 0.2, "yearly"],
    ["/terms", 0.2, "yearly"],
    ["/refund", 0.2, "yearly"],
  ];
  const [posts, content] = await Promise.all([getPublishedPosts(), getContent()]);
  return [
    ...pages.map(([path, priority, changeFrequency]) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority })),
    ...content.services.map((sv) => ({ url: `${SITE_URL}/services/${serviceSlug(sv)}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: new Date(p.updatedAt || p.publishedAt || now), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
