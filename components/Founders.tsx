"use client";

import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";
import { useContent } from "./ContentProvider";
import { SplitHeading, ease } from "./Reveal";
import type { Founder } from "@/lib/content";

// "The people behind Spinex" on the About page: photo, name, role, two lines and LinkedIn for each
// person. Edited and switched on or off in Admin → About and stats → Founders.
export default function Founders() {
  const { content } = useContent();
  const f = content.founders;
  const people = (f?.people ?? []).filter((p) => p.name.trim());
  if (!f?.show || !people.length) return null;

  return (
    <section className="bg-white py-24 sm:py-32" aria-labelledby="founders-heading" data-founders>
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div id="founders-heading">
            <SplitHeading key={f.heading} text={f.heading || "The people behind Spinex."} className="h-display text-4xl sm:text-6xl" />
          </div>
          {f.intro && <p className="max-w-sm text-muted">{f.intro}</p>}
        </div>
        <div className={`mt-12 grid gap-5 sm:grid-cols-2 ${people.length >= 3 ? "lg:grid-cols-3" : ""}`}>
          {people.map((p, i) => <Person key={p.id} p={p} i={i} />)}
        </div>
      </div>
    </section>
  );
}

function Person({ p, i }: { p: Founder; i: number }) {
  const initials = p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease, delay: i * 0.08 }}
      className="group"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-mist">
        {p.photo ? (
          <img src={p.photo} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" />
        ) : (
          <div aria-hidden className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgb(var(--c-lav-300)),rgb(var(--c-lav-600))_70%)]">
            <span className="font-display text-7xl font-semibold tracking-tight text-white/90">{initials}</span>
          </div>
        )}
        {p.linkedin && (
          <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on LinkedIn`} className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-lg transition hover:bg-lav-100">
            <Linkedin size={18} />
          </a>
        )}
      </div>
      <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight">{p.name}</h3>
      {p.role && <p className="mt-0.5 text-sm font-semibold uppercase tracking-[0.12em] text-lav-700">{p.role}</p>}
      {p.bio && <p className="mt-2 max-w-sm text-muted">{p.bio}</p>}
    </motion.article>
  );
}
