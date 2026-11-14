"use client";

import { useEffect, useState } from "react";

const COLORS = ["#ede9fe", "#f5d0fe", "#e0f2fe", "#ddd6fe", "#fce7f3", "#ede9fe"];

// The hero's soft colour swirl. It used to be a huge layer with a CSS blur, which the graphics chip had to
// redraw while it turned (and under the frosted navbar) — the main reason the hero stuttered when scrolling.
// Now the swirl is painted once into a tiny 64×64 picture; stretched over the hero, the browser's own smoothing
// makes it just as soft, and turning a plain picture costs almost nothing.
export default function SoftSwirl({ cx }: { cx: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      if (!g || !("createConicGradient" in g)) return;
      const x = (parseFloat(cx) / 100) * 64 || 32;
      const grad = g.createConicGradient(0, x, 64 * 0.55);
      COLORS.forEach((col, i) => grad.addColorStop(i / (COLORS.length - 1), col));
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      // A little blur inside the tiny picture, so the seam of the swirl disappears.
      g.filter = "blur(6px)";
      g.drawImage(c, 0, 0);
      setSrc(c.toDataURL("image/png"));
    } catch {
      /* the soft fallback below stays */
    }
  }, [cx]);
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-[25%] overflow-hidden">
      <div
        className="hp-spin absolute inset-0"
        style={
          src
            ? { backgroundImage: `url(${src})`, backgroundSize: "100% 100%" }
            : { background: `radial-gradient(40% 40% at ${cx} 40%, #f5d0fe, transparent 70%), radial-gradient(45% 45% at 30% 70%, #e0f2fe, transparent 70%), radial-gradient(50% 50% at 70% 75%, #fce7f3, transparent 70%), #ede9fe` }
        }
      />
    </div>
  );
}
