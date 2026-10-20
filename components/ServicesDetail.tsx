"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { useContent } from "./ContentProvider";
import { serviceSlug } from "@/lib/content";
import { ease } from "./Reveal";

export default function ServicesDetail() {
  const { content } = useContent();
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="container-x space-y-24 sm:space-y-32">
        {content.services.map((s, i) => (
          <div key={s.id} id={s.id} className="grid scroll-mt-44 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <motion.div
              className={`overflow-hidden rounded-[28px] ${i % 2 ? "lg:order-2" : ""}`}
              initial={{ clipPath: i % 2 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }}
              whileInView={{ clipPath: "inset(0 0 0 0)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.1, ease }}
            >
              <motion.img src={s.image} alt={s.title} className="aspect-[5/4] w-full object-cover" initial={{ scale: 1.25 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease }} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, delay: 0.2, ease }}>
              <h2 className="h-display text-4xl sm:text-5xl">{s.title}</h2>
              <p className="mt-6 text-lg leading-relaxed text-muted">{s.description}</p>
              <ul className="mt-8 space-y-3">
                {s.tags.map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-lav-100 text-lav-700"><Check size={13} /></span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-3"><Link href={`/services/${serviceSlug(s)}`} className="btn-dark">Learn more <ArrowUpRight size={17} /></Link><Link href="/contact" className="btn-ghost">Get a quote</Link></div>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
