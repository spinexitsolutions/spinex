"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { Monitor, Tablet, Smartphone, RotateCcw, Play, Check, ShieldCheck, Headphones, MessageCircle } from "lucide-react";
import { useContent } from "../ContentProvider";
import { SplitHeading, ease } from "../Reveal";

export default function WhySpinex() {
  const { content } = useContent();
  const sec = content.sections.why;
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="container-x">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SplitHeading key={sec.heading} text={sec.heading} className="h-display max-w-3xl text-4xl sm:text-6xl" />
          <p className="max-w-sm text-muted">{sec.intro}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-6">
          <Tile className="md:col-span-4 md:row-span-2"><DevicePreview /></Tile>
          <Tile className="md:col-span-2"><SpeedTest /></Tile>
          <Tile className="md:col-span-2" dark><CodeRun /></Tile>
          <Tile className="md:col-span-2"><SeoChecklist /></Tile>
          <Tile className="md:col-span-2"><Secure /></Tile>
          <Tile className="md:col-span-2" accent><Support /></Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({ children, className = "", dark, accent }: { children: React.ReactNode; className?: string; dark?: boolean; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease }}
      className={`relative overflow-hidden rounded-[28px] p-6 sm:p-7 ${dark ? "bg-ink text-white" : accent ? "bg-lav-600 text-white" : "border border-line bg-mist"} ${className}`}
    >
      {children}
    </motion.div>
  );
}

const devices = [
  { id: "desktop", label: "Desktop", Icon: Monitor, width: "100%", cols: 3 },
  { id: "tablet", label: "Tablet", Icon: Tablet, width: "64%", cols: 2 },
  { id: "mobile", label: "Mobile", Icon: Smartphone, width: "36%", cols: 1 },
] as const;

