"use client";

import { useEffect, useMemo, useState } from "react";
import { animate, motion } from "framer-motion";
import type { IntroSettings, IntroStyle } from "@/lib/content";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeInOut: [number, number, number, number] = [0.76, 0, 0.24, 1];
export const SPEED: Record<IntroSettings["speed"], number> = { fast: 0.7, normal: 1, slow: 1.4 };

// How long each style stays on screen before it leaves, and how long leaving takes (seconds, at normal speed).
const TIMING: Record<IntroStyle, { hold: number; out: number }> = {
  logo: { hold: 1.9, out: 0.8 },
  counter: { hold: 1.7, out: 0.8 },
  letters: { hold: 1.9, out: 0.9 },
  split: { hold: 1.7, out: 0.9 },
  circle: { hold: 1.8, out: 0.8 },
  typing: { hold: 2.1, out: 0.7 },
  stripes: { hold: 1.6, out: 1.0 },
  minimal: { hold: 1.0, out: 0.6 },
};
export const introLength = (cfg: Pick<IntroSettings, "style" | "speed">) => (TIMING[cfg.style].hold + TIMING[cfg.style].out) * SPEED[cfg.speed];

export const STYLE_INFO: Record<IntroStyle, { name: string; about: string }> = {
  logo: { name: "Logo reveal", about: "Logo grows in with a glow, the name rises letter by letter, then the screen lifts away." },
  counter: { name: "Loading counter", about: "A big 0 to 100% counter with a progress line, then a clean wipe up." },
  letters: { name: "Big letters", about: "Huge brand letters rise one by one with an underline, then fly up." },
  split: { name: "Split doors", about: "The name sits on a line; the screen opens like two doors, up and down." },
  circle: { name: "Circle burst", about: "A coloured circle bursts from the centre, then shrinks back into the logo." },
  typing: { name: "Code typing", about: "Your name typed like code with a blinking cursor. Great for an IT company." },
  stripes: { name: "Stripes", about: "Coloured stripes with the name on top slide away one after another." },
  minimal: { name: "Minimal", about: "A short, quiet fade of the logo and name. Best if it plays on every visit." },
};

type Props = {
  cfg: IntroSettings;
  logo: string;
  onDone?: () => void;
  // Inside a box (admin preview) instead of covering the whole screen.
  contained?: boolean;
};

// One full intro: comes in, holds, then leaves and calls onDone.
export default function IntroAnimation({ cfg, logo, onDone, contained = false }: Props) {
  const s = SPEED[cfg.speed];
  const t = TIMING[cfg.style];
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    setPhase("in");
    const a = setTimeout(() => setPhase("out"), t.hold * s * 1000);
    const b = setTimeout(() => onDone?.(), (t.hold + t.out) * s * 1000);
    return () => { clearTimeout(a); clearTimeout(b); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.style, cfg.speed]);

  const bg = cfg.background || "rgb(var(--c-ink))";
  const accent = cfg.accent || "rgb(var(--c-lav-400))";
  const fg = cfg.text || "#ffffff";
  const box = `${contained ? "absolute" : "fixed"} inset-0 ${contained ? "z-10" : "z-[100]"} overflow-hidden`;
  const big = contained ? "text-[13cqw]" : "text-[19vw] sm:text-[15vw]";
  const props = { cfg, logo, s, out: phase === "out", outDur: t.out * s, bg, accent, fg, box, big, contained };
  const Style = STYLES[cfg.style] ?? STYLES.logo;
  return (
    <div aria-hidden data-lenis-prevent data-intro={cfg.style} style={contained ? { containerType: "inline-size" } : undefined} className={contained ? "absolute inset-0 overflow-hidden" : ""}>
      <Style {...props} />
    </div>
  );
}

type P = { cfg: IntroSettings; logo: string; s: number; out: boolean; outDur: number; bg: string; accent: string; fg: string; box: string; big: string; contained: boolean };

