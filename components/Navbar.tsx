"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Stage } from "./home/ServicesList";
import { ArrowUpRight, Briefcase, ChevronDown, GraduationCap, Home, Menu, MessageSquare, Monitor, Newspaper, Sparkles, User, X, type LucideIcon } from "lucide-react";
import { useContent } from "./ContentProvider";
import { serviceSlug, type NavStyle } from "@/lib/content";
import { cursorSettings } from "./CustomCursor";
import { ease } from "./Reveal";


const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services", mega: true },
  { href: "/products", label: "Products" },
  { href: "/work", label: "Work" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/internship", label: "Internship" },
  { href: "/contact", label: "Contact" },
];

// Icons for the "icons" navbar style.
export const NAV_ICONS: Record<string, LucideIcon> = { "/": Home, "/services": Sparkles, "/products": Monitor, "/work": Briefcase, "/blog": Newspaper, "/about": User, "/internship": GraduationCap, "/contact": MessageSquare };
// For each navbar style (Admin → Intro & cursor → Navbar): the sliding pill behind the current page,
// the one behind the link under the mouse, and the text colour of the current page. Everything else is in app/nav-fx.css.
export const NAV: Record<NavStyle, { active?: string; hover?: string; activeText: string; spring?: { stiffness: number; damping: number } }> = {
  default: { active: "inset-0 rounded-full bg-ink", hover: "inset-0 rounded-full bg-lav-100", activeText: "text-white" },
  underline: { activeText: "text-ink" },
  capsule: { active: "inset-0 rounded-full bg-gradient-to-b from-[#f3f0ff] to-[#e9e3ff] shadow-[inset_0_0_0_1px_rgb(var(--c-lav-600)/0.25),0_6px_16px_-8px_rgb(var(--c-lav-600)/0.6)]", hover: "inset-0 rounded-full bg-mist", activeText: "text-lav-700", spring: { stiffness: 300, damping: 20 } },
  dot: { activeText: "text-ink" },
  segmented: { active: "inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(18,15,27,0.08),0_6px_14px_-6px_rgba(18,15,27,0.25)]", activeText: "text-ink" },
  brackets: { activeText: "" },
  gradient: { active: "inset-0 rounded-full bg-gradient-to-r from-lav-600 to-fuchsia-600 shadow-[0_8px_20px_-8px_rgba(192,38,211,0.7)]", hover: "inset-0 rounded-full bg-lav-100", activeText: "text-white" },
  elastic: { active: "inset-0 rounded-full bg-ink", hover: "inset-x-4 bottom-1 h-[3px] rounded-full bg-lav-400", activeText: "text-white", spring: { stiffness: 260, damping: 13 } },
  neon: { activeText: "text-ink" },
  marker: { activeText: "text-ink" },
  icons: { activeText: "text-ink" },
  glowbar: { active: "inset-x-3 bottom-0.5 h-[3px] rounded-full bg-gradient-to-r from-lav-500 to-fuchsia-500 shadow-[0_0_12px_2px_rgba(192,38,211,0.55),0_-14px_22px_-6px_rgb(var(--c-lav-400)/0.55)]", hover: "inset-0 rounded-full bg-mist", activeText: "text-ink" },
};

