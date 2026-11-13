"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

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

// Counts a stat like "120+" or "4.9" up from 0 when it scrolls into view; text without a number shows as is.
// The in-view margin is top/bottom only: a side margin would never "see" a short number near the
// screen edge on phones (it stayed at 0).
export default function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
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