const Corners = ({ cfg, fg, s, contained }: Pick<P, "cfg" | "fg" | "s" | "contained">) =>
  cfg.cornerLeft || cfg.cornerRight ? (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.15 * s, duration: 0.5 * s }}
      className={`absolute inset-x-0 top-0 flex justify-between ${contained ? "p-3 text-[10px]" : "p-6 text-xs sm:p-10 sm:text-sm"} font-medium uppercase tracking-[0.18em]`} style={{ color: fg }}>
      <span>{cfg.cornerLeft}</span>
      <span>{cfg.cornerRight}</span>
    </motion.div>
  ) : null;

const Logo = ({ logo, size, className = "" }: { logo: string; size: number; className?: string }) =>
  logo ? <img src={logo} alt="" width={size} height={size} style={{ width: size, height: size }} className={`object-contain ${className}`} /> : null;

const Tagline = ({ cfg, fg, s, delay, contained }: Pick<P, "cfg" | "fg" | "s" | "contained"> & { delay: number }) =>
  cfg.tagline ? (
    <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 0.75, y: 0 }} transition={{ delay: delay * s, duration: 0.6 * s, ease }}
      className={`${contained ? "mt-2 text-[10px]" : "mt-5 text-sm sm:text-base"} tracking-[0.2em] uppercase`} style={{ color: fg }}>
      {cfg.tagline}
    </motion.p>
  ) : null;

const Letters = ({ text, s, delay, step = 0.05, className = "", style }: { text: string; s: number; delay: number; step?: number; className?: string; style?: React.CSSProperties }) => (
  <span className={`inline-flex overflow-hidden ${className}`} style={style}>
    {Array.from(text).map((ch, i) => (
      <motion.span key={i} className="inline-block whitespace-pre" initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ delay: (delay + i * step) * s, duration: 0.7 * s, ease }}>
        {ch}
      </motion.span>
    ))}
  </span>
);

// 1. Logo reveal
function LogoStyle({ cfg, logo, s, out, outDur, bg, accent, fg, box, contained }: P) {
  const size = contained ? 46 : 96;
  return (
    <motion.div className={`${box} grid place-items-center`} style={{ background: bg }}
      initial={{ clipPath: "inset(0 0 0% 0)" }} animate={out ? { clipPath: "inset(0 0 100% 0)" } : { clipPath: "inset(0 0 0% 0)" }} transition={{ duration: outDur, ease: easeInOut }}>
      <Corners cfg={cfg} fg={fg} s={s} contained={contained} />
      <motion.div className="flex flex-col items-center text-center" animate={out ? { y: -40, opacity: 0 } : { y: 0, opacity: 1 }} transition={{ duration: outDur * 0.7, ease }}>
        {cfg.showLogo && logo && (
          <div className="relative">
            <motion.div className="absolute inset-0 rounded-full" style={{ background: accent, filter: "blur(28px)" }}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.6, 1.2], opacity: [0, 0.55, 0.3] }} transition={{ delay: 0.2 * s, duration: 1.2 * s, ease }} />
            <motion.div initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.15 * s, duration: 0.9 * s, ease }} className="relative">
              <Logo logo={logo} size={size} />
            </motion.div>
          </div>
        )}
        <Letters text={cfg.title} s={s} delay={0.55} className={`font-display font-bold tracking-tight ${contained ? "mt-3 text-2xl" : "mt-6 text-5xl sm:text-7xl"}`} style={{ color: fg }} />
        <Tagline cfg={cfg} fg={fg} s={s} delay={1.0} contained={contained} />
        <motion.div className={`${contained ? "mt-3 h-[2px] w-20" : "mt-7 h-[3px] w-40"} overflow-hidden rounded-full`} style={{ background: "rgba(255,255,255,0.12)" }}>
          <motion.div className="h-full" style={{ background: accent }} initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ delay: 0.3 * s, duration: 1.5 * s, ease: easeInOut }} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// 2. Loading counter (the original one, polished)
