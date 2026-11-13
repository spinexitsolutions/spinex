"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Linkedin } from "lucide-react";
import { useContent } from "./ContentProvider";
import { SplitHeading, ease } from "./Reveal";
import type { Founder } from "@/lib/content";
import { sized } from "@/lib/img";

// Each person's card gets its own colour mood (used behind the initials when there is no photo).
const moods = [
  "from-[#8f7bff] via-[#6e59d9] to-[#3d2f8f]",
  "from-[#ff9db5] via-[#c56ad8] to-[#5b3fb8]",
  "from-[#7fd6ff] via-[#5f7cf0] to-[#3b2d93]",
  "from-[#ffc98f] via-[#f07fa0] to-[#7a3fb5]",
];

// "The people behind Spinex" on the About page: a dark band with one card per person (photo or
// coloured initials, name, role, two lines, LinkedIn). Edited and switched on or off in
// Admin → About and stats → Founders.
export default function Founders() {
  const { content } = useContent();
  const f = content.founders;
  const people = (f?.people ?? []).filter((p) => p.name.trim());
  if (!f?.show || !people.length) return null;

  return (
    <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-24" aria-label={f.heading || "The people behind Spinex"} data-founders>
      <div aria-hidden className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-lav-600/25 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-[#c56ad8]/15 blur-[120px]" />
      <div className="container-x relative">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-lav-200">
              <span className="h-1.5 w-1.5 rounded-full bg-lav-300" /> Our team
            </p>
            <SplitHeading key={f.heading} text={f.heading || "The people behind Spinex."} className="h-display text-4xl sm:text-6xl" />
          </div>
          {f.intro && <p className="max-w-sm text-white/65">{f.intro}</p>}
        </div>
        <div className={`mx-auto mt-12 grid max-w-[920px] gap-5 grid-cols-2 ${people.length >= 3 ? "md:grid-cols-3" : ""}`}>
          {people.map((p, i) => <Person key={p.id} p={p} i={i} />)}
        </div>
        <div className="mx-auto mt-10 flex max-w-[920px] flex-col items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-6 sm:flex-row sm:items-center sm:p-7">
          <p className="text-lg text-white/80">You talk directly to the people who plan and build your project.</p>
          <a href="/contact" className="btn-light shrink-0">Talk to us <ArrowUpRight size={16} /></a>
        </div>
      </div>
    </section>
  );
}

function Person({ p, i }: { p: Founder; i: number }) {
  const initials = p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  // Gentle 3D tilt that follows the pointer on computers.
  const card = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 });
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !card.current) return;
    const r = card.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => { mx.set(0); my.set(0); };

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px 0px" }}
      transition={{ duration: 0.8, ease, delay: i * 0.1 }}
      className="[perspective:1000px]"
    >
      <motion.div
        ref={card}
        onPointerMove={move}
        onPointerLeave={leave}
        style={{ rotateX: rx, rotateY: ry }}
        className="group relative h-full overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-2.5 transition-colors duration-500 hover:border-lav-400/40"
      >
        <div className="relative aspect-square overflow-hidden rounded-[20px]">
          {p.photo ? (
            <img src={sized(p.photo, 960)} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" />
          ) : (
            <div aria-hidden className={`absolute inset-0 bg-gradient-to-br ${moods[i % moods.length]}`}>
              <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />
              <span className="absolute inset-0 grid place-items-center font-display text-[clamp(44px,6vw,80px)] font-semibold tracking-tight text-white/95 transition-transform duration-700 group-hover:scale-110">{initials}</span>
            </div>
          )}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          {p.role && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink backdrop-blur">{p.role}</span>
          )}
          {p.linkedin && (
            <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on LinkedIn`} className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-lg transition hover:scale-110 hover:bg-lav-100">
              <Linkedin size={16} />
            </a>
          )}
        </div>
        <div className="px-2 pb-3 pt-4">
          <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{p.name}</h3>
          {p.bio && <p className="mt-1.5 text-sm leading-relaxed text-white/65">{p.bio}</p>}
        </div>
      </motion.div>
    </motion.article>
  );
}
