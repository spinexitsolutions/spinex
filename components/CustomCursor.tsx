"use client";

import { useEffect, useRef, useState } from "react";
import { BUTTON_HOVERS, BUTTON_STYLES, CURSOR_STYLES, CURSOR_TRAILS, defaultCursor, type CursorSettings, type SiteContent } from "@/lib/content";
import CursorTrail from "./CursorTrail";
import { useIntroDone } from "./Intro";
import { useContent } from "./ContentProvider";
import { sized } from "@/lib/img";

export function cursorSettings(raw: Partial<CursorSettings> | undefined): CursorSettings {
  const v = { ...defaultCursor, ...(raw ?? {}) };
  return {
    enabled: v.enabled !== false,
    style: (CURSOR_STYLES as readonly string[]).includes(v.style) ? v.style : defaultCursor.style,
    color: typeof v.color === "string" && /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : "",
    admin: !!v.admin,
    trail: v.trail && (CURSOR_TRAILS as readonly string[]).includes(v.trail) ? v.trail : "none",
    btnStyle: v.btnStyle && (BUTTON_STYLES as readonly string[]).includes(v.btnStyle) ? v.btnStyle : "default",
    btnHover: v.btnHover && (BUTTON_HOVERS as readonly string[]).includes(v.btnHover) ? v.btnHover : "default",
  };
}

// Things the cursor grows over, and fields where the normal text cursor is kept.
const HOVER = "a, button, [role='button'], label, summary, select, [data-cursor]";
const TEXT = "input:not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']):not([type='range']):not([type='color']), textarea, [contenteditable='true']";
const DESKTOP = "(hover: hover) and (pointer: fine)";

// Custom mouse cursor. Only on computers with a mouse or trackpad: phones and tablets never get it
// (no hover, coarse pointer), and it hides itself if a touch or pen is used. Off for "reduce motion".
export default function CustomCursor({ cfg: raw }: { cfg?: Partial<CursorSettings> }) {
  const cfg = cursorSettings(raw);
  const [desktop, setDesktop] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => setDesktop(mq.matches && !reduced.matches);
    check();
    mq.addEventListener("change", check);
    reduced.addEventListener("change", check);
    return () => { mq.removeEventListener("change", check); reduced.removeEventListener("change", check); };
  }, []);

  const on = cfg.enabled && desktop;

  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.classList.add("custom-cursor");
    const target = { x: -100, y: -100 };
    const trail = { x: -100, y: -100 };
    let state = { shown: false, hover: false, text: false, down: false };
    let raf = 0;
    const lag = cfg.style === "ring" ? 0.18 : cfg.style === "glow" ? 0.12 : 0.28;

    const paint = () => {
      const d = dot.current, r = ring.current;
      trail.x += (target.x - trail.x) * lag;
      trail.y += (target.y - trail.y) * lag;
      const visible = state.shown && !state.text;
      const single = cfg.style === "dot" || cfg.style === "blend";
      if (d) {
        const p = single ? trail : target;
        d.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        d.style.opacity = visible ? "1" : "0";
        d.dataset.hover = state.hover ? "1" : "";
        d.dataset.down = state.down ? "1" : "";
      }
      if (r) {
        r.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;
        r.style.opacity = visible ? "1" : "0";
        r.dataset.hover = state.hover ? "1" : "";
        r.dataset.down = state.down ? "1" : "";
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    const move = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") { state = { ...state, shown: false }; root.classList.remove("custom-cursor"); return; }
      root.classList.add("custom-cursor");
      if (!state.shown) { trail.x = e.clientX; trail.y = e.clientY; }
      target.x = e.clientX; target.y = e.clientY;
      const el = e.target instanceof Element ? e.target : null;
      state = { ...state, shown: true, hover: !!el?.closest(HOVER), text: !!el?.closest(TEXT) };
    };
    const leave = (e: MouseEvent) => { if (!e.relatedTarget) state = { ...state, shown: false }; };
    const down = () => { state = { ...state, down: true }; };
    const up = () => { state = { ...state, down: false }; };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("mouseout", leave);
    window.addEventListener("blur", up);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseout", leave);
      window.removeEventListener("blur", up);
    };
  }, [on, cfg.style]);

  if (!on) return null;
  return <CursorMarks style={cfg.style} color={cfg.color} dotRef={dot} ringRef={ring} />;
}

// The drawn parts. Also used, standing still, in the admin preview.
export function CursorMarks({ style, color, dotRef, ringRef, still }: {
  style: CursorSettings["style"]; color: string; still?: boolean;
  dotRef?: React.Ref<HTMLDivElement>; ringRef?: React.Ref<HTMLDivElement>;
}) {
  const c = color || "rgb(var(--c-lav-500))";
  const pos = still ? "absolute left-1/2 top-1/2" : "fixed left-0 top-0";
  const base = still ? `${pos} pointer-events-none` : `${pos} pointer-events-none z-[2147483000] will-change-transform`;
  return (
    <div aria-hidden data-cursor-style={style} className="spx-cursor" style={{ ["--cur" as string]: c }}>
      {style !== "blend" && style !== "dot" && <div ref={ringRef} className={`${base} spx-cursor-${style}`} />}
      <div ref={dotRef} className={`${base} spx-cursor-${style}-dot`} />
    </div>
  );
}

// Website: reads the setting saved in Admin → Intro & cursor.
export function SiteCursor() {
  const { content } = useContent();
  return (
    <>
      <CustomCursor cfg={content.cursor} />
      <SiteTrail content={content} />
    </>
  );
}

// What the cursor trails show: pictures of your products and projects, your service names, your brand name.
export function trailData(content: SiteContent) {
  const images = [
    ...content.products.filter((p) => p.name && p.image && p.home !== "hide").map((p) => p.image),
    ...content.projects.filter((p) => p.image && p.home !== "hide").map((p) => p.image),
  ].map((src) => sized(src, 400));
  return {
    images: Array.from(new Set(images)),
    words: content.services.map((s) => s.title).filter(Boolean),
    brand: (content.brand.name || "Spinex").split(/\s+/)[0],
  };
}

export function SiteTrail({ content, area, kind }: { content: SiteContent; area?: React.RefObject<HTMLElement | null>; kind?: CursorSettings["trail"] }) {
  const cfg = cursorSettings(content.cursor);
  const d = trailData(content);
  const introDone = useIntroDone(); // no trail while the Spinex intro animation is playing
  return <CursorTrail kind={introDone ? kind ?? cfg.trail : "none"} images={d.images} words={d.words} brand={d.brand} area={area} />;
}
