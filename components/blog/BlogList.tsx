"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { Post } from "@/lib/posts";
import PostCard from "./PostCard";
import { useContent } from "../ContentProvider";

const PER_PAGE = 9;

export default function BlogList({ posts }: { posts: Post[] }) {
  const fallback = useContent().content.banners?.blogCover || "";
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category).filter(Boolean)))];
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);
  // A new topic or search starts again from page 1.
  useEffect(() => setPage(1), [cat, q]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = posts.filter((p) => {
    if (cat !== "All" && p.category !== cat) return false;
    const text = [p.title, p.excerpt, p.category, ...(p.tags ?? [])].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });

  if (!posts.length) {
    return <p className="rounded-[24px] border border-dashed border-line p-12 text-center text-muted">New articles are on the way. Check back soon.</p>;
  }

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = list.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const go = (n: number) => {
    setPage(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <>
      <div ref={top} className="scroll-mt-28" />
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
        {(
          <label className="flex h-12 w-full items-center gap-2 rounded-full border border-line bg-white px-4 shadow-sm focus-within:border-lav-500 lg:max-w-sm">
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
      {shown.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => <PostCard key={p.id} post={p} fallback={fallback} />)}
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Pages">
          <button onClick={() => go(current - 1)} disabled={current === 1} aria-label="Previous page" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white transition hover:border-ink disabled:pointer-events-none disabled:opacity-40"><ChevronLeft size={18} /></button>
          {pageList(current, pages).map((n, i) =>
            n === 0 ? (
              <span key={`gap${i}`} className="px-1 text-muted">…</span>
            ) : (
              <button key={n} onClick={() => go(n)} aria-current={n === current ? "page" : undefined} className={`h-11 min-w-11 rounded-full px-3 text-sm font-semibold transition ${n === current ? "bg-ink text-white" : "border border-line bg-white text-muted hover:border-ink hover:text-ink"}`}>{n}</button>
            ),
          )}
          <button onClick={() => go(current + 1)} disabled={current === pages} aria-label="Next page" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white transition hover:border-ink disabled:pointer-events-none disabled:opacity-40"><ChevronRight size={18} /></button>
        </nav>
      )}
    </>
  );
}

// Page numbers with gaps (0) on long lists: 1 … 4 5 6 … 12
function pageList(current: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, current - 1, current, current + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = Array.from(set).sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push(0);
    out.push(n);
  });
  return out;
}
