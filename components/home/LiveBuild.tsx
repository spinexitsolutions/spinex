"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Check, Clapperboard, Gauge, Globe, Heart, LayoutDashboard, Lock, Megaphone, MessageCircle, PenTool, Send,
  ShoppingBag, Smartphone, Sparkles, TrendingUp, Zap, type LucideIcon,
} from "lucide-react";
import { HERO_SCENES_DEFAULT, type HeroScene } from "@/lib/content";
import { sized } from "@/lib/img";

// Browser window on the right of the hero that "builds" a piece of work for each service.
// Which four show, and in what order, is set in Admin → Homepage hero → Box on the right.
// It moves to the next one on its own; a visitor can click a tab, and hovering pauses it.
// The animations live in app/hero-scenes.css and play once each time a scene shows.

type Scene = { label: string; Icon: LucideIcon; url: string; View: ComponentType };

export const SCENES: Record<HeroScene, Scene> = {
  web: { label: "Website", Icon: Globe, url: "yourbrand.in", View: WebScene },
  ai: { label: "AI", Icon: Sparkles, url: "wa.me/yourbrand · AI assistant", View: AiScene },
  ecommerce: { label: "Store", Icon: ShoppingBag, url: "shop.yourbrand.in", View: StoreScene },
  saas: { label: "Software", Icon: LayoutDashboard, url: "app.yourbrand.in/dashboard", View: SaasScene },
  marketing: { label: "Ads", Icon: TrendingUp, url: "ads manager · Jaipur campaign", View: AdsScene },
  social: { label: "Social", Icon: Heart, url: "instagram.com/yourbrand", View: SocialScene },
  app: { label: "App", Icon: Smartphone, url: "Android & iOS app", View: AppScene },
  video: { label: "Video", Icon: Clapperboard, url: "studio / reel_final.mp4", View: VideoScene },
  design: { label: "Design", Icon: PenTool, url: "brand kit · logo.fig", View: DesignScene },
  promotion: { label: "Promotion", Icon: Megaphone, url: "campaign · reach report", View: PromoScene },
};

const STAY = 5600; // ms each scene shows before the next one

