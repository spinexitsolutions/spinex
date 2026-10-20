"use client";

import { useEffect, useRef } from "react";
import { useContent } from "./ContentProvider";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        resolve();
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Cloudflare Turnstile. Usually invisible; shows a small check only when a visitor looks suspicious.
// Renders nothing until a site key is set in Admin → API keys (or NEXT_PUBLIC_TURNSTILE_SITE_KEY).
export default function HumanCheck({ onToken }: { onToken: (token: string) => void }) {
  const { turnstileKey } = useContent();
  const SITE_KEY = turnstileKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !box.current || !window.turnstile) return;
      id = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(""),
        "error-callback": () => cb.current(""),
      });
    });
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [SITE_KEY]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="mt-4 empty:hidden" />;
}
