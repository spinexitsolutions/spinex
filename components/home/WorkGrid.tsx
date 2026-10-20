"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useContent } from "../ContentProvider";
import { SplitHeading, ease } from "../Reveal";

export default function WorkGrid({ limit, showHeading = true }: { limit?: number; showHeading?: boolean }) {
  const { content } = useContent();
  const categories = useMemo(() => ["All", ...Array.from(new Set(content.projects.map((p) => p.category)))], [content.projects]);
  const [filter, setFilter] = useState("All");
  const list = content.projects.filter((p) => filter === "All" || p.category === filter).slice(0, limit);

  return (
    <section className="bg-mist py-24 sm:py-32">
      <div className="container-x">
        {showHeading && (
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SplitHeading text="Selected work." className="h-display text-4xl sm:text-6xl" />
            {limit && <Link href="/work" className="btn-ghost w-fit bg-white">All projects <ArrowUpRight size={16} /></Link>}
          </div>
        )}

        <div className="mb-10 flex flex-wrap gap-2" role="tablist" aria-label="Filter projects">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)} className="relative min-h-11 rounded-full px-5 py-2.5 text-sm font-medium">
              {filter === c && <motion.span layoutId="work-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className={`relative ${filter === c ? "text-white" : "text-muted hover:text-ink"}`}>{c}</span>
            </button>
          ))}
        </div>

        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.article
                key={p.id}
                layout
                initial={{ opacity: 0, clipPath: "inset(18% 0% 0% 0% round 24px)" }}
                whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 24px)" }}
                exit={{ opacity: 0, scale: 0.94 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: (i % 3) * 0.08, ease }}
                className={`group relative overflow-hidden rounded-3xl bg-ink ${i % 3 === 1 ? "lg:mt-12" : ""}`}
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <span className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">{p.category}</span>
                  <h3 className="font-display text-2xl font-semibold tracking-tight">{p.title}</h3>
                  <p className="mt-2 max-h-0 overflow-hidden text-white/70 opacity-0 transition-all duration-500 group-hover:max-h-20 group-hover:opacity-100">{p.summary}</p>
                </div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="absolute right-5 top-5 grid h-11 w-11 scale-0 place-items-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:scale-100" aria-label={`Open ${p.title}`}>
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
