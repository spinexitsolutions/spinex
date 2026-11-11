"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useContent } from "./ContentProvider";
import { openCookieSettings } from "@/lib/consent";
import { cityPath, defaultFooter, productSlug, serviceSlug } from "@/lib/content";
import { sized } from "@/lib/img";

const ease = [0.22, 1, 0.36, 1] as const;

// Brand icons (Simple Icons paths) so each social button looks like the real app.
const social = {
  Instagram: { bg: "bg-[linear-gradient(45deg,#f9ce34,#ee2a7b_50%,#6228d7)]", size: 18, d: "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" },
  LinkedIn: { bg: "bg-[#0A66C2]", size: 17, d: "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" },
  YouTube: { bg: "bg-[#FF0000]", size: 19, d: "M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 002.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" },
} as const;

export default function Footer() {
  const { content } = useContent();
  const c = content.contact;
  const ft = { ...defaultFooter, ...(content.integrations?.footer ?? {}) };
  const products = ft.products ? content.products.slice(0, 3) : [];
  const links = ([
    ["Instagram", c.instagram],
    ["LinkedIn", c.linkedin],
    ["YouTube", c.youtube],
  ] as const).filter(([, href]) => href);

  return (
    <footer className="relative overflow-hidden bg-ink text-white" data-footer>
      <div aria-hidden className="pointer-events-none absolute -right-52 -top-64 h-[760px] w-[760px] rounded-full bg-[radial-gradient(circle,rgba(110,89,217,0.42),transparent_65%)]" />

      <div className={`container-x relative grid gap-12 pb-12 pt-16 sm:pt-20 md:grid-cols-2 ${products.length ? "lg:grid-cols-[1.4fr_1fr_1fr_1fr]" : "lg:grid-cols-[1.4fr_1fr_1fr]"} lg:gap-10`}>
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-3">
            {content.brand.logo && <img loading="lazy" decoding="async" src={content.brand.logo} alt={`${content.brand.name || "Spinex"} logo`} className="h-10 w-10 object-contain" />}
            <span className="font-display text-xl font-semibold">{content.brand.name}</span>
          </Link>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">{content.brand.tagline}</p>
          <div className="mt-5 space-y-1.5 text-[15px] text-white/80">
            <a href={`mailto:${c.email}`} className="flex min-h-10 items-center break-all hover:text-white sm:min-h-0">{c.email}</a>
            <a href={`tel:+91${c.phone}`} className="flex min-h-10 items-center hover:text-white sm:min-h-0">+91 {c.phone}</a>
          </div>
          {links.length > 0 && (
            <div className="mt-6 flex gap-2.5">
              {links.map(([label, href]) => {
                const s = social[label];
                return (
                  <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className={`grid h-10 w-10 place-items-center rounded-xl ${s.bg} transition-transform duration-300 hover:-translate-y-0.5`}>
                    <svg width={s.size} height={s.size} viewBox="0 0 24 24" aria-hidden><path fill="#fff" d={s.d} /></svg>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <FooterCol title="Services" items={content.services.map((s) => ({ label: s.title, href: `/services/${serviceSlug(s)}` }))} />
        <FooterCol
          title="Company"
          items={[
            { label: "About", href: "/about" },
            ...(content.products.length && !products.length ? [{ label: "Our products", href: "/products" }] : []),
            { label: "Our work", href: "/work" },
            { label: "Blog", href: "/blog" },
            { label: "Careers", href: "/careers" },
            { label: "Internship", href: "/internship" },
            ...(content.profile?.public ? [{ label: "Company profile (PDF)", href: "/company-profile" }] : []),
            { label: "Verify certificate", href: "/verify" },
            ...(content.cities ?? []).filter((x) => x.show).map((x) => ({ label: `Website development in ${x.city}`, href: cityPath(x) })),
            { label: "Contact", href: "/contact" },
            { label: "Client login", href: "/portal/login" },
          ]}
        />

        {products.length > 0 && (
          <div data-footer-products>
            <h3 className="mb-5 text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              <Link href="/products" className="hover:text-white">Our products</Link>
            </h3>
            <ul className="space-y-3">
              {products.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${productSlug(p)}`} className="group flex items-center gap-3">
                    <span className="h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                      {(p.cardImage || p.image) && <img loading="lazy" decoding="async" src={sized(p.cardImage || p.image, 160)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] leading-snug text-white/85 group-hover:text-lav-300">{p.name}</span>
                      {p.category && <span className="block text-xs text-white/45">{p.category}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {ft.wordmark.trim() && <Wordmark text={ft.wordmark.trim()} animate={ft.animate} />}

      <div data-footer-bottom className="container-x relative flex flex-col gap-3 pb-7 pt-3 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
        <p suppressHydrationWarning>© {new Date().getFullYear()} {content.brand.name}. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-5">
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5">
            <Link href="/privacy" className="flex min-h-10 items-center hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="flex min-h-10 items-center hover:text-white">Terms of Service</Link>
            <Link href="/refund" className="flex min-h-10 items-center hover:text-white">Refund Policy</Link>
            {content.integrations?.cookieBanner && <button type="button" onClick={openCookieSettings} className="flex min-h-10 items-center text-left hover:text-white">Cookie settings</button>}
          </nav>
          <button
            type="button"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="hidden h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition hover:border-white hover:bg-white hover:text-ink sm:grid"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      </div>
    </footer>
  );
}

// Big spaced-out word (e.g. S P I N E X). Letters open up from a soft blur when it scrolls into view.
function Wordmark({ text, animate }: { text: string; animate: boolean }) {
  const reduce = useReducedMotion();
  const still = !animate || reduce;
  const letters = [...text];
  return (
    <div className="container-x relative">
      <motion.p
        aria-label={text}
        data-footer-wordmark
        className="flex select-none items-center justify-center border-t border-white/10 py-10 font-display font-medium leading-none text-[#f3f1f8] sm:py-14"
        style={{ fontSize: `clamp(34px, ${Math.min(9, 62 / letters.length)}vw, 110px)` }}
        initial={still ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
      >
        {letters.map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block text-center"
            style={still ? { width: "1.05em" } : undefined}
            variants={{
              hidden: { width: "0.62em", opacity: 0.2, filter: "blur(6px)" },
              show: { width: "1.05em", opacity: 1, filter: "blur(0px)", transition: { duration: 1.4, ease } },
            }}
          >
            {ch === " " ? " " : ch}
          </motion.span>
        ))}
      </motion.p>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-5 text-xs font-medium uppercase tracking-[0.14em] text-white/50">{title}</h3>
      {/* On phones every link gets a 40 px tall touch area so the right one is easy to tap. */}
      <ul className="sm:space-y-2.5">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex min-h-10 items-center text-[15px] text-white/80 transition hover:text-lav-300 sm:inline sm:min-h-0">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
