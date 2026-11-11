"use client";

import { useEffect } from "react";

const BTN = ".btn-dark, .btn-light, .btn-ghost, .btn-ghost-dark";
const NEEDS_MOUSE = new Set(["follow", "spotlight", "holo", "magnet"]);
const COLOURS = ["#8b7bff", "#d946ef", "#38bdf8", "#f59e0b"];

// Helps the button hover effects in app/button-fx.css that need to know where the mouse is:
// "follow" (fill starts where the mouse came in), "spotlight", "holo" and "magnet". "spark" throws
// small stars out of the button. One set of listeners for the whole page; it reads the effect from
// the nearest [data-btn-hover] so the admin preview can use a different one.
export default function ButtonFx() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fx = (b: Element) => b.closest("[data-btn-hover]")?.getAttribute("data-btn-hover") || "default";

    const place = (b: HTMLElement, e: PointerEvent) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      b.style.setProperty("--mx", `${x}px`);
      b.style.setProperty("--my", `${y}px`);
      b.style.setProperty("--mxp", `${(x / r.width) * 100}%`);
      b.style.setProperty("--tx", `${(x - r.width / 2) * 0.15}px`);
      b.style.setProperty("--ty", `${(y - r.height / 2) * 0.25}px`);
    };

    const sparks = (b: HTMLElement) => {
      if (reduced) return;
      const r = b.getBoundingClientRect();
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const s = document.createElement("span");
        s.className = "spx-spark";
        s.style.left = `${r.left + r.width / 2 + (Math.cos(a) * r.width) / 2}px`;
        s.style.top = `${r.top + r.height / 2 + (Math.sin(a) * r.height) / 2}px`;
        const size = 6 + (k % 3) * 3;
        s.innerHTML = `<svg viewBox="0 0 10 10" width="${size}" height="${size}"><path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8z" fill="${COLOURS[k % 4]}"/></svg>`;
        document.body.appendChild(s);
        const dx = Math.cos(a), dy = Math.sin(a);
        s.animate(
          [
            { transform: "translate(-50%,-50%) scale(0)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx * 36}px),calc(-50% + ${dy * 26}px)) scale(1.2) rotate(90deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(calc(-50% + ${dx * 58}px),calc(-50% + ${dy * 42 + 10}px)) scale(0) rotate(180deg)`, opacity: 0 },
          ],
          { duration: 800, easing: "cubic-bezier(.2,.8,.3,1)" },
        ).onfinish = () => s.remove();
      }
    };

    // pointerover/out bubble, so we can tell when the mouse enters or leaves a button.
    const over = (e: PointerEvent) => {
      const b = (e.target as Element | null)?.closest?.(BTN) as HTMLElement | null;
      if (!b || (e.relatedTarget instanceof Node && b.contains(e.relatedTarget))) return;
      const kind = fx(b);
      if (NEEDS_MOUSE.has(kind)) place(b, e);
      if (kind === "spark") sparks(b);
    };
    const out = (e: PointerEvent) => {
      const b = (e.target as Element | null)?.closest?.(BTN) as HTMLElement | null;
      if (!b || (e.relatedTarget instanceof Node && b.contains(e.relatedTarget))) return;
      if (fx(b) === "follow") place(b, e);
    };
    const move = (e: PointerEvent) => {
      const b = (e.target as Element | null)?.closest?.(BTN) as HTMLElement | null;
      if (b && NEEDS_MOUSE.has(fx(b)) && fx(b) !== "follow") place(b, e);
    };
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerout", out, { passive: true });
    document.addEventListener("pointermove", move, { passive: true });
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointermove", move);
    };
  }, []);
  return null;
}
