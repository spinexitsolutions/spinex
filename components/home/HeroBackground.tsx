"use client";

import { useEffect, useRef } from "react";
import DotField from "./DotField";
import type { HeroBg } from "@/lib/content";

// Moving background behind the hero, chosen in Admin → Homepage hero → Background effect.
// Each effect follows the mouse; on phones (no mouse) it moves on its own along a slow path.
// Drawing stops when the hero is off screen or the tab is hidden, and only one still frame
// is drawn for visitors who ask their device for less motion.
export default function HeroBackground({ kind = "dots", center }: { kind?: HeroBg; center?: boolean }) {
  if (kind === "none") return null;
  if (kind === "dots" || !DRAW[kind]) {
    return <DotField className={center ? "[mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" : "[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"} />;
  }
  return <Canvas kind={kind} center={center} />;
}

type M = { x: number; y: number };
type S = { w: number; h: number; t: number; m: M; wide: boolean; center: boolean; acc: string; ink: string; mem: Record<string, unknown> };
type Draw = (g: CanvasRenderingContext2D, s: S) => void;

const MASK: Partial<Record<HeroBg, string>> = {
  trail: "[mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]",
  torch: "[mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_90%)]",
};

function Canvas({ kind, center = false }: { kind: HeroBg; center?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const g = canvas.getContext("2d")!;
    const draw = DRAW[kind]!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = (n: string, d: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d;
    const s: S = { w: 0, h: 0, t: 0, m: { x: 0, y: 0 }, wide: true, center, acc: "110 89 217", ink: "18 15 27", mem: {} };
    const target = { x: 0, y: 0 };
    let last = -1e9, raf = 0, visible = true, started = false;
    const t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      s.w = canvas.clientWidth;
      s.h = canvas.clientHeight;
      s.wide = s.w >= 1024;
      canvas.width = s.w * dpr;
      canvas.height = s.h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.mem = {};
      s.acc = css("--c-lav-600", "110 89 217");
      s.ink = css("--c-ink", "18 15 27");
    };

    // Where the "mouse" is when nobody is moving one: a slow loop over the busy part of the hero.
    const auto = (t: number): M => {
      const rx = s.wide ? s.w * 0.42 : s.w * 0.34;
      return { x: s.w * 0.5 + rx * Math.cos(t * 0.35), y: s.h * 0.5 + s.h * 0.36 * Math.sin(t * 0.7) };
    };

    const frame = (now: number) => {
      s.t = (now - t0) / 1000;
      const live = now - last < 2500;
      const goal = live ? target : auto(s.t);
      if (!started) { s.m = { ...goal }; started = true; }
      s.m.x += (goal.x - s.m.x) * (live ? 0.14 : 0.05);
      s.m.y += (goal.y - s.m.y) * (live ? 0.14 : 0.05);
      g.clearRect(0, 0, s.w, s.h);
      draw(g, s);
    };
    const loop = (now: number) => {
      frame(now);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && !reduced && visible && !document.hidden) raf = requestAnimationFrame(loop); };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height || !r.width) return;
      // The admin preview is drawn smaller, so scale back to the canvas's own size.
      target.x = (x * s.w) / r.width;
      target.y = (y * s.h) / r.height;
      last = performance.now();
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
    const vis = () => start();
    const onResize = () => { resize(); if (reduced) frame(t0 + 4000); };

    resize();
    frame(t0 + (reduced ? 4000 : 0));
    io.observe(canvas);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", vis);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [kind, center]);

  return <canvas ref={ref} aria-hidden data-hero-bg={kind} className={`pointer-events-none absolute inset-0 h-full w-full ${MASK[kind] ?? ""}`} />;
}

// ---------- effects ----------

const TAU = Math.PI * 2;
const dot = (g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) => {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = fill;
  g.fill();
};

