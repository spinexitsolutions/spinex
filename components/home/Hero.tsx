"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useContent } from "../ContentProvider";
import DotField from "./DotField";
import LiveBuild from "./LiveBuild";
import { ease } from "../Reveal";
import { useIntroDone } from "../Intro";

export default function Hero() {
  const { content } = useContent();
  const words = content.hero.title.split(" ");
  const ready = useIntroDone();

  return (
    <section className="relative flex items-center overflow-hidden bg-white pb-16 pt-28 sm:pt-32 lg:h-[100svh] lg:min-h-[620px] lg:pb-6 lg:pt-24">
      <DotField className="[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.08fr_1fr] lg:gap-14">
        <div>
          {/* One H1: the keyword line (for search) plus the headline */}
          <h1>
            <motion.span initial={{ opacity: 0, y: 10 }} animate={ready ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.6, ease }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-muted">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lav-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lav-600" />
              </span>
              {content.hero.kicker}
            </motion.span>
            <span className="sr-only"> – </span>
            <span className="h-display block text-[2.6rem] sm:text-6xl lg:text-[clamp(2.4rem,6.4vh,4.4rem)]">
              {words.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-top">
                  <motion.span className="inline-block" initial={{ y: "110%", rotate: 4 }} animate={ready ? { y: "0%", rotate: 0 } : undefined} transition={{ duration: 1, delay: 0.15 + i * 0.055, ease }}>
                    {w}&nbsp;
                  </motion.span>
                </span>
              ))}
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={ready ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.8, delay: 0.7, ease }} className="mt-5 max-w-[34rem] text-base leading-relaxed text-muted sm:text-lg">
            {content.hero.subtitle}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={ready ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.8, delay: 0.85, ease }} className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/contact" className="btn-dark group">
              {content.hero.primaryCta}
              <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/work" className="btn-ghost">{content.hero.secondaryCta}</Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : undefined} transition={{ delay: 1.1, duration: 0.8 }} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-muted lg:[@media(max-height:760px)]:hidden">
            {content.stats.slice(0, 2).map((s) => (
              <div key={s.id}>
                <p className="font-display text-2xl font-semibold text-ink">{s.value}</p>
                <p>{s.label}</p>
              </div>
            ))}
            <div className="flex items-center gap-2"><MapPin size={16} className="text-lav-600" /> {content.contact.location}</div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={ready ? { opacity: 1, y: 0, scale: 1 } : undefined} transition={{ duration: 1.1, delay: 0.35, ease }}>
          <LiveBuild />
        </motion.div>
      </div>
    </section>
  );
}
