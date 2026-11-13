"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Megaphone, Sparkles } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useContent } from "../ContentProvider";
import { serviceSlug, type Service } from "@/lib/content";
import { Reveal, SplitHeading, ease } from "../Reveal";

// Home "What we do": every service as a card with a small looping animation of what it is, so a
// visitor understands the whole offer at a glance. 2 across on phones, 5 on big screens. Order,
// badge (New / Popular) and animation are set per service in Admin → Services.
export default function ServicesList() {
  const { content } = useContent();
  const services = content.services.filter((s) => s.title);
  if (!services.length) return null;
  const sec = content.sections.services;
  return (
    <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-28" data-services-grid>
      <div aria-hidden className="pointer-events-none absolute -left-52 -top-52 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(110,89,217,0.32),transparent_65%)]" />
      <div className="container-x relative">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:mb-12 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-lav-300 sm:text-[13px]">Services</p>
            <SplitHeading key={sec.heading} text={sec.heading} className="h-display max-w-2xl text-4xl sm:text-6xl" />
          </div>
          {sec.intro && (
            <Reveal delay={0.15}>
              <p className="max-w-sm text-white/60 sm:text-lg">{sec.intro}</p>
            </Reveal>
          )}
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-5">
          {services.map((s, i) => <Card key={s.id} s={s} i={i} />)}
        </ul>
      </div>
    </section>
  );
}

function Card({ s, i }: { s: Service; i: number }) {
  const hot = !!s.badge;
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px 0px" }}
      transition={{ duration: 0.6, ease, delay: (i % 5) * 0.05 }}
      className={`overflow-hidden rounded-[18px] border sm:rounded-[24px] ${hot ? "border-lav-300/45 bg-[linear-gradient(180deg,rgba(110,89,217,0.16),rgba(255,255,255,0.03))]" : "border-white/10 bg-white/[0.035]"}`}
    >
      <Link href={`/services/${serviceSlug(s)}`} className="group flex h-full flex-col">
        <div className="svc-stage relative h-[100px] overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(80%_90%_at_50%_20%,rgba(110,89,217,0.25),transparent)] sm:h-[124px]" aria-hidden>
          {s.badge && <span className="absolute left-2.5 top-2 z-10 rounded-full bg-[#f0abfc] px-2 py-px text-[10px] font-bold text-[#3b0a45]">{s.badge}</span>}
          <span className="absolute right-3 top-2 z-10 hidden text-[11px] font-medium text-white/35 sm:block">{String(i + 1).padStart(2, "0")}</span>
          <Stage kind={s.anim || s.id} badge={!!s.badge} />
        </div>
        <div className="flex flex-1 flex-col p-3 sm:p-5">
          <h3 className="font-display text-[14px] font-semibold leading-snug tracking-tight sm:text-[17px]">{s.title}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-white/55 sm:mt-1.5 sm:text-[13.5px]">{s.short}</p>
          <span className="mt-auto hidden items-center gap-1 pt-3 text-[13px] font-semibold text-lav-300 transition group-hover:text-white sm:inline-flex">
            Learn more <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.li>
  );
}

/* ---------- the little animations (keyframes in globals.css, all on a 3.6 s loop) ---------- */

const d = (s: number) => ({ animationDelay: `${s}s` });

