"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion";
import { Globe, Heart, Lock, Play, ShoppingBag, Clapperboard, Gauge, Zap } from "lucide-react";

const scenes = [
  { id: "web", label: "Website", Icon: Globe, url: "yourbrand.in" },
  { id: "store", label: "Store", Icon: ShoppingBag, url: "shop.yourbrand.in" },
  { id: "social", label: "Social", Icon: Heart, url: "instagram.com/yourbrand" },
  { id: "video", label: "Video", Icon: Clapperboard, url: "studio / reel_final.mp4" },
] as const;

type SceneId = (typeof scenes)[number]["id"];

const pop: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: (i: number) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

// Browser window that "builds" each kind of work Spinex does. Cycles on its own, click a tab to pick one.
export default function LiveBuild() {
  const [active, setActive] = useState<SceneId>("web");
  const [paused, setPaused] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useInView(box);

  useEffect(() => {
    if (paused || !onScreen) return;
    const t = setTimeout(() => {
      const i = scenes.findIndex((s) => s.id === active);
      setActive(scenes[(i + 1) % scenes.length].id);
    }, 4200);
    return () => clearTimeout(t);
  }, [active, paused, onScreen]);

  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 120, damping: 18 });
  const scene = scenes.find((s) => s.id === active)!;

  return (
    <div
      ref={box}
      className="relative [perspective:1400px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); mx.set(0.5); my.set(0.5); }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry }} className="relative rounded-[22px] border border-line bg-white shadow-[0_40px_90px_-30px_rgb(var(--c-lav-700)/0.45)] [transform-style:preserve-3d]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF6159]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C941]" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-mist px-3 py-1.5 text-xs text-muted">
            <Lock size={11} />
            <AnimatePresence mode="wait">
              <motion.span key={scene.url} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {scene.url}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="relative h-[300px] overflow-hidden p-4 sm:h-[340px] lg:h-[clamp(200px,calc(100svh_-_380px),360px)]">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.2 } }} className="h-full">
              {active === "web" && <WebScene />}
              {active === "store" && <StoreScene />}
              {active === "social" && <SocialScene />}
              {active === "video" && <VideoScene />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line p-2" role="tablist" aria-label="What we build">
          {scenes.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={active === id}
              onClick={() => setActive(id)}
              className="relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-medium"
            >
              {active === id && <motion.span layoutId="build-tab" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <Icon size={14} className={`relative ${active === id ? "text-lav-300" : "text-muted"}`} />
              <span className={`relative ${active === id ? "text-white" : "text-muted"}`}>{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        style={{ translateZ: 60 }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.7 }}
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
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.45, duration: 0.7 }}
        className="absolute -right-4 -top-5 hidden items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-xl sm:flex"
      >
        <Zap size={14} className="text-lav-300" /> Loads in 0.8s
      </motion.div>
    </div>
  );
}

const Bar = ({ w, className = "" }: { w: string; className?: string }) => <div className={`h-2.5 rounded-full bg-line ${className}`} style={{ width: w }} />;

