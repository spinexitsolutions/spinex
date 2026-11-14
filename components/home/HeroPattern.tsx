import type { CSSProperties, ReactNode } from "react";
import type { HeroPattern as Kind } from "@/lib/content";
import SoftSwirl from "./SoftSwirl";

// Still (or slowly moving) background drawn behind the hero, under the moving effect.
// Picked in Admin → Homepage hero → Background pattern. Movement keyframes are the hp-* ones in app/hero-scenes.css.
const L = "110,89,217"; // brand purple, for drawings that cannot read the theme colour
const V = "rgb(var(--c-lav-600)"; // brand purple from the theme; add " / alpha)" or ")"
const svg = (body: string, w: number | string = "100%", h: number | string = "100%", vb?: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'${vb ? ` viewBox='${vb}' preserveAspectRatio='none'` : ""}>${body}</svg>`,
  )}")`;
const FADE: CSSProperties = { WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, #000 35%, transparent 85%)", maskImage: "radial-gradient(ellipse at 50% 45%, #000 35%, transparent 85%)" };
const lay = (style: CSSProperties, className = "", key?: string | number, children?: ReactNode) => (
  <div key={key} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} style={style}>{children}</div>
);
const blob = (k: number, left: string, top: string, w: string, h: string, bg: string, blur: number, rot = 0, anim = "") => (
  <div key={k} className={`absolute rounded-full ${anim}`} style={{ left, top, width: w, height: h, background: bg, filter: `blur(${blur}px)`, transform: `rotate(${rot}deg)`, animationDelay: `${-k * 3}s` }} />
);
const grain = (alpha = 0.5, op = 0.35) => lay({
  backgroundImage: svg(`<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .43 0 0 0 0 .35 0 0 0 0 .85 0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/>`, 200, 200),
  backgroundSize: "200px 200px", opacity: op,
}, "", "grain");

export default function HeroPattern({ kind, center }: { kind?: Kind; center?: boolean }) {
  if (!kind || kind === "none") return null;
  const cx = center ? "50%" : "75%"; // where the right-hand box sits
  const cxn = center ? 50 : 75;
  const p = PATTERNS[kind];
  if (!p) return null;
  return <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" data-hero-pattern={kind}>{p(cx, cxn)}</div>;
}

