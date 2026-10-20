"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useContent } from "./ContentProvider";

// Sticky row of service chips on the Services page; highlights the one on screen.
export default function ServiceNav() {
  const { content } = useContent();
  const [current, setCurrent] = useState(content.services[0]?.id);

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

  return (
    <div className="sticky top-[84px] z-30 bg-white/85 py-3 backdrop-blur-xl">
      <nav aria-label="Services on this page" className="container-x">
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {content.services.map((s) => {
            const on = s.id === current;
            return (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-current={on ? "true" : undefined}
                  className="relative flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
                >
                  {on && <motion.span layoutId="service-nav" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                  <span className={`relative ${on ? "text-white" : "text-muted hover:text-ink"}`}>{s.title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