function CounterStyle({ cfg, s, out, outDur, bg, accent, fg, box, big, contained }: P) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, 100, { duration: 1.4 * s, ease: [0.65, 0, 0.35, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [s]);
  return (
    <motion.div className={`${box} flex flex-col justify-end ${contained ? "p-3" : "p-6 sm:p-10"}`} style={{ background: bg, color: fg }}
      initial={{ clipPath: "inset(0 0 0% 0)" }} animate={out ? { clipPath: "inset(0 0 100% 0)" } : { clipPath: "inset(0 0 0% 0)" }} transition={{ duration: outDur, ease: easeInOut }}>
      <Corners cfg={cfg} fg={fg} s={s} contained={contained} />
      <div className="flex items-end justify-between gap-4">
        <div className="overflow-hidden">
          <motion.p initial={{ y: "100%" }} animate={{ y: "0%" }} transition={{ duration: 0.8 * s, ease }} className={`font-display font-bold leading-[0.85] tracking-tightest tabular-nums ${big}`}>
            {n}<span style={{ color: accent }}>%</span>
          </motion.p>
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.4 * s }} className={`${contained ? "mb-1 text-[10px]" : "mb-3 text-sm"} max-w-[40%] text-right uppercase tracking-[0.18em]`}>{cfg.title}<br />{cfg.tagline}</motion.p>
      </div>
      <div className={`${contained ? "mt-2" : "mt-6"} h-[2px] w-full overflow-hidden`} style={{ background: "rgba(255,255,255,0.12)" }}>
        <div className="h-full" style={{ width: `${n}%`, background: accent }} />
      </div>
    </motion.div>
  );
}

// 3. Big letters
function LettersStyle({ cfg, logo, s, out, outDur, bg, accent, fg, box, big, contained }: P) {
  const letters = Array.from(cfg.title || "Spinex");
  return (
    <motion.div className={`${box} grid place-items-center`} style={{ background: bg }}
      initial={{ y: "0%" }} animate={out ? { y: "-100%" } : { y: "0%" }} transition={{ duration: outDur, ease: easeInOut, delay: out ? 0.25 * s : 0 }}>
      <Corners cfg={cfg} fg={fg} s={s} contained={contained} />
      <div className="flex flex-col items-center">
        {cfg.showLogo && logo && <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={out ? { opacity: 0 } : { opacity: 1, scale: 1 }} transition={{ duration: 0.6 * s, ease }} className={contained ? "mb-2" : "mb-6"}><Logo logo={logo} size={contained ? 28 : 56} /></motion.div>}
        <div className="flex overflow-hidden">
          {letters.map((ch, i) => (
            <motion.span key={i} className={`inline-block whitespace-pre font-display font-bold leading-[0.9] tracking-tightest ${big}`} style={{ color: i === letters.length - 1 ? accent : fg }}
              initial={{ y: "105%", rotate: 8 }} animate={out ? { y: "-105%", rotate: -6 } : { y: "0%", rotate: 0 }}
              transition={{ delay: (out ? i * 0.04 : 0.1 + i * 0.07) * s, duration: (out ? 0.5 : 0.8) * s, ease }}>
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.div className={`${contained ? "mt-2 h-[2px]" : "mt-4 h-1"} self-stretch origin-left rounded-full`} style={{ background: accent }}
          initial={{ scaleX: 0 }} animate={out ? { scaleX: 0, transformOrigin: "right" } : { scaleX: 1 }} transition={{ delay: out ? 0 : 0.7 * s, duration: 0.7 * s, ease: easeInOut }} />
        <Tagline cfg={cfg} fg={fg} s={s} delay={1.1} contained={contained} />
      </div>
    </motion.div>
  );
}

// 4. Split doors
function SplitStyle({ cfg, logo, s, out, outDur, bg, accent, fg, box, contained }: P) {
  const half = "absolute inset-x-0 h-1/2";
  return (
    <div className={box}>
      <motion.div className={`${half} top-0`} style={{ background: bg }} animate={out ? { y: "-100%" } : { y: "0%" }} transition={{ duration: outDur, ease: easeInOut }} />
      <motion.div className={`${half} bottom-0`} style={{ background: bg }} animate={out ? { y: "100%" } : { y: "0%" }} transition={{ duration: outDur, ease: easeInOut }} />
      <motion.div className="absolute inset-0" animate={out ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: outDur * 0.4 }}>
        <Corners cfg={cfg} fg={fg} s={s} contained={contained} />
        <motion.div className="absolute inset-x-0 top-1/2 h-px origin-center" style={{ background: accent }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9 * s, ease: easeInOut }} />
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-full items-end justify-center gap-3 pb-3">
          {cfg.showLogo && logo && <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 * s, duration: 0.7 * s, ease }}><Logo logo={logo} size={contained ? 26 : 64} /></motion.div>}
          <Letters text={cfg.title} s={s} delay={0.55} className={`font-display font-bold tracking-tight ${contained ? "text-2xl" : "text-5xl sm:text-8xl"}`} style={{ color: fg }} />
        </div>
        <div className="absolute inset-x-0 top-1/2 flex justify-center pt-1">
          <Tagline cfg={cfg} fg={fg} s={s} delay={0.95} contained={contained} />
        </div>
      </motion.div>
    </div>
  );
}