// Letters roll up one after another on hover; the visible copy is for screen readers.
function RollText({ text, alt = "text-lav-700" }: { text: string; alt?: string }) {
  return (
    <span className="relative inline-flex overflow-hidden leading-[1.3]">
      <span className="sr-only">{text}</span>
      {text.split("").map((ch, i) => (
        <span key={i} aria-hidden className="relative inline-block">
          <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full" style={{ transitionDelay: `${i * 22}ms` }}>
            {ch === " " ? "\u00A0" : ch}
          </span>
          <span className={`absolute left-0 top-full inline-block ${alt} transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full`} style={{ transitionDelay: `${i * 22}ms` }}>
            {ch === " " ? "\u00A0" : ch}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function Navbar() {
  const { content } = useContent();
  // "Products" shows only once at least one product is added in the admin panel.
  const navStyle = cursorSettings(content.cursor).navStyle ?? "default";
  const ns = NAV[navStyle] ?? NAV.default;
  const navLinks = links.filter((l) => l.href !== "/products" || content.products.length > 0);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mega, setMega] = useState(false);
  const [preview, setPreview] = useState(content.services[0]?.id);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 240 && !open && !mega);
    setScrolled(y > 24);
  });

  useEffect(() => {
    setOpen(false);
    setMega(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    // The floating WhatsApp and chat buttons hide while the phone menu is open.
    if (open) document.documentElement.dataset.menuOpen = "1";
    else delete document.documentElement.dataset.menuOpen;
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const showMega = () => {
    clearTimeout(closeTimer.current);
    setMega(true);
  };
  const hideMega = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMega(false);
    }, 160);
  };

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const previewService = content.services.find((s) => s.id === preview) ?? content.services[0];

  return (
    <>
      {/* The logo and the button sit at the top of the page and scroll away with it.
          Only the links pill (and the phone menu button) is fixed: it slides away while scrolling down and comes back when scrolling up. */}
      <header className="absolute inset-x-0 top-0 z-50 flex justify-center px-3 pt-4">
        <div className="relative w-full max-w-[1240px]">
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease, delay: 0.1 }} // opacity only: a transform here would pin the fixed links pill to the nav
            // "Floating islands": the logo sits on its own with no background, the links and the button float as separate pills.
            className="relative flex items-center justify-between gap-3"
            aria-label="Main"
          >
            <Link href="/" className="flex shrink-0 items-center gap-1.5 rounded-full py-2 pl-1 pr-3" aria-label={`${content.brand.name} home`} data-nav-brand>
              {content.brand.logo?.trim() ? (
                <img src={content.brand.logo.trim() === "/brand/logo.png" ? "/brand/icon.svg" : "/api/brand-icon?size=96"} alt="" className="h-6 w-6 object-contain" data-nav-logo />
              ) : (
                <span className="w-2" aria-hidden />
              )}
              <span className="font-display text-[20px] font-semibold tracking-tight">Spinex</span>
            </Link>

            <motion.ul
              initial={false}
              animate={{ x: "-50%", y: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
              transition={{ duration: 0.45, ease }}
              style={{ pointerEvents: hidden ? "none" : undefined, left: "50%" }}
              aria-hidden={hidden || undefined}
              onMouseLeave={() => { setHovered(null); hideMega(); }}
              className={`fixed top-4 z-50 hidden items-center rounded-full border p-1.5 transition-[background,box-shadow,border-color] duration-500 lg:flex ${
                scrolled || mega
                  ? "border-line bg-white/90 shadow-[0_12px_40px_-14px_rgba(18,15,27,0.3)] backdrop-blur-xl"
                  : "border-line bg-white shadow-[0_12px_30px_-16px_rgba(18,15,27,0.3)]"
              }`}
              data-nav-links
              data-nav-style={navStyle}
              onMouseMove={navStyle === "segmented" ? (e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--nx", `${e.clientX - r.left}px`); } : undefined}
            >
              {navLinks.map((l) => {
                const isActive = active(l.href);
                return (
                  <li key={l.href} className="relative" onMouseEnter={() => { setHovered(l.href); if (l.mega) showMega(); else hideMega(); }}>
                    {isActive && ns.active && (
                      <motion.span layoutId="nav-active" className={`absolute ${ns.active}`} transition={{ type: "spring", ...(ns.spring ?? { stiffness: 380, damping: 32 }) }} />
                    )}
                    {hovered === l.href && !isActive && ns.hover && (
                      <motion.span layoutId="nav-hover" className={`absolute ${ns.hover}`} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                    )}
                    <div className="relative flex items-center">
                      <Link href={l.href} onFocus={() => setHovered(l.href)} aria-current={isActive ? "page" : undefined} data-nav-link
                        className={`group relative z-10 flex min-h-11 items-center gap-1.5 whitespace-nowrap px-3.5 text-[14.5px] xl:px-4 ${isActive ? `font-semibold ${ns.activeText}` : "font-medium text-muted hover:text-ink"}`}>
                        {navStyle === "icons" && (() => { const I = NAV_ICONS[l.href] ?? Sparkles; return <b className="nav-ic grid h-6 w-6 place-items-center rounded-full"><I size={13} strokeWidth={2.2} /></b>; })()}
                        {navStyle === "default" ? <RollText text={l.label} alt={isActive ? "text-lav-200" : "text-lav-700"} /> : <span className="nav-label relative">{l.label}</span>}
                        {navStyle === "brackets" && <><i aria-hidden className="nav-br nav-br-a" /><i aria-hidden className="nav-br nav-br-b" /></>}
                      </Link>
                      {l.mega && (
                        <button
                          onClick={() => (mega ? setMega(false) : showMega())}
                          aria-expanded={mega}
                          aria-controls="services-menu"
                          aria-label="Show services menu"
                          className={`relative z-10 -ml-3 mr-1 grid h-11 w-7 place-items-center ${isActive && ns.activeText === "text-white" ? "text-white/80" : "text-muted"}`}
                        >
                          <motion.span animate={{ rotate: mega ? 180 : 0 }} transition={{ duration: 0.3 }}>
                            <ChevronDown size={15} />
                          </motion.span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </motion.ul>

            <div className="flex items-center gap-2">
              <Link href="/contact" className="group relative inline-flex h-12 shrink-0 items-center whitespace-nowrap gap-2 overflow-hidden rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(18,15,27,0.55)] sm:h-[54px] sm:pl-6 sm:pr-2">
                <span aria-hidden className="absolute inset-0 origin-left scale-x-0 rounded-full bg-lav-600 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                <span className="relative hidden sm:inline">Start a project</span>
                <span className="relative sm:hidden">Start</span>
                <span className="relative hidden h-[38px] w-[38px] place-items-center overflow-hidden rounded-full bg-white text-ink sm:grid">
                  <ArrowUpRight size={15} className="transition-transform duration-500 group-hover:-translate-y-6 group-hover:translate-x-6" />
                  <ArrowUpRight size={15} className="absolute -translate-x-6 translate-y-6 transition-transform duration-500 group-hover:translate-x-0 group-hover:translate-y-0" />
                </span>
              </Link>
              <span className="h-12 w-12 lg:hidden" aria-hidden />
              <motion.button
                initial={false}
                animate={{ y: hidden ? -90 : 0, opacity: hidden ? 0 : 1 }}
                transition={{ duration: 0.45, ease }}
                style={{ pointerEvents: hidden ? "none" : undefined }}
                onClick={() => setOpen((v) => !v)}
                className="fixed right-3 top-4 z-50 grid h-12 w-12 place-items-center rounded-full border border-line bg-white text-ink shadow-[0_12px_30px_-16px_rgba(18,15,27,0.3)] lg:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={open ? "x" : "m"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {open ? <X size={20} /> : <Menu size={20} />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.nav>

          {/* Services mega menu (desktop): fixed under the links pill */}
          <div className="pointer-events-none fixed left-1/2 top-[84px] z-50 hidden w-[min(1240px,calc(100vw-24px))] -translate-x-1/2 lg:block">
          <AnimatePresence>
            {mega && !hidden && previewService && (
              <motion.div
                id="services-menu"
                onMouseEnter={showMega}
                onMouseLeave={hideMega}
                initial={{ opacity: 0, y: -10, clipPath: "inset(0 0 100% 0 round 28px)" }}
                animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0 round 28px)" }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45, ease }}
                className="pointer-events-auto relative overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_30px_80px_-24px_rgba(18,15,27,0.35)]"
              >
                <div className="grid grid-cols-[1.3fr_1fr] gap-2 p-3">
                  <ul className="grid grid-cols-2 gap-1">
                    {content.services.map((s, i) => (
                      <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.035, ease }}>
                        <Link
                          href={`/services/${serviceSlug(s)}`}
                          onMouseEnter={() => setPreview(s.id)}
                          onFocus={() => setPreview(s.id)}
                          onClick={() => setMega(false)}
                          className={`group block rounded-2xl p-4 transition-colors ${preview === s.id ? "bg-mist" : "hover:bg-mist"}`}
                        >
                          <span className="flex items-center justify-between gap-2 font-semibold">
                            {s.title}
                            <ArrowUpRight size={15} className={`transition-all duration-300 ${preview === s.id ? "translate-x-0 opacity-100 text-lav-600" : "-translate-x-1 opacity-0"}`} />
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-muted">{s.short}</span>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                  <div className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-white" data-mega-scene={previewService.id}>
                    {/* The same little animation as the service's card in the Services section, shown larger. */}
                    <div className="relative h-[230px] overflow-hidden bg-ink bg-[radial-gradient(80%_90%_at_50%_20%,rgba(110,89,217,0.35),transparent)] text-white">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={previewService.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} className="absolute inset-0">
                          <div className="absolute left-1/2 top-1/2 h-[124px] w-[260px] -translate-x-1/2 -translate-y-1/2 scale-[1.45]">
                            <Stage kind={previewService.anim || previewService.id} badge={false} />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                    <div className="px-4 pt-3">
                      <p className="font-semibold">{previewService.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{previewService.short}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4 pt-3">
                      <p className="line-clamp-2 text-[13px] text-muted">{previewService.tags.join(", ")}</p>
                      <Link href="/services" onClick={() => setMega(false)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-lav-700">
                        All services <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-between overflow-y-auto bg-ink px-6 pb-10 pt-28 text-white lg:hidden"
            initial={{ clipPath: "circle(0% at 92% 6%)" }}
            animate={{ clipPath: "circle(150% at 92% 6%)" }}
            exit={{ clipPath: "circle(0% at 92% 6%)" }}
            transition={{ duration: 0.7, ease }}
            data-lenis-prevent
          >
            <ul className="space-y-1">
              {navLinks.map((l, i) => (
                <li key={l.href} className="overflow-hidden">
                  <motion.div initial={{ y: "100%" }} animate={{ y: "0%" }} transition={{ delay: 0.2 + i * 0.06, duration: 0.6, ease }}>
                    <Link href={l.href} className={`block py-1 font-display text-5xl font-semibold tracking-tight ${active(l.href) ? "text-lav-300" : ""}`}>
                      {l.label}
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-10 space-y-4">
              <Link href="/contact" className="btn-light w-full">Start a project <ArrowUpRight size={17} /></Link>
              <div className="space-y-1 text-white/60">
                <p>{content.contact.email}</p>
                <p>+91 {content.contact.phone}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