export default function LiveBuild({ scenes }: { scenes?: HeroScene[] }) {
  const key = (scenes ?? []).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => (scenes?.length ? scenes : HERO_SCENES_DEFAULT).filter((s) => SCENES[s]).slice(0, 4), [key]);
  const [active, setActive] = useState<HeroScene>(list[0]);
  const [paused, setPaused] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useInView(box);
  const current = list.includes(active) ? active : list[0];

  // Intro on computers: a "Spinex" cursor drags out the box, the box appears, and from then on the
  // cursor walks to the next tab and clicks it. Phones and "reduce motion" get the box straight away.
  const win = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [fancy, setFancy] = useState(false);
  const [phase, setPhase] = useState<"off" | "enter" | "drag" | "show" | "live">("off");
  const [cur, setCur] = useState({ x: 0, y: 0, dur: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [click, setClick] = useState<{ x: number; y: number; k: number } | null>(null);
  const shown = phase === "off" || phase === "show" || phase === "live";

  useEffect(() => {
    const ok = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ok || !win.current) return;
    setFancy(true);
    const W = win.current.offsetWidth, H = win.current.offsetHeight;
    setSize({ w: W, h: H });
    const ts: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, f: () => void) => ts.push(setTimeout(f, ms));
    setCur({ x: W + 240, y: H + 160, dur: 0 });
    setPhase("enter");
    at(80, () => setCur({ x: 0, y: 0, dur: 900 }));
    at(1050, () => { setPhase("drag"); setCur({ x: W, y: H, dur: 1400 }); });
    at(2500, () => { setClick({ x: W, y: H, k: 1 }); setPhase("show"); });
    at(3000, () => setCur({ x: W * 0.22, y: H * 0.42, dur: 900 }));
    at(3900, () => { setClick({ x: W * 0.22, y: H * 0.42, k: 2 }); setPhase("live"); });
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (paused || !onScreen || list.length < 2 || !shown) return;
    const next = list[(list.indexOf(current) + 1) % list.length];
    if (!fancy || phase !== "live") {
      const t = setTimeout(() => setActive(next), STAY);
      return () => clearTimeout(t);
    }
    // Walk the cursor to the next tab, then click it.
    const spot = () => {
      const tab = tabRefs.current[list.indexOf(next)], b = box.current;
      if (!tab || !b) return { x: 0, y: 0 };
      const r = tab.getBoundingClientRect(), o = b.getBoundingClientRect();
      return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 };
    };
    const t1 = setTimeout(() => setCur({ ...spot(), dur: 900 }), STAY - 1100);
    const t2 = setTimeout(() => { const p = spot(); setClick({ ...p, k: Date.now() }); setActive(next); }, STAY);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [current, paused, onScreen, list, shown, fancy, phase]);

  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 120, damping: 18 });
  const scene = SCENES[current];
  const View = scene.View;

  return (
    <div
      ref={box}
      className="relative [perspective:1400px]"
      data-live-build
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); mx.set(0.5); my.set(0.5); }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
    >
      {/* The dashed box the cursor drags out before the window appears. */}
      {fancy && (phase === "enter" || phase === "drag" || phase === "show") && (
        <div aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 rounded-md border-[1.5px] border-dashed border-lav-600 bg-lav-600/[0.06]"
          style={{ width: phase === "enter" ? 0 : size.w, height: phase === "enter" ? 0 : size.h, opacity: phase === "show" ? 0 : 1, transition: "width 1.4s cubic-bezier(.65,0,.35,1), height 1.4s cubic-bezier(.65,0,.35,1), opacity .35s" }}>
          {["-left-[5px] -top-[5px]", "-right-[5px] -top-[5px]", "-left-[5px] -bottom-[5px]", "-right-[5px] -bottom-[5px]"].map((c) => <i key={c} className={`absolute h-2.5 w-2.5 rounded-sm border-[1.5px] border-lav-600 bg-white ${c}`} />)}
          {phase === "drag" && <DragSize w={size.w} h={size.h} />}
        </div>
      )}
      <motion.div
        ref={win}
        initial={false}
        animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.96 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ rotateX: rx, rotateY: ry, transformOrigin: "top left" }}
        className="relative rounded-[22px] border border-line bg-white shadow-[0_40px_90px_-30px_rgb(var(--c-lav-700)/0.45)] [transform-style:preserve-3d]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF6159]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C941]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-mist px-3 py-1.5 text-xs text-muted">
            <Lock size={11} className="shrink-0" />
            <AnimatePresence mode="wait">
              <motion.span key={scene.url} className="truncate" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {scene.url}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="relative h-[300px] overflow-hidden p-4 sm:h-[340px] lg:h-[clamp(220px,calc(100svh_-_380px),360px)]">
          <AnimatePresence mode="wait">
            {shown && <motion.div key={current} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="h-full" data-scene={current}>
              <View />
            </motion.div>}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-1.5 border-t border-line p-2" role="tablist" aria-label="What we build">
          {list.map((id) => {
            const { label, Icon } = SCENES[id];
            return (
              <button
                key={id}
                ref={(el) => { tabRefs.current[list.indexOf(id)] = el; }}
                role="tab"
                aria-selected={current === id}
                onClick={() => setActive(id)}
                className="relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 text-[13px] font-medium"
              >
                {current === id && <motion.span layoutId="build-tab" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <Icon size={14} className={`relative shrink-0 ${current === id ? "text-lav-300" : "text-muted"}`} />
                <span className={`relative truncate ${current === id ? "text-white" : "text-muted"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Website speed card: only with the website scene, so it never covers the others. */}
      <motion.div
        style={{ translateZ: 60 }}
        initial={{ opacity: 0, x: 20 }}
        animate={current === "web" && shown ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
        transition={{ delay: current === "web" ? 1.2 : 0, duration: current === "web" ? 0.7 : 0.25 }}
        className="absolute -left-6 bottom-20 hidden items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-xl sm:flex"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-lav-100 text-lav-700"><Gauge size={18} /></span>
        <div>
          <p className="text-xs text-muted">Performance</p>
          <p className="font-display text-lg font-semibold leading-none">98 / 100</p>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
        transition={{ delay: shown ? 1.45 : 0, duration: 0.7 }}
        className="absolute -right-4 -top-5 hidden items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-xl sm:flex"
      >
        <Zap size={14} className="text-lav-300" /> Loads in 0.8s
      </motion.div>

      {/* The "Spinex" cursor and its click ripple (computers only). */}
      {fancy && (
        <>
          {click && <span key={click.k} aria-hidden className="hs-click-ring pointer-events-none absolute z-30 -ml-4 -mt-4 h-8 w-8 rounded-full border-2 border-lav-600" style={{ left: click.x, top: click.y }} />}
          <div aria-hidden className="pointer-events-none absolute left-0 top-0 z-30" style={{ transform: `translate(${cur.x}px, ${cur.y}px)`, transition: `transform ${cur.dur}ms cubic-bezier(.65,0,.35,1), opacity .3s`, opacity: paused || phase === "off" ? 0 : 1 }}>
            <svg width="20" height="22" viewBox="0 0 14 16"><path d="M0 0 13 8 6 9.5 3.5 15z" fill="rgb(var(--c-lav-600))" stroke="#fff" strokeWidth="1.2" /></svg>
            <span className="absolute left-4 top-[18px] whitespace-nowrap rounded-full rounded-tl-sm bg-lav-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-[0_6px_14px_-6px_rgb(var(--c-lav-600)/0.8)]">Spinex</span>
          </div>
        </>
      )}
    </div>
  );
}

// The "520 × 440" label that counts up while the box is dragged out.
function DragSize({ w, h }: { w: number; h: number }) {
  const t = useClock(1.5);
  const k = ease(t / 1.4);
  return <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-lav-600 px-2 py-0.5 text-[11px] font-semibold text-white">{Math.round(w * k)} × {Math.round(h * k)}</span>;
}

// ---------- helpers ----------

const img = (name: string, w = 640) => sized(`/images/stock/${name}.jpg`, w);
const d = (s: number): CSSProperties => ({ animationDelay: `${s}s` });
const Bar = ({ w, className = "" }: { w: string; className?: string }) => <div className={`h-2 rounded-full bg-line ${className}`} style={{ width: w }} />;
function In({ at, className = "", style, children }: { at: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return <div className={`hs-in ${className}`} style={{ ...style, ...d(at) }}>{children}</div>;
}

// Seconds since the scene appeared, updated every frame (only while the scene is on screen).
function useClock(until = 8) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setT(until); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      setT(s);
      if (s < until) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [until]);
  return t;
}
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function Count({ to, at = 0.3, dur = 2, fmt = (n: number) => Math.round(n).toLocaleString("en-IN") }: { to: number; at?: number; dur?: number; fmt?: (n: number) => string }) {
  const t = useClock(at + dur + 0.1);
  return <>{fmt(to * ease((t - at) / dur))}</>;
}

// ---------- scenes ----------

function WebScene() {
  return (
    <div className="relative flex h-full flex-col gap-3">
      <In at={0} className="flex items-center justify-between">
        <div className="h-4 w-16 rounded-md bg-ink" />
        <div className="flex gap-3"><Bar w="30px" /><Bar w="30px" /><Bar w="30px" /></div>
      </In>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-mist">
        <div className="hs-gone absolute inset-0 space-y-2.5 rounded-2xl border-2 border-dashed border-lav-300 p-5" style={d(1.2)}>
          <div className="h-3.5 w-3/5 rounded bg-line" /><div className="h-3.5 w-2/5 rounded bg-line" /><div className="mt-4 h-7 w-24 rounded-full bg-line" />
        </div>
        <div className="hs-real absolute inset-0" style={d(1.2)}>
          <img src={img("photo-1497366216548-37526070297c", 960)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 to-ink/20 p-5 text-white">
            <p className="font-display text-xl font-semibold leading-tight sm:text-2xl">We grow<br />your business.</p>
            <span className="mt-4 inline-block rounded-full bg-lav-400 px-4 py-2 text-xs font-semibold text-ink">Get started →</span>
          </div>
        </div>
        <svg viewBox="0 0 14 16" className="hs-cursor absolute left-0 top-0 h-4 w-4" style={{ ["--x0" as string]: "260px", ["--y0" as string]: "200px", ["--x1" as string]: "70px", ["--y1" as string]: "92px", ...d(2.3) }}>
          <path d="M0 0 13 8 6 9.5 3.5 15z" fill="#120f1b" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="hs-pop absolute right-3 top-3 flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold shadow-lg" style={d(3.4)}>
          <svg width="26" height="26" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="none" stroke="#eee" strokeWidth="4" /><circle cx="17" cy="17" r="15" fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" transform="rotate(-90 17 17)" className="hs-draw" style={{ ["--len" as string]: 94, ...d(3.5) }} /><text x="17" y="21" textAnchor="middle" fontSize="10" fontWeight="700" fill="#16a34a">98</text></svg>
          Speed
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <In key={i} at={0.3 + i * 0.15} className="space-y-2 rounded-xl border border-line p-3">
            <div className="h-5 w-5 rounded-lg bg-lav-100" /><Bar w="80%" />
          </In>
        ))}
      </div>
    </div>
  );
}

function AiScene() {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-[#efeae2] bg-[radial-gradient(#e2dbd0_1px,transparent_1px)] bg-[length:12px_12px] p-3 text-[12.5px] leading-snug">
      <In at={0.2} className="ml-auto w-fit max-w-[78%] rounded-2xl rounded-br-md bg-[#dcf8c6] px-3 py-2">Hi, website ka price kya hai?</In>
      <div className="hs-in mt-2 w-fit" style={d(0.9)}>
        <div className="hs-gone hs-type flex gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-3" style={d(1.9)}>
          <i className="h-1.5 w-1.5 rounded-full bg-muted" /><i className="h-1.5 w-1.5 rounded-full bg-muted" /><i className="h-1.5 w-1.5 rounded-full bg-muted" />
        </div>
      </div>
      <In at={1.95} className="-mt-8 w-fit max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3 py-2">
        <b className="flex items-center gap-1 text-lav-700"><Sparkles size={12} /> Spinex AI</b>
        Business websites ₹9,999 se shuru. Aapka naam bata do, team call karegi.
      </In>
      <In at={2.9} className="ml-auto mt-2 w-fit rounded-2xl rounded-br-md bg-[#dcf8c6] px-3 py-2">Rahul, Jaipur</In>
      <In at={3.6} className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700"><Check size={12} /> Lead saved</span>
        <span className="truncate">Rahul · Jaipur · Website</span>
        <span className="ml-auto text-muted">CRM</span>
      </In>
    </div>
  );
}

function StoreScene() {
  const orders = [["Amazon", "bg-orange-50 text-orange-700", "₹1,299"], ["Flipkart", "bg-blue-50 text-blue-700", "₹849"], ["Meesho", "bg-pink-50 text-pink-700", "₹399"]];
  return (
    <div className="flex h-full flex-col gap-2.5">
      <In at={0} className="flex items-center justify-between">
        <div className="h-2.5 w-20 rounded-full bg-ink" />
        <div className="relative grid h-8 w-8 place-items-center rounded-full border border-line">
          <ShoppingBag size={14} />
          <span className="hs-pop absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-lav-600 text-[9px] font-bold text-white" style={d(1.5)}>1</span>
        </div>
      </In>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1fr)] gap-3">
        {[["photo-1523275335684-37898b6baf30", "₹2,499"], ["photo-1505740420928-5e560c06d30e", "₹1,899"]].map(([p, price], i) => (
          <In key={p} at={0.2 + i * 0.15} className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-line">
            <img src={img(p, 400)} alt="" className="min-h-0 w-full flex-1 object-cover" />
            <div className="flex items-center justify-between p-2 text-xs font-semibold">{price}{i === 0 && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] text-white">Add</span>}</div>
            {i === 0 && <img src={img(p, 120)} alt="" className="hs-fly absolute left-6 top-6 h-8 w-8 rounded-md object-cover" style={{ ["--fx" as string]: "220px", ["--fy" as string]: "-60px", ...d(0.9) }} />}
          </In>
        ))}
      </div>
      {orders.map(([m, cls, amt], i) => (
        <In key={m} at={2 + i * 0.55} className="flex items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-xs">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{m}</span>New order<b className="ml-auto">{amt}</b>
        </In>
      ))}
    </div>
  );
}

function SaasScene() {
  const bars = [18, 30, 24, 42, 36, 55, 48, 66];
  return (
    <div className="grid h-full grid-cols-[38px_1fr] gap-3">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-ink py-3">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-4 w-4 rounded ${i ? "bg-white/20" : "bg-lav-400"}`} />)}
      </div>
      <div className="relative flex min-h-0 flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-2">
          {([["Users", 1284, ""], ["MRR", 84200, "₹"], ["Churn", 0, "1.2%"]] as const).map(([l, n, pre], i) => (
            <In key={l} at={0.1 + i * 0.15} className="rounded-xl border border-line px-3 py-2">
              <p className="text-[10px] text-muted">{l}</p>
              <p className="font-display text-base font-semibold sm:text-lg">{n ? <>{pre}<Count to={n} at={0.4} dur={2.2} /></> : pre}</p>
            </In>
          ))}
        </div>
        <In at={0.5} className="min-h-0 flex-1 rounded-xl border border-line p-2">
          <svg viewBox="0 0 200 90" preserveAspectRatio="none" className="h-full w-full">
            {bars.map((h, i) => <rect key={i} x={8 + i * 24} y={90 - h} width="12" height={h} rx="3" fill="rgb(var(--c-lav-100))" className="hs-grow" style={d(0.6 + i * 0.06)} />)}
            <path d="M5 75 L30 66 L55 70 L80 50 L105 55 L130 34 L155 40 L195 14" fill="none" stroke="rgb(var(--c-lav-600))" strokeWidth="3" strokeLinecap="round" className="hs-draw" style={{ ["--len" as string]: 300, ...d(0.9) }} />
          </svg>
        </In>
        <In at={3.4} className="absolute bottom-2 right-2 flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-xl">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-lav-600">₹</span>New subscriber · ₹999/mo
        </In>
      </div>
    </div>
  );
}

function AdsScene() {
  const rows = [["Reach", 48200, "100%", "bg-lav-400"], ["Clicks", 3120, "78%", "bg-lav-500"], ["Leads", 186, "54%", "bg-lav-700"]] as const;
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {[["Google Ads", "bg-blue-50 text-blue-700"], ["Meta Ads", "bg-indigo-50 text-indigo-700"], ["Jaipur · 25-45", "bg-lav-100 text-lav-700"]].map(([t, c], i) => (
          <In key={t} at={0.1 + i * 0.15} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c}`}>{t}</In>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
        {rows.map(([l, n, w, c], i) => (
          <div key={l} className={`hs-width mx-auto flex h-8 items-center justify-between rounded-lg px-3 text-xs font-semibold text-white ${c}`} style={{ ["--from" as string]: "18%", ["--to" as string]: w, ...d(0.4 + i * 0.4) }}>
            <span>{l}</span><span><Count to={n} at={0.5 + i * 0.4} dur={1.6} /></span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <In at={2.4} className="rounded-xl border border-line px-3 py-2"><p className="text-[10px] text-muted">Return on ads</p><p className="font-display text-xl font-semibold text-emerald-600">4.2x</p></In>
        <In at={2.7} className="rounded-xl border border-line px-3 py-2"><p className="text-[10px] text-muted">Cost per lead</p><p className="font-display text-xl font-semibold">₹48</p></In>
      </div>
    </div>
  );
}

function SocialScene() {
  const tiles = ["photo-1504384308090-c894fdcc538d", "photo-1519389950473-47ba0277781c", "photo-1561070791-2526d30994b5", "photo-1497366216548-37526070297c", "photo-1523275335684-37898b6baf30", "photo-1505740420928-5e560c06d30e"];
  return (
    <div className="relative flex h-full flex-col gap-2.5">
      <In at={0} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-lav-600 p-[2px]"><div className="h-full w-full rounded-full bg-white" /></div>
        <div className="flex-1"><p className="text-sm font-bold"><Count to={12480} at={0.3} dur={2.4} /></p><p className="text-[10px] text-muted">followers</p></div>
        <span className="rounded-full bg-lav-100 px-2.5 py-1 text-[11px] font-semibold text-lav-700">+2,140 this month</span>
      </In>
      <div className="relative grid min-h-0 flex-1 grid-cols-3 grid-rows-[repeat(2,minmax(0,1fr))] gap-1">
        {tiles.map((t, i) => (
          <div key={t} className="hs-tile overflow-hidden rounded-md bg-mist" style={d(0.2 + i * 0.15)}>
            <img src={img(t, 320)} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
        <Heart className="hs-heart absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 fill-white text-white drop-shadow-lg" style={d(1.6)} />
      </div>
      <In at={3.3} className="absolute bottom-2 left-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-xl">
        <span className="h-4 w-4 rounded bg-gradient-to-tr from-amber-400 to-fuchsia-500" />Reel scheduled · Tue 7 PM
      </In>
    </div>
  );
}

function AppScene() {
  const route = "M14 120 L14 86 L52 86 L52 42 L90 42 L90 18";
  return (
    <div className="relative flex h-full items-center justify-center">
      <In at={0.5} className="absolute left-2 top-6 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-lg">Android</In>
      <In at={0.8} className="absolute right-2 top-1/2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-lg">iOS</In>
      <In at={0} className="h-full max-h-[300px] rounded-[26px] bg-ink p-1.5" style={{ aspectRatio: "9 / 17" }}>
        <div className="relative h-full overflow-hidden rounded-[21px] bg-white">
          <div className="absolute inset-x-0 top-0 bottom-[34%] bg-[#e9f3ec] bg-[linear-gradient(90deg,#fff_6px,transparent_6px),linear-gradient(#fff_6px,transparent_6px)] bg-[length:38px_34px] bg-[position:12px_8px]">
            <svg viewBox="0 0 108 136" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
              <path d={route} fill="none" stroke="rgb(var(--c-lav-600))" strokeWidth="3" strokeDasharray="4 4" />
              <circle cx="90" cy="18" r="5" fill="#d946ef" />
              <circle r="6" cx="0" cy="0" fill="#120f1b" stroke="#fff" strokeWidth="3"><animateMotion dur="2.8s" begin="0s" fill="freeze" path={route} calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.3 1" /></circle>
            </svg>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[34%] rounded-t-2xl bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <p className="text-xs font-bold">Driver arriving</p>
            <Bar w="70%" className="mt-2" />
            <p className="mt-2.5 rounded-lg bg-ink py-1.5 text-center text-[11px] font-semibold text-white">Track order</p>
          </div>
          <div className="hs-sheet absolute inset-x-0 bottom-0 h-[34%] rounded-t-2xl bg-emerald-600 p-3 text-center text-white" style={d(3.3)}>
            <p className="flex items-center justify-center gap-1 text-sm font-bold"><Check size={15} /> Delivered</p>
            <p className="mt-1 text-[11px] opacity-85">Rate your order ★★★★★</p>
          </div>
        </div>
      </In>
    </div>
  );
}

// Reel editor: a reel plays in the phone (photos cut together with zooms and captions) while the timeline follows.
const REEL = ["photo-1504384308090-c894fdcc538d", "photo-1522071820081-009f0129c71c", "photo-1556761175-5973dc0f32e7", "photo-1542744173-8e7e53415bb0"];
const KB = [[1, 1.18, -4, 3], [1.15, 1, 4, -3], [1, 1.2, 3, 4], [1.18, 1.02, -3, -2]];
const CAPS = [["STOP", "SCROLLING"], ["YOUR", "BRAND"], ["GROWS", "HERE"], ["WITH", "SPINEX"]];
function VideoScene() {
  const D = 5.2, n = REEL.length, clip = D / n;
  const t = Math.min(useClock(D + 0.6), D - 0.001);
  const p = t / D, k = Math.min(n - 1, Math.floor(t / clip)), f = (t % clip) / clip;
  const exp = Math.max(0, Math.min(1, (p - 0.6) / 0.35));
  return (
    <div className="grid h-full grid-cols-[minmax(0,30%)_1fr] gap-3">
      <div className="relative self-center overflow-hidden rounded-[18px] bg-ink shadow-[0_18px_30px_-14px_rgba(18,15,27,0.6)]" style={{ aspectRatio: "9 / 16", maxHeight: "100%" }}>
        {REEL.map((src, i) => {
          const [a, b, x, y] = KB[i], on = i === k, s = a + (b - a) * f;
          return <img key={src} src={img(src, 480)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: on ? 1 : 0, transform: on ? `scale(${s}) translate(${x * f}%, ${y * f}%)` : undefined }} />;
        })}
        <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: f < 0.08 ? (1 - f / 0.08) * 0.7 : 0 }} />
        <div className="absolute inset-x-2 top-2 flex gap-[3px]">
          {REEL.map((s, i) => <i key={s} className="h-[2.5px] flex-1 overflow-hidden rounded bg-white/35"><span className="block h-full bg-white" style={{ width: `${i < k ? 100 : i === k ? f * 100 : 0}%` }} /></i>)}
        </div>
        <p className="absolute inset-x-0 top-[40%] pl-2 pr-8 text-center font-display text-sm font-bold leading-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
          {CAPS[k].map((w, i) => {
            const s = Math.max(0, Math.min(1, (f - 0.12 - i * 0.18) / 0.12));
            return <span key={w} className={`mx-0.5 inline-block ${k === 3 && i === 1 ? "text-yellow-300" : ""}`} style={{ transform: `scale(${s < 1 ? s * 1.25 : 1})` }}>{w}</span>;
          })}
        </p>
        <div className="absolute bottom-10 right-1.5 flex flex-col items-center gap-2 text-[8px] font-semibold text-white">
          <span className="text-center"><Heart size={16} className="mx-auto fill-white drop-shadow" />{(1.2 + p * 3.4).toFixed(1)}K</span>
          <span className="text-center"><MessageCircle size={16} className="mx-auto fill-white drop-shadow" />86</span>
          <span className="text-center"><Send size={15} className="mx-auto drop-shadow" /></span>
        </div>
        <p className="absolute bottom-2 left-2 right-8 flex items-center gap-1 truncate text-[9px] font-semibold text-white"><i className="h-3.5 w-3.5 shrink-0 rounded-full bg-gradient-to-tr from-amber-400 to-fuchsia-500" />yourbrand · ♪ Original audio</p>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {["✂ Smart cuts", "✦ Captions", "◐ Colour grade", "♪ Beat sync"].map((x, i) => (
            <span key={x} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-300 ${p > 0.05 + i * 0.12 ? "border-ink bg-ink text-white" : "border-line text-muted"}`}>{x}</span>
          ))}
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-muted"><span>Timeline</span><span>00:0{Math.floor(t)} / 00:05</span></div>
        <div className="relative flex flex-col gap-1.5 rounded-xl bg-mist p-2">
          <div className="flex h-9 gap-[3px] sm:h-10">
            {REEL.map((src, i) => <div key={src} className={`flex-1 rounded-md bg-cover bg-center outline outline-2 ${i === k ? "outline-fuchsia-500" : "outline-transparent"}`} style={{ backgroundImage: `url(${img(src, 160)})` }} />)}
          </div>
          <div className="relative h-4">
            {[["STOP SCROLLING", 0, 30], ["YOUR BRAND", 33, 32], ["GROWS HERE", 68, 32]].map(([l, x, w]) => (
              <span key={l} className="absolute top-0 flex h-full items-center overflow-hidden whitespace-nowrap rounded bg-lav-400 px-1.5 text-[8px] font-semibold text-white" style={{ left: `${x}%`, width: `${w}%` }}>{l}</span>
            ))}
          </div>
          <div className="flex h-5 items-center gap-[2px] rounded bg-lav-100 px-1">
            {Array.from({ length: 36 }, (_, i) => (
              <i key={i} className="flex-1 rounded-sm bg-lav-600" style={{ height: `${25 + 65 * Math.abs(Math.sin(i * 0.7 + t * 7)) * (0.5 + 0.5 * Math.sin(i * 0.31 + t * 2))}%`, opacity: Math.abs(i / 36 - p) < 0.05 ? 1 : 0.5 }} />
            ))}
          </div>
          <span className="absolute bottom-1 top-1 w-0.5 rounded bg-fuchsia-500" style={{ left: `calc(8px + ${p} * (100% - 16px))` }} />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-ink px-3 py-2 text-[11px] font-semibold text-white">
          <span className="shrink-0">{exp >= 1 ? <span className="text-emerald-400">✓ Ready to post</span> : exp > 0 ? "Exporting 1080p" : "Editing…"}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-gradient-to-r from-lav-400 to-fuchsia-500" style={{ width: `${exp * 100}%` }} /></span>
          {exp > 0 && exp < 1 && <span>{Math.round(exp * 100)}%</span>}
        </div>
      </div>
    </div>
  );
}

