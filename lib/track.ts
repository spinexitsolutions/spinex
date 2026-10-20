// Sends a conversion event to Google Analytics (and Clarity tags) when they're set up. Safe to call anytime.
type Win = Window & { gtag?: (...a: unknown[]) => void; clarity?: (...a: unknown[]) => void };

export function track(event: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const w = window as Win;
  w.gtag?.("event", event, params);
  w.clarity?.("event", event);
}