function DevicePreview() {
  const [d, setD] = useState<(typeof devices)[number]>(devices[0]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight">Looks right on every screen</h3>
          <p className="mt-1 text-muted">Most of your visitors are on phones. We design for them first.</p>
        </div>
        <div className="flex rounded-full border border-line bg-white p-1" role="tablist" aria-label="Preview size">
          {devices.map((x) => (
            <button key={x.id} role="tab" aria-selected={d.id === x.id} aria-label={x.label} onClick={() => setD(x)} className="relative grid h-11 w-11 place-items-center rounded-full">
              {d.id === x.id && <motion.span layoutId="device-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <x.Icon size={17} className={`relative ${d.id === x.id ? "text-white" : "text-muted"}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex min-h-[320px] flex-1 items-end justify-center rounded-2xl bg-white p-4 pb-0">
        <motion.div layout style={{ width: d.width }} transition={{ type: "spring", stiffness: 160, damping: 22 }} className="overflow-hidden rounded-t-2xl border border-b-0 border-line bg-white shadow-[0_-10px_40px_-20px_rgba(18,15,27,0.35)]">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-line" /><span className="h-2 w-2 rounded-full bg-line" /><span className="h-2 w-2 rounded-full bg-line" />
          </div>
          <motion.div layout className="space-y-3 p-3">
            <div className="flex items-center justify-between"><div className="h-3 w-14 rounded bg-ink" /><div className="h-3 w-6 rounded bg-line" /></div>
            <div className="relative h-28 overflow-hidden rounded-xl bg-ink">
              <img src="/images/stock/photo-1497366216548-37526070297c.jpg" alt="" className="h-full w-full object-cover opacity-50" />
              <div className="absolute bottom-3 left-3 space-y-1.5"><div className="h-2.5 w-24 rounded bg-white" /><div className="h-2.5 w-16 rounded bg-white/70" /></div>
            </div>
            <motion.div layout className="grid gap-2" style={{ gridTemplateColumns: `repeat(${d.cols}, minmax(0, 1fr))` }}>
              {[0, 1, 2].map((i) => (
                <motion.div layout key={i} className="space-y-1.5 rounded-lg border border-line p-2">
                  <div className="h-10 rounded-md bg-lav-100" />
                  <div className="h-2 w-4/5 rounded bg-line" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function SpeedTest() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [score, setScore] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setScore(0);
    const c = animate(0, 98, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setScore(Math.round(v)) });
    return () => {
      c.stop();
    };
  }, [inView, run]);

  const r = 46, len = 2 * Math.PI * r;
  return (
    <div ref={ref} className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <h3 className="font-display text-xl font-semibold tracking-tight">Fast by default</h3>
        <button onClick={() => setRun((n) => n + 1)} aria-label="Run speed test again" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-muted transition hover:text-ink">
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <svg viewBox="0 0 110 110" className="h-28 w-28 -rotate-90" aria-hidden>
          <circle cx="55" cy="55" r={r} fill="none" stroke="#E6E2EF" strokeWidth="9" />
          <circle cx="55" cy="55" r={r} fill="none" stroke="#6E59D9" strokeWidth="9" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - score / 100)} />
        </svg>
        <div>
          <p className="h-display text-5xl" aria-live="polite">{score}</p>
          <p className="text-sm text-muted">Performance score target</p>
        </div>
      </div>
    </div>
  );
}

const codeLines = ["const growBrand = async () => {", "  await optimize('SEO');", "  await scale('Sales');", "  return 'Success';", "};"];

function CodeRun() {
  const [typed, setTyped] = useState(0);
  const [out, setOut] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const full = codeLines.join("\n");

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => {
      setTyped((n) => {
        if (n >= full.length) {
          clearInterval(t);
          return n;
        }
        return n + 1;
      });
    }, 28);
    return () => {
      clearInterval(t);
    };
  }, [inView, full.length]);

  const runCode = () => {
    setTyped(full.length);
    setOut("Running…");
    setTimeout(() => {
      setOut("✓ 'Success'  (0.8s)");
    }, 700);
  };

  return (
    <div ref={ref} className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold tracking-tight">Clean code</h3>
        <button onClick={runCode} className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold transition hover:bg-lav-600">
          <Play size={14} /> Run
        </button>
      </div>
      <pre className="mt-4 min-h-[110px] flex-1 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-lav-200">
        {full.slice(0, typed)}
        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-white">▍</motion.span>
      </pre>
      <p className="mt-2 h-5 font-mono text-[13px] text-emerald-300" aria-live="polite">{out}</p>
    </div>
  );
}

const seoItems = ["Page titles and meta tags", "Fast mobile loading", "Google Business Profile", "Sitemap and indexing"];

function SeoChecklist() {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <div>
      <h3 className="font-display text-xl font-semibold tracking-tight">Ready for Google</h3>
      <ul ref={ref} className="mt-4 space-y-2.5">
        {seoItems.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[15px]">
            <motion.span
              initial={{ scale: 0, backgroundColor: "#E6E2EF" }}
              animate={inView ? { scale: 1, backgroundColor: "#6E59D9" } : undefined}
              transition={{ delay: 0.2 + i * 0.25, type: "spring", stiffness: 400, damping: 18 }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white"
            >
              <Check size={13} />
            </motion.span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Secure() {
  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-ink text-lav-300">
        <ShieldCheck size={24} />
        <motion.span className="absolute inset-0 rounded-2xl border-2 border-lav-400" animate={{ scale: [1, 1.35], opacity: [0.8, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      </div>
      <div>
        <h3 className="font-display text-xl font-semibold tracking-tight">Secure and backed up</h3>
        <p className="mt-1 text-muted">SSL, regular backups and updates so your site stays safe.</p>
      </div>
    </div>
  );
}

function Support() {
  const { content } = useContent();
  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><Headphones size={24} /></span>
        <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-300" /> Online
        </span>
      </div>
      <div>
        <h3 className="font-display text-xl font-semibold tracking-tight">Quick WhatsApp support</h3>
        <p className="mt-1 text-white/80">A real person replies, not a ticket queue.</p>
        <a href={`https://wa.me/${content.contact.whatsapp}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink">
          <MessageCircle size={15} /> Message us
        </a>
      </div>
    </div>
  );
}
