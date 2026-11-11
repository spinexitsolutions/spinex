"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { useContent } from "@/components/ContentProvider";
import { introSettings } from "@/components/Intro";

// Runs again on every page change. The very first page of a visit has the intro instead, so it only fades in.
// Decided in the browser only, so the server and the browser draw the same first frame.
let navigated = false;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const ease: [number, number, number, number] = [0.76, 0, 0.24, 1];

// Transition between pages (Admin → Intro animation → Between pages). The overlay sits on top of the new
// page and moves away; the page itself is never moved, so fixed and sticky parts keep working.
export default function Template({ children }: { children: React.ReactNode }) {
  const { content } = useContent();
  const cfg = introSettings(content.intro);
  const [kind, setKind] = useState<string>("fade");
  // Before the new page is painted: page changes get the chosen transition, the first page doesn't.
  useIsoLayoutEffect(() => {
    if (navigated && window.self === window.top) setKind(cfg.pageTransition); // none inside the admin live preview
    navigated = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bg = cfg.background || "rgb(var(--c-ink))";
  const accent = cfg.accent || "rgb(var(--c-lav-400))";
  return (
    <>
      <motion.div initial={{ opacity: kind === "none" ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: kind === "fade" ? 0.25 : 0.15, ease: "easeOut" }}>
        {children}
      </motion.div>
      {kind === "curtain" && (
        <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[90]" style={{ background: bg }}
          initial={{ clipPath: "inset(0 0 0% 0)" }} animate={{ clipPath: "inset(0 0 100% 0)" }} transition={{ duration: 0.7, ease, delay: 0.05 }}>
          <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: accent }} />
        </motion.div>
      )}
      {kind === "wipe" && (
        <>
          <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[90]" style={{ background: accent }}
            initial={{ clipPath: "inset(0 0% 0 0)" }} animate={{ clipPath: "inset(0 0 0 100%)" }} transition={{ duration: 0.75, ease, delay: 0.12 }} />
          <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[91]" style={{ background: bg }}
            initial={{ clipPath: "inset(0 0% 0 0)" }} animate={{ clipPath: "inset(0 0 0 100%)" }} transition={{ duration: 0.65, ease }} />
        </>
      )}
      {kind === "logo" && (
        <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[90] grid place-items-center" style={{ background: bg }}
          initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.45, delay: 0.45, ease: "easeOut" }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} className="flex items-center gap-3">
            {cfg.showLogo && content.brand.logo && <img src={content.brand.logo} alt="" className="h-12 w-12 object-contain" />}
            <span className="font-display text-3xl font-semibold" style={{ color: cfg.text || "#fff" }}>{cfg.title}</span>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
