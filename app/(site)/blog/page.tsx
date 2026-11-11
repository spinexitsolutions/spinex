import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import BlogList from "@/components/blog/BlogList";
import { getPublishedPosts } from "@/lib/post-db";
import { getContent } from "@/lib/content-server";
import { PageJsonLd } from "@/components/JsonLd";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getContent();
  return {
    title: "Blog",
    description: pages.blog.intro,
    alternates: { canonical: "/blog" },
    openGraph: { title: "Blog | Spinex IT Solutions", description: pages.blog.intro, url: "/blog", type: "website", images: ["/og-image.jpg"] },
  };
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return (
    <>
      <PageJsonLd type="CollectionPage" name="Blog" path="/blog" description="Practical articles on websites, online stores, SEO and social media." items={posts.map((p) => ({ name: p.title, path: `/blog/${p.slug}`, description: p.excerpt }))} />
      <PageHeader page="blog" title="Ideas and guides for growing online." intro="Practical articles on websites, online stores, SEO and social media." badge={posts.length ? { value: String(posts.length), label: posts.length === 1 ? "Article" : "Articles" } : undefined} />
      <section className="bg-mist py-16 sm:py-24">
        <div className="container-x">
          <BlogList posts={posts} />
        </div>
      </section>
    </>
  );
}
