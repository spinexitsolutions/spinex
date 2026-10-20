"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { ease } from "./Reveal";

const SEEN_KEY = "spinex-intro-seen";
const IntroContext = createContext(true);

// True once the intro loader has finished (or was skipped). Hero waits for this.
export const useIntroDone = () => useContext(IntroContext);

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = true;
    try {
      seen = !!sessionStorage.getItem(SEEN_KEY);
    } catch {
      // Storage blocked: skip the intro rather than replay it on every page.
    }
    if (seen || reduced) {
      setShow(false);
      setDone(true);
      return;
    }
    document.documentElement.style.overflow = "hidden";
    const c = animate(0, 100, {
      duration: 1.3,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setCount(Math.round(v)),
      onComplete: () => {
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          // ignore: storage unavailable
        }
        setShow(false);
      },
    });
    return () => {
      c.stop();
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <IntroContext.Provider value={done}>
      {children}
      <AnimatePresence
        onExitComplete={() => {
          document.documentElement.style.overflow = "";
          setDone(true);
        }}
      >
        {show && (
          <motion.div
            key="intro"
            data-lenis-prevent
            className="fixed inset-0 z-[100] flex flex-col justify-between bg-ink p-6 text-white sm:p-10"
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.8, ease }}
            aria-hidden
          >
            <div className="flex justify-between text-sm text-white/55">
              <span>Spinex IT Solutions</span>
              <span>Jaipur</span>
            </div>
            <div className="overflow-hidden">
              <motion.p
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.8, ease }}
                className="font-display text-[22vw] font-bold leading-[0.85] tracking-tightest sm:text-[16vw]"
              >
                {count}
                <span className="text-lav-400">%</span>
              </motion.p>
            </div>
            <div className="h-[2px] w-full overflow-hidden bg-white/10">
              <div className="h-full bg-lav-400" style={{ width: `${count}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </IntroContext.Provider>
  );
}
