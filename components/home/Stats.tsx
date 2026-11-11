"use client";

import Counter from "../CountUp";
import { useContent } from "../ContentProvider";

export default function Stats({ dark = false }: { dark?: boolean }) {
  const { content } = useContent();
  return (
    <section className={dark ? "bg-ink py-20 text-white" : "bg-white py-20"}>
      <div className="container-x grid grid-cols-2 gap-y-12 lg:grid-cols-4">
        {content.stats.map((s) => (
          <div key={s.id} className={`border-l pl-6 ${dark ? "border-white/15" : "border-line"}`}>
            <p className="h-display text-5xl sm:text-6xl"><Counter value={s.value} /></p>
            <p className={`mt-3 ${dark ? "text-white/55" : "text-muted"}`}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
