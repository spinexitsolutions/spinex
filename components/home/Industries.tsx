"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight, Building2, Check, Rocket, ShoppingBag, Sparkles, Store, type LucideIcon } from "lucide-react";
import { useContent } from "../ContentProvider";
import type { Industry } from "@/lib/content";
import { SplitHeading } from "../Reveal";

const icons: Record<string, LucideIcon> = { local: Store, ecom: ShoppingBag, creators: Sparkles, startups: Rocket };
const tones = ["bg-ink", "bg-[#2A2340]", "bg-lav-700", "bg-ink-3"];

// Stacking cards: each industry pins near the top and the next one slides over it,
// while the cards underneath shrink and dim. Works by scroll alone, so phones and
// laptops behave the same.
export default function Industries() {
  const { content } = useContent();
  const list = content.industries;
  const stack = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stack, offset: ["start start", "end end"] });
  if (!list.length) return null;

  return (
    <section className="bg-white pt-24 sm:pt-32">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SplitHeading key={content.sections.industries.heading} text={content.sections.industries.heading} className="h-display text-4xl sm:text-6xl" />
          <p className="max-w-sm text-muted">{content.sections.industries.intro}</p>
        </div>
      </div>

      <div ref={stack} className="container-x relative pb-24">
        {list.map((ind, i) => (
          <StackCard key={ind.id} ind={ind} i={i} n={list.length} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}

function StackCard({ ind, i, n, progress }: { ind: Industry; i: number; n: number; progress: MotionValue<number> }) {
  const Icon = icons[ind.id] ?? Building2;
  const start = i / n;
  const scale = useTransform(progress, [start, 1], [1, 1 - (n - 1 - i) * 0.05]);
  const shade = useTransform(progress, [start, Math.min(1, start + 1 / n)], [0, i === n - 1 ? 0 : 0.45]);
  const imgScale = useTransform(progress, [Math.max(0, start - 1 / n), start], [1.25, 1]);

  return (
    <div className="sticky top-0 flex h-[100svh] items-start" style={{ paddingTop: `calc(5.5rem + ${i * 16}px)` }}>
      <motion.article
        style={{ scale }}
        className={`relative w-full origin-top overflow-hidden rounded-[28px] text-white shadow-[0_-20px_60px_-30px_rgba(18,15,27,0.6)] ${tones[i % tones.length]}`}
      >
        <div className="grid md:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col p-6 sm:p-10 md:order-1">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Icon size={22} className="text-lav-200" /></span>
              <span className="text-sm text-white/60">{i + 1} of {n}</span>
            </div>
            <h3 className="mt-4 font-display text-3xl sm:mt-6 font-semibold tracking-tight sm:text-5xl">{ind.title}</h3>
            <p className="mt-2 max-w-md text-white/70 sm:mt-3 sm:text-lg">{ind.description}</p>
            <ul className="mt-6 space-y-2.5">
              {ind.points.map((pt) => (
                <li key={pt} className="flex items-center gap-3 text-[15px]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-ink"><Check size={13} /></span>
                  {pt}
                </li>
              ))}
            </ul>
            <Link href="/contact" className="btn-light mt-8 w-fit">Talk about your business <ArrowUpRight size={16} /></Link>
          </div>
          <div className="relative order-first h-32 overflow-hidden sm:h-56 md:order-2 md:h-auto md:min-h-[440px]">
            <motion.img style={{ scale: imgScale }} src={ind.image} alt={ind.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
        <motion.div aria-hidden style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-ink" />
      </motion.article>
    </div>
  );
}
