"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Next.js handles scroll position on navigation (top for new pages, restored on back/forward);
// Lenis follows native scroll events, so it needs no reset here.
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
  }, []);

  return <>{children}</>;
}
