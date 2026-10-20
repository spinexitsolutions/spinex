"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, FileText } from "lucide-react";
import { useContent } from "./ContentProvider";
import { legalDocs, type Block } from "@/lib/legal";
import { ease } from "./Reveal";

const others = [
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms of Service" },
  { slug: "refund", label: "Refund & Cancellation" },
] as const;

export default function LegalPage({ slug }: { slug: keyof typeof legalDocs }) {
  const { content } = useContent();
  const doc = legalDocs[slug](content);
  const [active, setActive] = useState(doc.sections[0]?.id);

  // Highlight the section being read in the side menu
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    doc.sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => {
      obs.disconnect();
    };
  }, [doc.sections]);

  return (
    <>
      <section className="relative overflow-hidden bg-ink pb-14 pt-36 text-white sm:pb-20 sm:pt-44 grain">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-lav-600/25 blur-[130px]" />
        <div className="container-x relative max-w-4xl">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm text-white/55">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li aria-hidden><ChevronRight size={14} /></li>
              <li aria-current="page" className="text-white">{doc.title}</li>
            </ol>
          </nav>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="h-display mt-6 text-5xl sm:text-6xl">
            {doc.title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease }} className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">
            {doc.summary}
          </motion.p>
          <p className="mt-6 text-sm text-white/55">Last updated {doc.updated}</p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-3 text-sm font-semibold">On this page</p>
            <ol className="space-y-1 border-l border-line">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors ${active === s.id ? "border-lav-600 font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-8 space-y-2">
              {others.filter((o) => o.slug !== slug).map((o) => (
                <Link key={o.slug} href={`/${o.slug}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm hover:border-ink">
                  <FileText size={15} className="text-lav-600" /> {o.label}
                </Link>
              ))}
            </div>
          </aside>

          <article className="max-w-3xl">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 border-b border-line py-8 first:pt-0 last:border-0">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  <span className="mr-3 text-lav-600">{i + 1}.</span>
                  {s.title}
                </h2>
                <div className="mt-4 space-y-4 text-[16.5px] leading-[1.75] text-ink/80">
                  {s.body.map((b, k) => (
                    <BlockView key={k} block={b} />
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </section>
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === "string") return <p>{block}</p>;
  return (
    <ul className="space-y-2.5">
      {block.list.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-lav-500" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
