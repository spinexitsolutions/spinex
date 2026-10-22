"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { useContent } from "./ContentProvider";
import { serviceSlug } from "@/lib/content";
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
      <motion.header animate={{ y: hidden ? -120 : 0 }} transition={{ duration: 0.45, ease }} className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-4">
        <div className="relative w-full" style={{ maxWidth: scrolled ? 1080 : 1240, transition: "max-width .6s cubic-bezier(.22,1,.36,1)" }} onMouseLeave={hideMega}>
          <motion.nav
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease, delay: 0.1 }}
            className={`relative flex items-center justify-between gap-4 rounded-full border px-2.5 py-2 transition-[background,box-shadow,border-color] duration-500 ${
              scrolled || mega
                ? "border-line bg-white/90 shadow-[0_12px_40px_-14px_rgba(18,15,27,0.28)] backdrop-blur-xl"
                : "border-white/60 bg-white/55 backdrop-blur-md"
            }`}
            aria-label="Main"
          >
            <Link href="/" className="group flex shrink-0 items-center gap-2 rounded-full pl-0.5 pr-3" aria-label={`${content.brand.name} home`}>
              {content.brand.logo?.trim() ? (
                <span className="relative grid h-10 w-10 place-items-center">
                  <span className="absolute inset-0 scale-0 rounded-full bg-lav-100 transition-transform duration-500 group-hover:scale-100" />
                  <img src="/api/brand-icon?size=160" alt="" className="relative h-8 w-8 object-contain transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[360deg]" />
                </span>
              ) : (
                <span className="w-2" aria-hidden />
              )}
              <span className="font-display text-[22px] font-semibold tracking-tight">Spinex</span>
            </Link>

            <ul className="hidden items-center lg:flex" onMouseLeave={() => setHovered(null)}>
              {navLinks.map((l) => {
                const isActive = active(l.href);
                return (
                  <li key={l.href} className="relative" onMouseEnter={() => { setHovered(l.href); if (l.mega) showMega(); else hideMega(); }}>
                    {isActive && (
                      <motion.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                    )}
                    {hovered === l.href && !isActive && (
                      <motion.span layoutId="nav-hover" className="absolute inset-0 rounded-full bg-lav-100" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                    )}
                    <div className="relative flex items-center">
                      <Link href={l.href} onFocus={() => setHovered(l.href)} aria-current={isActive ? "page" : undefined} className={`group relative z-10 flex min-h-11 items-center whitespace-nowrap px-3.5 text-[14.5px] xl:px-4 ${isActive ? "font-semibold text-white" : "font-medium text-muted hover:text-ink"}`}>
                        <RollText text={l.label} alt={isActive ? "text-lav-200" : "text-lav-700"} />
                      </Link>
                      {l.mega && (
                        <button
                          onClick={() => (mega ? setMega(false) : showMega())}
                          aria-expanded={mega}
                          aria-controls="services-menu"
                          aria-label="Show services menu"
                          className={`relative z-10 -ml-3 mr-1 grid h-11 w-7 place-items-center ${isActive ? "text-white/80" : "text-muted"}`}
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
            </ul>

            <div className="flex items-center gap-2">
              <Link href="/contact" className="group relative hidden h-11 shrink-0 items-center whitespace-nowrap gap-2 overflow-hidden rounded-full bg-ink pl-5 pr-1.5 text-sm font-semibold text-white sm:inline-flex">
                <span aria-hidden className="absolute inset-0 origin-left scale-x-0 rounded-full bg-lav-600 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                <span className="relative">Start a project</span>
                <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white text-ink">
                  <ArrowUpRight size={15} className="transition-transform duration-500 group-hover:-translate-y-6 group-hover:translate-x-6" />
                  <ArrowUpRight size={15} className="absolute -translate-x-6 translate-y-6 transition-transform duration-500 group-hover:translate-x-0 group-hover:translate-y-0" />
                </span>
              </Link>
              <button
                onClick={() => setOpen((v) => !v)}
                className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white lg:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={open ? "x" : "m"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {open ? <X size={20} /> : <Menu size={20} />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </motion.nav>

          {/* Services mega menu (desktop) */}
          <AnimatePresence>
            {mega && previewService && (
              <motion.div
                id="services-menu"
                onMouseEnter={showMega}
                initial={{ opacity: 0, y: -10, clipPath: "inset(0 0 100% 0 round 28px)" }}
                animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0 round 28px)" }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45, ease }}
                className="absolute inset-x-0 top-full mt-3 hidden overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_30px_80px_-24px_rgba(18,15,27,0.35)] lg:block"
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
                  <div className="relative overflow-hidden rounded-[20px] bg-ink">
                    <AnimatePresence initial={false}>
                      <motion.img
                        key={previewService.id}
                        src={previewService.image}
                        alt=""
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-sm text-white/70">{previewService.tags.join(", ")}</p>
                      <Link href="/services" onClick={() => setMega(false)} className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink transition hover:bg-lav-100">
                        All services <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

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