// C. Soft purple, pink and blue light that follows the mouse.
const aurora: Draw = (g, s) => {
  const { m, t } = s;
  const r = Math.max(s.w, s.h) * (s.wide ? 0.24 : 0.42);
  const blobs: [number, number, number, string][] = [
    [m.x, m.y, r, `rgb(${s.acc} / 0.30)`],
    [m.x - r * 0.6 * Math.cos(t * 0.6), m.y + r * 0.3, r * 0.85, "rgb(232 121 249 / 0.24)"],
    [m.x + r * 0.5, m.y - r * 0.35 * Math.sin(t * 0.6), r * 0.75, "rgb(56 189 248 / 0.20)"],
  ];
  for (const [x, y, rr, c] of blobs) {
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, c);
    gr.addColorStop(1, c.replace(/[\d.]+\)$/, "0)"));
    g.fillStyle = gr;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
};

// D. A field of dots in perspective that waves, with ripples where the mouse is.
const wave: Draw = (g, s) => {
  const { m, t, w, h } = s;
  const rows = 24, cols = Math.round(Math.min(80, w / 18));
  const top = h * 0.42, depth = h * 0.62;
  const cx = s.wide && !s.center ? w * 0.6 : w * 0.5;
  for (let r = 0; r < rows; r++) {
    const z = r / (rows - 1);
    const y0 = top + z * z * depth;
    const persp = 0.55 + z * 0.9;
    for (let c = 0; c < cols; c++) {
      const x = cx + (c / (cols - 1) - 0.5) * w * persp;
      if (x < -10 || x > w + 10) continue;
      const d = Math.hypot(x - m.x, (y0 - m.y) * 1.6);
      const k = Math.max(0, 1 - d / 280);
      const y = y0 - Math.sin(t * 1.6 + c * 0.3 + r * 0.25) * 5 * persp - Math.cos(d / 26 - t * 5) * k * 22;
      dot(g, x, y, (0.8 + z * 1.6) * (1 + k), `rgb(${s.acc} / ${0.12 + z * 0.3 + k * 0.45})`);
    }
  }
};

// E. Square grid where the cells the mouse passes over light up and fade.
const trail: Draw = (g, s) => {
  const S = s.wide ? 44 : 36;
  const cols = Math.ceil(s.w / S), rows = Math.ceil(s.h / S);
  let heat = s.mem.heat as Float32Array | undefined;
  if (!heat || heat.length !== cols * rows) heat = s.mem.heat = new Float32Array(cols * rows);
  const ci = Math.floor(s.m.x / S), ri = Math.floor(s.m.y / S);
  for (let i = 0; i < heat.length; i++) heat[i] *= 0.94;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const c = ci + dx, r = ri + dy;
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    const k = dx === 0 && dy === 0 ? 1 : 0.35;
    heat[r * cols + c] = Math.max(heat[r * cols + c], k);
  }
  g.lineWidth = 1;
  g.strokeStyle = `rgb(${s.ink} / 0.07)`;
  g.beginPath();
  for (let x = 0; x <= s.w; x += S) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, s.h); }
  for (let y = 0; y <= s.h; y += S) { g.moveTo(0, y + 0.5); g.lineTo(s.w, y + 0.5); }
  g.stroke();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = heat[r * cols + c];
    if (k < 0.02) continue;
    g.fillStyle = `rgb(${s.acc} / ${0.42 * k})`;
    g.fillRect(c * S + 1, r * S + 1, S - 1, S - 1);
  }
};

