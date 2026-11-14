"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Next.js handles scroll position on navigation (top for new pages, restored on back/forward);
// Lenis follows native scroll events, so it needs no reset here.
// Off unless switched on in Admin → Site settings → Page transitions ("Extra-smooth scrolling on computers").
export default function SmoothScroll({ children, enabled = false }: { children: React.ReactNode; enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Phones and tablets scroll with the finger natively (smooth and handled off the main thread). Lenis only
    // smooths the mouse wheel, and its touch listeners could make finger scrolling wait for the page's scripts,
    // so it isn't started on touch screens at all.
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const lenis = new Lenis({ lerp: 0.14, smoothWheel: true, wheelMultiplier: 1 });
    let id = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, [enabled]);

  return <>{children}</>;
}
