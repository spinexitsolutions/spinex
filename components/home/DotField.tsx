"use client";

import { useEffect, useRef } from "react";

// Dot grid that bends away from the cursor and lights up around it.
export default function DotField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gap = 26;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let w = 0, h = 0, raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let visible = true;
    let running = false;

    // Theme colours are CSS variables ("R G B"), read on every paint so a theme change recolours the dots.
    const themeVar = (name: string, fallback: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    const paint = () => {
      const accent = themeVar("--c-lav-600", "110 89 217");
      const base = themeVar("--c-ink", "18 15 27");
      ctx.clearRect(0, 0, w, h);
      for (let x = gap / 2; x < w; x += gap) {
        for (let y = gap / 2; y < h; y += gap) {
          const dx = x - mouse.x, dy = y - mouse.y;
          const d = Math.hypot(dx, dy);
          const f = d < 150 ? 1 - d / 150 : 0;
          const px = x + (dx / (d || 1)) * f * 14;
          const py = y + (dy / (d || 1)) * f * 14;
          ctx.fillStyle = f > 0 ? `rgb(${accent} / ${0.16 + f * 0.7})` : `rgb(${base} / 0.1)`;
          ctx.beginPath();
          ctx.arc(px, py, 1.1 + f * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Runs only while the dots are still easing toward the mouse, then stops.
    const tick = () => {
      mouse.x += (mouse.tx - mouse.x) * 0.15;
      mouse.y += (mouse.ty - mouse.y) * 0.15;
      paint();
      const settled = Math.abs(mouse.tx - mouse.x) < 0.5 && Math.abs(mouse.ty - mouse.y) < 0.5;
      if (settled || !visible || reduced) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running || !visible || reduced) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const move = (e: PointerEvent) => {
      if (!visible) return;
      const r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left;
      mouse.ty = e.clientY - r.top;
      if (mouse.x < -5000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
      start();
    };
    const leave = () => { mouse.tx = -9999; mouse.ty = -9999; mouse.x = -9999; mouse.y = -9999; paint(); };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const onResize = () => { resize(); paint(); };
    resize();
    paint();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
