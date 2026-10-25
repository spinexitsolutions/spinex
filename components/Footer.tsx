"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Instagram, Linkedin, Youtube } from "lucide-react";
import { useContent } from "./ContentProvider";
import { openCookieSettings } from "@/lib/consent";
import { cityPath, serviceSlug } from "@/lib/content";

export default function Footer() {
  const { content } = useContent();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["40%", "0%"]);
  const c = content.contact;

  return (
    <footer ref={ref} className="relative overflow-hidden bg-ink text-white">
      <div className="container-x grid gap-12 pb-10 pt-20 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            {content.brand.logo && <img loading="lazy" decoding="async" src={content.brand.logo} alt="" className="h-14 w-14 object-contain" />}
            <span className="font-display text-lg font-semibold">{content.brand.name}</span>
          </div>
          <p className="mt-5 leading-relaxed text-white/55">{content.brand.tagline}</p>
        </div>
        <FooterCol title="Services" items={content.services.map((s) => ({ label: s.title, href: `/services/${serviceSlug(s)}` }))} />
        <FooterCol
          title="Company"
          items={[
            { label: "About", href: "/about" },
            ...(content.products.length ? [{ label: "Our products", href: "/products" }] : []),
            { label: "Our work", href: "/work" },
            { label: "Blog", href: "/blog" },
            { label: "Careers", href: "/careers" },
            { label: "Internship", href: "/internship" },
            { label: "Verify certificate", href: "/verify" },
            ...(content.cities ?? []).filter((x) => x.show).map((x) => ({ label: `Website development in ${x.city}`, href: cityPath(x) })),
            { label: "Contact", href: "/contact" },
          ]}
        />
        <div>
          <h3 className="mb-5 text-sm text-white/55">Get in touch</h3>
          <a href={`mailto:${c.email}`} className="block break-all text-white/80 hover:text-white">{c.email}</a>
          <a href={`tel:+91${c.phone}`} className="mt-2 block text-white/80 hover:text-white">+91 {c.phone}</a>
          <p className="mt-2 text-white/50">{c.location}</p>
          <div className="mt-6 flex gap-2">
            {[
              { href: c.instagram, Icon: Instagram, label: "Instagram" },
              { href: c.linkedin, Icon: Linkedin, label: "LinkedIn" },
              { href: c.youtube, Icon: Youtube, label: "YouTube" },
            ].filter((s) => s.href).map(({ href, Icon, label }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-lav-400 hover:bg-lav-600 hover:text-white">
                <Icon size={17} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="relative h-[17vw] min-h-[90px] overflow-hidden">
        <motion.p style={{ y }} aria-hidden className="text-outline absolute inset-x-0 bottom-[-0.18em] select-none text-center font-display text-[24vw] font-bold leading-none tracking-tightest">
          SPINEX
        </motion.p>
      </div>

      <div className="container-x flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-white/55 sm:flex-row sm:justify-between">
        <p suppressHydrationWarning>© {new Date().getFullYear()} {content.brand.name}. All rights reserved.</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <Link href="/refund" className="hover:text-white">Refund Policy</Link>
          {content.integrations?.cookieBanner && <button type="button" onClick={openCookieSettings} className="text-left hover:text-white">Cookie settings</button>}
        </nav>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-5 text-sm text-white/55">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="text-white/80 transition hover:text-lav-300">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
