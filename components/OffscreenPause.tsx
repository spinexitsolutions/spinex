"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Marks page sections that are off screen with data-offscreen, so CSS pauses their endless animations
// (services cards, rotating button borders, the hero background, the tools strip). Saves a lot of work on phones.
export default function OffscreenPause() {
  const path = usePathname();
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? e.target.removeAttribute("data-offscreen") : e.target.setAttribute("data-offscreen", ""))),
      { rootMargin: "200px 0px" },
    );
    const watch = () => document.querySelectorAll("main section, footer").forEach((el) => io.observe(el));
    watch();
    // Sections that appear later (client-side content) are picked up too.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => ((queued = 0), watch()));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const stop = setTimeout(() => mo.disconnect(), 8000);
    return () => {
      clearTimeout(stop);
      cancelAnimationFrame(queued);
      mo.disconnect();
      io.disconnect();
    };
  }, [path]);
  return null;
}