function WebScene() {
  return (
    <div className="flex h-full flex-col gap-3">
      <motion.div variants={pop} custom={0} className="flex items-center justify-between">
        <div className="h-5 w-16 rounded-md bg-ink" />
        <div className="flex gap-3"><Bar w="32px" /><Bar w="32px" /><Bar w="32px" /></div>
      </motion.div>
      <motion.div variants={pop} custom={1} className="relative flex-1 overflow-hidden rounded-2xl bg-ink p-5">
        <img loading="lazy" decoding="async" src="/images/stock/photo-1497366216548-37526070297c.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative space-y-2.5">
          <div className="h-4 w-3/5 rounded bg-white" />
          <div className="h-4 w-2/5 rounded bg-white" />
          <div className="h-2 w-1/2 rounded bg-white/50" />
          <motion.div initial={{ width: 0 }} animate={{ width: 96 }} transition={{ delay: 0.7, duration: 0.6 }} className="mt-4 h-8 rounded-full bg-lav-400" />
        </div>
      </motion.div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} variants={pop} custom={2 + i} className="space-y-2 rounded-xl border border-line p-3">
            <div className="h-6 w-6 rounded-lg bg-lav-100" />
            <Bar w="80%" /><Bar w="55%" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StoreScene() {
  const items = [
    { img: "photo-1523275335684-37898b6baf30", price: "₹2,499" },
    { img: "photo-1542291026-7eec264c27ff", price: "₹3,199" },
    { img: "photo-1505740420928-5e560c06d30e", price: "₹1,899" },
  ];
  return (
    <div className="flex h-full flex-col gap-3">
      <motion.div variants={pop} custom={0} className="flex items-center justify-between">
        <Bar w="90px" className="bg-ink" />
        <div className="relative grid h-8 w-8 place-items-center rounded-full border border-line">
          <ShoppingBag size={14} />
          <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 1.3, duration: 0.5 }} className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-lav-600 text-[9px] font-bold text-white">1</motion.span>
        </div>
      </motion.div>
      <div className="grid flex-1 grid-cols-3 gap-3">
        {items.map((it, i) => (
          <motion.div key={it.img} variants={pop} custom={1 + i} className="flex flex-col overflow-hidden rounded-xl border border-line">
            <div className="flex-1 bg-mist">
              <img loading="lazy" decoding="async" src={`/images/stock/${it.img}.jpg`} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="space-y-1.5 p-2.5">
              <Bar w="80%" />
              <p className="text-[12px] font-semibold">{it.price}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={pop} custom={4} className="flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-white">
        <span className="text-xs text-white/60">Checkout</span>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-xs font-semibold text-lav-300">Order placed ✓</motion.span>
      </motion.div>
    </div>
  );
}

function SocialScene() {
  const [likes, setLikes] = useState(1240);
  useEffect(() => {
    const t = setInterval(() => setLikes((n) => n + Math.floor(Math.random() * 40 + 10)), 220);
    return () => clearInterval(t);
  }, []);
  const tiles = ["photo-1504384308090-c894fdcc538d", "photo-1519389950473-47ba0277781c", "photo-1561070791-2526d30994b5", "photo-1512941937669-90a1b58e7e9c", "photo-1460925895917-afdab827c52f", "photo-1556742049-0cfed4f6a45d"];
  return (
    <div className="flex h-full flex-col gap-3">
      <motion.div variants={pop} custom={0} className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-lav-400 to-lav-700 p-[2px]"><div className="h-full w-full rounded-full bg-white" /></div>
        <div className="flex-1 space-y-1.5"><Bar w="40%" className="bg-ink" /><Bar w="25%" /></div>
        <div className="rounded-full bg-lav-100 px-3 py-1 text-xs font-semibold text-lav-700">
          <Heart size={11} className="mr-1 inline fill-lav-600 text-lav-600" />{likes.toLocaleString("en-IN")}
        </div>
      </motion.div>
      <div className="grid flex-1 grid-cols-3 gap-1.5">
        {tiles.map((t, i) => (
          <motion.div key={t} variants={pop} custom={1 + i} className="overflow-hidden rounded-md bg-mist">
            <img loading="lazy" decoding="async" src={`/images/stock/${t}.jpg`} alt="" className="h-full w-full object-cover" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VideoScene() {
  const tracks = [
    [{ l: 0, w: 30 }, { l: 32, w: 40 }, { l: 74, w: 26 }],
    [{ l: 8, w: 22 }, { l: 45, w: 35 }],
    [{ l: 0, w: 100 }],
  ];
  return (
    <div className="flex h-full flex-col gap-3">
      <motion.div variants={pop} custom={0} className="relative flex-1 overflow-hidden rounded-xl bg-ink">
        <img loading="lazy" decoding="async" src="/images/stock/photo-1574717024653-61fd2cf4d44d.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90"><Play size={18} className="ml-0.5 fill-ink" /></span>
        </div>
      </motion.div>
      <motion.div variants={pop} custom={1} className="relative space-y-1.5 rounded-xl bg-mist p-2.5">
        {tracks.map((row, r) => (
          <div key={r} className="relative h-4">
            {row.map((c, i) => (
              <div key={i} className={`absolute h-full rounded ${r === 2 ? "bg-lav-200" : r === 1 ? "bg-lav-400" : "bg-ink/80"}`} style={{ left: `${c.l}%`, width: `${c.w}%` }} />
            ))}
          </div>
        ))}
        <motion.div className="absolute bottom-1 top-1 w-0.5 rounded bg-lav-600" initial={{ left: "2%" }} animate={{ left: "96%" }} transition={{ duration: 3.8, ease: "linear" }} />
      </motion.div>
    </div>
  );
}
