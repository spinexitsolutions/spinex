import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/posts";
import type { SiteContent } from "@/lib/content";
import PostCard from "../blog/PostCard";

// Shows the three newest articles. Hidden until at least one post is published.
export default function LatestPosts({ posts, content }: { posts: Post[]; content: SiteContent }) {
  if (!posts.length) return null;
  const sec = content.sections.blog;
  return (
    <section className="bg-mist py-24 sm:py-28">
      <div className="container-x">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="h-display text-4xl sm:text-6xl">{sec.heading}</h2>
            {sec.intro && <p className="mt-4 max-w-md text-muted">{sec.intro}</p>}
          </div>
          <Link href="/blog" className="btn-ghost w-fit bg-white">All articles <ArrowUpRight size={16} /></Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {posts.slice(0, 3).map((p) => <PostCard key={p.id} post={p} fallback={content.banners?.blogCover} />)}
        </div>
      </div>
    </section>
  );
}
