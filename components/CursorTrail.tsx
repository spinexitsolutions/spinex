"use client";

import { useEffect, useRef, useState } from "react";
import type { CursorTrail as TrailKind } from "@/lib/content";

// A moving trail behind the mouse, chosen in Admin → Site settings → Intro & cursor → Cursor trail.
// Only on computers with a mouse; phones, tablets and "reduce motion" never get it.
// It draws on one see-through canvas over the page and stops drawing as soon as the trail has faded.
export default function CursorTrail({ kind, images = [], words = [], brand = "SPINEX", area }: {
  kind?: TrailKind; images?: string[]; words?: string[]; brand?: string;
  area?: React.RefObject<HTMLElement | null>; // admin "try it" box: only draw inside it
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => setDesktop(mq.matches && !reduced.matches);
    check();
    mq.addEventListener("change", check);
    reduced.addEventListener("change", check);
    return () => { mq.removeEventListener("change", check); reduced.removeEventListener("change", check); };
  }, []);

  const on = desktop && !!kind && kind !== "none" && !!MAKE[kind];
  const imgKey = images.join("|"), wordKey = words.join("|");

  useEffect(() => {
    if (!on || !kind) return;
    const canvas = ref.current!;
    const g = canvas.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const acc = css.getPropertyValue("--c-lav-600").trim() || "110 89 217";
    const pics = images.filter(Boolean).slice(0, 12).map((src) => { const i = new Image(); i.decoding = "async"; i.src = src; return i; });
    const w: Ctx = { g, W: 0, H: 0, acc, pics, words: words.length ? words : WORDS, brand: (brand || "SPINEX").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SPINEX", t: 0 };
    const fx = MAKE[kind]!(w);
    const m = { x: -999, y: -999, px: -999, py: -999, last: -1e9, dist: 0 };
    let raf = 0;

    const resize = () => {
      const dpr = kind === "fluid" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      w.W = window.innerWidth;
      w.H = window.innerHeight;
      canvas.width = w.W * dpr;
      canvas.height = w.H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.resize?.();
    };
    const frame = (now: number) => {
      w.t = now / 1000;
      const moving = now - m.last < 120;
      g.clearRect(0, 0, w.W, w.H);
      fx.frame({ x: m.x, y: m.y, vx: moving ? m.x - m.px : 0, vy: moving ? m.y - m.py : 0, active: now - m.last < 900 });
      m.px = m.x; m.py = m.y;
      raf = fx.busy() || now - m.last < 900 ? requestAnimationFrame(frame) : 0;
      if (!raf) g.clearRect(0, 0, w.W, w.H);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (area?.current) {
        const r = area.current.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      }
      if (m.x < -900) { m.px = e.clientX; m.py = e.clientY; }
      m.dist += Math.hypot(e.clientX - m.x, e.clientY - m.y) || 0;
      m.x = e.clientX; m.y = e.clientY;
      m.last = performance.now();
      fx.move?.(m.x, m.y);
      if (!raf) raf = requestAnimationFrame(frame);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, kind, imgKey, wordKey, brand]);

  if (!on) return null;
  return (
    <>
      {kind === "gooey" && (
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id="spx-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="8" /><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -10" /></filter>
        </svg>
      )}
      <canvas ref={ref} aria-hidden data-cursor-trail={kind}
        className="pointer-events-none fixed inset-0 z-[2147482999] h-screen w-screen"
        style={kind === "gooey" ? { filter: "url(#spx-goo)" } : kind === "fluid" ? { filter: "blur(4px)" } : undefined} />
    </>
  );
}

// ---------- effects ----------

type Ctx = { g: CanvasRenderingContext2D; W: number; H: number; acc: string; pics: HTMLImageElement[]; words: string[]; brand: string; t: number };
type Mouse = { x: number; y: number; vx: number; vy: number; active: boolean };
type Fx = { frame: (m: Mouse) => void; busy: () => boolean; move?: (x: number, y: number) => void; resize?: () => void };
type P = { x: number; y: number; vx: number; vy: number; l: number; s: number; a: number; va: number; k: number; c: string; t?: string };

const WORDS = ["Websites", "AI automation", "Online stores", "SaaS software", "Google Ads", "Reels", "Apps", "SEO", "Branding", "Meta Ads", "Chatbots", "Logo design"];
const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const part = (x: number, y: number, o: Partial<P> = {}): P => ({ x, y, vx: 0, vy: 0, l: 1, s: 4, a: 0, va: 0, k: 0, c: "", ...o });
const BRIGHT = ["#6e59d9", "#8b7bff", "#b9acf5", "#d946ef", "#5b45c7"];
// Brand purple, pink and blue, blended along t (0..1, wraps).
const hue = (t: number) => {
  const c = [[110, 89, 217], [217, 70, 239], [56, 189, 248], [110, 89, 217]];
  const k = (((t % 1) + 1) % 1) * 3, i = Math.floor(k), f = k - i;
  return c[i].map((v, j) => Math.round(v + (c[i + 1][j] - v) * f)).join(",");
};

// Shared shape for "drop particles while the mouse moves, let them fall and fade" effects.
function particles(w: Ctx, o: {
  every: number; // pixels of mouse travel between new particles
  make: (x: number, y: number, m: Mouse) => P | P[];
  step: (p: P) => void;
  draw: (g: CanvasRenderingContext2D, p: P) => void;
  max?: number; before?: (m: Mouse) => void; after?: (m: Mouse) => void;
}): Fx {
  let ps: P[] = [];
  let travel = 0;
  return {
    busy: () => ps.length > 0,
    frame: (m) => {
      o.before?.(m);
      travel += Math.hypot(m.vx, m.vy);
      // Spread new particles along the path so fast moves don't leave gaps.
      while (travel >= o.every && (m.vx || m.vy)) {
        travel -= o.every;
        const f = Math.min(1, travel / (Math.hypot(m.vx, m.vy) || 1));
        const made = o.make(m.x - m.vx * f, m.y - m.vy * f, m);
        ps.push(...(Array.isArray(made) ? made : [made]));
      }
      if (ps.length > (o.max ?? 260)) ps = ps.slice(-(o.max ?? 260));
      const g = w.g;
      for (const p of ps) { o.step(p); if (p.l > 0) { g.save(); o.draw(g, p); g.restore(); } }
      ps = ps.filter((p) => p.l > 0);
      o.after?.(m);
    },
  };
}

// Recent mouse positions, for trails drawn as one line.
function history(n: number) {
  const h: { x: number; y: number }[] = [];
  return {
    h,
    push: (m: Mouse) => {
      if (m.active) h.push({ x: m.x, y: m.y });
      else if (h.length) h.shift();
      if (h.length > n) h.shift();
      if (m.active && h.length > 1 && !m.vx && !m.vy) h.shift();
    },
  };
}

const MAKE: Partial<Record<TrailKind, (w: Ctx) => Fx>> = {
  // 1. Pixel sparks: small purple squares that fall and fade.
  pixels: (w) => particles(w, {
    every: 6,
    make: (x, y) => part(x + rnd(-4, 4), y + rnd(-4, 4), { vx: rnd(-0.6, 0.6), vy: rnd(0.3, 1.5), s: rnd(2, 6), c: pick(BRIGHT) }),
    step: (p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.l -= 0.022; },
    draw: (g, p) => { g.globalAlpha = p.l; g.fillStyle = p.c; g.fillRect(p.x, p.y, p.s, p.s); },
  }),

  // 2. Code trail: { } </> ; float up and fade.
  code: (w) => particles(w, {
    every: 26,
    make: (x, y) => part(x, y, { vx: rnd(-0.5, 0.5), vy: rnd(-1.5, -0.3), a: rnd(-0.3, 0.3), c: pick(BRIGHT.slice(0, 3)), t: pick(["{", "}", "<", "/>", ";", "()", "</>", "=", "#"]) }),
    step: (p) => { p.x += p.vx; p.y += p.vy; p.l -= 0.016; },
    draw: (g, p) => { g.globalAlpha = p.l; g.translate(p.x, p.y); g.rotate(p.a); g.font = `700 ${13 + (1 - p.l) * 6}px ui-monospace, monospace`; g.fillStyle = p.c; g.fillText(p.t!, 0, 0); },
  }),

  // 3. AI sparkles: four-point stars that twinkle.
  sparkles: (w) => particles(w, {
    every: 16,
    make: (x, y) => part(x + rnd(-15, 15), y + rnd(-15, 15), { s: rnd(5, 12), c: pick(["#6e59d9", "#d946ef", "#f59e0b", "#8b7bff"]) }),
    step: (p) => { p.l -= 0.02; p.y -= 0.3; },
    draw: (g, p) => {
      const k = Math.sin((1 - p.l) * Math.PI) * p.s;
      g.globalAlpha = p.l; g.fillStyle = p.c; g.beginPath();
      for (let a = 0; a < 8; a++) { const r = a % 2 ? k * 0.28 : k, an = (a * Math.PI) / 4 - Math.PI / 2; g.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r); }
      g.fill();
    },
  }),

  // 4. Ribbon: a smooth purple-to-pink line.
  ribbon: (w) => {
    const hs = history(22);
    return {
      busy: () => hs.h.length > 1,
      frame: (m) => {
        hs.push(m);
        const h = hs.h, g = w.g;
        g.lineCap = "round";
        for (let k = 1; k < h.length; k++) {
          const f = k / h.length;
          g.strokeStyle = `rgba(${hue(0.33 * (1 - f))},${f})`;
          g.lineWidth = f * 10;
          g.beginPath(); g.moveTo(h[k - 1].x, h[k - 1].y); g.lineTo(h[k].x, h[k].y); g.stroke();
        }
      },
    };
  },

  // 5. Ripple rings: thin circles spread out as the mouse moves.
  rings: (w) => particles(w, {
    every: 40,
    make: (x, y) => part(x, y),
    step: (p) => { p.l -= 0.02; },
    draw: (g, p) => { g.globalAlpha = p.l * 0.8; g.strokeStyle = `rgb(${w.acc})`; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, 4 + (1 - p.l) * 34, 0, TAU); g.stroke(); },
  }),

  // 6. Comet: a glowing tail with a little star dust.
  comet: (w) => {
    const hs = history(24);
    const dust = particles(w, {
      every: 8,
      make: (x, y) => part(x, y, { vx: rnd(-0.7, 0.7), vy: rnd(-0.7, 0.7) }),
      step: (p) => { p.x += p.vx; p.y += p.vy; p.l -= 0.03; },
      draw: (g, p) => { g.globalAlpha = p.l; g.fillStyle = "#c4b5fd"; g.beginPath(); g.arc(p.x, p.y, 1.4, 0, TAU); g.fill(); },
    });
    return {
      busy: () => hs.h.length > 1 || dust.busy(),
      frame: (m) => {
        hs.push(m);
        const g = w.g, h = hs.h;
        for (let k = 0; k < h.length; k++) {
          const f = (k + 1) / h.length, r = 3 + f * 13;
          const gr = g.createRadialGradient(h[k].x, h[k].y, 0, h[k].x, h[k].y, r);
          gr.addColorStop(0, `rgba(139,123,255,${f * 0.75})`); gr.addColorStop(1, "rgba(110,89,217,0)");
          g.fillStyle = gr; g.beginPath(); g.arc(h[k].x, h[k].y, r, 0, TAU); g.fill();
        }
        dust.frame(m);
      },
    };
  },

  // 7. Liquid ink: soft coloured smoke that spreads and changes colour.
  ink: (w) => particles(w, {
    every: 5, max: 160,
    make: (x, y, m) => part(x, y, { vx: m.vx * 0.2 + rnd(-0.3, 0.3), vy: m.vy * 0.2 + rnd(-0.3, 0.3), s: 10 + Math.min(40, Math.hypot(m.vx, m.vy)), c: hue(w.t * 0.15) }),
    step: (p) => { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.l -= 0.013; p.s += 0.9; },
    draw: (g, p) => {
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      gr.addColorStop(0, `rgba(${p.c},${0.22 * p.l})`); gr.addColorStop(0.6, `rgba(${p.c},${0.08 * p.l})`); gr.addColorStop(1, `rgba(${p.c},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill();
    },
  }),

  // 8. Gooey blobs: drops that stick together and break off (the canvas has a "goo" filter).
  gooey: (w) => particles(w, {
    every: 7,
    make: (x, y) => part(x, y, { vx: rnd(-0.4, 0.4), vy: rnd(-0.2, 0.6), s: rnd(7, 12) }),
    step: (p) => { p.x += p.vx; p.y += p.vy; p.l -= 0.024; },
    draw: (g, p) => { g.fillStyle = `rgb(${w.acc})`; g.beginPath(); g.arc(p.x, p.y, p.s * p.l, 0, TAU); g.fill(); },
  }),

  // 9. 3D glass shards: shiny triangles that spin and fall.
  shards: (w) => particles(w, {
    every: 18,
    make: (x, y) => part(x, y, { vx: rnd(-1.2, 1.2), vy: rnd(-3, -1), s: rnd(6, 14), a: rnd(0, 6), va: rnd(-0.08, 0.08), k: rnd(0, 6), t: pick(["#c4b5fd|#6e59d9", "#f5d0fe|#d946ef", "#bae6fd|#0ea5e9", "#ddd6fe|#4c1d95"]) }),
    step: (p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.a += p.va; p.k += 0.12; p.l -= 0.012; },
    draw: (g, p) => {
      const [c0, c1] = p.t!.split("|");
      g.globalAlpha = Math.min(1, p.l * 2); g.translate(p.x, p.y); g.rotate(p.a); g.scale(Math.cos(p.k), 1);
      const gr = g.createLinearGradient(-p.s, -p.s, p.s, p.s); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -p.s); g.lineTo(p.s * 0.9, p.s * 0.6); g.lineTo(-p.s * 0.9, p.s * 0.6); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.moveTo(0, -p.s); g.lineTo(p.s * 0.25, p.s * 0.6); g.lineTo(-p.s * 0.9, p.s * 0.6); g.closePath(); g.fill();
    },
  }),

  // 10. Brand letters: S P I N E X pop out one by one and fall.
  letters: (w) => {
    let n = 0;
    return particles(w, {
      every: 55,
      make: (x, y) => part(x, y, { vx: rnd(-0.8, 0.8), vy: rnd(-2.4, -1.4), a: rnd(-0.15, 0.15), va: rnd(-0.02, 0.02), t: w.brand[n++ % w.brand.length] }),
      step: (p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.a += p.va; p.l -= 0.011; },
      draw: (g, p) => {
        const pop = Math.min(1, (1 - p.l) * 8);
        g.globalAlpha = Math.min(1, p.l * 2); g.translate(p.x, p.y); g.rotate(p.a); g.scale(pop, pop);
        g.font = "700 30px Poppins, system-ui, sans-serif"; g.textAlign = "center";
        const gr = g.createLinearGradient(-12, -24, 12, 4); gr.addColorStop(0, "#8b7bff"); gr.addColorStop(1, "#d946ef");
        g.fillStyle = gr; g.fillText(p.t!, 0, 0);
      },
    });
  },

  // 11. Neon tail: a glowing tail that swings behind the mouse like a spring.
  neon: (w) => {
    const nodes = Array.from({ length: 22 }, () => ({ x: -999, y: -999, vx: 0, vy: 0 }));
    let life = 0;
    return {
      busy: () => life > 0.01,
      move: (x, y) => { if (nodes[0].x < -900) nodes.forEach((n) => { n.x = x; n.y = y; }); },
      frame: (m) => {
        life = m.active ? Math.min(1, life + 0.1) : life * 0.9;
        let tx = m.x, ty = m.y;
        for (const n of nodes) { n.vx += (tx - n.x) * 0.5; n.vy += (ty - n.y) * 0.5; n.vx *= 0.5; n.vy *= 0.5; n.x += n.vx; n.y += n.vy; tx = n.x; ty = n.y; }
        const g = w.g;
        g.lineCap = "round"; g.globalCompositeOperation = "lighter";
        for (let pass = 0; pass < 2; pass++) for (let k = 1; k < nodes.length; k++) {
          const f = 1 - k / nodes.length;
          g.strokeStyle = `rgba(${hue((k / nodes.length) * 0.66 + w.t * 0.2)},${(pass ? f : f * 0.25) * life})`;
          g.lineWidth = pass ? f * 7 : f * 22;
          g.beginPath(); g.moveTo(nodes[k - 1].x, nodes[k - 1].y); g.lineTo(nodes[k].x, nodes[k].y); g.stroke();
        }
        g.globalCompositeOperation = "source-over";
      },
    };
  },

  // 12. Orbit + stardust: three glowing dots circle the mouse and leave star dust.
  orbit: (w) => {
    const tails: [number, number][][] = [[], [], []];
    let life = 0;
    const dust = particles(w, {
      every: 6,
      make: (x, y) => part(x, y, { vx: rnd(-0.4, 0.4), vy: rnd(-0.1, 0.7) }),
      step: (p) => { p.x += p.vx; p.y += p.vy; p.l -= 0.02; },
      draw: (g, p) => { g.globalAlpha = p.l; g.fillStyle = "#a78bfa"; g.beginPath(); g.arc(p.x, p.y, 1.3, 0, TAU); g.fill(); },
    });
    return {
      busy: () => life > 0.01 || dust.busy(),
      frame: (m) => {
        life = m.active ? Math.min(1, life + 0.08) : life * 0.9;
        const g = w.g;
        tails.forEach((h, k) => {
          const a = w.t * 7 + k * 2.094, r = 22 + 6 * Math.sin(w.t * 3 + k);
          h.push([m.x + Math.cos(a) * r, m.y + Math.sin(a) * r * 0.75]);
          if (h.length > 14) h.shift();
          const c = hue(k / 3);
          h.forEach(([x, y], j) => {
            const f = ((j + 1) / h.length) * life, rad = 1 + f * 6;
            const gr = g.createRadialGradient(x, y, 0, x, y, rad);
            gr.addColorStop(0, `rgba(255,255,255,${f})`); gr.addColorStop(0.35, `rgba(${c},${0.85 * f})`); gr.addColorStop(1, `rgba(${c},0)`);
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
          });
        });
        dust.frame(m);
      },
    };
  },

  // 13. Fluid smoke: a small real fluid simulation; colour is stirred in where the mouse moves.
  fluid: (w) => fluid(w),

  // 14. Our work trail: pictures of your work pop out behind the mouse.
  work: (w) => {
    let n = 0;
    return particles(w, {
      every: 110, max: 12,
      make: (x, y) => part(x, y, { a: rnd(-0.12, 0.12), k: n++ }),
      step: (p) => { p.l -= 0.022; },
      draw: (g, p) => {
        const im = w.pics.length ? w.pics[p.k % w.pics.length] : null;
        const age = 1 - p.l, s = Math.min(1, age * 7) * (p.l < 0.3 ? p.l / 0.3 : 1);
        const bw = 150 * s, bh = 104 * s;
        if (bw < 2) return;
        g.translate(p.x, p.y + age * 25); g.rotate(p.a);
        g.shadowColor = "rgba(20,16,40,.25)"; g.shadowBlur = 24; g.shadowOffsetY = 12;
        g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, 12 * s);
        g.fillStyle = im?.complete && im.naturalWidth ? "#fff" : `rgb(${w.acc})`; g.fill();
        g.shadowColor = "transparent";
        if (im?.complete && im.naturalWidth) {
          g.clip();
          const ar = im.naturalWidth / im.naturalHeight;
          let dw = bw, dh = bw / ar;
          if (dh < bh) { dh = bh; dw = bh * ar; }
          g.drawImage(im, -dw / 2, -dh / 2, dw, dh);
        }
      },
    });
  },

  // 15. Pixel mosaic: coloured squares appear where the mouse passes, then shrink away.
  mosaic: (w) => {
    const S = 24;
    const cells = new Map<number, { h: number; c: string }>();
    let lx = -1, ly = -1;
    return {
      busy: () => cells.size > 0,
      frame: (m) => {
        const ci = Math.floor(m.x / S), cj = Math.floor(m.y / S);
        if ((m.vx || m.vy) && (ci !== lx || cj !== ly || Math.random() < 0.3)) {
          lx = ci; ly = cj;
          for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
            const d = Math.hypot(a, b);
            if (d > 2.3 || Math.random() > 1 - d / 3 || ci + a < 0 || cj + b < 0) continue;
            const key = (cj + b) * 10000 + ci + a;
            const old = cells.get(key);
            cells.set(key, { h: 1, c: old && old.h > 0.5 ? old.c : pick(["#6e59d9", "#8b7bff", "#c4b5fd", "#d946ef", "#ede9fe", "#120f1b"]) });
          }
        }
        const g = w.g;
        cells.forEach((v, key) => {
          v.h *= 0.935;
          if (v.h < 0.03) { cells.delete(key); return; }
          const c = key % 10000, r = Math.floor(key / 10000), s = S * Math.min(1, v.h * 1.3);
          g.globalAlpha = Math.min(1, v.h * 1.4); g.fillStyle = v.c;
          g.fillRect(c * S + (S - s) / 2, r * S + (S - s) / 2, s - 1, s - 1);
        });
        g.globalAlpha = 1;
      },
    };
  },

  // 16. Service pills: your services pop out as small tags and float up.
  pills: (w) => {
    let n = 0;
    const colours = [["#6e59d9", "#fff"], ["#120f1b", "#fff"], ["#ede9fe", "#5b45c7"], ["#fdf4ff", "#c026d3"]];
    return particles(w, {
      every: 90, max: 14,
      make: (x, y, m) => part(x, y, { vx: -m.vx * 0.1 + rnd(-0.3, 0.3), vy: -1.1, k: n, t: w.words[n++ % w.words.length] }),
      step: (p) => { p.x += p.vx; p.y += p.vy; p.vy *= 0.97; p.l -= 0.02; },
      draw: (g, p) => {
        const [bg, fg] = colours[p.k % colours.length];
        const age = 1 - p.l, s = Math.min(1, age * 6), b = 1 + Math.sin(Math.min(1, age * 6) * Math.PI) * 0.15;
        g.font = "500 14px Poppins, system-ui, sans-serif";
        const tw = g.measureText(p.t!).width;
        g.globalAlpha = Math.min(1, p.l * 2.5); g.translate(p.x, p.y); g.scale(s * b, s * b);
        g.shadowColor = "rgba(20,16,40,.18)"; g.shadowBlur = 14; g.shadowOffsetY = 6;
        g.fillStyle = bg; g.beginPath(); g.roundRect(-tw / 2 - 14, -16, tw + 28, 32, 16); g.fill();
        g.shadowColor = "transparent"; g.fillStyle = fg; g.textAlign = "center"; g.fillText(p.t!, 0, 5);
      },
    });
  },

  // 17. Lightning: a purple bolt crackles behind the mouse.
  lightning: (w) => {
    const hs = history(16);
    let bolt: [number, number][] = [], fork: [number, number][] | null = null, tick = 0;
    return {
      busy: () => hs.h.length > 1,
      frame: (m) => {
        hs.push(m);
        const h = hs.h, g = w.g;
        if (h.length < 2) return;
        if (tick++ % 2 === 0) {
          bolt = h.map((p, k) => { const j = 14 * (1 - k / h.length); return [p.x + rnd(-j, j) / 2, p.y + rnd(-j, j) / 2]; });
          fork = null;
          if (Math.random() < 0.5) {
            fork = [[m.x, m.y]];
            let x = m.x, y = m.y; const a = rnd(0, TAU);
            for (let s = 0; s < 6; s++) { x += Math.cos(a) * 9 + rnd(-5, 5); y += Math.sin(a) * 9 + rnd(-5, 5); fork.push([x, y]); }
          }
        }
        g.lineJoin = "round"; g.lineCap = "round";
        const line = (pts: [number, number][], lw: number, c: string) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
        for (const b of [bolt, fork]) { if (!b) continue; line(b, 10, `rgb(${w.acc} / 0.15)`); line(b, 4.5, `rgb(${w.acc} / 0.45)`); line(b, 1.8, "#a78bfa"); }
      },
    };
  },

  // 18. Glitch RGB: red, green and blue rings trail behind with small glitch lines.
  glitch: (w) => {
    const hs = history(10);
    return {
      busy: () => hs.h.length > 1,
      frame: (m) => {
        hs.push(m);
        const h = hs.h, g = w.g;
        if (h.length < 2) return;
        ([["255,40,90", 2], ["16,200,140", 4], ["70,110,255", 6]] as [string, number][]).forEach(([c, lag]) => {
          const q = h[Math.max(0, h.length - 1 - lag)];
          g.strokeStyle = `rgba(${c},.85)`; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, 18, 0, TAU); g.stroke();
          g.fillStyle = `rgba(${c},.35)`; g.fillRect(q.x - 30 + (Math.random() < 0.15 ? rnd(-10, 10) : 0), q.y - 1, 60, Math.random() < 0.3 ? 3 : 1.5);
        });
      },
    };
  },
};

// Stable-fluids simulation on a coarse grid (about 12px per cell), drawn as a blurred colour image.
function fluid(w: Ctx): Fx {
  const CELL = 12;
  let FX = 0, FY = 0, S = 0;
  let u = new Float32Array(0), v = u, u0 = u, v0 = u, dR = u, dG = u, dB = u, tmp = u, cu = u;
  let off: HTMLCanvasElement, og: CanvasRenderingContext2D, img: ImageData;
  let mass = 0;
  const IX = (i: number, j: number) => i + (FX + 2) * j;
  const setup = () => {
    FX = Math.max(8, Math.ceil(w.W / CELL)); FY = Math.max(8, Math.ceil(w.H / CELL)); S = (FX + 2) * (FY + 2);
    const f = () => new Float32Array(S);
    u = f(); v = f(); u0 = f(); v0 = f(); dR = f(); dG = f(); dB = f(); tmp = f(); cu = f();
    off = document.createElement("canvas"); off.width = FX; off.height = FY;
    og = off.getContext("2d")!; img = og.createImageData(FX, FY);
  };
  const bnd = (b: number, x: Float32Array) => {
    for (let i = 1; i <= FX; i++) { x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)]; x[IX(i, FY + 1)] = b === 2 ? -x[IX(i, FY)] : x[IX(i, FY)]; }
    for (let j = 1; j <= FY; j++) { x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)]; x[IX(FX + 1, j)] = b === 1 ? -x[IX(FX, j)] : x[IX(FX, j)]; }
  };
  const adv = (b: number, d: Float32Array, d0: Float32Array, uu: Float32Array, vv: Float32Array) => {
    for (let j = 1; j <= FY; j++) for (let i = 1; i <= FX; i++) {
      let x = i - uu[IX(i, j)], y = j - vv[IX(i, j)];
      x = Math.max(0.5, Math.min(FX + 0.5, x)); y = Math.max(0.5, Math.min(FY + 0.5, y));
      const i0 = x | 0, j0 = y | 0, s1 = x - i0, t1 = y - j0;
      d[IX(i, j)] = (1 - s1) * ((1 - t1) * d0[IX(i0, j0)] + t1 * d0[IX(i0, j0 + 1)]) + s1 * ((1 - t1) * d0[IX(i0 + 1, j0)] + t1 * d0[IX(i0 + 1, j0 + 1)]);
    }
    bnd(b, d);
  };
  const project = () => {
    const p = u0, div = v0;
    for (let j = 1; j <= FY; j++) for (let i = 1; i <= FX; i++) { div[IX(i, j)] = -0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]); p[IX(i, j)] = 0; }
    bnd(0, div); bnd(0, p);
    for (let k = 0; k < 12; k++) { for (let j = 1; j <= FY; j++) for (let i = 1; i <= FX; i++) p[IX(i, j)] = (div[IX(i, j)] + p[IX(i - 1, j)] + p[IX(i + 1, j)] + p[IX(i, j - 1)] + p[IX(i, j + 1)]) / 4; bnd(0, p); }
    for (let j = 1; j <= FY; j++) for (let i = 1; i <= FX; i++) { u[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]); v[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]); }
    bnd(1, u); bnd(2, v);
  };
  const vort = () => {
    for (let j = 1; j <= FY; j++) for (let i = 1; i <= FX; i++) cu[IX(i, j)] = (v[IX(i + 1, j)] - v[IX(i - 1, j)] - u[IX(i, j + 1)] + u[IX(i, j - 1)]) * 0.5;
    for (let j = 2; j < FY; j++) for (let i = 2; i < FX; i++) {
      let nx = Math.abs(cu[IX(i + 1, j)]) - Math.abs(cu[IX(i - 1, j)]), ny = Math.abs(cu[IX(i, j + 1)]) - Math.abs(cu[IX(i, j - 1)]);
      const l = Math.hypot(nx, ny) + 1e-5; nx /= l; ny /= l;
      const c = cu[IX(i, j)] * 0.35; u[IX(i, j)] += ny * c; v[IX(i, j)] -= nx * c;
    }
  };
  return {
    resize: setup,
    busy: () => mass > 0.5,
    frame: (m) => {
      if (!S) setup();
      if (m.vx || m.vy) {
        const ci = Math.round(m.x / CELL), cj = Math.round(m.y / CELL), dx = m.vx / CELL, dy = m.vy / CELL;
        const col = hue(w.t * 0.15).split(",").map(Number);
        for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
          const i = ci + a, j = cj + b;
          if (i < 1 || j < 1 || i > FX || j > FY) continue;
          const f = Math.exp(-(a * a + b * b) / 5), k = IX(i, j);
          u[k] += dx * f * 1.6; v[k] += dy * f * 1.6;
          dR[k] += (col[0] / 255) * f * 1.1; dG[k] += (col[1] / 255) * f * 1.1; dB[k] += (col[2] / 255) * f * 1.1;
        }
      }
      vort();
      u0.set(u); v0.set(v);
      adv(1, u, u0, u0, v0); adv(2, v, v0, u0, v0);
      project();
      for (const d of [dR, dG, dB]) { tmp.set(d); adv(0, d, tmp, u, v); for (let k = 0; k < S; k++) d[k] *= 0.965; }
      for (let k = 0; k < S; k++) { u[k] *= 0.99; v[k] *= 0.99; }
      mass = 0;
      const data = img.data;
      for (let j = 0; j < FY; j++) for (let i = 0; i < FX; i++) {
        const k = IX(i + 1, j + 1), o = (i + j * FX) * 4, sum = dR[k] + dG[k] + dB[k];
        mass += sum;
        // Colour is the mix of what was stirred in; how much of it there is sets how solid it looks.
        const n = sum > 1e-4 ? 255 / Math.max(dR[k], dG[k], dB[k]) : 0;
        data[o] = dR[k] * n; data[o + 1] = dG[k] * n; data[o + 2] = dB[k] * n;
        data[o + 3] = Math.max(0, Math.min(190, (sum - 0.08) * 170));
      }
      og.putImageData(img, 0, 0);
      w.g.imageSmoothingEnabled = true;
      w.g.drawImage(off, 0, 0, FX * CELL, FY * CELL);
    },
  };
}
