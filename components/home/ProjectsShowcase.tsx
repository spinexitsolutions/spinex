"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useContent } from "../ContentProvider";
import type { Project } from "@/lib/content";
import { SplitHeading, ease } from "../Reveal";

const AUTO_MS = 6000;

// Each project plays inside a laptop (and a phone on larger screens).
// Pick from the list, or let it move on by itself; hovering pauses it.
// `full` (Work page): every project, category filters, no section heading.
export default function ProjectsShowcase({ full = false }: { full?: boolean }) {
  const { content } = useContent();
  const isDemo = (p: Project) => p.type === "demo";
  const hasDemo = content.projects.some(isDemo);
  const hasClient = content.projects.some((p) => !isDemo(p));
  // Type filters appear only when both kinds exist; category filters follow.
  const categories = [
    "All",
    ...(hasDemo && hasClient ? ["Client work", "Demos"] : []),
    ...Array.from(new Set(content.projects.map((p) => p.category).filter(Boolean))),
  ];
  const [filter, setFilter] = useState("All");
  const matches = (p: Project) =>
    filter === "All" || (filter === "Client work" ? !isDemo(p) : filter === "Demos" ? isDemo(p) : p.category === filter);
  // Home page: client work first, then demos.
  const ordered = [...content.projects.filter((p) => !isDemo(p)), ...content.projects.filter(isDemo)];
  const projects = full ? content.projects.filter(matches) : ordered.slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { margin: "-20%" });
  const opened = useInView(box, { once: true, margin: "-15%" });
  const reduced = useReducedMotion();
  const current = projects[index] ?? projects[0];

  useEffect(() => {
    if (paused || !inView || reduced || projects.length < 2) return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % projects.length);
    }, AUTO_MS);
    return () => {
      clearTimeout(t);
    };
  }, [index, paused, inView, reduced, projects.length]);

  if (!current)
    return full ? (
      <section className="bg-mist py-24 sm:py-32">
        <div className="container-x max-w-2xl text-center">
          <h2 className="h-display text-3xl sm:text-4xl">Our latest work is on its way.</h2>
          <p className="mt-4 text-lg text-muted">We are adding recent projects here. Want to see examples for your industry? Ask us and we will share them directly.</p>
          <Link href="/contact" className="btn-dark mt-8 inline-flex">Ask for examples <ArrowUpRight size={17} /></Link>
        </div>
      </section>
    ) : null;
  const go = (d: 1 | -1) => setIndex((i) => (i + d + projects.length) % projects.length);
  const running = !paused && inView && !reduced;

  return (
    <section className="overflow-hidden bg-mist py-24 sm:py-32">
      <div className="container-x">
        {full ? (
          <div className="mb-12 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter projects">
            {categories.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={filter === c}
                onClick={() => {
                  setFilter(c);
                  setIndex(0);
                }}
                className="relative min-h-11 rounded-full px-5 py-2.5 text-sm font-medium"
              >
                {filter === c && <motion.span layoutId="work-page-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <span className={`relative ${filter === c ? "text-white" : "text-muted hover:text-ink"}`}>{c}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SplitHeading key={content.sections.work.heading} text={content.sections.work.heading} className="h-display text-4xl sm:text-6xl" />
            <Link href="/work" className="btn-ghost w-fit bg-white">All projects <ArrowUpRight size={16} /></Link>
          </div>
        )}

        <div ref={box} className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-14" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* Project list (desktop) */}
          <ul className="hidden max-h-[560px] overflow-y-auto pr-1 lg:block" role="tablist" aria-label="Projects" data-lenis-prevent>
            {projects.map((p, i) => {
              const on = i === index;
              return (
                <li key={p.id}>
                  <button
                    role="tab"
                    aria-selected={on}
                    onClick={() => setIndex(i)}
                    onFocus={() => setPaused(true)}
                    className="group relative w-full overflow-hidden rounded-2xl px-5 py-4 text-left"
                  >
                    {on && <motion.span layoutId="project-active" className="absolute inset-0 rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(18,15,27,0.35)]" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
                    <span className="relative flex items-center justify-between gap-4">
                      <span>
                        <span className={`flex items-center gap-2 text-xs ${on ? "text-lav-700" : "text-muted"}`}>{p.category}{isDemo(p) && <DemoTag />}</span>
                        <span className={`mt-0.5 block font-display text-xl font-semibold tracking-tight transition-colors ${on ? "text-ink" : "text-muted group-hover:text-ink"}`}>{p.title}</span>
                      </span>
                      <ArrowRight size={18} className={`shrink-0 transition-all duration-300 ${on ? "translate-x-0 text-lav-600 opacity-100" : "-translate-x-2 opacity-0"}`} />
                    </span>
                    {on && (
                      <span className="absolute inset-x-5 bottom-2 h-[2px] overflow-hidden rounded-full bg-line">
                        <motion.span
                          key={`${index}-${running}`}
                          className="block h-full origin-left bg-lav-600"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: running ? 1 : 0 }}
                          transition={{ duration: running ? AUTO_MS / 1000 : 0.2, ease: "linear" }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Devices */}
          <div>
            <div className="relative mx-auto max-w-[760px] pb-[4%] [perspective:1800px]">
              <Laptop project={current} open={opened} play={inView} />
              <div className="absolute -right-[2%] bottom-0 hidden w-[21%] sm:block">
                <Phone project={current} show={opened} />
              </div>
            </div>

            {/* Caption + controls (mobile and tablet) */}
            <div className="mt-8 flex items-center justify-between gap-4 lg:hidden">
              <AnimatePresence mode="wait">
                <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease }}>
                  <p className="flex items-center gap-2 text-xs text-lav-700">{current.category}{isDemo(current) && <DemoTag />}</p>
                  <h3 className="font-display text-2xl font-semibold tracking-tight">{current.title}</h3>
                  <p className="mt-1 text-sm text-muted">{current.summary}</p>
                </motion.div>
              </AnimatePresence>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => go(-1)} aria-label="Previous project" className="grid h-12 w-12 place-items-center rounded-full border border-line bg-white"><ArrowLeft size={18} /></button>
                <button onClick={() => go(1)} aria-label="Next project" className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white"><ArrowRight size={18} /></button>
              </div>
            </div>
            <div className="mt-5 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {projects.map((p, i) => (
                <motion.span key={p.id} animate={{ width: i === index ? 22 : 6, backgroundColor: i === index ? "#6E59D9" : "#E6E2EF" }} className="h-1.5 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Laptop({ project, open, play }: { project: Project; open: boolean; play: boolean }) {
  return (
    <div>
      {/* Lid opens when the section first comes into view */}
      <motion.div
        initial={{ rotateX: -70, opacity: 0 }}
        animate={open ? { rotateX: 0, opacity: 1 } : undefined}
        transition={{ duration: 1.3, ease }}
        style={{ transformOrigin: "bottom center" }}
        className="relative mx-[6%] rounded-t-[18px] border border-[#2c2836] bg-[#17141f] p-[1.6%] pb-[2.4%] shadow-[0_40px_80px_-30px_rgba(41,26,110,0.45)]"
      >
        <span aria-hidden className="absolute left-1/2 top-[0.6%] z-10 h-[2.4%] w-[12%] -translate-x-1/2 rounded-b-md bg-[#17141f]" />
        <div className="relative aspect-[16/10] overflow-hidden rounded-[6px] bg-white">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={project.id} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }} className="absolute inset-0">
              <SiteScreen project={project} play={play} />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      {/* Base */}
      <div aria-hidden className="relative h-[14px] rounded-b-[14px] rounded-t-[3px] bg-gradient-to-b from-[#d9d5e3] to-[#a8a3b5] sm:h-[18px]">
        <span className="absolute left-1/2 top-0 h-[40%] w-[14%] -translate-x-1/2 rounded-b-lg bg-[#bdb8c9]" />
      </div>
    </div>
  );
}

// A small website built from the project's image and text; it scrolls slowly like someone browsing.
function SiteScreen({ project, play }: { project: Project; play: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="h-full overflow-hidden">
      <motion.div
        className="h-[230%]"
        animate={reduced || !play ? { y: "0%" } : { y: ["0%", "0%", "-56%", "-56%"] }}
        transition={play && !reduced ? { duration: 11, times: [0, 0.12, 0.85, 1], repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } : { duration: 0.4 }}
      >
        <div className="flex h-[5%] items-center justify-between border-b border-line px-[4%]">
          <span className="truncate text-[clamp(7px,1.1vw,12px)] font-bold">{project.title.split(" ").slice(0, 2).join(" ")}</span>
          <span className="flex gap-[6px]">{[0, 1, 2].map((i) => <span key={i} className="h-[5px] w-[22px] rounded bg-line" />)}</span>
        </div>
        <div className="relative h-[34%] overflow-hidden bg-ink">
          <img src={project.image} alt={project.title} className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 to-transparent" />
          <div className="absolute left-[5%] top-1/2 w-[60%] -translate-y-1/2 text-white">
            <p className="font-display text-[clamp(11px,2.3vw,26px)] font-semibold leading-tight">{project.title}</p>
            <p className="mt-1 text-[clamp(7px,1vw,12px)] text-white/75">{project.summary}</p>
            <span className="mt-2 inline-block rounded-full bg-lav-400 px-[8%] py-[2%] text-[clamp(6px,0.9vw,11px)] font-semibold text-ink">Learn more</span>
          </div>
        </div>
        <div className="grid h-[22%] grid-cols-3 gap-[3%] p-[4%]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-[8%] rounded-lg border border-line p-[6%]">
              <div className="flex-1 rounded-md bg-lav-100" />
              <div className="h-[8%] w-4/5 rounded bg-line" />
              <div className="h-[8%] w-1/2 rounded bg-line" />
            </div>
          ))}
        </div>
        <div className="grid h-[24%] grid-cols-2 gap-[4%] px-[4%] pb-[4%]">
          <div className="overflow-hidden rounded-lg bg-mist"><img src={project.image} alt="" className="h-full w-full object-cover" /></div>
          <div className="flex flex-col justify-center gap-[8%]">
            <div className="h-[8%] w-4/5 rounded bg-ink" />
            <div className="h-[6%] w-full rounded bg-line" />
            <div className="h-[6%] w-11/12 rounded bg-line" />
            <div className="h-[6%] w-3/5 rounded bg-line" />
          </div>
        </div>
        <div className="h-[15%] bg-ink" />
      </motion.div>
    </div>
  );
}

