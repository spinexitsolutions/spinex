import { readingMinutes, type Post } from "@/lib/posts";
import { formatDate } from "@/lib/interns";
import type { SiteContent } from "@/lib/content";
import LatestPostsView, { type PostItem } from "./LatestPostsView";

// Home page blog block: the newest article large, the next four in a list, and category buttons to
// filter them. Hidden until at least one post is published.
export default function LatestPosts({ posts, content }: { posts: Post[]; content: SiteContent }) {
  if (!posts.length) return null;
  const fallback = content.banners?.blogCover ?? "";
  // Only what the cards need is sent to the browser, not the full article text.
  const items: PostItem[] = posts.slice(0, 24).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover: p.cover || fallback,
    coverAlt: p.coverAlt || "",
    category: (p.category || "").trim(),
    date: formatDate(p.publishedAt),
    mins: readingMinutes(p.body || p.excerpt),
  }));
  return <LatestPostsView items={items} heading={content.sections.blog.heading} intro={content.sections.blog.intro} />;
}