function DesignScene() {
  return (
    <div className="grid h-full grid-cols-[1fr_72px] gap-3">
      <div className="relative grid place-items-center rounded-xl bg-mist bg-[radial-gradient(rgb(var(--c-lav-200))_1px,transparent_1px)] bg-[length:10px_10px]">
        <svg viewBox="0 0 120 120" className="h-3/4 max-h-40 w-auto">
          <path d="M84 36c-6-8-16-12-27-10-14 2-22 13-17 23 4 9 18 10 28 15 10 5 13 16 4 24-9 8-26 7-35-3" fill="rgb(var(--c-lav-600))" fillOpacity="0" stroke="rgb(var(--c-lav-600))" strokeWidth="9" strokeLinecap="round" className="hs-draw" style={{ ["--len" as string]: 400, animation: "hs-draw 2s cubic-bezier(.6,0,.2,1) .2s both, hs-fill .6s ease 2.3s both" }} />
        </svg>
        <div className="hs-in absolute inset-[12%] border-[1.5px] border-sky-400" style={d(2.4)}>
          {["-left-1 -top-1", "-right-1 -top-1", "-left-1 -bottom-1", "-right-1 -bottom-1"].map((c) => <i key={c} className={`absolute h-2 w-2 border-[1.5px] border-sky-400 bg-white ${c}`} />)}
        </div>
        <In at={3.2} className="absolute bottom-2 left-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-lg">Logo · Final ✓</In>
      </div>
      <div className="flex flex-col gap-2">
        {["bg-lav-600", "bg-fuchsia-500", "bg-ink", "bg-mist"].map((c, i) => (
          <In key={c} at={2.6 + i * 0.12} className={`min-h-0 flex-1 rounded-lg border border-line ${c}`} />
        ))}
        <In at={3.2} className="text-center font-display text-2xl font-bold leading-none">Aa</In>
      </div>
    </div>
  );
}

