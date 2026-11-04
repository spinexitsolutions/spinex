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
    let lastRun = 0;
    const tick = async () => {
      // In a background tab it still checks once a minute, so a new-lead alert can reach you.
      if (busy || (document.visibilityState !== "visible" && Date.now() - lastRun < 55000)) return;
      busy = true;
      lastRun = Date.now();
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

// New-lead alert: a short "ding" and a browser notification when a new lead arrives while the admin is open.
// On/off is remembered on this computer (on by default; the notification needs the browser's permission).
export const LEAD_ALERT_KEY = "spinex-lead-alert";
export const leadAlertOn = () => {
  try { return localStorage.getItem(LEAD_ALERT_KEY) !== "off"; } catch { return true; }
};
export function ding() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const note = (freq: number, at: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.45);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.5);
    };
    note(880, 0);
    note(1320, 0.16);
    setTimeout(() => ctx.close().catch(() => undefined), 1200);
  } catch {
    // no sound on this device
  }
}
export function useLeadAlert(badges: Badges, onOpen: () => void) {
  const last = useRef<string | null>(null);
  const open = useRef(onOpen);
  open.current = onOpen;
  const stamp = badges.leads?.stamp;
  useEffect(() => {
    if (!stamp) return;
    const newest = stamp.split("|")[2] || "";
    const prev = last.current;
    last.current = newest;
    if (prev === null || !newest || newest === prev || !leadAlertOn()) return;
    // A lead you just added yourself doesn't ring.
    const self = (window as Window & { __spxSelfLead?: number }).__spxSelfLead ?? 0;
    if (Date.now() - self < 60000) return;
    ding();
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification("New lead on Spinex", { body: "Someone just sent an enquiry. Tap to open Leads.", icon: "/api/brand-icon?size=192&pad=12", tag: "spinex-lead" });
        n.onclick = () => { window.focus(); open.current(); n.close(); };
      }
    } catch {
      // notifications not available
    }
  }, [stamp]);
}
