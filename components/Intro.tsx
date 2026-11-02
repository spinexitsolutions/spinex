"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useContent } from "./ContentProvider";
import IntroAnimation from "./intro/IntroAnimation";
import { INTRO_STYLES, PAGE_TRANSITIONS, defaultIntro, type IntroSettings } from "@/lib/content";

const SEEN_KEY = "spinex-intro-seen";
// This page load's decision (play the intro or not), and whether it has finished.
let decision: boolean | null = null;
let finished = false;
const IntroContext = createContext(true);
// Layout effect on the client so the decision lands before the first paint after hydration.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Lock page scroll while the intro plays, padding the scrollbar's width so nothing shifts sideways.
function lockScroll() {
  const root = document.documentElement;
  const bar = window.innerWidth - root.clientWidth;
  root.style.overflow = "hidden";
  if (bar > 0) root.style.paddingRight = `${bar}px`;
}
function unlockScroll() {
  const root = document.documentElement;
  root.style.overflow = "";
  root.style.paddingRight = "";
}

// Saved settings with anything unknown replaced by the default, so a bad value can never break the page.
export function introSettings(raw: Partial<IntroSettings> | undefined): IntroSettings {
  const v = { ...defaultIntro, ...(raw ?? {}) };
  const color = (c: unknown) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : "");
  return {
    ...v,
    enabled: v.enabled !== false,
    style: (INTRO_STYLES as readonly string[]).includes(v.style) ? v.style : defaultIntro.style,
    pageTransition: (PAGE_TRANSITIONS as readonly string[]).includes(v.pageTransition) ? v.pageTransition : defaultIntro.pageTransition,
    when: v.when === "always" ? "always" : "session",
    pages: v.pages === "home" ? "home" : "all",
    speed: v.speed === "fast" || v.speed === "slow" ? v.speed : "normal",
    title: String(v.title ?? "").slice(0, 60),
    tagline: String(v.tagline ?? "").slice(0, 80),
    cornerLeft: String(v.cornerLeft ?? "").slice(0, 60),
    cornerRight: String(v.cornerRight ?? "").slice(0, 60),
    background: color(v.background),
    accent: color(v.accent),
    text: color(v.text),
    showLogo: v.showLogo !== false,
    admin: !!v.admin,
  };
}

// Should the intro play on this page load? Same rules on the server-sent cover script and in React.
function shouldPlay(cfg: IntroSettings, path: string, seen: boolean, reduced: boolean) {
  if (!cfg.enabled || reduced) return false;
  if (cfg.pages === "home" && path !== "/") return false;
  if (cfg.when === "session" && seen) return false;
  return true;
}

// Plain screen in the intro's colour, sent with the page HTML and shown by a tiny script before the page is painted,
// so a visitor never sees the page flash before the intro starts. Hidden by default (returning visitors, reduced
// motion, no JavaScript). The animated intro takes over from it.
const COVER_ID = "intro-cover";
export function IntroCover({ cfg: raw }: { cfg?: Partial<IntroSettings> }) {
  const cfg = introSettings(raw);
  const rules = JSON.stringify({ enabled: cfg.enabled, pages: cfg.pages, when: cfg.when });
  const script = `(function(){try{var r=${rules};if(!r.enabled)return;if(r.pages==="home"&&location.pathname!=="/")return;if(r.when==="session"&&sessionStorage.getItem("${SEEN_KEY}"))return;if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;var c=document.getElementById("${COVER_ID}");if(c)c.style.display="block"}catch(e){}})()`;
  return (
    <>
      <div id={COVER_ID} suppressHydrationWarning aria-hidden style={{ display: "none", background: cfg.background || "rgb(var(--c-ink))" }} className="fixed inset-0 z-[99]" />
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}

const hideCover = () => {
  const c = document.getElementById(COVER_ID);
  if (c) c.style.display = "none";
};

// True once the intro has finished (or was skipped). The home hero waits for this.
export const useIntroDone = () => useContext(IntroContext);

// Decides on the first load whether the intro plays (settings in Admin → Intro animation), then plays it once.
export function IntroProvider({ children }: { children: React.ReactNode }) {
  const { content } = useContent();
  const cfg = introSettings(content.intro);
  const path = usePathname() || "/";
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  useIsoLayoutEffect(() => {
    // Decided once per page load. If React mounts this twice (it can while recovering from an error),
    // the second mount keeps the first decision instead of thinking the intro was already seen.
    if (decision === null) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let seen = true;
      try {
        seen = !!sessionStorage.getItem(SEEN_KEY);
      } catch {
        // Storage blocked: count it as seen rather than replay it on every page.
      }
      decision = shouldPlay(cfg, path, seen, reduced);
      if (decision) {
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          // ignore: storage unavailable
        }
      }
    }
    if (!decision || finished) {
      hideCover();
      setDone(true);
      return;
    }
    lockScroll();
    setShow(true);
    return () => {
      unlockScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The animated intro is on screen now, so the plain cover under it can go.
  useEffect(() => {
    if (show) requestAnimationFrame(hideCover);
  }, [show]);

  return (
    <IntroContext.Provider value={done}>
      {children}
      {show && (
        <IntroAnimation
          cfg={cfg}
          logo={content.brand.logo}
          onDone={() => {
            finished = true;
            setShow(false);
            unlockScroll();
            setDone(true);
          }}
        />
      )}
    </IntroContext.Provider>
  );
}
