"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Building2, Check, Rocket, ShoppingBag, Sparkles, Store, type LucideIcon } from "lucide-react";
import { useContent } from "../ContentProvider";
import type { Industry } from "@/lib/content";
import { SplitHeading, ease } from "../Reveal";

const icons: Record<string, LucideIcon> = { local: Store, ecom: ShoppingBag, creators: Sparkles, startups: Rocket };
const tones = ["bg-ink", "bg-ink-3", "bg-lav-700", "bg-ink-3"];

// "Who we work with": the industries as a 2-column grid of cards (one column on phones),
// so the whole section fits in about one screen instead of a long pinned scroll.
export default function Industries() {
  const { content } = useContent();
  const list = content.industries;
  if (!list.length) return null;

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SplitHeading key={content.sections.industries.heading} text={content.sections.industries.heading} className="h-display text-4xl sm:text-6xl" />
          <p className="max-w-sm text-muted">{content.sections.industries.intro}</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5">
          {list.map((ind, i) => (
            <Card key={ind.id} ind={ind} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ ind, i }: { ind: Industry; i: number }) {
  const Icon = icons[ind.id] ?? Building2;
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease, delay: (i % 2) * 0.08 }}
      className={`group relative flex flex-col overflow-hidden rounded-[28px] text-white ${tones[i % tones.length]}`}
    >
      <div className="relative h-40 overflow-hidden sm:h-48">
        <img src={ind.image} alt={ind.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur"><Icon size={20} className="text-white" /></span>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{ind.title}</h3>
        <p className="mt-2 text-white/70">{ind.description}</p>
        <ul className="mt-5 space-y-2">
          {ind.points.map((pt) => (
            <li key={pt} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-ink"><Check size={12} /></span>
              {pt}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          <Link href="/contact" className="btn-light w-fit">Talk about your business <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </motion.article>
  );
}