// F. Service icons floating in small cards; they float away from the mouse.
const ICONS: [string, string][] = [
  ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z", "#6e59d9"],
  ["M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12", "#f59e0b"],
  ["M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6", "#16a34a"],
  ["M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z", "#d946ef"],
  ["m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.76-.43L16 10.5M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z", "#ef4444"],
  ["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01", "#0ea5e9"],
  ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z", "#ec4899"],
  ["M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z", "#8b5cf6"],
  ["M4 4h16v12H4zM8 20h8M12 16v4", "#0f766e"],
  ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", "#25d366"],
];
// Where each icon sits, as a share of the hero's width and height (wide screens, text on the left).
const HOME_SIDE = [[0.5, 0.17], [0.64, 0.1], [0.79, 0.16], [0.93, 0.09], [0.97, 0.38], [0.96, 0.66], [0.89, 0.88], [0.73, 0.92], [0.57, 0.88], [0.46, 0.94]];
// Around the edges, for phones and the centred design.
const HOME_EDGE = [[0.08, 0.12], [0.3, 0.06], [0.7, 0.07], [0.92, 0.14], [0.95, 0.45], [0.92, 0.82], [0.68, 0.94], [0.32, 0.95], [0.07, 0.82], [0.05, 0.47]];
const icons: Draw = (g, s) => {
  const paths = (s.mem.paths as Path2D[]) ?? (s.mem.paths = ICONS.map(([d]) => new Path2D(d)));
  const home = s.wide && !s.center ? HOME_SIDE : HOME_EDGE;
  const n = s.wide ? ICONS.length : 7;
  const size = s.wide ? 58 : 46;
  for (let k = 0; k < n; k++) {
    const fx = home[k][0] * s.w + Math.sin(s.t * 0.9 + k) * 10;
    const fy = home[k][1] * s.h + Math.cos(s.t * 0.8 + k * 1.3) * 10;
    const dx = fx - s.m.x, dy = fy - s.m.y, d = Math.hypot(dx, dy) || 1;
    const push = Math.max(0, 1 - d / 190) * 70;
    const x = fx + (dx / d) * push, y = fy + (dy / d) * push;
    g.save();
    g.translate(x, y);
    g.rotate((Math.sin(s.t * 0.9 + k) * 6 + (dx / d) * push * 0.2) * (Math.PI / 180));
    g.shadowColor = "rgba(20,16,40,0.14)";
    g.shadowBlur = 24;
    g.shadowOffsetY = 10;
    g.fillStyle = "#fff";
    g.beginPath();
    g.roundRect(-size / 2, -size / 2, size, size, size * 0.3);
    g.fill();
    g.shadowColor = "transparent";
    g.strokeStyle = "rgba(20,16,40,0.06)";
    g.stroke();
    const sc = (size * 0.48) / 24;
    g.translate(-12 * sc, -12 * sc);
    g.scale(sc, sc);
    g.lineWidth = 2;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = ICONS[k][1];
    g.stroke(paths[k]);
    g.restore();
  }
};

// H. Faint grid; a round "torch" around the mouse shows colour and the services hidden underneath.
const WORDS = ["Websites", "AI automation", "Online stores", "SaaS software", "Google Ads", "Reels", "Apps", "SEO", "Branding", "Meta Ads", "Shopify", "Chatbots", "Video editing", "Social media", "Logo design", "WhatsApp bots"];
const torch: Draw = (g, s) => {
  const { m, w, h } = s;
  const R = s.wide ? 180 : 130, G = 48;
  const lines = (c: string) => {
    g.strokeStyle = c;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= w; x += G) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); }
    for (let y = 0; y <= h; y += G) { g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); }
    g.stroke();
  };
  lines(`rgb(${s.ink} / 0.06)`);
  g.save();
  g.beginPath();
  g.arc(m.x, m.y, R, 0, TAU);
  g.clip();
  const gr = g.createLinearGradient(m.x - R, m.y - R, m.x + R, m.y + R);
  gr.addColorStop(0, "rgb(196 181 253 / 0.4)");
  gr.addColorStop(0.5, "rgb(240 171 252 / 0.4)");
  gr.addColorStop(1, "rgb(147 197 253 / 0.4)");
  g.fillStyle = gr;
  g.fillRect(m.x - R, m.y - R, R * 2, R * 2);
  lines(`rgb(${s.acc} / 0.5)`);
  g.font = `600 ${s.wide ? 15 : 13}px Poppins, system-ui, sans-serif`;
  const colW = s.wide ? 190 : 150, rowH = s.wide ? 110 : 90;
  let i = 0;
  for (let y = 60, row = 0; y < h; y += rowH, row++) {
    for (let x = 30 + (row % 2) * (colW / 2); x < w; x += colW, i++) {
      if (Math.abs(x - m.x) > R + colW || Math.abs(y - m.y) > R + rowH) continue;
      const word = WORDS[(i + row * 3) % WORDS.length];
      const tw = g.measureText(word).width;
      g.fillStyle = "#fff";
      g.beginPath();
      g.roundRect(x - 13, y - 22, tw + 26, 34, 17);
      g.fill();
      g.fillStyle = `rgb(${s.acc})`;
      g.fillText(word, x, y);
    }
  }
  g.restore();
  const edge = g.createRadialGradient(m.x, m.y, R * 0.8, m.x, m.y, R + 2);
  edge.addColorStop(0, "rgba(255,255,255,0)");
  edge.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = edge;
  g.beginPath();
  g.arc(m.x, m.y, R + 2, 0, TAU);
  g.fill();
};

