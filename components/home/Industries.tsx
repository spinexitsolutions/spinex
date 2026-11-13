"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight, BedDouble, Briefcase, Building2, Camera, Car, ChevronDown, Dumbbell, Factory, Gem, GraduationCap,
  HeartHandshake, Hospital, Landmark, PartyPopper, Plane, Rocket, Scale, Scissors, Shirt, ShoppingCart, Sparkles,
  Stethoscope, Store, Truck, UtensilsCrossed, Wrench, type LucideIcon,
} from "lucide-react";
import { useContent } from "../ContentProvider";
import type { Industry } from "@/lib/content";
import { SplitHeading, ease } from "../Reveal";

const icons: Record<string, LucideIcon> = {
  government: Landmark, hospital: Hospital, doctor: Stethoscope, building: Building2, education: GraduationCap,
  cart: ShoppingCart, store: Store, hotel: BedDouble, food: UtensilsCrossed, corporate: Briefcase, salon: Scissors,
  factory: Factory, startup: Rocket, creator: Sparkles, gym: Dumbbell, law: Scale, jewellery: Gem, fashion: Shirt,
  travel: Plane, auto: Car, events: PartyPopper, ngo: HeartHandshake, photo: Camera, logistics: Truck, services: Wrench,
  // Older saved industries without an icon key
  local: Store, ecom: ShoppingCart, creators: Sparkles, startups: Rocket,
};

// On phones only the first few show, with a button to open the rest.
const PHONE_LIMIT = 6;

// "Who we work with": one dark box split into cells (4 across on computers, 2 on phones). Each cell has
// an icon, the industry and one line on what we do for it. Industries are added in Admin → Industries.
export default function Industries() {
  const { content } = useContent();
  const list = content.industries.filter((x) => x && String(x.title || "").trim());
  const [all, setAll] = useState(false);
  if (!list.length) return null;
  const sec = content.sections.industries;
  const more = list.length > PHONE_LIMIT;
  // Empty cells finish the last row, so the grid lines stay even.
  const fill4 = (4 - (list.length % 4)) % 4;
  const fill2 = (all || !more ? list.length : PHONE_LIMIT) % 2;

  return (
    <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-28" data-industries>
      <div aria-hidden className="pointer-events-none absolute -right-52 -top-64 h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(110,89,217,0.32),transparent_65%)]" />
      <div className="container-x relative">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-lav-300 sm:text-[13px]">Industries</p>
            <SplitHeading key={sec.heading} text={sec.heading} className="h-display text-4xl sm:text-6xl" />
          </div>
          {sec.intro && <p className="max-w-md text-white/60 sm:text-lg">{sec.intro}</p>}
        </div>

        <div className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.08] sm:mt-12 sm:rounded-[28px] lg:grid-cols-4">
          {list.map((ind, i) => (
            <Cell key={ind.id} ind={ind} i={i} hidden={!all && more && i >= PHONE_LIMIT} />
          ))}
          {/* fillers: one on phones when the visible count is odd, the rest on computers */}
          {fill2 === 1 && <div aria-hidden className="bg-ink lg:hidden" />}
          {Array.from({ length: fill4 }).map((_, i) => (
            <div key={i} aria-hidden className="hidden bg-ink lg:block" />
          ))}
        </div>

        {more && !all && (
          <button type="button" onClick={() => setAll(true)} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-semibold text-white transition hover:bg-white/10 lg:hidden">
            See all {list.length} industries <ChevronDown size={16} />
          </button>
        )}

        <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:px-1">
          <p className="text-[15px] text-white/60">Don&apos;t see your industry? We have probably worked with it.</p>
          <Link href="/contact" className="btn-light w-full justify-center sm:w-auto">Tell us about your business <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

function Cell({ ind, i, hidden }: { ind: Industry; i: number; hidden: boolean }) {
  const Icon = icons[ind.icon || ""] ?? icons[ind.id] ?? Building2;
  const desc = String(ind.description || "");
  const short = desc.split(",")[0].replace(/\.$/, "");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px 0px" }}
      transition={{ duration: 0.6, ease, delay: (i % 4) * 0.06 }}
      className={`${hidden ? "hidden lg:block" : ""} bg-ink`}
    >
      <Link
        href="/contact"
        className="group relative flex h-full flex-col p-4 transition-colors duration-300 hover:bg-[radial-gradient(120%_120%_at_0%_0%,rgba(110,89,217,0.35),rgba(110,89,217,0.08)_60%,transparent)] sm:p-7 lg:p-8"
      >
        <ArrowUpRight size={16} className="absolute right-5 top-6 hidden text-white/25 transition group-hover:text-white sm:block" />
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-lav-400/30 bg-gradient-to-br from-lav-400/30 to-lav-400/5 text-lav-200 transition-colors group-hover:border-lav-600 group-hover:bg-lav-600 group-hover:bg-none group-hover:text-white sm:h-[52px] sm:w-[52px] sm:rounded-2xl">
          <Icon size={20} strokeWidth={1.7} />
        </span>
        <h3 className="mt-3 font-display text-[15px] font-semibold leading-snug tracking-tight sm:mt-5 sm:text-lg lg:text-[19px]">{ind.title}</h3>
        {desc && (
          <>
            <p className="mt-1 text-xs leading-relaxed text-white/55 sm:hidden">{short}</p>
            <p className="mt-2 hidden text-[14.5px] leading-relaxed text-white/60 sm:block">{desc}</p>
          </>
        )}
      </Link>
    </motion.div>
  );
}
