import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { readingMinutes, type Post } from "@/lib/posts";
import { formatDate } from "@/lib/interns";

export default function PostCard({ post, large = false }: { post: Post; large?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-line bg-white transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(18,15,27,0.35)]">
      <Link href={`/blog/${post.slug}`} className={`relative block overflow-hidden bg-mist ${large ? "aspect-[16/9]" : "aspect-[16/10]"}`} tabIndex={-1} aria-hidden>
        {post.cover ? (
          <img src={post.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-lav-100 to-lav-300 font-display text-5xl font-semibold text-lav-700">{post.title.slice(0, 1)}</div>
        )}
        {post.category && <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur">{post.category}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <p className="flex items-center gap-2 text-sm text-muted">
          {formatDate(post.publishedAt)} <span aria-hidden>·</span> <Clock size={13} /> {readingMinutes(post.body || post.excerpt)} min read
        </p>
        <h3 className={`mt-2 font-display font-semibold tracking-tight ${large ? "text-3xl" : "text-xl"}`}>
          <Link href={`/blog/${post.slug}`} className="hover:text-lav-700">{post.title}</Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-muted">{post.excerpt}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-lav-700">
          Read article <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
