"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type Badges = Record<string, { count: number; stamp: string }>;
const LiveContext = createContext<Badges>({});
export const LiveProvider = LiveContext.Provider;

// Asks the server every 20 seconds (while the tab is visible) what is waiting in each section.
export function useBadges(enabled: boolean) {
  const [badges, setBadges] = useState<Badges>({});
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/admin/badges", { cache: "no-store" });
        if (r.ok && !stop) setBadges(await r.json());
      } catch {
        // offline for a moment: try again next time
      }
    };
    tick();
    const t = setInterval(tick, 20000);
    const onShow = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onShow); window.removeEventListener("focus", onShow); };
  }, [enabled]);
  // Zero a section's number at once (it was just opened); the next check brings the real numbers.
  const clear = (key: string) => setBadges((b) => (b[key]?.count ? { ...b, [key]: { ...b[key], count: 0 } } : b));
  return { badges, clear };
}

// Reloads a section's data quietly when something in it changes (a new lead, a reply, a booking…).
export function useLive(key: string, reload: (opts: { silent: true }) => unknown) {
  const stamp = useContext(LiveContext)[key]?.stamp;
  const last = useRef<string | undefined>(undefined);
  const fn = useRef(reload);
  fn.current = reload;
  useEffect(() => {
    if (stamp === undefined) return;
    if (last.current !== undefined && last.current !== stamp) fn.current({ silent: true });
    last.current = stamp;
  }, [stamp]);
}
