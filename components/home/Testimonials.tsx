"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import { useContent } from "../ContentProvider";
import { SplitHeading, ease } from "../Reveal";
import type { Testimonial } from "@/lib/content";

// Client quotes from Admin → Testimonials. Hidden until at least one is added.
// One quote: a single large card. Two or more: a row of cards that slides (arrows, swipe or drag).
export default function Testimonials() {
  const { content } = useContent();
  const list = content.testimonials.filter((t) => String(t.quote || "").trim());
  const sec = content.sections.testimonials ?? { heading: "What our clients say.", intro: "" };
  const row = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = () => {
    const el = row.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [list.length]);

  if (!list.length) return null;
  const many = list.length > 1;
  const scroll = (dir: -1 | 1) => {
    const el = row.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? el.clientWidth * 0.8) + 24), behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-lav-600/20 blur-[120px]" aria-hidden />
      <div className="container-x relative">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SplitHeading key={sec.heading} text={sec.heading} className="h-display text-4xl sm:text-6xl" />
            {sec.intro && <p className="mt-4 max-w-md text-white/60">{sec.intro}</p>}
          </div>
          {many && (
            <div className="flex shrink-0 gap-2">
              <button onClick={() => scroll(-1)} disabled={edge.start} aria-label="Previous" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 transition hover:bg-white hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white"><ArrowLeft size={18} /></button>
              <button onClick={() => scroll(1)} disabled={edge.end} aria-label="Next" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 transition hover:bg-white hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white"><ArrowRight size={18} /></button>
            </div>
          )}
        </div>

        {many ? (
          <div
            ref={row}
            onScroll={update}
            data-lenis-prevent
            className="-mx-5 mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {list.map((t, i) => (
              <motion.div
                key={t.id}
                data-card
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: Math.min(i, 3) * 0.08, ease }}
                className="w-[85%] shrink-0 snap-start sm:w-[60%] lg:w-[calc((100%-48px)/3)]"
              >
                <Card t={t} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }} className="mt-12 max-w-4xl">
            <Card t={list[0]} large />
          </motion.div>
        )}
      </div>
    </section>
  );
}

function Card({ t, large = false }: { t: Testimonial; large?: boolean }) {
  const stars = Number(t.rating) || 0;
  const initials = String(t.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <figure className={`flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur ${large ? "p-8 sm:p-12" : "p-7 sm:p-8"}`}>
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lav-600/25 text-lav-300"><Quote size={20} /></span>
        {stars > 0 && (
          <span className="flex gap-0.5 text-amber-400" aria-label={`${stars} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} className={i < stars ? "fill-current" : "opacity-25"} />)}
          </span>
        )}
      </div>
      <blockquote className={`mt-6 flex-1 font-display font-medium leading-snug tracking-tight text-white ${large ? "text-2xl sm:text-4xl" : "text-xl sm:text-[22px]"}`}>
        “{t.quote.trim()}”
      </blockquote>
      <figcaption className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
        {t.photo ? (
          <img src={t.photo} alt={t.name} loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/10" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lav-400 to-lav-700 font-display text-base font-semibold text-white">{initials}</span>
        )}
        <span>
          <span className="block font-semibold text-white">{t.name}</span>
          {t.role && <span className="block text-sm text-white/55">{t.role}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