export function Stage({ kind, badge }: { kind: string; badge: boolean }) {
  const top = badge ? "top-7" : "top-3";
  switch (kind) {
    case "ai":
      return (
        <div className={`absolute inset-x-3 ${badge ? "top-8" : "top-5"} sm:inset-x-4`}>
          <span className="absolute inset-x-8 top-[17px] h-0.5 bg-lav-300/35 sm:top-[21px]" />
          <span className="relative z-[1] flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#25D366] text-white sm:h-11 sm:w-11"><WhatsAppIcon size={18} /></span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#b9acf5] to-lav-600 text-[10px] font-bold sm:h-11 sm:w-11">AI</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[9px] font-bold text-ink sm:h-11 sm:w-11">CRM</span>
          </span>
          <span className="svc-run absolute top-[13px] h-2.5 w-2.5 rounded-full bg-[#f0abfc] shadow-[0_0_12px_#f0abfc] sm:top-[17px]" />
          <span className="svc-pop absolute -bottom-7 right-0 rounded-full bg-emerald-500 px-2 py-px text-[9px] font-bold text-emerald-950 sm:-bottom-8 sm:text-[10px]" style={d(1.8)}>Lead saved ✓</span>
        </div>
      );
    case "saas":
      return (
        <div className={`absolute inset-x-2.5 bottom-0 ${badge ? "top-7" : "top-3"} rounded-t-lg bg-white p-2 text-ink sm:inset-x-3.5`}>
          <div className="flex gap-1.5">
            <div className="flex-1 rounded-md bg-[#f4f2fb] px-1.5 py-1"><p className="text-[8px] text-muted">Active users</p><p className="svc-pop font-display text-[11px] font-bold sm:text-xs">1,240</p></div>
            <div className="flex-1 rounded-md bg-[#f4f2fb] px-1.5 py-1"><p className="text-[8px] text-muted">Revenue</p><p className="svc-pop font-display text-[11px] font-bold sm:text-xs" style={d(0.4)}>₹1.2L</p></div>
          </div>
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="absolute inset-x-2 bottom-1.5 h-[30%] w-[calc(100%-16px)]"><path className="svc-draw" d="M2 37 C 30 34, 45 27, 70 25 S 110 20, 130 14 S 170 7, 198 3" fill="none" stroke="#6E59D9" strokeWidth="3" strokeLinecap="round" /></svg>
        </div>
      );
    case "web":
      return (
        <div className="absolute inset-x-4 bottom-0 top-3 overflow-hidden rounded-t-lg bg-white sm:inset-x-6">
          <div className="flex h-3.5 items-center gap-1 bg-[#f1eff6] px-2"><i className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" /><i className="h-1.5 w-1.5 rounded-full bg-[#febc2e]" /><i className="h-1.5 w-1.5 rounded-full bg-[#28c840]" /></div>
          <span className="svc-pop absolute left-2.5 top-6 h-1.5 w-[22%] rounded bg-ink" />
          <span className="svc-pop absolute left-2.5 top-9 h-3 w-[45%] rounded bg-ink" style={d(0.25)} />
          <span className="svc-pop absolute left-2.5 top-[52px] h-3 w-[32%] rounded bg-lav-600" style={d(0.5)} />
          <span className="svc-pop absolute right-2.5 top-7 h-[52%] w-[34%] rounded-md bg-gradient-to-br from-[#b9acf5] to-lav-600" style={d(0.6)} />
          <span className="svc-pop absolute bottom-1.5 right-1.5 rounded-md bg-ink px-1.5 py-0.5 font-display text-[11px] font-bold text-white sm:text-[13px]" style={d(1.4)}>98<span className="text-[8px]">/100</span></span>
        </div>
      );
    case "ecommerce":
      return (
        <div className={`absolute inset-x-2 ${top} space-y-1.5 sm:inset-x-3`}>
          {[["a", "#ff9900", "₹1,299", "Amazon"], ["F", "#2874f0", "₹849", "Flipkart"], ["M", "#9b2bae", "₹399", "Meesho"]].map(([l, c, p, n], k) => (
            <div key={n} className="svc-slide flex h-6 items-center gap-1.5 rounded-lg bg-white px-1.5 text-[8.5px] font-semibold text-ink sm:h-7 sm:text-[10.5px]" style={d(k * 0.5)}>
              <b className="grid h-4 w-4 place-items-center rounded text-[8px] text-white" style={{ background: c }}>{l}</b>New order · {p}<span className="ml-auto hidden text-emerald-600 sm:inline">{n}</span>
            </div>
          ))}
        </div>
      );
    case "marketing":
      return (
        <>
          <span className="absolute left-2.5 top-2 rounded-full bg-emerald-500 px-2 py-px text-[9px] font-bold text-emerald-950 sm:text-[10px]">Leads +240%</span>
          <div className="absolute inset-x-3 bottom-2.5 flex h-[55%] items-end gap-1.5 sm:inset-x-4">
            {[30, 45, 40, 62, 78, 100].map((h, k) => <i key={k} className="svc-grow flex-1 rounded-t-md bg-gradient-to-b from-[#b9acf5] to-lav-600" style={{ height: `${h}%`, ...d(k * 0.12) }} />)}
          </div>
        </>
      );
    case "social":
      return (
        <>
          <div className={`absolute left-1/2 ${badge ? "top-6" : "top-3"} h-[100px] w-[78px] -translate-x-1/2 overflow-hidden rounded-xl border-[3px] border-white bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] sm:h-[124px] sm:w-[96px]`}>
            <span className="absolute inset-x-2 top-3 h-2 rounded bg-white/80" /><span className="absolute inset-x-2 top-7 h-2 w-1/2 rounded bg-white/60" />
          </div>
          {[[44, 0], [58, 0.6], [36, 1.2], [52, 1.8]].map(([l, t]) => <span key={t} className="svc-float absolute top-[52%] text-lg text-[#ff4d6d]" style={{ left: `${l}%`, ...d(t) }}>♥</span>)}
          <span className="absolute bottom-2 right-2 rounded-full bg-white px-2 py-px text-[9px] font-bold text-ink sm:text-[10px]">♥ 2.4k</span>
        </>
      );
    case "ondemand":
      return (
        <div className={`absolute left-1/2 ${badge ? "top-6" : "top-2.5"} h-[118px] w-[62px] -translate-x-1/2 overflow-hidden rounded-[14px] border-[3px] border-[#17141f] bg-[#eef2ff] sm:h-[130px] sm:w-[72px]`}>
          <svg viewBox="0 0 66 120" className="absolute inset-0 h-full w-full"><path d="M12 100 C 26 76, 48 80, 40 50 S 24 18, 52 12" fill="none" stroke="#6E59D9" strokeWidth="3" strokeDasharray="5 5" /></svg>
          <span className="svc-move absolute h-3 w-3 rounded-full border-2 border-white bg-lav-600 shadow-[0_0_0_4px_rgba(110,89,217,0.3)]" />
          <span className="absolute inset-x-1 bottom-1 rounded-md bg-white px-1 py-0.5 text-center text-[7px] font-bold text-ink">Arriving in 6 min</span>
        </div>
      );
    case "video":
      return (
        <>
          <div className={`absolute left-1/2 ${badge ? "top-7" : "top-3"} h-10 w-24 -translate-x-1/2 rounded-md bg-gradient-to-br from-ink-3 to-lav-700 sm:h-12 sm:w-28`}><span className="absolute inset-0 grid place-items-center text-[10px] text-white/80">▶</span></div>
          <div className="absolute inset-x-3 bottom-3 flex h-7 gap-1 sm:inset-x-4 sm:h-9">
            {[["2", "#6E59D9"], ["1.2", "#b9acf5"], ["1.6", "#f0abfc"], ["1", "#6E59D9"]].map(([f, c], k) => <i key={k} className="rounded" style={{ flex: Number(f), background: c }} />)}
          </div>
          <span className="svc-play absolute bottom-1.5 top-[48%] w-0.5 bg-white" />
        </>
      );
    case "design":
      return (
        <>
          <div className={`absolute left-3 ${top} flex gap-1.5`}>
            {["#f0abfc", "#b9acf5", "#6E59D9", "#fbbf24"].map((c, k) => <span key={c} className="svc-pop h-4 w-4 rounded-full sm:h-5 sm:w-5" style={{ background: c, ...d(0.4 + k * 0.2) }} />)}
          </div>
          <svg viewBox="0 0 300 124" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><path className="svc-draw" d="M50 100 C 90 20, 140 20, 150 64 S 220 116, 250 40" fill="none" stroke="#b9acf5" strokeWidth="4" strokeLinecap="round" /></svg>
        </>
      );
    case "promotion":
      return (
        <>
          {[0, 1.2, 2.4].map((t) => <span key={t} className="svc-ring absolute left-1/2 top-1/2 -ml-5 -mt-5 h-10 w-10 rounded-full border-2 border-[#b9acf5] sm:-ml-6 sm:-mt-6 sm:h-12 sm:w-12" style={d(t)} />)}
          <span className="absolute left-1/2 top-1/2 z-[1] grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lav-600 sm:h-12 sm:w-12"><Megaphone size={20} /></span>
          <span className="svc-pop absolute bottom-2 right-2 rounded-full bg-white px-2 py-px text-[9px] font-bold text-ink sm:text-[10px]" style={d(1)}>+12k reach</span>
        </>
      );
    default:
      return (
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-lav-400/30 bg-gradient-to-br from-lav-400/30 to-lav-400/5 text-lav-200">
          <Sparkles size={22} />
        </span>
      );
  }
}
