"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Play } from "lucide-react";
import { useContent } from "../ContentProvider";
import type { Project } from "@/lib/content";
import { PROJECT_KIND, projectDisplay, projectSlug, type ProjectDisplay } from "@/lib/project-display";
import { sized } from "@/lib/img";
import { SplitHeading, ease } from "../Reveal";

// Home page "Our work": one project as a big card and up to four small ones, each drawn the way that
// kind of work looks (website in a browser and phone, software in an app window, app screens, an
// Instagram grid, an ad with results, a video, a design collage). Big/small/hidden is set per project
// in Admin → Projects; the full list with filters is on the Work page.
const MAX = 5;

const liveUrl = (p: Project) => {
  const u = p.url?.trim() ?? "";
  return /^https?:\/\//i.test(u) ? u : "";
};
const host = (u: string) => u.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
const pics = (p: Project) => {
  const list = (p.images ?? []).filter(Boolean);
  return list.length ? list : p.image ? [p.image] : [];
};
const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1] ?? "";

export default function HomeWork() {
  const { content } = useContent();
  const sec = content.sections.work;
  const pool = useMemo(() => {
    const list = content.projects.filter((p) => p.title && p.home !== "hide");
    // Client work first, then demos.
    return [...list.filter((p) => p.type !== "demo"), ...list.filter((p) => p.type === "demo")];
  }, [content.projects]);
  const kinds = useMemo(() => Array.from(new Set(pool.map((p) => projectDisplay(p)))), [pool]);
  const [kind, setKind] = useState<ProjectDisplay | "">("");
  if (!pool.length) return null;

  const list = kind ? pool.filter((p) => projectDisplay(p) === kind) : pool;
  const big = (!kind && list.find((p) => p.home === "featured")) || list[0];
  const small = list.filter((p) => p !== big).slice(0, MAX - 1);

  return (
    <section className="overflow-hidden bg-white py-20 sm:py-28" data-home-work>
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-lav-600 sm:text-[13px]">Our work</p>
            <SplitHeading key={sec.heading} text={sec.heading} className="h-display text-4xl sm:text-6xl" />
            {sec.intro && <p className="mt-4 max-w-xl text-muted sm:text-lg">{sec.intro}</p>}
          </div>
          <Link href="/work" className="btn-ghost w-fit shrink-0">All projects <ArrowUpRight size={16} /></Link>
        </div>

        {/* Filters only when there is more than one kind of work */}
        {kinds.length > 1 && (
          <div className="-mx-1 mt-7 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Filter projects">
            {(["", ...kinds] as (ProjectDisplay | "")[]).map((k) => (
              <button
                key={k || "all"}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${kind === k ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-ink hover:text-ink"}`}
              >
                {k ? PROJECT_KIND[k] : "All"}
              </button>
            ))}
          </div>
        )}

        <div className={`mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-4 lg:grid-cols-3 lg:gap-[18px]`}>
          {big && <Big key={big.id} p={big} wide={small.length === 0} />}
          {small.map((p, i) => <Small key={p.id} p={p} i={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------- frames ---------- */

function WindowBar({ label }: { label: string }) {
  return (
    <div className="flex h-6 shrink-0 items-center gap-1 border-b border-line bg-[#f1eff6] px-2.5 sm:h-7">
      <i className="h-2 w-2 rounded-full bg-[#ff5f57]" /><i className="h-2 w-2 rounded-full bg-[#febc2e]" /><i className="h-2 w-2 rounded-full bg-[#28c840]" />
      {label && <span className="ml-2 truncate rounded-md bg-white px-2 py-px text-[10px] text-muted sm:text-[11px]">{label}</span>}
    </div>
  );
}

// A browser or app window. The tall screenshot scrolls down on hover (big card: by itself).
function Win({ src, label, auto = false, className = "" }: { src: string; label: string; auto?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-t-xl border border-black/10 bg-white shadow-[0_24px_50px_-24px_rgba(0,0,0,0.45)] ${className}`}>
      <WindowBar label={label} />
      <div className="relative flex-1 overflow-hidden">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sized(src, 1280)} alt="" loading="lazy" decoding="async" className={`block w-full ${auto ? "animate-[shot_22s_ease-in-out_infinite_alternate]" : "transition-transform duration-[6s] ease-linear group-hover:[transform:translateY(calc(-100%_+_100cqh))]"}`} />
        ) : <div className="h-full bg-mist" />}
      </div>
    </div>
  );
}

// Website projects: a Mac-style window showing only the site's first screen (hero), not a long page.
// Uses "Hero screenshot" from Admin → Projects; older projects fall back to the top of the full screenshot.
function MacWin({ src, label, dark }: { src: string; label: string; dark: boolean }) {
  return (
    <div className={`rounded-[12px] px-1.5 pb-1.5 sm:rounded-[16px] sm:px-2 sm:pb-2 ${dark ? "bg-gradient-to-b from-[#2a2638] to-[#1a1724] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/10" : "bg-gradient-to-b from-[#fdfcff] to-[#ece9f4] shadow-[0_30px_60px_-30px_rgba(18,15,27,0.45)] ring-1 ring-inset ring-[#e1dcec]"}`}>
      <div className="relative flex h-6 items-center gap-1.5 px-1 sm:h-8 sm:px-1.5">
        <i className="h-2 w-2 rounded-full bg-[#ff5f57] sm:h-2.5 sm:w-2.5" /><i className="h-2 w-2 rounded-full bg-[#febc2e] sm:h-2.5 sm:w-2.5" /><i className="h-2 w-2 rounded-full bg-[#28c840] sm:h-2.5 sm:w-2.5" />
        {label && <span className={`absolute left-1/2 hidden max-w-[60%] -translate-x-1/2 truncate rounded-md px-3 py-0.5 text-[11px] sm:block ${dark ? "bg-white/[0.06] text-white/55" : "border border-line bg-white text-muted"}`}>{label}</span>}
      </div>
      <div className="aspect-[16/9] overflow-hidden rounded-[7px] bg-white sm:rounded-[10px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={sized(src, 1280)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.02]" /> : <div className="h-full bg-mist" />}
      </div>
    </div>
  );
}

function PhoneFrame({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`aspect-[9/19] overflow-hidden rounded-[18%/8.5%] border-[4px] border-[#17141f] bg-white shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={sized(src, 480)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />}
    </div>
  );
}

function Visual({ p, big }: { p: Project; big: boolean }) {
  const d = projectDisplay(p);
  const url = liveUrl(p);
  const imgs = pics(p);
  const shot = p.screen || p.image;
  const h = big ? "h-[230px] sm:h-[330px]" : "h-[110px] sm:h-[210px]";

  if (d === "website") {
    return (
      <div className={big ? "pb-5 sm:pb-8 lg:flex lg:h-full lg:items-center lg:pb-9" : "pb-3 sm:pb-5"}>
        <MacWin src={p.hero || shot} label={host(url)} dark={big} />
      </div>
    );
  }
  if (d === "software" || d === "ecommerce") {
    return (
      <div className={`relative ${h}`}>
        <Win src={shot} label={host(url) || p.client || p.title} auto={big} className="h-full [container-type:size]" />
        {d === "ecommerce" && (p.platforms?.length ?? 0) > 0 && (
          <div className="absolute bottom-2 left-2 hidden flex-wrap gap-1 sm:flex">
            {p.platforms!.slice(0, 3).map((x) => <span key={x} className="rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-white">{x}</span>)}
          </div>
        )}
      </div>
    );
  }
  if (d === "app" || d === "ondemand") {
    const screens = [p.mobile, p.partner, p.screen, p.image].filter(Boolean).slice(0, 3) as string[];
    return (
      <div className={`flex items-end justify-center gap-2 sm:gap-3 ${h}`}>
        {screens.map((s, i) => <PhoneFrame key={i} src={s} className={`h-[92%] ${i === 1 ? "h-full" : ""} ${i > 1 && !big ? "hidden sm:block" : ""}`} />)}
      </div>
    );
  }
  if (d === "social") {
    return (
      <div className={`overflow-hidden rounded-t-xl border border-black/10 bg-white shadow-[0_24px_50px_-24px_rgba(0,0,0,0.35)] ${h}`}>
        <div className="flex items-center gap-2 px-2.5 py-1.5 sm:py-2">
          <span className="h-5 w-5 shrink-0 rounded-full bg-[linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)] p-[2px] sm:h-7 sm:w-7"><span className="block h-full rounded-full bg-white" /></span>
          <b className="truncate text-[10px] sm:text-xs">{p.handle || p.client || p.title}</b>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => {
            const s = imgs[i % Math.max(imgs.length, 1)];
            // eslint-disable-next-line @next/next/no-img-element
            return s ? <img key={i} src={sized(s, 320)} alt="" loading="lazy" className="aspect-square w-full object-cover" /> : <span key={i} className="aspect-square bg-mist" />;
          })}
        </div>
      </div>
    );
  }
  if (d === "video") {
    const yt = youtubeId(p.video || "");
    const poster = p.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "");
    return (
      <div className={`relative overflow-hidden rounded-t-xl bg-ink shadow-[0_24px_50px_-24px_rgba(0,0,0,0.45)] ${h}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {poster && <img src={poster.startsWith("http") ? poster : sized(poster, 960)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
        <span className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-lg sm:h-14 sm:w-14"><Play size={18} className="ml-0.5" /></span></span>
      </div>
    );
  }
  if (d === "ads") {
    const res = (p.results ?? []).filter(Boolean).slice(0, 3);
    return (
      <div className={`grid gap-2 sm:gap-2.5 ${res.length ? "grid-cols-2" : ""} ${h}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imgs[0] ? <img src={sized(imgs[0], 640)} alt="" loading="lazy" className="h-full w-full rounded-t-xl object-cover shadow-[0_24px_50px_-24px_rgba(0,0,0,0.4)]" /> : <span className="rounded-t-xl bg-mist" />}
        {res.length > 0 && (
          <div className="grid content-start gap-1.5 sm:gap-2">
            {res.map((r) => {
              const i = r.indexOf(":");
              return (
                <div key={r} className="rounded-lg border border-line bg-white px-2 py-1.5 sm:rounded-xl sm:px-3 sm:py-2">
                  {i > 0 && <p className="truncate text-[9px] text-muted sm:text-[10.5px]">{r.slice(0, i)}</p>}
                  <p className="truncate font-display text-[11px] font-bold text-ink sm:text-base">{i > 0 ? r.slice(i + 1).trim() : r}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  // design: a small collage
  return (
    <div className={`grid grid-cols-2 gap-1.5 overflow-hidden rounded-t-xl sm:gap-2 ${h}`}>
      {Array.from({ length: 4 }).map((_, i) => {
        const s = imgs[i % Math.max(imgs.length, 1)];
        // eslint-disable-next-line @next/next/no-img-element
        return s ? <img key={i} src={sized(s, 480)} alt="" loading="lazy" className="h-full w-full rounded-lg object-cover" /> : <span key={i} className="rounded-lg bg-mist" />;
      })}
    </div>
  );
}

/* ---------- cards ---------- */

export function Big({ p, wide, flip = false }: { p: Project; wide: boolean; flip?: boolean }) {
  const href = p.hidePage ? (liveUrl(p) || "/work") : `/work/${projectSlug(p)}`;
  const url = liveUrl(p);
  const kind = PROJECT_KIND[projectDisplay(p)];
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease }}
      className={`group relative col-span-2 grid overflow-hidden rounded-[24px] bg-ink text-white sm:rounded-[30px] ${flip ? "lg:grid-cols-[1.35fr_1fr]" : "lg:grid-cols-[1fr_1.35fr]"} ${wide ? "lg:col-span-3" : ""}`}
      data-work-big
    >
      <div aria-hidden className={`pointer-events-none absolute -top-36 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(110,89,217,0.45),transparent_65%)] ${flip ? "-left-24" : "-right-24"}`} />
      <div className={`relative order-2 flex flex-col p-5 sm:p-8 lg:p-9 ${flip ? "lg:order-2" : "lg:order-1"}`}>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">{kind}</span>
          {p.industry && <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/60">{p.industry}</span>}
          {p.type === "demo" && <span className="rounded-full bg-lav-600/30 px-3 py-1 text-xs font-semibold text-lav-200">Demo</span>}
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold leading-tight tracking-tight sm:mt-5 sm:text-[32px]"><Link href={href} className="hover:text-lav-200">{p.title}</Link></h3>
        {p.summary && <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-white/60">{p.summary}</p>}
        <div className="mt-6 flex flex-wrap gap-2.5 lg:mt-auto lg:pt-6">
          {!p.hidePage && <Link href={href} className="btn-light px-5 py-2.5 text-sm">Case study <ArrowUpRight size={15} /></Link>}
          {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Visit site <ArrowUpRight size={15} /></a>}
        </div>
      </div>
      <Link href={href} tabIndex={-1} aria-hidden className={`relative order-1 block px-4 pt-5 sm:px-8 sm:pt-8 lg:pt-9 ${flip ? "lg:order-1 lg:pl-8 lg:pr-0" : "lg:order-2 lg:pl-0 lg:pr-8"}`}>
        <Visual p={p} big />
      </Link>
    </motion.article>
  );
}

export function Small({ p, i }: { p: Project; i: number }) {
  const href = p.hidePage ? (liveUrl(p) || "/work") : `/work/${projectSlug(p)}`;
  const kind = PROJECT_KIND[projectDisplay(p)];
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease, delay: (i % 3) * 0.06 }}
      className="group flex flex-col overflow-hidden rounded-[18px] border border-line bg-[#f4f2fb] sm:rounded-[26px]"
    >
      <Link href={href} className="flex h-full flex-col">
        <div className="relative bg-[radial-gradient(70%_80%_at_50%_30%,rgba(110,89,217,0.16),transparent)] px-2.5 pt-8 sm:px-5 sm:pt-11">
          <span className="absolute left-2.5 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-lav-700 shadow-sm sm:left-4 sm:top-3 sm:px-2.5 sm:text-[11px]">{kind}</span>
          <Visual p={p} big={false} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 bg-white px-3 py-2.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            {p.industry && <p className="truncate text-[10.5px] text-muted sm:text-xs">{p.industry}</p>}
            <p className="truncate font-display text-[13.5px] font-semibold tracking-tight sm:text-[17px]">{p.title}</p>
          </div>
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform group-hover:-rotate-45 sm:grid"><ArrowUpRight size={16} /></span>
        </div>
      </Link>
    </motion.article>
  );
}

/* ---------- Work page: every project in the same style ---------- */

// Client projects as big cards (alternating sides), demos as small cards, then a "your turn" card.
export function WorkProjects() {
  const { content } = useContent();
  const all = useMemo(() => content.projects.filter((p) => p.title), [content.projects]);
  const kinds = useMemo(() => Array.from(new Set(all.map((p) => projectDisplay(p)))), [all]);
  const [kind, setKind] = useState<ProjectDisplay | "">("");

  if (!all.length)
    return (
      <section className="bg-mist py-24 sm:py-32">
        <div className="container-x max-w-2xl text-center">
          <SplitHeading text="Our latest work is on its way." className="h-display text-3xl sm:text-4xl" />
          <p className="mt-4 text-lg text-muted">We are adding recent projects here. Want to see examples for your industry? Ask us and we will share them directly.</p>
          <Link href="/contact" className="btn-dark mt-8 inline-flex">Ask for examples <ArrowUpRight size={17} /></Link>
        </div>
      </section>
    );

  const list = kind ? all.filter((p) => projectDisplay(p) === kind) : all;
  const bigs = list.filter((p) => p.type !== "demo");
  const smalls = list.filter((p) => p.type === "demo");

  return (
    <section className="overflow-hidden bg-white py-16 sm:py-24" data-work-page>
      <div className="container-x">
        {kinds.length > 1 && (
          <div className="-mx-1 mb-7 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Filter projects">
            {(["", ...kinds] as (ProjectDisplay | "")[]).map((k) => (
              <button
                key={k || "all"}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${kind === k ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-ink hover:text-ink"}`}
              >
                {k ? PROJECT_KIND[k] : "All"}
              </button>
            ))}
          </div>
        )}

        {bigs.length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-[18px]">
            {bigs.map((p, i) => <Big key={p.id} p={p} wide flip={i % 2 === 1} />)}
          </div>
        )}

        {smalls.length > 0 && <p className="mb-4 mt-12 text-[13px] font-semibold uppercase tracking-[0.12em] text-lav-700">{bigs.length ? "More work" : "Demos we built"}</p>}
        <div className={`grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-[18px] ${smalls.length ? "" : "mt-4 sm:mt-[18px]"}`}>
          {smalls.map((p, i) => <Small key={p.id} p={p} i={i} />)}
          <YourTurn wide={smalls.length % 3 === 0} />
        </div>
      </div>
    </section>
  );
}

function YourTurn({ wide }: { wide: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className={`relative col-span-2 flex flex-col overflow-hidden rounded-[18px] bg-ink p-6 text-white sm:rounded-[26px] sm:p-8 lg:col-span-1 ${wide ? "lg:col-span-3 lg:flex-row lg:items-center lg:justify-between lg:gap-10" : ""}`}
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-[300px] w-[300px] rounded-full bg-lav-600/50 blur-[90px]" />
      <div className="relative">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-lav-300">Your turn</p>
        <h3 className="h-display mt-3 text-3xl">Your business could be next.</h3>
        <p className="mt-3 max-w-md leading-relaxed text-white/60">Tell us what you need. The first call and the quote are free.</p>
      </div>
      <Link href="/contact" className={`btn-light relative w-fit ${wide ? "mt-6 lg:mt-0 lg:shrink-0" : "mt-6 lg:mt-auto"}`}>Start a project <ArrowUpRight size={17} /></Link>
    </motion.div>
  );
}
