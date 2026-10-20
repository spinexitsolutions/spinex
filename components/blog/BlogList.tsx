"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Post } from "@/lib/posts";
import PostCard from "./PostCard";

export default function BlogList({ posts }: { posts: Post[] }) {
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category).filter(Boolean)))];
  const [cat, setCat] = useState("All");
  const list = posts.filter((p) => cat === "All" || p.category === cat);

  if (!posts.length) {
    return <p className="rounded-[24px] border border-dashed border-line p-12 text-center text-muted">New articles are on the way. Check back soon.</p>;
  }

  const [first, ...rest] = list;
  return (
    <>
      {categories.length > 2 && (
        <div className="mb-10 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by topic">
          {categories.map((c) => (
            <button key={c} role="radio" aria-checked={cat === c} onClick={() => setCat(c)} className="relative min-h-11 rounded-full px-5 py-2.5 text-sm font-medium">
              {cat === c && <motion.span layoutId="blog-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className={`relative ${cat === c ? "text-white" : "text-muted hover:text-ink"}`}>{c}</span>
            </button>
          ))}
        </div>
      )}
      {first && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><PostCard post={first} large /></div>
          {rest.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </>
  );
}
