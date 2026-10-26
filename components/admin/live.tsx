"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type Badges = Record<string, { count: number; stamp: string }>;
const LiveContext = createContext<Badges>({});
export const LiveProvider = LiveContext.Provider;

// Asks the server every 20 seconds (while the tab is visible) what's new in each section.
// It also tells the server which section is open, so that section counts as seen.
export function useBadges(enabled: boolean, open: string) {
  const [badges, setBadges] = useState<Badges>({});
  const openRef = useRef(open);
  openRef.current = open;
  const tickRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const r = await fetch(`/api/admin/badges?open=${encodeURIComponent(openRef.current)}`, { cache: "no-store" });
        if (r.ok && !stop) setBadges(await r.json());
      } catch {
        // offline for a moment: try again next time
      } finally {
        busy = false;
      }
    };
    tickRef.current = tick;
    tick();
    const t = setInterval(tick, 20000);
    const onShow = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [enabled]);
  // Opening a section: its number goes at once, and the server notes it as seen.
  useEffect(() => {
    setBadges((b) => (b[open]?.count ? { ...b, [open]: { ...b[open], count: 0 } } : b));
    if (enabled) tickRef.current();
  }, [open, enabled]);
  return badges;
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
