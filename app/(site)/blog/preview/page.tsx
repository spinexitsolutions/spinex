import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { getSession } from "@/lib/admin-guard";
import { getDb, hasDb } from "@/lib/db";
import { getPublishedPosts } from "@/lib/post-db";
import { getContent } from "@/lib/content-server";
import { blankPost, type Post } from "@/lib/posts";
import { allowed } from "@/lib/roles";
import PostView from "@/components/blog/PostView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Post preview", robots: { index: false, follow: false } };

// Only for a logged-in team member who pressed "Preview" in the blog editor. Nobody else can see it.
export default async function PostPreviewPage() {
  const s = hasDb() ? await getSession() : null;
  let post: Post | null = null;
  if (s && allowed(s, "blog", "view")) {
    const doc = await (await getDb()).collection<{ _id: string; data?: Partial<Post> }>("settings").findOne({ _id: `post_preview:${s.uid}` });
    if (doc?.data) post = { ...blankPost(), ...doc.data, id: "preview", publishedAt: doc.data.publishedAt || new Date().toISOString().slice(0, 10) };
  }

  if (!post) {
    return (
      <section className="bg-ink pb-24 pt-40 text-white">
        <div className="container-x max-w-2xl text-center">
          <h1 className="h-display text-4xl">Nothing to preview</h1>
          <p className="mt-4 text-white/65">Open a post in the admin panel and press Preview. You need to be logged in.</p>
          <Link href="/admin#blog" className="btn-light mt-8 inline-flex px-6 py-3 text-sm">Go to admin</Link>
        </div>
      </section>
    );
  }

  const [all, content] = await Promise.all([getPublishedPosts(), getContent()]);
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[95] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-amber-400 px-4 py-2.5 text-sm font-medium text-ink shadow-lg">
        <span className="flex items-center gap-2"><Eye size={16} /> Post preview: only you can see this. It is not live until you publish it.</span>
        <Link href="/admin#blog" className="rounded-full bg-ink px-4 py-1.5 text-white">Back to admin</Link>
      </div>
      <PostView post={post} all={all.filter((p) => p.slug !== post!.slug)} content={content} />
    </>
  );
}
