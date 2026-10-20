"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useContent } from "../ContentProvider";
import { ease } from "../Reveal";

// Only shows when real testimonials have been added in the admin panel.
export default function Testimonials() {
  const { content } = useContent();
  const list = content.testimonials;
  const [i, setI] = useState(0);
  if (!list.length) return null;
  const t = list[i % list.length];

  return (
    <section className="bg-ink py-24 text-white sm:py-32">
      <div className="container-x max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.figure key={t.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.6, ease }}>
            <blockquote className="font-display text-3xl font-medium leading-snug tracking-tight sm:text-4xl">“{t.quote}”</blockquote>
            <figcaption className="mt-8 text-white/60"><span className="font-semibold text-white">{t.name}</span>, {t.role}</figcaption>
          </motion.figure>
        </AnimatePresence>
        {list.length > 1 && (
          <div className="mt-10 flex gap-2">
            <button onClick={() => setI((n) => (n - 1 + list.length) % list.length)} aria-label="Previous" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 hover:bg-white hover:text-ink"><ArrowLeft size={18} /></button>
            <button onClick={() => setI((n) => (n + 1) % list.length)} aria-label="Next" className="grid h-12 w-12 place-items-center rounded-full border border-white/20 hover:bg-white hover:text-ink"><ArrowRight size={18} /></button>
          </div>
        )}
      </div>
    </section>
  );
}
