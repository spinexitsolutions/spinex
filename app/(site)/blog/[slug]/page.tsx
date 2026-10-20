import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { getPublishedPost, getPublishedPosts } from "@/lib/post-db";
import { getContent } from "@/lib/content-server";
import { readingMinutes, renderMarkdown } from "@/lib/posts";
import { formatDate } from "@/lib/interns";
import { SITE_URL } from "@/lib/site";
import PostCard from "@/components/blog/PostCard";
import ShareButtons from "@/components/blog/ShareButtons";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost(params.slug);
  if (!post) return { title: "Article not found" };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  return {
    title: { absolute: `${title} | Spinex IT Solutions` },
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
  const { html, toc } = renderMarkdown(post.body);
  const related = all.filter((p) => p.id !== post.id && (p.category === post.category || p.tags.some((t) => post.tags.includes(t)))).slice(0, 3);
  const more = related.length ? related : all.filter((p) => p.id !== post.id).slice(0, 3);
  const url = `${SITE_URL}/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.cover ? (post.cover.startsWith("http") ? post.cover : `${SITE_URL}${post.cover}`) : `${SITE_URL}/og-image.jpg`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Person", name: post.author || content.brand.name },
    publisher: { "@type": "Organization", name: content.brand.name, logo: { "@type": "ImageObject", url: content.brand.logo } },
    mainEntityOfPage: url,
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="bg-ink pb-16 pt-36 text-white sm:pt-44">
        <div className="container-x max-w-4xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={15} /> All articles</Link>
          {post.category && <p className="mt-8 text-lav-300">{post.category}</p>}
          <h1 className="h-display mt-3 text-4xl sm:text-6xl">{post.title}</h1>
          {post.excerpt && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">{post.excerpt}</p>}
          <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
            <span>{post.author}</span><span aria-hidden>·</span><span>{formatDate(post.publishedAt)}</span><span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {readingMinutes(post.body)} min read</span>
          </p>
        </div>
      </section>

      {post.cover && (
        <div className="bg-ink">
          <div className="container-x max-w-5xl translate-y-0 pb-0">
            <img src={post.cover} alt={post.title} className="aspect-[16/8] w-full rounded-t-[28px] object-cover" />
          </div>
        </div>
      )}

      <section className="bg-white py-14 sm:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_260px]">
          <article className="prose-spinex mx-auto w-full max-w-3xl lg:mx-0" dangerouslySetInnerHTML={{ __html: html }} />
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            {toc.length > 1 && (
              <nav aria-label="In this article" className="rounded-[20px] border border-line p-5">
                <p className="text-sm font-semibold">In this article</p>
                <ol className="mt-3 space-y-2 text-sm">
                  {toc.map((t) => (
                    <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                      <a href={`#${t.id}`} className="text-muted hover:text-ink">{t.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <ShareButtons url={url} title={post.title} />
            <div className="rounded-[20px] bg-ink p-6 text-white">
              <p className="font-display text-xl font-semibold">Need help with this?</p>
              <p className="mt-2 text-sm text-white/65">Tell us about your project and get a free quote.</p>
              <Link href="/contact" className="btn-light mt-5 w-full py-3 text-sm">Talk to us <ArrowUpRight size={15} /></Link>
            </div>
          </aside>
        </div>
        {post.tags.length > 0 && (
          <div className="container-x mt-10 flex flex-wrap gap-2">
            {post.tags.map((t) => <span key={t} className="rounded-full bg-mist px-3 py-1.5 text-sm text-muted">#{t}</span>)}
          </div>
        )}
      </section>

      {more.length > 0 && (
        <section className="bg-mist py-16 sm:py-20">
          <div className="container-x">
            <h2 className="h-display mb-8 text-3xl sm:text-4xl">Keep reading</h2>
            <div className="grid gap-6 md:grid-cols-3">{more.map((p) => <PostCard key={p.id} post={p} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}
