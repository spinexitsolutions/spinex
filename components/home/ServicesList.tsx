"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { useContent } from "../ContentProvider";
import { serviceSlug } from "@/lib/content";
import { Reveal, SplitHeading, ease } from "../Reveal";

// Desktop: list on the left, a sticky preview card on the right that changes with the
// hovered or focused service. Mobile: each row opens in place with its image.
export default function ServicesList() {
  const { content } = useContent();
  const services = content.services;
  const [active, setActive] = useState(services[0]?.id);
  const [open, setOpen] = useState<string | null>(null);
  const current = services.find((s) => s.id === active) ?? services[0];
  if (!current) return null;

  return (
    <section className="bg-ink py-24 text-white sm:py-32">
      <div className="container-x">
        <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SplitHeading key={content.sections.services.heading} text={content.sections.services.heading} className="h-display max-w-2xl text-4xl sm:text-6xl" />
          <Reveal delay={0.2}>
            <p className="max-w-sm text-white/60">{content.sections.services.intro}</p>
          </Reveal>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <ul className="border-t border-white/10">
            {services.map((s) => {
              const isActive = s.id === current.id;
              const isOpen = open === s.id;
              return (
                <li key={s.id} className="relative border-b border-white/10">
                  {isActive && (
                    <motion.span layoutId="service-bar" className="absolute bottom-0 left-0 top-0 hidden w-[3px] bg-lav-400 lg:block" transition={{ type: "spring", stiffness: 380, damping: 34 }} />
                  )}

                  {/* Desktop row: hover or focus selects it */}
                  <Link
                    href={`/services/${serviceSlug(s)}`}
                    onMouseEnter={() => setActive(s.id)}
                    onFocus={() => setActive(s.id)}
                    className="hidden items-center gap-6 py-7 pl-8 pr-2 lg:flex"
                  >
                    <div className="flex-1">
                      <h3 className={`block font-display text-4xl font-medium tracking-tight transition-colors duration-300 xl:text-5xl ${isActive ? "text-white" : "text-white/40"}`}>
                        {s.title}
                      </h3>
                    </div>
                    <motion.span
                      animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -10 }}
                      transition={{ duration: 0.3, ease }}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lav-600"
                    >
                      <ArrowUpRight size={20} />
                    </motion.span>
                  </Link>

                  {/* Mobile row: tap to open */}
                  <button onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="flex w-full items-center gap-4 py-6 text-left lg:hidden">
                    <span className="flex-1">
                      <span className="block font-display text-3xl font-medium tracking-tight" role="heading" aria-level={3}>{s.title}</span>
                      <span className="mt-1 block text-white/60">{s.short}</span>
                    </span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20">
                      <Plus size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease }} className="overflow-hidden lg:hidden">
                        <div className="pb-8">
                          <img src={s.image} alt={s.title} loading="lazy" className="aspect-[16/10] w-full rounded-2xl object-cover" />
                          <p className="mt-5 leading-relaxed text-white/75">{s.description}</p>
                          <Tags tags={s.tags} />
                          <Link href={`/services/${serviceSlug(s)}`} className="btn-light mt-6">Learn more <ArrowUpRight size={16} /></Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>

          {/* Desktop preview card */}
          <div className="hidden lg:block">
            <div className="sticky top-28 overflow-hidden rounded-[28px] bg-ink-2">
              <div className="relative aspect-[4/3] overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={current.id}
                    src={current.image}
                    alt={current.title}
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </AnimatePresence>
              </div>
              <div className="min-h-[230px] p-7">
                <AnimatePresence mode="wait">
                  <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease }}>
                    <p className="leading-relaxed text-white/75">{current.description}</p>
                    <Tags tags={current.tags} />
                    <Link href={`/services/${serviceSlug(current)}`} className="btn-light mt-6">Explore {current.title.toLowerCase()} <ArrowUpRight size={16} /></Link>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">{t}</span>
      ))}
    </div>
  );
}
