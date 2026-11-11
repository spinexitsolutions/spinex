"use client";

import { Fragment, useEffect, useState } from "react";
import type { Highlight, TextAnim } from "@/lib/typography";

// Heading text with the animation and highlight picked in Admin → Fonts & text.
// Used by the home hero headline (components/home/Hero.tsx) and SplitHeading (components/Reveal.tsx).

export type Word = { w: string; on?: boolean };

type Props = {
  words: Word[];
  anim: TextAnim;
  play: boolean;
  speed?: number; // 1 = normal, bigger = slower
  delay?: number; // seconds before the first word
  highlight?: Highlight;
  color?: string; // hex colour for highlights
  light?: boolean; // text on a dark background
};

// Split the text into groups so the highlighted words share one wrapper (marks then run across the phrase).
function groups(words: Word[]) {
  const out: { on: boolean; items: { w: string; i: number }[] }[] = [];
  words.forEach((x, i) => {
    const on = !!x.on;
    const last = out[out.length - 1];
    if (last && last.on === on) last.items.push({ w: x.w, i });
    else out.push({ on, items: [{ w: x.w, i }] });
  });
  return out;
}

// ---- highlight looks ----

const svg = (body: string, color: string, vb = "0 0 300 30") =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}' preserveAspectRatio='none'>${body.replace(/COLOR/g, color)}</svg>`)}")`;

// Background-image marks: they follow the text onto every line (box-decoration-break: clone).
function markBg(h: Highlight, c: string): { img: string; h: string; pos: string } | null {
  const line = (d: string, w = 6, extra = "") => `<path d='${d}' fill='none' stroke='COLOR' stroke-width='${w}' stroke-linecap='round' stroke-linejoin='round' ${extra}/>`;
  switch (h) {
    case "brush": return { img: svg(line("M4 18C80 8 200 8 296 13", 9), c), h: "0.3em", pos: "0 96%" };
    case "double": return { img: svg(line("M4 9C90 4 200 4 296 8", 4) + line("M14 23C100 17 190 17 286 21", 4), c), h: "0.32em", pos: "0 100%" };
    case "wave": return { img: svg(line("M2 15q9-11 18 0t18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0 18 0", 4.5), c), h: "0.22em", pos: "0 100%" };
    case "zigzag": return { img: svg(line("M2 22 12 8l10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14 10 14 10-14", 4), c), h: "0.22em", pos: "0 100%" };
    case "dotted": return { img: svg(line("M4 15H296", 6, "stroke-dasharray='0.5 14'"), c), h: "0.2em", pos: "0 100%" };
    case "loop": return { img: svg(line("M4 8C70 4 140 4 175 7c30 3 42 12 32 19-9 6-24-2-15-11 9-8 50-9 104-7", 4.5), c, "0 0 300 34"), h: "0.42em", pos: "0 118%" };
    case "circle": return { img: svg(line("M150 4C60 2 6 20 8 52c2 30 70 44 150 42 80-2 136-16 134-46C290 18 220 4 120 9", 4), c, "0 0 300 100"), h: "100%", pos: "0 50%" };
    case "marker": return { img: `linear-gradient(transparent 58%, ${c}55 58%, ${c}55 92%, transparent 92%)`, h: "100%", pos: "0 0" };
    default: return null;
  }
}