function Phone({ project, show }: { project: Project; show: boolean }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={show ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 0.9, delay: 0.8, ease }}
      className="relative aspect-[9/19] overflow-hidden rounded-[22%/10%] border-[5px] border-[#17141f] bg-white shadow-[0_30px_60px_-20px_rgba(18,15,27,0.55)]"
    >
      <span aria-hidden className="absolute left-1/2 top-[2%] z-10 h-[3%] w-[34%] -translate-x-1/2 rounded-full bg-[#17141f]" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, delay: 0.1, ease }} className="absolute inset-0 flex flex-col">
          <div className="relative h-[46%] bg-ink">
            <img src={project.image} alt="" className="h-full w-full object-cover opacity-75" />
            <p className="absolute bottom-[8%] left-[8%] right-[8%] font-display text-[clamp(8px,1vw,13px)] font-semibold leading-tight text-white">{project.title}</p>
          </div>
          <div className="flex flex-1 flex-col gap-[5%] p-[9%]">
            <div className="h-[6%] w-4/5 rounded bg-line" />
            <div className="h-[6%] w-3/5 rounded bg-line" />
            <div className="mt-auto h-[16%] rounded-full bg-ink" />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function DemoTag() {
  return <span className="rounded-full bg-lav-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lav-700">Demo</span>;
}
