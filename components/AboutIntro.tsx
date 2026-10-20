"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Gauge, LayoutGrid, ShieldCheck, Handshake } from "lucide-react";
import { useContent } from "./ContentProvider";
import { Reveal, SplitHeading } from "./Reveal";

const values = [
  { Icon: Gauge, title: "Speed is a feature", text: "Every page is tuned to load fast on mobile data, because slow sites lose customers." },
  { Icon: LayoutGrid, title: "Clarity over decoration", text: "Visitors should know what you do and how to reach you within seconds." },
  { Icon: ShieldCheck, title: "Built to last", text: "Secure setups, clean code and backups, so your site keeps working after launch." },
  { Icon: Handshake, title: "You own everything", text: "Domains, code, accounts and designs stay in your name. No lock-in." },
];

export default function AboutIntro() {
  const { content } = useContent();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <>
      <section className="bg-white py-24 sm:py-32">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2">
          <div ref={ref} className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-mist">
            <motion.img style={{ y, scale: 1.18 }} src={content.about.image} alt="Working on a client project" className="h-full w-full object-cover" />
          </div>
          <div>
            <SplitHeading text={content.about.title} className="h-display text-4xl sm:text-6xl" />
            <Reveal delay={0.1}><p className="mt-8 text-lg leading-relaxed text-muted">{content.about.body}</p></Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8 rounded-2xl border-l-4 border-lav-500 bg-mist p-6">
                <p className="text-lg leading-relaxed">{content.about.philosophy}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-ink py-24 text-white sm:py-32">
        <div className="container-x">
          <SplitHeading text="What we hold ourselves to." className="h-display mb-14 max-w-2xl text-4xl sm:text-6xl" />
          <div className="grid gap-px overflow-hidden rounded-[28px] bg-white/10 sm:grid-cols-2">
            {values.map(({ Icon, title, text }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="group bg-ink p-8 transition-colors duration-500 hover:bg-ink-2 sm:p-10"
              >
                <Icon size={28} className="text-lav-300 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" />
                <h3 className="mt-8 font-display text-2xl font-semibold">{title}</h3>
                <p className="mt-3 max-w-sm text-white/60">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