// 5. Circle burst
function CircleStyle({ cfg, logo, s, out, outDur, bg, accent, fg, box, contained }: P) {
  return (
    <motion.div className={`${box} grid place-items-center`} style={{ background: bg }}
      initial={{ clipPath: "circle(150% at 50% 50%)" }} animate={out ? { clipPath: "circle(0% at 50% 50%)" } : { clipPath: "circle(150% at 50% 50%)" }} transition={{ duration: outDur, ease: easeInOut }}>
      <motion.div className="absolute aspect-square w-[160%] rounded-full sm:w-[120%]" style={{ background: accent, opacity: 0.16 }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1.4 * s, ease }} />
      <motion.div className="absolute aspect-square w-[90%] rounded-full sm:w-[60%]" style={{ border: `1px solid ${accent}` }} initial={{ scale: 0, opacity: 0.9 }} animate={{ scale: 1.15, opacity: 0 }} transition={{ delay: 0.25 * s, duration: 1.4 * s, ease }} />
      <Corners cfg={cfg} fg={fg} s={s} contained={contained} />
      <div className="relative flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 * s, type: "spring", stiffness: 220, damping: 16 }}
          className={`grid place-items-center rounded-full ${contained ? "h-14 w-14" : "h-28 w-28"}`} style={{ background: accent }}>
          {cfg.showLogo && logo ? <Logo logo={logo} size={contained ? 30 : 60} /> : <span className="font-display text-3xl font-bold" style={{ color: bg }}>{(cfg.title || "S").charAt(0)}</span>}
        </motion.div>
        <Letters text={cfg.title} s={s} delay={0.6} className={`font-display font-bold tracking-tight ${contained ? "mt-3 text-xl" : "mt-6 text-5xl sm:text-6xl"}`} style={{ color: fg }} />
        <Tagline cfg={cfg} fg={fg} s={s} delay={1.0} contained={contained} />
      </div>
    </motion.div>
  );
}

