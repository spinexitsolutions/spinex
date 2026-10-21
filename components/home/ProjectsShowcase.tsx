"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useContent } from "../ContentProvider";
import type { Project } from "@/lib/content";
import { SplitHeading, ease } from "../Reveal";
import ProjectStage from "./ProjectFrames";
import { projectSlug } from "@/lib/project-display";

const AUTO_MS = 6000;

// Live link for a project: only http(s) or site-relative links (the server sanitises these too).
const liveUrl = (p: Project) => {
  const u = p.url?.trim() ?? "";
  return /^https?:\/\//i.test(u) || /^\/(?!\/)/.test(u) || u === "/" ? u : "";
};

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
              const url = on ? liveUrl(p) : "";
              // The selected project's card opens its case study; other cards just select that project.
              const caseHref = on && !p.hidePage ? `/work/${projectSlug(p)}` : "";
              const inner = (
                <>
                  <span className="relative flex items-center justify-between gap-4">
                    <span>
                      <span className={`flex items-center gap-2 text-xs ${on ? "text-lav-700" : "text-muted"}`}>{p.category}{isDemo(p) && <DemoTag />}</span>
                      <span className={`mt-0.5 block font-display text-xl font-semibold tracking-tight transition-colors ${on ? "text-ink" : "text-muted group-hover:text-ink"}`}>{p.title}</span>
                      {caseHref && <span className="mt-1 block text-xs font-medium text-muted transition-colors group-hover:text-lav-700">Click to see the full case study</span>}
                    </span>
                    {caseHref ? (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lav-100 text-lav-700 transition-colors group-hover:bg-ink group-hover:text-white"><ArrowUpRight size={17} /></span>
                    ) : (
                      <ArrowRight size={18} className={`shrink-0 transition-all duration-300 ${on ? "translate-x-0 text-lav-600 opacity-100" : "-translate-x-2 opacity-0"}`} />
                    )}
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
                </>
              );
              const cls = `group relative block w-full overflow-hidden rounded-2xl px-5 ${caseHref ? "pb-5 pt-4" : "py-4"} text-left`;
              return (
                <li key={p.id} className="relative">
                  {on && <motion.span layoutId="project-active" className="absolute inset-0 rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(18,15,27,0.35)]" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
                  {caseHref ? (
                    <Link href={caseHref} onFocus={() => setPaused(true)} aria-label={`${p.title}: open the case study`} className={cls}>{inner}</Link>
                  ) : (
                    <button role="tab" aria-selected={on} onClick={() => setIndex(i)} onFocus={() => setPaused(true)} className={cls}>{inner}</button>
                  )}
                  {url && <VisitLink href={url} className="absolute right-16 top-4 z-10 text-xs" />}
                </li>
              );
            })}
          </ul>

          {/* Devices */}
          <div>
            <ProjectStage project={current} open={opened} play={inView} />

            {/* Caption + controls (mobile and tablet) */}
            <div className="mt-8 flex items-center justify-between gap-4 lg:hidden">
              <AnimatePresence mode="wait">
                <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease }}>
                  <p className="flex items-center gap-2 text-xs text-lav-700">{current.category}{isDemo(current) && <DemoTag />}</p>
                  {current.hidePage ? (
                    <h3 className="font-display text-2xl font-semibold tracking-tight">{current.title}</h3>
                  ) : (
                    <Link href={`/work/${projectSlug(current)}`} className="group block">
                      <h3 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
                        {current.title}
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lav-100 text-lav-700 transition-colors group-hover:bg-ink group-hover:text-white"><ArrowUpRight size={15} /></span>
                      </h3>
                      <p className="mt-1 text-sm text-muted">{current.summary}</p>
                      <span className="mt-1 block text-xs font-medium text-lav-700">Tap to see the full case study</span>
                    </Link>
                  )}
                  {current.hidePage && <p className="mt-1 text-sm text-muted">{current.summary}</p>}
                  {liveUrl(current) && <VisitLink href={liveUrl(current)} className="mt-2" />}
                </motion.div>
              </AnimatePresence>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => go(-1)} aria-label="Previous project" className="grid h-12 w-12 place-items-center rounded-full border border-line bg-white"><ArrowLeft size={18} /></button>
                <button onClick={() => go(1)} aria-label="Next project" className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white"><ArrowRight size={18} /></button>
              </div>
            </div>
            <div className="mt-5 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {projects.map((p, i) => (
                <motion.span key={p.id} animate={{ width: i === index ? 22 : 6 }} className={`h-1.5 rounded-full transition-colors ${i === index ? "bg-lav-600" : "bg-line"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VisitLink({ href, className = "" }: { href: string; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`inline-flex min-h-6 items-center gap-1 text-sm font-medium text-lav-700 underline-offset-4 hover:underline ${className}`}>
      Visit site <span aria-hidden>↗</span>
    </a>
  );
}

function DemoTag() {
  return <span className="rounded-full bg-lav-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lav-700">Demo</span>;
}
