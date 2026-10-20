"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Compass, PenTool, Code2, Rocket, Check, MousePointer2 } from "lucide-react";
import { SplitHeading, ease } from "../Reveal";
import { useContent } from "../ContentProvider";

// Visuals and icons follow the step order; extra steps reuse them in turn.
const visuals = [DiscoverVisual, DesignVisual, BuildVisual, LaunchVisual];
const icons = [Compass, PenTool, Code2, Rocket];

// Compact stepper pinned to the screen: scrolling through the section moves through the steps.
// Below md the section isn't pinned; every step is shown as a plain list instead.
export default function Process() {
  const { content } = useContent();
  const steps = content.process.map((s, i) => ({ ...s, Icon: icons[i % icons.length], Visual: visuals[i % visuals.length] }));
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const n = Math.max(1, steps.length);
  const railFill = useTransform(scrollYProgress, [0, (n - 1) / n], ["0%", "100%"]);
  const stepFill = useTransform(scrollYProgress, (v) => Math.min(1, Math.max(0, v * n - Math.min(n - 1, Math.floor(v * n)))));
  const step = steps[active];

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(n - 1, Math.max(0, Math.floor(v * n))));
  });

  // Clicking a step scrolls to the middle of that step's scroll range.
  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + range * ((i + 0.5) / n), behavior: "smooth" });
  };

  if (!step) return null;

  return (
    <section
      ref={ref}
      className="relative border-t border-line bg-white md:h-[var(--process-h)]"
      style={{ "--process-h": `${Math.max(180, n * 55)}vh` } as React.CSSProperties}
    >
      <div className="py-20 md:sticky md:top-0 md:flex md:h-[100svh] md:items-center md:overflow-hidden">
      <div className="container-x">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SplitHeading key={content.sections.process.heading} text={content.sections.process.heading} className="h-display text-4xl sm:text-5xl" />
          <p className="max-w-xs text-muted">{content.sections.process.intro}</p>
        </div>

        {/* Phones: all steps in normal flow */}
        <ol className="space-y-4 md:hidden">
          {steps.map((s, i) => (
            <li key={s.id} className="rounded-[24px] bg-ink p-6 text-white">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-lav-300"><s.Icon size={18} /></span>
                <p className="text-sm text-lav-300">Step {i + 1} of {steps.length}, {s.time}</p>
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-white/65">{s.text}</p>
              <ul className="mt-5 space-y-2.5">
                {s.gets.map((g) => (
                  <li key={g} className="flex items-center gap-3 text-[15px]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lav-600"><Check size={11} /></span>
                    {g}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="hidden md:block">
          {/* Step rail */}
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} role="tablist" aria-label="Project stages">
            <div aria-hidden className="absolute top-6 h-px bg-line" style={{ left: `${50 / n}%`, right: `${50 / n}%` }}>
              <motion.div className="h-full bg-lav-600" style={{ width: railFill }} />
            </div>
            {steps.map((s, i) => {
              const on = i === active;
              const done = i < active;
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={on}
                  aria-controls="process-panel"
                  onClick={() => goTo(i)}
                  className="group relative flex flex-col items-center gap-3 pb-2 text-center"
                >
                  <motion.span
                    animate={{ scale: on ? 1.1 : 1 }}
                    transition={{ duration: 0.35 }}
                    className={`relative z-10 grid h-12 w-12 place-items-center rounded-full border border-line transition-colors duration-300 group-hover:border-ink ${on || done ? "bg-ink text-lav-300" : "bg-white text-muted"}`}
                  >
                    {done ? <Check size={18} /> : <s.Icon size={19} />}
                    {on && (
                      <svg className="absolute -inset-1 h-14 w-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
                        <motion.circle cx="28" cy="28" r="26" fill="none" className="stroke-lav-500" strokeWidth="2" style={{ pathLength: stepFill }} />
                      </svg>
                    )}
                  </motion.span>
                  <span>
                    <span className={`block text-[15px] font-semibold transition-colors sm:text-base ${on ? "text-ink" : "text-muted group-hover:text-ink"}`}>{s.title}</span>
                    <span className="hidden text-xs text-muted sm:block">{s.time}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          <div id="process-panel" role="tabpanel" className="mt-8 overflow-hidden rounded-[28px] bg-ink text-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45, ease }}
                className="grid md:grid-cols-[1fr_1.1fr]"
              >
                <div className="p-7 sm:p-9">
                  <p className="text-sm text-lav-300">Step {active + 1} of {steps.length}, {step.time}</p>
                  <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-white/65">{step.text}</p>
                  <ul className="mt-6 space-y-2.5">
                    {step.gets.map((g, i) => (
                      <motion.li key={g} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08, ease }} className="flex items-center gap-3 text-[15px]">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-lav-600"><Check size={11} /></span>
                        {g}
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="hidden border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(136,115,238,0.22),transparent_60%)] p-6 md:block md:min-h-[300px] md:border-l">
                  <step.Visual play />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

const pop = (play: boolean, delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: play ? { opacity: 1, y: 0 } : undefined,
  transition: { delay, duration: 0.5, ease },
});

function DiscoverVisual({ play }: { play: boolean }) {
  const goals = ["More enquiries from Google", "Online payments", "Easy to update"];
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <motion.div {...pop(play, 0.1)} className="w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-sm">What should your website do for you?</motion.div>
      <motion.div {...pop(play, 0.45)} className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-lav-600 px-4 py-2.5 text-sm">Bring customers and take orders online.</motion.div>
      <motion.div {...pop(play, 0.8)} className="mt-1 rounded-2xl border border-white/10 bg-ink p-4">
        <p className="text-xs text-white/55">Project brief</p>
        <ul className="mt-2 space-y-1.5">
          {goals.map((g, i) => (
            <motion.li key={g} {...pop(play, 1 + i * 0.2)} className="flex items-center gap-2 text-sm">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/20 text-emerald-300"><Check size={12} /></span>{g}
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

function DesignVisual({ play }: { play: boolean }) {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="relative h-full w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-ink">
        {/* wireframe */}
        <div className="absolute inset-0 space-y-3 p-4">
          <div className="h-3 w-16 rounded border border-dashed border-white/25" />
          <div className="h-24 rounded-xl border border-dashed border-white/25" />
          <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-lg border border-dashed border-white/25" />)}</div>
        </div>
        {/* finished design wipes over the wireframe */}
        <motion.div initial={{ clipPath: "inset(0 100% 0 0)" }} animate={play ? { clipPath: "inset(0 0% 0 0)" } : undefined} transition={{ delay: 0.5, duration: 1.4, ease }} className="absolute inset-0 space-y-3 bg-white p-4">
          <div className="h-3 w-16 rounded bg-ink" />
          <div className="relative h-24 overflow-hidden rounded-xl bg-lav-600">
            <img src="/images/stock/photo-1497366216548-37526070297c.jpg" alt="" className="h-full w-full object-cover opacity-60" />
          </div>
          <div className="grid grid-cols-3 gap-2">{["bg-lav-100", "bg-lav-200", "bg-lav-100"].map((c, i) => <div key={i} className={`h-14 rounded-lg ${c}`} />)}</div>
        </motion.div>
        <motion.div initial={{ left: "8%", top: "70%" }} animate={play ? { left: ["8%", "62%", "78%"], top: ["70%", "35%", "60%"] } : undefined} transition={{ delay: 0.4, duration: 2.2, ease: "easeInOut" }} className="absolute flex items-start">
          <MousePointer2 size={18} className="fill-lav-400 text-lav-400" />
          <span className="ml-1 mt-4 rounded-md bg-lav-500 px-2 py-0.5 text-[11px] font-semibold">Designer</span>
        </motion.div>
      </div>
      <div className="absolute right-0 top-0 hidden flex-col gap-1.5 sm:flex">
        {["rgb(var(--c-ink))", "rgb(var(--c-lav-600))", "rgb(var(--c-lav-300))", "rgb(var(--c-mist))"].map((c, i) => (
          <motion.span key={c} {...pop(play, 0.2 + i * 0.12)} className="h-7 w-7 rounded-lg border border-white/15" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

function BuildVisual({ play }: { play: boolean }) {
  const pages = [{ name: "Home", to: 100 }, { name: "Shop", to: 100 }, { name: "Checkout", to: 82 }, { name: "Admin", to: 64 }];
  return (
    <div className="grid h-full gap-4 sm:grid-cols-[1.1fr_1fr]">
      <div className="hidden rounded-2xl border border-white/10 bg-ink p-4 font-mono text-[12px] leading-relaxed sm:block">
        {["<Page>", "  <Hero />", "  <Products />", "  <Checkout pay=\"razorpay\" />", "</Page>"].map((l, i) => (
          <motion.p key={i} initial={{ opacity: 0, x: -8 }} animate={play ? { opacity: 1, x: 0 } : undefined} transition={{ delay: 0.2 + i * 0.18 }} className={i === 3 ? "text-lav-300" : "text-white/70"}>
            {l}
          </motion.p>
        ))}
      </div>
      <div className="flex flex-col justify-center gap-3.5">
        {pages.map((p, i) => (
          <div key={p.name}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>{p.name}</span>
              <motion.span initial={{ opacity: 0 }} animate={play ? { opacity: 1 } : undefined} transition={{ delay: 1.2 + i * 0.2 }} className={p.to === 100 ? "text-emerald-300" : "text-white/55"}>
                {p.to === 100 ? "Done" : `${p.to}%`}
              </motion.span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div initial={{ width: 0 }} animate={play ? { width: `${p.to}%` } : undefined} transition={{ delay: 0.3 + i * 0.2, duration: 1.2, ease }} className={`h-full rounded-full ${p.to === 100 ? "bg-emerald-400" : "bg-lav-500"}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaunchVisual({ play }: { play: boolean }) {
  const path = "M0 120 C 40 115, 60 100, 90 96 S 150 70, 180 66 S 240 40, 270 30 S 320 12, 340 8";
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <motion.span {...pop(play, 0.1)} className="flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300">
          <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-70" /><span className="relative h-2 w-2 rounded-full bg-emerald-300" /></span>
          Live
        </motion.span>
        <motion.span {...pop(play, 0.3)} className="text-sm text-white/55">Visitors this month</motion.span>
      </div>
      <svg viewBox="0 0 340 130" className="mt-4 w-full flex-1" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="launch-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: "rgb(var(--c-lav-500))" }} stopOpacity="0.45" />
            <stop offset="100%" style={{ stopColor: "rgb(var(--c-lav-500))" }} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={`${path} L 340 130 L 0 130 Z`} fill="url(#launch-fill)" initial={{ opacity: 0 }} animate={play ? { opacity: 1 } : undefined} transition={{ delay: 1.2, duration: 0.8 }} />
        <motion.path d={path} fill="none" className="stroke-lav-400" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={play ? { pathLength: 1 } : undefined} transition={{ delay: 0.3, duration: 1.6, ease }} />
      </svg>
    </div>
  );
}