// Style for each word of a highlighted group.
function wordStyle(h: Highlight | undefined, c: string, light?: boolean): React.CSSProperties | undefined {
  switch (h) {
    case "color": return { color: c };
    case "gradient": return { backgroundImage: `linear-gradient(90deg, ${c}, #ff8a5b, ${c})`, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "tx-grad 6s linear infinite" };
    case "outline": return { color: "transparent", WebkitTextStroke: `0.03em ${light ? "#fff" : "rgb(var(--c-ink))"}` };
    case "serif": return { color: c, fontFamily: "var(--ff-dmserif)", fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.01em" };
    default: return undefined;
  }
}

// ---- per-word / per-letter motion ----
// Plain CSS animations (app/globals.css, tx-*): they run on the GPU, so they stay smooth even while
// the hero background is busy. They wait (paused) until the wrapper gets the tx-run class.

type Step = { mask?: boolean; letters?: boolean; dur: number; gap: number };
const STEPS: Partial<Record<TextAnim, Step>> = {
  rise: { mask: true, dur: 1, gap: 0.055 },
  fade: { dur: 0.9, gap: 0.06 },
  blur: { dur: 1.1, gap: 0.08 },
  slide: { dur: 0.8, gap: 0.06 },
  zoom: { dur: 0.7, gap: 0.06 },
  flip: { dur: 0.9, gap: 0.07 },
  letters: { mask: true, letters: true, dur: 0.6, gap: 0.022 },
  wave: { letters: true, dur: 0.8, gap: 0.03 },
};

// How long the text takes to appear, so marks can start drawing just after.
export function textDuration(words: Word[], anim: TextAnim, speed = 1) {
  const letters = words.reduce((n, x) => n + x.w.length, 0);
  if (anim === "none") return 0;
  if (anim === "typewriter") return letters * 0.045 * speed;
  if (anim === "scramble") return 1.2 * speed;
  const s = STEPS[anim]!;
  return ((s.letters ? letters : words.length) * s.gap + s.dur * 0.6) * speed;
}

export default function AnimText({ words, anim, play, speed = 1, delay = 0, highlight = "color", color = "#6E59D9", light, onClass = "" }: Props & { onClass?: string }) {
  const mark = markBg(highlight, color);
  const ws = wordStyle(highlight, color, light);
  const markDelay = delay + textDuration(words, anim, speed);
  const typed = useTyped(words, anim, play, speed, delay);
  const t = (n: number) => `${Math.round(n * 1000)}ms`;

  let letter = 0;
  const word = (w: string, i: number, on: boolean) => {
    const style = on ? ws : undefined;
    const cls = on ? onClass : "";
    const last = i === words.length - 1;
    const text = last ? w : `${w}\u00a0`;
    if (anim === "none") return <span key={i} className={`inline-block ${cls}`} style={style}>{text}</span>;
    if (anim === "typewriter" || anim === "scramble") {
      const start = letter;
      letter += w.length;
      return (
        <span key={i} className={`inline-block whitespace-nowrap ${cls}`} style={style}>
          {[...w].map((ch, k) => <Fragment key={k}>{typed.render(ch, start + k)}{typed.caretAt === start + k && <Caret />}</Fragment>)}
          {!last && "\u00a0"}
        </span>
      );
    }
    const s = STEPS[anim]!;
    if (s.letters) {
      const chars = [...w];
      const start = letter;
      letter += chars.length;
      return (
        <span key={i} className="inline-block whitespace-nowrap">
          {chars.map((ch, k) => (
            <span key={k} className={`inline-block align-top ${s.mask ? "overflow-hidden pb-[0.1em]" : ""}`}>
              <span className={`tx-a tx-${anim} ${cls}`} style={{ ...style, animationDuration: t(s.dur * speed), animationDelay: t(delay + (start + k) * s.gap * speed) }}>{ch}</span>
            </span>
          ))}
          {!last && "\u00a0"}
        </span>
      );
    }
    return (
      <span key={i} className={`inline-block align-top ${s.mask ? "overflow-hidden pb-[0.1em]" : ""}`} style={anim === "flip" ? { perspective: 600 } : undefined}>
        <span className={`tx-a tx-${anim} ${cls}`} style={{ ...style, animationDuration: t(s.dur * speed), animationDelay: t(delay + i * s.gap * speed) }}>{text}</span>
      </span>
    );
  };

  return (
    <span className={play ? "tx-run" : undefined}>
      {groups(words).map((g, gi) => {
        const inner = g.items.map(({ w, i }) => word(w, i, g.on));
        if (!g.on || !mark) return <Fragment key={gi}>{inner}</Fragment>;
        return (
          <span key={gi} className="tx-mark relative"
            style={{ backgroundImage: mark.img, backgroundPosition: mark.pos, ["--mh" as string]: mark.h, ["--md-dur" as string]: t(0.8 * speed), ["--md-del" as string]: t(markDelay), padding: highlight === "circle" ? "0.1em 0.12em" : undefined } as React.CSSProperties}>
            {inner}
          </span>
        );
      })}
    </span>
  );
}

function Caret() {
  return <span aria-hidden className="tx-caret ml-[0.04em] inline-block h-[0.8em] w-[0.06em] translate-y-[0.06em] rounded-sm bg-current align-baseline" />;
}

const RANDOM = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789#%&*";

// Typewriter and scramble keep a counter of how many letters are done.
function useTyped(words: Word[], anim: TextAnim, play: boolean, speed: number, delay: number) {
  const total = words.reduce((n, x) => n + x.w.length, 0);
  const active = anim === "typewriter" || anim === "scramble";
  const [n, setN] = useState(active ? 0 : total);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (!play) { setN(0); return; }
    let id = 0, start = 0;
    const per = anim === "typewriter" ? 45 * speed : (1200 * speed) / Math.max(1, total);
    const run = (t: number) => {
      if (!start) start = t;
      const done = Math.min(total, Math.floor((t - start) / per));
      setN(done);
      if (anim === "scramble") tick((x) => x + 1);
      if (done < total) id = requestAnimationFrame(run);
    };
    const wait = setTimeout(() => (id = requestAnimationFrame(run)), delay * 1000);
    return () => { clearTimeout(wait); cancelAnimationFrame(id); };
  }, [active, anim, play, speed, delay, total]);

  return {
    caretAt: anim === "typewriter" ? n - 1 : -2,
    render: (ch: string, idx: number) => {
      if (anim === "typewriter") return <span key={idx} style={idx < n ? undefined : { visibility: "hidden" }}>{ch}</span>;
      if (idx < n) return <span key={idx}>{ch}</span>;
      // not settled yet: a random letter, faded, a little ahead of the settled part
      const show = play && idx < n + 8;
      return <span key={idx} style={{ opacity: show ? 0.45 : 0 }}>{show ? RANDOM[(idx * 7 + Math.floor(performance.now() / 60)) % RANDOM.length] : ch}</span>;
    },
  };
}