const PATTERNS: Partial<Record<Kind, (cx: string, cxn: number) => ReactNode>> = {
  // ----- set 1: fine patterns -----
  dots: () => lay({ ...FADE, background: `radial-gradient(${V} / 0.35) 1.2px, transparent 1.4px) 0 0 / 26px 26px` }),
  plus: () => lay({ ...FADE, backgroundImage: svg(`<path d='M16 12v8M12 16h8' stroke='rgb(${L})' stroke-opacity='.4' stroke-width='1.3' stroke-linecap='round'/>`, 32, 32), backgroundSize: "32px 32px" }),
  graph: () => lay({ ...FADE, background: `linear-gradient(${V} / .12) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, ${V} / .12) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(${V} / .2) 1px, transparent 1px) 0 0 / 120px 120px, linear-gradient(90deg, ${V} / .2) 1px, transparent 1px) 0 0 / 120px 120px` }),
  topo: () => lay({ ...FADE, backgroundImage: svg(Array.from({ length: 9 }, (_, i) => `<path d='M-20 ${30 + i * 32} C 60 ${i * 32} 120 ${60 + i * 32} 180 ${28 + i * 32} S 280 ${i * 32 + 5} 330 ${40 + i * 32}' fill='none' stroke='rgb(${L})' stroke-opacity='.22' stroke-width='1.2'/>`).join(""), 300, 300), backgroundSize: "300px 300px" }, "hp-drift"),
  honeycomb: () => lay({ ...FADE, backgroundImage: svg(`<path d='M28 0 56 16v32L28 64 0 48V16zM28 64v33M0 97V80M56 97V80' fill='none' stroke='rgb(${L})' stroke-opacity='.18' stroke-width='1.1'/>`, 56, 97), backgroundSize: "40px 69px" }),
  circuit: () => lay({ ...FADE, backgroundImage: svg(`<g fill='none' stroke='rgb(${L})' stroke-opacity='.25' stroke-width='1.2'><path d='M0 30h40l15 15h40M60 120V80l20-20h40M20 120V95l15-15M120 15H85L70 0'/></g><g fill='rgb(${L})' fill-opacity='.45'><circle cx='95' cy='45' r='2.5'/><circle cx='35' cy='80' r='2.5'/><circle cx='85' cy='15' r='2.5'/><circle cx='60' cy='80' r='2'/></g>`, 120, 120), backgroundSize: "120px 120px" }),
  isometric: () => lay({ ...FADE, backgroundImage: svg(`<path d='M0 0 40 23M40 0 0 23M0 23 40 46M40 23 0 46M0 46 40 69M40 46 0 69M20 0v69' fill='none' stroke='rgb(${L})' stroke-opacity='.13' stroke-width='1'/>`, 40, 69), backgroundSize: "40px 69px" }),
  diagonal: () => lay({ ...FADE, background: `repeating-linear-gradient(-45deg, ${V} / .12) 0 1px, transparent 1px 14px)` }),
  radar: (cx) => lay({ background: `repeating-radial-gradient(circle at ${cx} 50%, ${V} / .16) 0 1px, transparent 1px 44px)`, WebkitMaskImage: `radial-gradient(circle at ${cx} 50%, #000 20%, transparent 70%)`, maskImage: `radial-gradient(circle at ${cx} 50%, #000 20%, transparent 70%)` }),
  stars: () => lay({ ...FADE, backgroundImage: svg(`<g fill='rgb(${L})'><path fill-opacity='.4' d='M30 22l2 6 6 2-6 2-2 6-2-6-6-2 6-2z'/><path fill-opacity='.25' d='M100 80l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z'/><circle cx='70' cy='30' r='1.3' fill-opacity='.35'/><circle cx='20' cy='100' r='1.3' fill-opacity='.35'/><circle cx='120' cy='125' r='1.1' fill-opacity='.3'/></g>`, 140, 140), backgroundSize: "140px 140px" }, "hp-twinkle"),
  floor: () => lay({ WebkitMaskImage: "linear-gradient(transparent 45%, #000 85%)", maskImage: "linear-gradient(transparent 45%, #000 85%)", perspective: "400px" }, "", undefined,
    <div className="hp-floor absolute -left-1/2 -right-1/2 -bottom-[40%] h-[110%]" style={{ transform: "rotateX(62deg)", transformOrigin: "bottom", background: `linear-gradient(${V} / .35) 1px, transparent 1px) 0 0 / 56px 56px, linear-gradient(90deg, ${V} / .35) 1px, transparent 1px) 0 0 / 56px 56px` }} />),
  grain: () => <>{lay({ background: `radial-gradient(50% 60% at 20% 30%, ${V} / .12), transparent 70%)` })}{grain(0.55, 0.4)}</>,

  // ----- set 2 -----
  mesh: () => lay({ background: "radial-gradient(40% 60% at 10% 20%, #c4b5fd, transparent 70%), radial-gradient(35% 55% at 60% 10%, #f5d0fe, transparent 70%), radial-gradient(45% 60% at 90% 80%, #bae6fd, transparent 70%), radial-gradient(40% 50% at 30% 95%, #fde68a88, transparent 70%)" }, "hp-breathe"),
  beams: () => <>
    {lay({ background: `linear-gradient(90deg, ${V} / .1) 1px, transparent 1px) 0 0 / 96px 100%` })}
    {[1, 3, 5, 7, 9, 12, 14].map((c, i) => (
      <span key={c} className="hp-beam absolute top-0 h-32 w-[3px] rounded-full" style={{ left: `calc(${c * 96}px - 1px)`, background: "linear-gradient(transparent, #a78bfa, #d946ef)", filter: "drop-shadow(0 0 6px #d946ef)", animationDelay: `${-i * 1.7}s`, animationDuration: `${6 + (i % 3) * 2}s` }} />
    ))}
  </>,
  rays: (cx) => <>
    {lay({ background: `conic-gradient(from 160deg at ${cx} -10%, transparent 0deg, ${V} / .18) 8deg, transparent 14deg, rgb(217 70 239 / .14) 22deg, transparent 30deg, ${V} / .16) 36deg, transparent 44deg)`, WebkitMaskImage: "linear-gradient(#000, transparent 95%)", maskImage: "linear-gradient(#000, transparent 95%)" }, "hp-sway")}
    {lay({ background: `radial-gradient(30% 25% at ${cx} 0%, ${V} / .35), transparent)` })}
  </>,
  ribbons: () => lay({ backgroundImage: svg([[0, "#c4b5fd", 0.7], [18, "#f0abfc", 0.5], [36, "#93c5fd", 0.5]].map(([o, c, a]) => `<path d='M-20 ${200 + +o} C 120 ${120 + +o} 220 ${260 + +o} 480 ${140 + +o} L 480 ${175 + +o} C 220 ${290 + +o} 120 ${150 + +o} -20 ${232 + +o} Z' fill='${c}' fill-opacity='${a}'/>`).join(""), "100%", "100%", "0 0 460 270"), backgroundSize: "100% 100%" }, "hp-sway"),
  halftone: () => <>
    {lay({ background: `radial-gradient(circle, ${V} / .55) 0 2.6px, transparent 3px) 0 0 / 18px 18px`, WebkitMaskImage: "radial-gradient(70% 90% at 100% 100%, #000, transparent 70%)", maskImage: "radial-gradient(70% 90% at 100% 100%, #000, transparent 70%)" })}
    {lay({ background: `radial-gradient(circle, ${V} / .4) 0 1.6px, transparent 2px) 9px 9px / 18px 18px`, WebkitMaskImage: "radial-gradient(50% 70% at 0% 0%, #000, transparent 70%)", maskImage: "radial-gradient(50% 70% at 0% 0%, #000, transparent 70%)" })}
  </>,
  constellation: () => {
    const pts = [[40, 40], [120, 70], [190, 30], [260, 90], [330, 50], [410, 80], [60, 200], [150, 170], [240, 230], [330, 190], [420, 230], [100, 120], [300, 140]];
    const ed = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 7], [7, 8], [8, 9], [9, 10], [1, 11], [11, 7], [3, 12], [12, 9], [12, 4]];
    return lay({ backgroundImage: svg(ed.map(([a, b]) => `<line x1='${pts[a][0]}' y1='${pts[a][1]}' x2='${pts[b][0]}' y2='${pts[b][1]}' stroke='rgb(${L})' stroke-opacity='.22' vector-effect='non-scaling-stroke'/>`).join("") + pts.map(([x, y], i) => `<ellipse cx='${x}' cy='${y}' rx='${i % 3 ? 1.6 : 2.6}' ry='${i % 3 ? 2.6 : 4.2}' fill='rgb(${L})' fill-opacity='${i % 3 ? 0.45 : 0.8}'/>`).join(""), "100%", "100%", "0 0 460 270"), backgroundSize: "100% 100%" }, "hp-drift-slow");
  },
  tunnel: (cx, n) => lay({ backgroundImage: svg(Array.from({ length: 9 }, (_, i) => { const s = 1 - i * 0.1; return `<rect x='${n * 4.6 - 180 * s}' y='${135 - 130 * s}' width='${360 * s}' height='${260 * s}' rx='${24 * s}' fill='none' stroke='rgb(${L})' stroke-opacity='${0.08 + i * 0.025}' vector-effect='non-scaling-stroke'/>`; }).join(""), "100%", "100%", "0 0 460 270"), backgroundSize: "100% 100%" }),
  holo: () => <>
    {lay({ background: "linear-gradient(115deg, #ede9fe 0%, #fce7f3 25%, #e0f2fe 45%, #fef9c3 60%, #ede9fe 80%, #fae8ff 100%)", backgroundSize: "200% 200%", opacity: 0.85 }, "hp-shift")}
    {grain(0.35, 0.5)}
  </>,
  coderain: () => {
    const chars = "{}</>;=()[]01#$";
    return lay({ WebkitMaskImage: "linear-gradient(90deg, transparent, #000 40%, #000)", maskImage: "linear-gradient(90deg, transparent, #000 40%, #000)" }, "", undefined,
      Array.from({ length: 40 }, (_, c) => (
        <div key={c} className="hp-rain absolute top-0 whitespace-pre text-center font-mono text-[12px] font-semibold leading-[24px]" style={{ left: `${c * 2.6}%`, color: `rgba(${L},${0.1 + (c % 4) * 0.06})`, animationDuration: `${14 + (c % 5) * 3}s`, animationDelay: `${-((c * 37) % 20)}s` }}>
          {Array.from({ length: 40 }, (_, r) => chars[(c * 7 + r * 3) % chars.length]).join("\n")}
        </div>
      )));
  },
  flow: () => lay({ backgroundImage: svg(Array.from({ length: 14 }, (_, i) => `<path d='M-10 ${60 + i * 12} C 100 ${10 + i * 12} 200 ${150 + i * 9} 300 ${90 + i * 10} S 420 ${40 + i * 12} 480 ${80 + i * 11}' fill='none' stroke='${i % 3 === 1 ? "#d946ef" : `rgb(${L})`}' stroke-opacity='${0.1 + (i % 4) * 0.05}' stroke-width='1.2' vector-effect='non-scaling-stroke'/>`).join(""), "100%", "100%", "0 0 460 270"), backgroundSize: "100% 100%" }, "hp-sway"),
  glowgrid: () => <>
    {lay({ background: `linear-gradient(${V} / .14) 1px, transparent 1px) 0 0 / 64px 64px, linear-gradient(90deg, ${V} / .14) 1px, transparent 1px) 0 0 / 64px 64px`, WebkitMaskImage: "radial-gradient(70% 80% at 50% 50%, #000, transparent)", maskImage: "radial-gradient(70% 80% at 50% 50%, #000, transparent)" })}
    {[[3, 2], [9, 1], [2, 5], [12, 4], [7, 6], [16, 2], [19, 6]].map(([x, y], i) => (
      <span key={i} className="hp-twinkle absolute h-2.5 w-2.5 rounded-full" style={{ left: x * 64 - 5, top: y * 64 - 5, background: i % 2 ? "#d946ef" : "#8b7bff", boxShadow: `0 0 0 4px ${i % 2 ? "rgb(217 70 239 / .18)" : "rgb(139 123 255 / .2)"}, 0 0 18px ${i % 2 ? "#d946ef" : "#8b7bff"}`, animationDelay: `${-i * 0.7}s` }} />
    ))}
  </>,
  orbits: (cx) => (
    <div className="absolute" style={{ left: cx, top: "50%" }}>
      {[260, 400, 540, 680].map((s, i) => (
        <div key={s} className="hp-orbit absolute rounded-full border" style={{ width: s, height: s * 0.62, left: -s / 2, top: -s * 0.31, borderColor: `rgba(${L},.2)`, borderStyle: i % 2 ? "dashed" : "solid", animationDuration: `${30 + i * 12}s` }}>
          <span className="absolute -ml-1.5 -mt-1.5 h-3 w-3 rounded-full" style={{ left: "50%", top: 0, background: ["#6e59d9", "#d946ef", "#38bdf8", "#f59e0b"][i] }} />
        </div>
      ))}
    </div>
  ),

  // ----- set 3: aurora and colour -----
  "aurora-curtains": () => <>
    {blob(0, "-5%", "-30%", "30%", "110%", "linear-gradient(#a7f3d0, #8b7bff)", 90, -18, "hp-float")}
    {blob(1, "22%", "-35%", "26%", "100%", "linear-gradient(#c4b5fd, #f0abfc)", 95, -12, "hp-float")}
    {blob(2, "48%", "-30%", "28%", "105%", "linear-gradient(#93c5fd, #a78bfa)", 90, -20, "hp-float")}
    {blob(3, "74%", "-40%", "30%", "110%", "linear-gradient(#f9a8d4, #c4b5fd)", 100, -14, "hp-float")}
    {lay({ background: "linear-gradient(transparent 40%, #fff 92%)" })}
  </>,
  "aurora-top": () => <>
    {blob(0, "-10%", "-45%", "60%", "70%", "#c4b5fd", 140, 0, "hp-float")}
    {blob(1, "30%", "-50%", "50%", "60%", "#f5d0fe", 140, 0, "hp-float")}
    {blob(2, "60%", "-45%", "55%", "70%", "#bae6fd", 140, 0, "hp-float")}
    {lay({ background: `radial-gradient(${V} / .25) 1px, transparent 1.3px) 0 0 / 26px 26px`, WebkitMaskImage: "linear-gradient(#000, transparent 70%)", maskImage: "linear-gradient(#000, transparent 70%)" })}
  </>,
  "aurora-grain": () => <>
    {lay({ background: "#f7f5ff" })}
    {blob(0, "-15%", "10%", "55%", "80%", "#a78bfa", 150, 0, "hp-float")}
    {blob(1, "45%", "-20%", "50%", "70%", "#f0abfc", 150, 0, "hp-float")}
    {blob(2, "55%", "50%", "55%", "70%", "#7dd3fc", 150, 0, "hp-float")}
    {grain(0.5, 0.35)}
  </>,
  blobs: () => <>
    {blob(0, "55%", "-15%", "45%", "75%", "linear-gradient(135deg, #c4b5fd, #f0abfc)", 70, 20, "hp-float")}
    {blob(1, "70%", "45%", "35%", "60%", "linear-gradient(135deg, #93c5fd, #c4b5fd)", 70, -15, "hp-float")}
    {blob(2, "-10%", "60%", "35%", "55%", "linear-gradient(135deg, #fbcfe8, #ddd6fe)", 70, 10, "hp-float")}
  </>,
  orbs: () => [[62, 8, 180, "#a78bfa"], [88, 58, 120, "#f0abfc"], [52, 74, 80, "#7dd3fc"], [6, 74, 70, "#c4b5fd"], [36, 12, 46, "#f9a8d4"]].map(([x, y, s, c], i) => (
    <div key={i} className="hp-bob absolute rounded-full" style={{ left: `${x}%`, top: `${y}%`, width: +s, height: +s, background: `radial-gradient(circle at 32% 28%, #fff 0, ${c} 38%, ${c} 60%, rgba(0,0,0,.08))`, boxShadow: `0 30px 40px -16px ${c}`, opacity: 0.9, animationDelay: `${-i * 1.3}s` }} />
  )),
  prism: () => <>
    {lay({ background: "conic-gradient(from 200deg at 105% -5%, transparent 0deg, #fca5a5 6deg, #fde68a 12deg, #a7f3d0 18deg, #93c5fd 24deg, #c4b5fd 30deg, transparent 38deg)", opacity: 0.5, filter: "blur(18px)" }, "hp-sway")}
    {lay({ background: "radial-gradient(40% 40% at 100% 0%, #fff, transparent)" })}
  </>,
  bokeh: () => [[10, 15, 120, "#c4b5fd", 0.6], [30, 70, 200, "#f0abfc", 0.35], [58, 10, 90, "#93c5fd", 0.5], [75, 60, 240, "#a78bfa", 0.3], [88, 20, 110, "#f9a8d4", 0.45], [45, 45, 60, "#7dd3fc", 0.5], [18, 45, 50, "#a78bfa", 0.5], [66, 85, 80, "#fde68a", 0.5]].map(([x, y, s, c, o], i) => (
    <div key={i} className="hp-bob absolute rounded-full border border-white/60" style={{ left: `${x}%`, top: `${y}%`, width: +s, height: +s, background: `${c}`, opacity: +o, filter: `blur(${+s > 120 ? 14 : 4}px)`, animationDelay: `${-i * 1.1}s`, animationDuration: `${9 + (i % 4) * 2}s` }} />
  )),
  "aurora-grid": () => <>
    {blob(0, "5%", "30%", "50%", "80%", "#c4b5fd", 140, 0, "hp-float")}
    {blob(1, "50%", "20%", "50%", "80%", "#bae6fd", 140, 0, "hp-float")}
    {blob(2, "30%", "60%", "40%", "60%", "#f5d0fe", 140, 0, "hp-float")}
    {lay({ background: "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px) 0 0 / 56px 56px, linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px) 0 0 / 56px 56px" })}
  </>,
  waves: () => lay({ backgroundImage: svg([["#ede9fe", 150], ["#ddd6fe", 175], ["#f5d0fe", 200], ["#c4b5fd", 225], ["#bae6fd", 245]].map(([c, y], i) => `<path d='M0 ${y} C 120 ${+y - 40 - i * 4} 260 ${+y + 40} 460 ${+y - 30} L460 270 L0 270Z' fill='${c}' fill-opacity='.85'/>`).join(""), "100%", "100%", "0 0 460 270"), backgroundSize: "100% 100%" }, "hp-sway"),
  swirl: (cx) => <SoftSwirl key="swirl" cx={cx} />,
  sunset: (cx) => <>
    {lay({ background: "linear-gradient(180deg, #fff 0%, #fff 35%, #fde7f3 65%, #fed7aa 85%, #fbcfe8 100%)" })}
    {blob(0, "45%", "55%", "60%", "80%", "#c4b5fd", 110, 0, "hp-float")}
    <div key="sun" className="absolute h-[360px] w-[360px] rounded-full bg-orange-300/50 blur-3xl" style={{ left: `calc(${cx} - 180px)`, bottom: -180 }} />
  </>,
  colordots: () => <>
    {lay({ background: "linear-gradient(120deg, #8b7bff, #d946ef 45%, #38bdf8)", backgroundSize: "200% 200%", WebkitMaskImage: "radial-gradient(circle, #000 0 1.7px, transparent 2px)", maskImage: "radial-gradient(circle, #000 0 1.7px, transparent 2px)", WebkitMaskSize: "20px 20px", maskSize: "20px 20px", opacity: 0.55 }, "hp-shift")}
    {lay({ background: "radial-gradient(60% 70% at 25% 40%, #fff 30%, transparent)" })}
  </>,
};
