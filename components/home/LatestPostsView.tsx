"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Clock } from "lucide-react";
import { SplitHeading } from "@/components/Reveal";

export type PostItem = { id: string; slug: string; title: string; excerpt: string; cover: string; coverAlt: string; category: string; date: string; mins: number };

function Cover({ p, className }: { p: PostItem; className: string }) {
  return p.cover ? (
    <img src={p.cover} alt={p.coverAlt} loading="lazy" decoding="async" className={`${className} object-cover transition-transform duration-700 group-hover:scale-105`} />
  ) : (
    <div className={`${className} grid place-items-center bg-gradient-to-br from-lav-100 to-lav-300 font-display text-4xl font-semibold text-lav-700`}>{p.title.slice(0, 1)}</div>
  );
}

export default function LatestPostsView({ items, heading, intro }: { items: PostItem[]; heading: string; intro: string }) {
  // Category buttons: the most used categories, up to five.
  const cats = useMemo(() => {
    const count = new Map<string, number>();
    items.forEach((p) => p.category && count.set(p.category, (count.get(p.category) ?? 0) + 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
  }, [items]);
  const [cat, setCat] = useState("");
  const shown = (cat ? items.filter((p) => p.category === cat) : items).slice(0, 5);
  const [first, ...rest] = shown;

  return (
    <section className="bg-mist py-24 sm:py-28" data-home-blog>
      <div className="container-x">
        <div className="mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SplitHeading text={heading} className="h-display text-4xl sm:text-6xl" />
            {intro && <p className="mt-4 max-w-xl text-muted sm:text-lg">{intro}</p>}
            {cats.length > 1 && (
              <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Filter articles by topic">
                {["", ...cats].map((c) => (
                  <button
                    key={c || "all"}
                    type="button"
                    aria-pressed={cat === c}
                    onClick={() => setCat(c)}
                    className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${cat === c ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-ink hover:text-ink"}`}
                  >
                    {c || "All"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/blog" className="btn-ghost w-fit shrink-0 bg-white">All articles <ArrowUpRight size={16} /></Link>
        </div>

        {first && (
          <div className={`grid gap-5 ${rest.length ? "lg:grid-cols-[1.25fr_1fr]" : ""}`}>
            <article className="group flex flex-col overflow-hidden rounded-[28px] border border-line bg-white">
              <Link href={`/blog/${first.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-mist" tabIndex={-1} aria-hidden>
                <Cover p={first} className="h-full w-full" />
              </Link>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <p className="flex items-center gap-2 text-sm text-muted">
                  {first.date} <span aria-hidden>·</span> <Clock size={13} /> {first.mins} min read
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                  <Link href={`/blog/${first.slug}`} className="hover:text-lav-700">{first.title}</Link>
                </h3>
                {first.excerpt && <p className="mt-3 line-clamp-3 text-muted">{first.excerpt}</p>}
                <Link href={`/blog/${first.slug}`} className="mt-auto inline-flex w-fit items-center gap-1.5 pt-5 text-sm font-semibold text-lav-700">
                  Read article <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>

            {rest.length > 0 && (
              <ul className="flex flex-col gap-3.5">
                {rest.map((p) => (
                  <li key={p.id} className="flex-1">
                    <Link href={`/blog/${p.slug}`} className="group flex h-full items-center gap-4 rounded-[22px] border border-line bg-white p-3 transition-shadow hover:shadow-[0_20px_40px_-28px_rgba(18,15,27,0.35)] sm:gap-5">
                      <span className="block aspect-[16/9] w-[120px] shrink-0 overflow-hidden rounded-2xl bg-mist sm:w-[168px]">
                        <Cover p={p} className="h-full w-full" />
                      </span>
                      <span className="min-w-0 py-1 pr-2">
                        {p.category && <span className="block text-xs font-semibold text-lav-700">{p.category}</span>}
                        <span className="mt-1 line-clamp-2 block font-display text-base font-semibold leading-snug tracking-tight group-hover:text-lav-700 sm:text-lg">{p.title}</span>
                        <span className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted"><Clock size={12} /> {p.mins} min read</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
