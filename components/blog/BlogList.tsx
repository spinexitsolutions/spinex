"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { Post } from "@/lib/posts";
import PostCard from "./PostCard";

export default function BlogList({ posts }: { posts: Post[] }) {
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category).filter(Boolean)))];
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = posts.filter((p) => {
    if (cat !== "All" && p.category !== cat) return false;
    const text = [p.title, p.excerpt, p.category, ...(p.tags ?? [])].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });

  if (!posts.length) {
    return <p className="rounded-[24px] border border-dashed border-line p-12 text-center text-muted">New articles are on the way. Check back soon.</p>;
  }

  const [first, ...rest] = list;
  return (
    <>
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {categories.length > 2 ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by topic">
          {categories.map((c) => (
            <button key={c} role="radio" aria-checked={cat === c} onClick={() => setCat(c)} className="relative min-h-11 rounded-full px-5 py-2.5 text-sm font-medium">
              {cat === c && <motion.span layoutId="blog-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className={`relative ${cat === c ? "text-white" : "text-muted hover:text-ink"}`}>{c}</span>
            </button>
          ))}
        </div>
      ) : <span />}
        {posts.length > 3 && (
          <label className="flex h-12 w-full items-center gap-2 rounded-full border border-line bg-white px-4 lg:max-w-xs">
            <Search size={17} className="shrink-0 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" aria-label="Search articles" className="h-full w-full bg-transparent text-sm outline-none" />
            {q && <button onClick={() => setQ("")} aria-label="Clear search" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"><X size={15} /></button>}
          </label>
        )}
      </div>
      {!list.length && (
        <p className="rounded-[24px] border border-dashed border-line bg-white p-12 text-center text-muted">
          No articles match{q ? ` "${q}"` : ""}. <button onClick={() => { setQ(""); setCat("All"); }} className="font-semibold text-lav-700 underline">Show all articles</button>
        </p>
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