// I. A glossy liquid ball that wobbles and leans toward the mouse.
const orb: Draw = (g, s) => {
  const { m, t } = s;
  const side = s.wide && !s.center;
  const bx = side ? s.w * 0.74 : s.w * 0.5, by = side ? s.h * 0.5 : s.h * 0.45;
  // Next to the text it sits behind the picture on the right and glows around it.
  const R = side ? Math.min(s.h * 0.4, s.w * 0.23) : Math.min(s.w * 0.4, s.h * 0.26);
  const cx = bx + (m.x - bx) * 0.1, cy = by + (m.y - by) * 0.1;
  const toward = Math.atan2(m.y - cy, m.x - cx);
  const shape = () => {
    g.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU;
      const r = R * (1 + 0.09 * Math.sin(a * 3 + t * 1.2) + 0.06 * Math.cos(a * 5 - t * 2) + 0.05 * Math.sin(a * 2 + t * 2.4)) + Math.cos(a - toward) * R * 0.11;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
  };
  g.save();
  if (!side) g.globalAlpha = 0.28;
  shape();
  g.shadowColor = `rgb(${s.acc} / 0.5)`;
  g.shadowBlur = R * 0.5;
  const gr = g.createRadialGradient(cx - R * 0.4 + (m.x - cx) * 0.15, cy - R * 0.45 + (m.y - cy) * 0.15, R * 0.05, cx, cy, R * 1.25);
  gr.addColorStop(0, "#f5f3ff");
  gr.addColorStop(0.25, "#c4b5fd");
  gr.addColorStop(0.6, `rgb(${s.acc})`);
  gr.addColorStop(1, "#2a1b6b");
  g.fillStyle = gr;
  g.fill();
  g.shadowColor = "transparent";
  shape();
  g.clip();
  const sh = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  sh.addColorStop(0, "rgb(240 171 252 / 0)");
  sh.addColorStop(0.5 + 0.2 * Math.sin(t), "rgb(240 171 252 / 0.45)");
  sh.addColorStop(1, "rgb(94 200 255 / 0.28)");
  g.fillStyle = sh;
  g.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
  g.restore();
};

