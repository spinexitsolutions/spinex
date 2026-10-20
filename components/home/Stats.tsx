"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { useContent } from "../ContentProvider";

function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const [shown, setShown] = useState(match && !match[3].startsWith("/") ? `${match[1]}0${match[3]}` : value);

  useEffect(() => {
    if (!inView || !match) return;
    const [, pre, num, post] = match;
    // "24/7" style values have no single number to count; show as-is.
    if (post.startsWith("/")) {
      setShown(value);
      return;
    }
    const c = animate(0, parseFloat(num), { duration: 1.8, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(`${pre}${Math.round(v)}${post}`) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
