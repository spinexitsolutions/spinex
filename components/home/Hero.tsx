"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin, Sparkles } from "lucide-react";
import { useContent } from "../ContentProvider";
import DotField from "./DotField";
import LiveBuild from "./LiveBuild";
import { ease } from "../Reveal";
import { useIntroDone } from "../Intro";
import { HERO_DESIGNS, heroDefaults, type HeroSettings, type SiteContent } from "@/lib/content";
import { sized } from "@/lib/img";

// Saved hero with every field checked, so an old or broken save still draws a hero.
export function heroSettings(raw: Partial<HeroSettings> | undefined, fallback: HeroSettings): HeroSettings {
  const v = { ...heroDefaults, ...fallback, ...(raw ?? {}) };
  const link = (x: unknown, d: string) => (typeof x === "string" && /^(\/|https?:\/\/|#|mailto:|tel:)/.test(x.trim()) ? x.trim() : d);
  const n = Number(v.overlay);
  return {
    ...v,
    design: (HERO_DESIGNS as readonly string[]).includes(v.design) ? v.design : heroDefaults.design,
    highlight: String(v.highlight ?? "").slice(0, 80),
    primaryLink: link(v.primaryLink, heroDefaults.primaryLink),
    secondaryLink: link(v.secondaryLink, heroDefaults.secondaryLink),
    image: String(v.image ?? ""),
    video: String(v.video ?? ""),
    overlay: Number.isFinite(n) ? Math.min(90, Math.max(0, Math.round(n))) : heroDefaults.overlay,
    accent: typeof v.accent === "string" && /^#[0-9a-f]{6}$/i.test(v.accent) ? v.accent : "",
    showStats: v.showStats !== false,
    showLocation: v.showLocation !== false,
    showTicker: v.showTicker !== false,
  };
}

type Ctx = { h: HeroSettings; c: SiteContent; ready: boolean; preview?: boolean; accent: string };

// `hero` and `preview` are used by the admin preview; the website reads the saved content.
export default function Hero({ hero, preview }: { hero?: Partial<HeroSettings>; preview?: boolean }) {
  const { content } = useContent();
  const h = heroSettings(hero ?? content.hero, content.hero);
  const intro = useIntroDone();
  const x: Ctx = { h, c: content, ready: preview ? true : intro, preview, accent: h.accent || "rgb(var(--c-lav-600))" };
  const D = { classic: Classic, centered: Centered, split: Split, fullscreen: Fullscreen, bento: Bento, aurora: Aurora, type: Type }[h.design];
  return <div data-hero={h.design}><D {...x} /></div>;
}

// ---------- shared parts ----------

const tall = (preview?: boolean) => (preview ? "min-h-[760px]" : "lg:min-h-[100svh]");
const fade = (ready: boolean, delay: number, y = 16) => ({
  initial: { opacity: 0, y },
  animate: ready ? { opacity: 1, y: 0 } : undefined,
  transition: { duration: 0.8, delay, ease },
});

// Which words of the headline fall inside the highlight phrase.
function words(title: string, highlight: string) {
  const list = title.split(" ").filter(Boolean);
  const hl = highlight.trim().toLowerCase();
  const at = hl ? title.toLowerCase().indexOf(hl) : -1;
  let pos = 0;
  return list.map((w) => {
    const start = title.indexOf(w, pos);
    pos = start + w.length;
    return { w, on: at >= 0 && start < at + hl.length && start + w.length > at };
  });
}

function Headline({ h, ready, accent, light, center, size = "text-[2.6rem] sm:text-6xl lg:text-[clamp(2.4rem,6.4vh,4.4rem)]", gradient }: Ctx & { light?: boolean; center?: boolean; size?: string; gradient?: boolean }) {
  return (
    // One H1: the keyword line (for search) plus the headline.
    <h1 className={center ? "text-center" : ""}>
      <motion.span {...fade(ready, 0, 10)} className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${light ? "border-white/20 bg-white/10 text-white/80 backdrop-blur" : "border-line bg-white text-muted"}`}>
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: accent }} />
        </span>
        {h.kicker}
      </motion.span>
      <span className="sr-only"> – </span>
      <span className={`h-display block ${size} ${light ? "text-white" : ""}`}>
        {words(h.title, h.highlight).map(({ w, on }, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-top">
            <motion.span className="inline-block" initial={{ y: "110%", rotate: 4 }} animate={ready ? { y: "0%", rotate: 0 } : undefined} transition={{ duration: 1, delay: 0.15 + i * 0.055, ease }}
              style={on ? (gradient ? { backgroundImage: `linear-gradient(90deg, ${accent}, rgb(var(--c-lav-300)))`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: accent }) : undefined}>
              {w}&nbsp;
            </motion.span>
          </span>
        ))}
      </span>
    </h1>
  );
}

function Sub({ h, ready, light, center, className = "" }: Ctx & { light?: boolean; center?: boolean; className?: string }) {
  if (!h.subtitle.trim()) return null;
  return <motion.p {...fade(ready, 0.7)} className={`mt-5 max-w-[34rem] text-base leading-relaxed sm:text-lg ${light ? "text-white/75" : "text-muted"} ${center ? "mx-auto text-center" : ""} ${className}`}>{h.subtitle}</motion.p>;
}

function Buttons({ h, ready, light, center }: Ctx & { light?: boolean; center?: boolean }) {
  return (
    <motion.div {...fade(ready, 0.85)} className={`mt-7 flex flex-wrap items-center gap-3 ${center ? "justify-center" : ""}`}>
      {h.primaryCta.trim() && (
        <Link href={h.primaryLink} className={`${light ? "btn-light" : "btn-dark"} group`}>
          {h.primaryCta}
          <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
      {h.secondaryCta.trim() && <Link href={h.secondaryLink} className={light ? "btn-ghost-dark" : "btn-ghost"}>{h.secondaryCta}</Link>}
    </motion.div>
  );
}

function Facts({ h, c, ready, light, center, accent }: Ctx & { light?: boolean; center?: boolean }) {
  if (!h.showStats && !h.showLocation) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : undefined} transition={{ delay: 1.1, duration: 0.8 }}
      className={`mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm lg:[@media(max-height:760px)]:hidden ${light ? "text-white/70" : "text-muted"} ${center ? "justify-center" : ""}`}>
      {h.showStats && c.stats.slice(0, 2).map((s) => (
        <div key={s.id}>
          <p className={`font-display text-2xl font-semibold ${light ? "text-white" : "text-ink"}`}>{s.value}</p>
          <p>{s.label}</p>
        </div>
      ))}
      {h.showLocation && c.contact.location && <div className="flex items-center gap-2"><MapPin size={16} style={{ color: accent }} /> {c.contact.location}</div>}
    </motion.div>
  );
}

function Ticker({ h, c, light }: Ctx & { light?: boolean }) {
  const items = c.services.map((s) => s.title).filter(Boolean);
  if (!h.showTicker || items.length === 0) return null;
  const row = [...items, ...items];
  return (
    <div className={`relative overflow-hidden border-y py-4 ${light ? "border-white/10" : "border-line"}`} aria-hidden>
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {[...row, ...row].map((t, i) => (
          <span key={i} className={`flex items-center gap-10 font-display text-xl font-semibold sm:text-2xl ${light ? "text-white/70" : "text-ink/70"}`}>
            {t}<Sparkles size={16} className="opacity-50" />
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- designs ----------

// 1. Text on the left, animated "live build" browser on the right (the original).
function Classic(x: Ctx) {
  return (
    <section className={`relative flex items-center overflow-hidden bg-white pb-16 pt-28 sm:pt-32 lg:pb-6 lg:pt-24 ${x.preview ? "min-h-[760px]" : "lg:h-[100svh] lg:min-h-[620px]"}`}>
      <DotField className="[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.08fr_1fr] lg:gap-14">
        <div>
          <Headline {...x} />
          <Sub {...x} />
          <Buttons {...x} />
          <Facts {...x} />
        </div>
        <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={x.ready ? { opacity: 1, y: 0, scale: 1 } : undefined} transition={{ duration: 1.1, delay: 0.35, ease }}>
          <LiveBuild />
        </motion.div>
      </div>
    </section>
  );
}

// 2. Big centred headline on the dot field, with a moving list of services under it.
function Centered(x: Ctx) {
  return (
    <section className={`relative flex flex-col justify-between overflow-hidden bg-white pt-32 sm:pt-36 ${tall(x.preview)}`}>
      <DotField className="[mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: x.accent }} aria-hidden />
      <div className="container-x relative mx-auto max-w-5xl pb-14 text-center">
        <Headline {...x} center size="text-[2.6rem] sm:text-6xl lg:text-7xl" />
        <Sub {...x} center />
        <Buttons {...x} center />
        <Facts {...x} center />
      </div>
      <div className="relative"><Ticker {...x} /></div>
    </section>
  );
}

// 3. Text on the left, a large photo on the right with small floating cards.
function Split(x: Ctx) {
  const stat = x.c.stats[0];
  return (
    <section className={`relative flex items-center overflow-hidden bg-mist pb-16 pt-28 sm:pt-32 lg:pb-10 ${tall(x.preview)}`}>
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <Headline {...x} />
          <Sub {...x} />
          <Buttons {...x} />
          <Facts {...x} />
        </div>
        <motion.div initial={{ opacity: 0, x: 40 }} animate={x.ready ? { opacity: 1, x: 0 } : undefined} transition={{ duration: 1.1, delay: 0.3, ease }} className="relative">
          <div className="absolute -inset-3 -z-0 rotate-3 rounded-[2.2rem]" style={{ background: x.accent, opacity: 0.18 }} aria-hidden />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_80px_-30px_rgba(18,15,27,0.45)] sm:aspect-[5/5] lg:aspect-[4/5] lg:max-h-[70vh]">
            {x.h.image ? <img src={sized(x.h.image, 1280)} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-lav-200 to-lav-500" />}
          </div>
          {stat && (
            <motion.div {...fade(x.ready, 1)} className="absolute -left-3 bottom-8 rounded-2xl bg-white px-5 py-4 shadow-xl sm:-left-8">
              <p className="font-display text-3xl font-semibold" style={{ color: x.accent }}>{stat.value}</p>
              <p className="text-sm text-muted">{stat.label}</p>
            </motion.div>
          )}
          <motion.div {...fade(x.ready, 1.15)} className="absolute right-3 top-6 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-xl sm:-right-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Taking new projects
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// 4. Photo or video across the whole screen, with the text over a dark layer.
function Fullscreen(x: Ctx) {
  const mp4 = /\.(mp4|webm)(\?|$)/i.test(x.h.video);
  return (
    <section className={`relative flex min-h-[100svh] items-end overflow-hidden bg-ink pb-16 pt-32 sm:pb-20 ${x.preview ? "!min-h-[760px]" : ""}`}>
      {mp4 ? (
        <video src={x.h.video} poster={x.h.image || undefined} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : x.h.image ? (
        <motion.img src={sized(x.h.image, 1600)} alt="" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease }} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(10,8,18,${x.h.overlay / 160}) 0%, rgba(10,8,18,${x.h.overlay / 100}) 100%)` }} aria-hidden />
      <div className="container-x relative">
        <div className="max-w-4xl">
          <Headline {...x} light size="text-[2.6rem] sm:text-6xl lg:text-7xl" />
          <Sub {...x} light />
          <Buttons {...x} light />
          <Facts {...x} light />
        </div>
      </div>
    </section>
  );
}

