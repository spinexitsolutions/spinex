"use client";

import { useContent } from "../ContentProvider";

export default function Marquee() {
  const { content } = useContent();
  const tools = content.sections.tools;
  if (!tools.length) return null;
  const row = [...tools, ...tools];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-ink py-6 text-white">
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap hover:[animation-play-state:paused]">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-12 font-display text-2xl font-medium text-white/70">
            {t}
            <span className="h-1.5 w-1.5 rotate-45 bg-lav-400" />
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink" />
    </div>
  );
}
