"use client";

import { useEffect, useState } from "react";

// For the floating WhatsApp and chat buttons: how far to lift them so they never cover the footer's
// bottom line (copyright and legal links), whether the cookie banner is open, and whether the page has
// been scrolled (the WhatsApp label then folds into a round button so it doesn't cover text).
export function useFloatLift() {
  const [lift, setLift] = useState(0);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const bar = document.querySelector<HTMLElement>("[data-footer-bottom]");
    let io: IntersectionObserver | undefined;
    if (bar) {
      io = new IntersectionObserver(
        ([e]) => setLift(e.isIntersecting ? Math.max(0, e.intersectionRect.height) + 8 : 0),
        { threshold: Array.from({ length: 11 }, (_, i) => i / 10) },
      );
      io.observe(bar);
    }
    const html = document.documentElement;
    const readCookie = () => {
      setCookieOpen(html.dataset.cookieOpen === "1");
      setMenuOpen(html.dataset.menuOpen === "1");
    };
    readCookie();
    const mo = new MutationObserver(readCookie);
    mo.observe(html, { attributes: true, attributeFilter: ["data-cookie-open", "data-menu-open"] });
    const onScroll = () => setScrolled(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io?.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return { lift, cookieOpen, menuOpen, scrolled };
}
