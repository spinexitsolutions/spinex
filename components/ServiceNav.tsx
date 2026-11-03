"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContent } from "./ContentProvider";

// Sticky row of service chips on the Services page; highlights the one on screen.
// A solid floating pill that moves up when the site menu hides, so nothing shows through above it.
export default function ServiceNav() {
  const { content } = useContent();
  const [current, setCurrent] = useState(content.services[0]?.id);
  const [menuHidden, setMenuHidden] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });
  const row = useRef<HTMLUListElement>(null);
  const { scrollY } = useScroll();

  // Same rule as the site menu (Navbar): it hides when scrolling down past 240 px.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setMenuHidden(y > prev && y > 240);
  });

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setCurrent(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    content.services.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => {
      obs.disconnect();
    };
  }, [content.services]);

  // Show fades/arrows only where more chips are hidden.
  const measure = () => {
    const el = row.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Keep the highlighted chip in view.
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>(`[data-chip="${current}"]`);
    const box = row.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [current]);

  const nudge = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.6, behavior: "smooth" });

  return (
    <div
      className={`sticky z-30 px-3 py-2 transition-[top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${menuHidden ? "top-2" : "top-[80px] sm:top-[84px]"}`}
      data-service-nav
    >
      <nav aria-label="Services on this page" className="relative mx-auto max-w-[1080px] rounded-full border border-line bg-white/95 p-1.5 shadow-[0_12px_40px_-18px_rgba(18,15,27,0.35)] backdrop-blur-xl">
        {edges.left && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-1.5 left-1.5 z-10 w-12 rounded-l-full bg-gradient-to-r from-white to-transparent" />
            <button type="button" onClick={() => nudge(-1)} aria-label="Previous services" className="absolute left-1.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow ring-1 ring-line hover:bg-mist md:grid">
              <ChevronLeft size={18} />
            </button>
          </>
        )}
        <ul ref={row} onScroll={measure} className="flex gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] md:px-1 [&::-webkit-scrollbar]:hidden">
          {content.services.map((s) => {
            const on = s.id === current;
            return (
              <li key={s.id} className="shrink-0" data-chip={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrent(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-current={on ? "true" : undefined}
                  className="relative flex min-h-10 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium sm:min-h-11 sm:px-4 sm:text-sm"
                >
                  {on && <motion.span layoutId="service-nav" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                  <span className={`relative ${on ? "text-white" : "text-muted hover:text-ink"}`}>{s.title}</span>
                </a>
              </li>
            );
          })}
        </ul>
        {edges.right && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-1.5 right-1.5 z-10 w-12 rounded-r-full bg-gradient-to-l from-white to-transparent" />
            <button type="button" onClick={() => nudge(1)} aria-label="More services" className="absolute right-1.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow ring-1 ring-line hover:bg-mist md:grid">
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