function PromoScene() {
  const people = [["left-[6%] top-[8%]", "photo-1504384308090-c894fdcc538d"], ["right-[6%] top-[12%]", "photo-1519389950473-47ba0277781c"], ["left-[10%] bottom-[30%]", "photo-1561070791-2526d30994b5"], ["right-[8%] bottom-[30%]", "photo-1497366216548-37526070297c"]];
  return (
    <div className="relative h-full">
      <div className="absolute left-1/2 top-[42%]">
        {[0, 0.8, 1.6].map((s) => <span key={s} className="hs-ripple absolute -left-12 -top-12 h-24 w-24 rounded-full border-2 border-lav-400" style={d(s)} />)}
        <span className="absolute -left-8 -top-8 grid h-16 w-16 place-items-center rounded-full bg-ink text-white shadow-[0_10px_24px_-8px_rgb(var(--c-lav-600)/0.8)]"><Megaphone size={24} /></span>
      </div>
      {people.map(([pos, p], i) => (
        <div key={p} className={`hs-pop absolute h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-lg ${pos}`} style={d(0.4 + i * 0.35)}>
          <img src={img(p, 120)} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
      <In at={1} className="absolute left-[20%] top-[10%] rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold shadow-lg">@foodie_jaipur</In>
      <In at={1.8} className="absolute bottom-[32%] right-[22%] rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold shadow-lg">#YourBrand</In>
      <In at={0.2} className="absolute inset-x-0 bottom-0 flex items-center justify-between rounded-xl bg-ink px-4 py-2.5 text-xs text-white">
        Total reach<b className="font-display text-lg"><Count to={1.2} at={0.5} dur={3} fmt={(v) => `${v.toFixed(1)}M`} /></b>
      </In>
    </div>
  );
}
