"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { useContent } from "../ContentProvider";

// Splits "4.9", "1,200+", "₹10L" into prefix, number and suffix. Returns null when there's no
// single number to count ("All India", "Free", "24/7").
function parse(value: string) {
  const m = value.match(/^(\D*?)(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d+(?:\.\d+)?)(.*)$/);
  if (!m || m[3].startsWith("/")) return null;
  const [, pre, raw, post] = m;
  const decimals = raw.split(".")[1]?.length ?? 0;
  const grouped = raw.includes(",");
  // "12,00,000" uses Indian grouping; "1,200" / "1,200,000" use international grouping.
  const fmt = new Intl.NumberFormat(/\d,\d{2},/.test(raw) ? "en-IN" : "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped });
  return { pre, post, target: parseFloat(raw.replace(/,/g, "")), format: (v: number) => `${pre}${fmt.format(v)}${post}` };
}

function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [shown, setShown] = useState(() => parse(value)?.format(0) ?? value);

  useEffect(() => {
    const p = parse(value);
    if (!p) {
      setShown(value);
      return;
    }
    if (!inView) return;
    const c = animate(0, p.target, { duration: 1.8, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(p.format(v)), onComplete: () => setShown(value) });
    return () => c.stop();
  }, [inView, value]);

  return <span ref={ref}>{shown}</span>;
}

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