// 6. Code typing
function TypingStyle({ cfg, s, out, outDur, bg, accent, fg, box, contained }: P) {
  const full = cfg.title || "Spinex";
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, full.length, { delay: 0.35 * s, duration: Math.min(1.2, 0.09 * full.length + 0.3) * s, ease: "linear", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [full, s]);
  return (
    <motion.div className={`${box} grid place-items-center`} style={{ background: bg }}
      animate={out ? { opacity: 0, filter: "blur(10px)", scale: 1.04 } : { opacity: 1, filter: "blur(0px)", scale: 1 }} transition={{ duration: outDur, ease }}>
      <Corners cfg={cfg} fg={fg} s={s} contained={contained} />
      <div className="text-center font-mono">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 0.3 * s }} className={contained ? "mb-2 text-[10px]" : "mb-5 text-sm"} style={{ color: fg }}>
          $ npm run build --brand
        </motion.p>
        <p className={`font-semibold tracking-tight ${contained ? "text-xl" : "text-4xl sm:text-7xl"}`} style={{ color: fg }}>
          <span style={{ color: accent }}>&lt;</span>
          {full.slice(0, n)}
          <motion.span className="inline-block w-[0.08em] translate-y-[0.08em] align-baseline" style={{ height: "0.9em", background: accent }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
          <span style={{ color: accent }}> /&gt;</span>
        </p>
        <Tagline cfg={cfg} fg={fg} s={s} delay={1.4} contained={contained} />
      </div>
    </motion.div>
  );
}

// 7. Stripes
function StripesStyle({ cfg, logo, s, out, outDur, bg, accent, fg, box, contained }: P) {
  const bars = 6;
  return (
    <div className={box}>
      <div className="absolute inset-0 flex">
        {Array.from({ length: bars }).map((_, i) => (
          <motion.div key={i} className="h-full flex-1" style={{ background: i % 2 ? bg : `color-mix(in srgb, ${bg} 88%, ${accent})` }}
            initial={{ y: "0%" }} animate={out ? { y: "-100%" } : { y: "0%" }}
            transition={{ delay: out ? i * 0.07 * s : 0, duration: outDur * 0.6, ease: easeInOut }} />
        ))}
      </div>
      <motion.div className="absolute inset-0 grid place-items-center" animate={out ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }} transition={{ duration: 0.35 * s }}>
        <Corners cfg={cfg} fg={fg} s={s} contained={contained} />
        <div className="flex flex-col items-center">
          {cfg.showLogo && logo && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 * s, duration: 0.6 * s, ease }}><Logo logo={logo} size={contained ? 30 : 70} /></motion.div>}
          <Letters text={cfg.title} s={s} delay={0.55} className={`font-display font-bold tracking-tight ${contained ? "mt-2 text-2xl" : "mt-5 text-5xl sm:text-8xl"}`} style={{ color: fg }} />
          <motion.span className={`${contained ? "mt-2 h-1 w-8" : "mt-5 h-1.5 w-16"} rounded-full`} style={{ background: accent }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9 * s, duration: 0.5 * s, ease }} />
          <Tagline cfg={cfg} fg={fg} s={s} delay={1.0} contained={contained} />
        </div>
      </motion.div>
    </div>
  );
}

// 8. Minimal
function MinimalStyle({ cfg, logo, s, out, outDur, bg, fg, box, contained }: P) {
  return (
    <motion.div className={`${box} grid place-items-center`} style={{ background: bg }} animate={out ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: outDur, ease }}>
      <motion.div className="flex items-center gap-3" initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }} animate={out ? { opacity: 0, scale: 1.02 } : { opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.6 * s, ease }}>
        {cfg.showLogo && logo && <Logo logo={logo} size={contained ? 30 : 52} />}
        <span className={`font-display font-semibold tracking-tight ${contained ? "text-xl" : "text-3xl sm:text-4xl"}`} style={{ color: fg }}>{cfg.title}</span>
      </motion.div>
    </motion.div>
  );
}

const STYLES: Record<IntroStyle, (p: P) => JSX.Element> = {
  logo: LogoStyle,
  counter: CounterStyle,
  letters: LettersStyle,
  split: SplitStyle,
  circle: CircleStyle,
  typing: TypingStyle,
  stripes: StripesStyle,
  minimal: MinimalStyle,
};

// The colour the screen starts with, for the plain cover shown before the page loads.
export const introBackground = (cfg: Pick<IntroSettings, "background" | "style">) => cfg.background || "rgb(var(--c-ink))";
export const useStyleList = () => useMemo(() => Object.entries(STYLE_INFO) as [IntroStyle, { name: string; about: string }][], []);