// 5. Headline on top, then a grid of tiles with your work or services.
function Bento(x: Ctx) {
  const shots = x.c.projects.filter((p) => p.image).slice(0, 3).map((p) => ({ img: p.image, label: p.title, sub: p.category }));
  const stock = ["/images/stock/photo-1460925895917-afdab827c52f.jpg", "/images/stock/photo-1561070791-2526d30994b5.jpg", "/images/stock/photo-1556742049-0cfed4f6a45d.jpg"];
  const tiles = [0, 1, 2].map((i) => shots[i] ?? { img: stock[i], label: x.c.services[i]?.title ?? "", sub: "Service" });
  const stat = x.c.stats[0];
  return (
    <section className={`relative overflow-hidden bg-white pb-14 pt-28 sm:pt-32 ${tall(x.preview)}`}>
      <div className="container-x relative">
        <div className="grid items-end gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Headline {...x} size="text-[2.6rem] sm:text-6xl lg:text-[4.2rem]" />
          <div className="lg:pb-3">
            <Sub {...x} className="!mt-0" />
            <Buttons {...x} />
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:h-[40vh] lg:min-h-[300px] lg:grid-cols-[1.5fr_1fr_1fr]">
          {tiles.map((t, i) => (
            <motion.div key={i} {...fade(x.ready, 0.5 + i * 0.12, 30)} className={`group relative min-h-[220px] overflow-hidden rounded-3xl bg-mist ${i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <img src={sized(t.img, 640)} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <p className="text-xs uppercase tracking-wider text-white/70">{t.sub}</p>
                <p className="font-display text-lg font-semibold">{t.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
        {(x.h.showStats || x.h.showLocation) && (
          <motion.div {...fade(x.ready, 1)} className="mt-3 grid gap-3 sm:grid-cols-3">
            {x.h.showStats && x.c.stats.slice(0, 2).map((s) => (
              <div key={s.id} className="rounded-3xl border border-line px-5 py-4"><p className="font-display text-2xl font-semibold">{s.value}</p><p className="text-sm text-muted">{s.label}</p></div>
            ))}
            {x.h.showLocation && <div className="flex items-center gap-2 rounded-3xl px-5 py-4 text-white" style={{ background: x.accent }}><MapPin size={18} /> <span className="font-semibold">{x.c.contact.location || stat?.label}</span></div>}
          </motion.div>
        )}
      </div>
    </section>
  );
}

// 6. Dark background with slowly moving colour light and a glass card of services.
function Aurora(x: Ctx) {
  return (
    <section className={`relative flex items-center overflow-hidden bg-ink pb-16 pt-28 sm:pt-32 ${tall(x.preview)}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full opacity-50 blur-[110px]" style={{ background: x.accent }}
          animate={{ x: [0, 120, 0], y: [0, 80, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-48 right-[-10%] h-[520px] w-[520px] rounded-full bg-sky-500 opacity-25 blur-[120px]"
          animate={{ x: [0, -100, 0], y: [0, -60, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute left-1/3 top-1/2 h-[380px] w-[380px] rounded-full bg-fuchsia-500 opacity-20 blur-[110px]"
          animate={{ x: [0, 80, -40, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <Headline {...x} light gradient size="text-[2.6rem] sm:text-6xl lg:text-[clamp(2.6rem,6.6vh,4.6rem)]" />
          <Sub {...x} light />
          <Buttons {...x} light />
          <Facts {...x} light />
        </div>
        <motion.div {...fade(x.ready, 0.5, 30)} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/50">What we do</p>
          <ul className="mt-4 divide-y divide-white/10">
            {x.c.services.slice(0, 6).map((s, i) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3.5 text-white">
                <span className="flex items-center gap-4"><span className="font-mono text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span><span className="font-display text-lg font-semibold">{s.title}</span></span>
                <ArrowUpRight size={16} className="shrink-0 text-white/40" />
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

// 7. Very large headline on its own, with the services moving along the bottom.
function Type(x: Ctx) {
  return (
    <section className={`relative flex flex-col justify-between overflow-hidden bg-white pt-32 sm:pt-36 ${tall(x.preview)}`}>
      <div className="container-x relative pb-12">
        <Headline {...x} gradient size="text-[2.8rem] leading-[0.95] sm:text-7xl lg:text-[clamp(3.6rem,9vh,7rem)]" />
        <div className="mt-8 grid gap-8 border-t border-line pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Sub {...x} className="!mt-0" />
            <Facts {...x} />
          </div>
          <Buttons {...x} />
        </div>
      </div>
      <div className="bg-ink"><Ticker {...x} light /></div>
    </section>
  );
}