// G. Dotted map of India with lines going out from Jaipur to big cities; the map tilts toward the mouse.
const INDIA = [[68.2, 23.7], [70.1, 20.9], [72.6, 21.1], [72.8, 19.0], [73.4, 16.0], [74.6, 12.8], [76.2, 9.9], [77.5, 8.1], [78.2, 8.9], [79.3, 10.3], [80.3, 13.2], [80.2, 15.7], [82.3, 16.6], [84.8, 19.2], [86.9, 20.9], [88.0, 21.6], [89.0, 22.0], [88.6, 24.3], [88.2, 26.3], [89.9, 26.5], [92.0, 26.9], [95.2, 27.0], [97.0, 28.2], [95.5, 29.0], [92.5, 27.9], [88.8, 27.3], [88.1, 27.9], [84.0, 28.0], [81.0, 30.2], [79.0, 31.3], [78.7, 32.5], [79.5, 34.0], [78.0, 35.5], [76.0, 35.8], [74.0, 34.6], [73.8, 33.0], [74.5, 32.4], [73.9, 30.0], [72.0, 28.5], [70.5, 27.8], [69.5, 26.6], [70.6, 25.6], [68.8, 24.3]];
const CITIES: [string, number, number][] = [["Delhi", 77.2, 28.6], ["Mumbai", 72.9, 19.1], ["Bengaluru", 77.6, 13.0], ["Kolkata", 88.4, 22.6], ["Chennai", 80.3, 13.1], ["Hyderabad", 78.5, 17.4], ["Ahmedabad", 72.6, 23.0], ["Lucknow", 80.9, 26.8], ["Pune", 73.9, 18.5]];
const JAIPUR = [75.8, 26.9];
type IndiaMap = { px: (lon: number, lat: number) => [number, number]; dots: [number, number][]; scale: number };
const india: Draw = (g, s) => {
  const side = s.wide && !s.center;
  let map = s.mem.map as IndiaMap | undefined;
  if (!map) {
    const boxW = side ? s.w * 0.46 : s.w * 0.9, boxH = side ? s.h * 1.02 : s.h * 0.84;
    const scale = Math.min(boxW / 29, boxH / 28);
    const ox = (side ? s.w * 0.75 : s.w * 0.5) - 14.5 * scale, oy = s.h * 0.5 - 14 * scale;
    const px = (lon: number, lat: number): [number, number] => [ox + (lon - 68) * scale, oy + (36 - lat) * scale];
    const P = INDIA.map(([a, b]) => px(a, b));
    const inside = (x: number, y: number) => {
      let c = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const step = Math.max(7, scale * 0.6);
    const dots: [number, number][] = [];
    for (let x = ox; x < ox + 30 * scale; x += step) for (let y = oy; y < oy + 29 * scale; y += step) if (inside(x, y)) dots.push([x, y]);
    map = s.mem.map = { px, dots, scale };
  }
  const { m, t } = s;
  const [jx, jy] = map.px(JAIPUR[0], JAIPUR[1]);
  // A small shift toward the mouse makes the map feel tilted without a 3D transform.
  const sx = (m.x - jx) * 0.02, sy = (m.y - jy) * 0.02;
  g.save();
  if (!side) g.globalAlpha = 0.35;
  g.translate(sx, sy);
  const rad = map.scale * 0.11;
  for (const [x, y] of map.dots) {
    const k = Math.max(0, 1 - Math.hypot(x - m.x, y - m.y) / 130);
    dot(g, x, y, rad + k * 2, k > 0 ? `rgb(${s.acc} / ${0.45 + 0.55 * k})` : `rgb(${s.acc} / 0.28)`);
  }
  g.font = `600 ${s.wide ? 11 : 10}px Poppins, system-ui, sans-serif`;
  CITIES.forEach(([name, lon, lat], i) => {
    const [cx, cy] = map!.px(lon, lat);
    const mx = (jx + cx) / 2, my = (jy + cy) / 2 - Math.hypot(cx - jx, cy - jy) * 0.35;
    const q = (u: number): [number, number] => [(1 - u) * (1 - u) * jx + 2 * (1 - u) * u * mx + u * u * cx, (1 - u) * (1 - u) * jy + 2 * (1 - u) * u * my + u * u * cy];
    g.strokeStyle = `rgb(${s.acc} / 0.22)`;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(jx, jy);
    g.quadraticCurveTo(mx, my, cx, cy);
    g.stroke();
    const ph = (t * 0.45 + i * 0.11) % 1;
    const end = Math.min(1, ph * 1.6);
    g.strokeStyle = `rgb(${s.acc})`;
    g.lineWidth = 2.4;
    g.beginPath();
    for (let u = Math.max(0, end - 0.25), first = true; u <= end; u += 0.02, first = false) {
      const [x, y] = q(u);
      if (first) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    dot(g, cx, cy, 3.5 + (end >= 1 ? 2.5 * (1 - (ph * 1.6 - 1) / 0.6) : 0), "#d946ef");
    g.fillStyle = `rgb(${s.ink} / 0.7)`;
    g.fillText(name, cx + 7, cy + 4);
  });
  for (let r = 0; r < 3; r++) {
    const rr = (t * 0.6 + r / 3) % 1;
    g.beginPath();
    g.arc(jx, jy, 6 + rr * 26, 0, TAU);
    g.strokeStyle = `rgb(${s.acc} / ${0.5 * (1 - rr)})`;
    g.lineWidth = 2;
    g.stroke();
  }
  dot(g, jx, jy, 7, `rgb(${s.ink})`);
  dot(g, jx, jy, 3, "#fff");
  g.fillStyle = `rgb(${s.ink})`;
  g.beginPath();
  g.roundRect(jx - 84, jy - 34, 76, 24, 12);
  g.fill();
  g.font = "700 12px Poppins, system-ui, sans-serif";
  g.fillStyle = "#fff";
  g.fillText("Jaipur HQ", jx - 76, jy - 18);
  g.restore();
};

const DRAW: Partial<Record<HeroBg, Draw>> = { aurora, wave, trail, icons, torch, orb, india };
