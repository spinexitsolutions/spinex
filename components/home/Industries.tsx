"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Building2, Check, Rocket, ShoppingBag, Sparkles, Store, type LucideIcon } from "lucide-react";
import { useContent } from "../ContentProvider";
import type { Industry } from "@/lib/content";
import { SplitHeading, ease } from "../Reveal";
import { sized } from "@/lib/img";

const icons: Record<string, LucideIcon> = { local: Store, ecom: ShoppingBag, creators: Sparkles, startups: Rocket };
const tones = ["bg-ink", "bg-ink-3", "bg-lav-700", "bg-ink-3"];

// "Who we work with": compact cards, four in one row on big screens, two on tablets, and a
// side-swipe row on phones, so the whole section takes about half a screen.
export default function Industries() {
  const { content } = useContent();
  const list = content.industries;
  if (!list.length) return null;

  return (
    <section className="bg-white py-20 sm:py-24" data-industries>
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SplitHeading key={content.sections.industries.heading} text={content.sections.industries.heading} className="h-display text-4xl sm:text-5xl" />
          <p className="max-w-sm text-muted">{content.sections.industries.intro}</p>
        </div>
        <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
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
      className={`group relative flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] text-white sm:w-auto ${tones[i % tones.length]}`}
    >
      <div className="relative h-28 overflow-hidden">
        <img src={sized(ind.image, 960)} alt={ind.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur"><Icon size={17} className="text-white" /></span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold tracking-tight">{ind.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-white/70">{ind.description}</p>
        <ul className="mt-4 space-y-1.5">
          {ind.points.slice(0, 3).map((pt) => (
            <li key={pt} className="flex items-start gap-2 text-[13px] leading-snug">
              <span className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white text-ink"><Check size={10} /></span>
              {pt}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-5">
          <Link href="/contact" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white underline-offset-4 hover:underline">Talk to us <ArrowUpRight size={15} /></Link>
        </div>
      </div>
    </motion.article>
  );
}
