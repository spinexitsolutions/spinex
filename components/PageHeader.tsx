"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useContent } from "./ContentProvider";
import { SplitHeading, ease } from "./Reveal";

type Page = "about" | "services" | "products" | "work" | "contact" | "internship" | "blog" | "careers";

const labels: Record<Page, string> = { about: "About", services: "Services", products: "Products", work: "Work", contact: "Contact", internship: "Internship", blog: "Blog", careers: "Careers" };
const pages = Object.keys(labels) as Page[];
const fallbackBanner = "/images/stock/photo-1497366216548-37526070297c.jpg";

// Inner-page hero: the banner fills the background, a dark wash keeps the text readable,
// and the image drifts slower than the page on scroll.
export default function PageHeader({ page: pageProp, title: titleProp, intro: introProp, badge: badgeProp }: { page?: Page; title: string; intro: string; kicker?: string; badge?: { value: string; label: string } }) {
  const { content } = useContent();
  const pathname = usePathname();
  const fromUrl = pages.find((p) => pathname?.startsWith(`/${p}`));
  const page: Page = pageProp && pages.includes(pageProp) ? pageProp : fromUrl ?? "about";
  // Text edited in Admin > Page headers wins over the defaults passed in by the page.
  const title = content.pages?.[page]?.title || titleProp;
  const intro = content.pages?.[page]?.intro || introProp;

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const badge = {
    about: { value: content.stats?.[0]?.value ?? "", label: content.stats?.[0]?.label ?? "" },
    services: { value: String(content.services.length), label: "Services, one team" },
    products: { value: content.products.length ? String(content.products.length) : "", label: "Products" },
    work: content.projects.length
      ? { value: String(content.projects.length), label: "Projects shown" }
      : { value: content.stats?.[0]?.value ?? "", label: content.stats?.[0]?.label ?? "" },
    contact: { value: "1 day", label: "Usual reply time" },
    internship: { value: String(content.internship?.roles.length ?? 0), label: "Open roles" },
    blog: { value: "", label: "" },
    careers: { value: content.careers?.open ? String(content.careers.jobs.length) : "", label: "Open roles" },
  }[page];
  const shown = badgeProp ?? badge;

  return (
    <section ref={ref} className="relative flex min-h-[78svh] items-end overflow-hidden bg-ink text-white">
      {/* Background banner */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <motion.img
          src={content.banners?.[page] || fallbackBanner}
          alt=""
          initial={{ scale: 1.25 }}
          animate={{ scale: 1.08 }}
          transition={{ duration: 2.2, ease }}
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />

      <motion.div style={{ y: textY, opacity: textOpacity }} className="container-x relative w-full pb-16 pt-36 sm:pb-20">
        <motion.nav aria-label="Breadcrumb" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
          <ol className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink/40 px-4 py-2 text-sm text-white/70 backdrop-blur">
            <li><Link href="/" className="hover:text-white">Home</Link></li>
            <li aria-hidden><ChevronRight size={14} /></li>
            <li aria-current="page" className="text-white">{labels[page]}</li>
          </ol>
        </motion.nav>

        <SplitHeading as="h1" text={title} className="h-display mt-6 max-w-4xl text-5xl sm:text-7xl lg:text-8xl" />

        <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease }} className="max-w-xl text-lg leading-relaxed text-white/75">
            {intro}
          </motion.p>
          {shown.value && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease }}
              className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-md"
            >
              <span className="h-display text-4xl">{shown.value}</span>
              <span className="max-w-[9rem] text-sm leading-snug text-white/70">{shown.label}</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
