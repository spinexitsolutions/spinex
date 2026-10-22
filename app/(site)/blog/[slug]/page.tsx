import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPost, getPublishedPosts } from "@/lib/post-db";
import { getContent } from "@/lib/content-server";
import PostView from "@/components/blog/PostView";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost(params.slug);
  if (!post) return { title: "Article not found" };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  return {
    // Don't repeat the brand if the SEO title already has it.
    title: { absolute: /spinex/i.test(title) ? title : `${title} | Spinex IT Solutions` },
    description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title, description, url: `/blog/${post.slug}`, publishedTime: post.publishedAt, images: post.cover ? [{ url: post.cover }] : ["/og-image.jpg"] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PostPage({ params }: Props) {
  const [post, all, content] = await Promise.all([getPublishedPost(params.slug), getPublishedPosts(), getContent()]);
  if (!post) notFound();
  return <PostView post={post} all={all} content={content} />;
}
