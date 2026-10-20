"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useContent } from "../ContentProvider";
import { SplitHeading } from "../Reveal";

export default function CTA() {
  const { content } = useContent();
  const box = useRef<HTMLDivElement>(null);
  const gx = useMotionValue(50), gy = useMotionValue(50);
  const bg = useTransform([gx, gy], ([x, y]) => `radial-gradient(600px circle at ${x}% ${y}%, rgb(var(--c-lav-500) / 0.35), transparent 60%)`);
  const bx = useSpring(0, { stiffness: 200, damping: 15 }), by = useSpring(0, { stiffness: 200, damping: 15 });

  return (
    <section className="bg-white px-3 py-3 sm:px-5 sm:py-5">
      <motion.div
        ref={box}
        onMouseMove={(e) => {
          const r = box.current!.getBoundingClientRect();
          gx.set(((e.clientX - r.left) / r.width) * 100);
          gy.set(((e.clientY - r.top) / r.height) * 100);
        }}
        className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-24 text-center text-white sm:py-32 grain"
      >
        <motion.div aria-hidden style={{ background: bg }} className="pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-3xl">
          <SplitHeading text="Have a project in mind? Let's talk." className="h-display text-5xl sm:text-7xl" />
          <p className="mx-auto mt-6 max-w-lg text-lg text-white/60">Tell us what you need. We reply within a day with a clear plan and quote.</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <motion.div
              style={{ x: bx, y: by }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                bx.set((e.clientX - r.left - r.width / 2) * 0.3);
                by.set((e.clientY - r.top - r.height / 2) * 0.3);
              }}
              onMouseLeave={() => { bx.set(0); by.set(0); }}
            >
              <Link href="/contact" className="btn-light px-8 py-4 text-base">Start your project <ArrowUpRight size={18} /></Link>
            </motion.div>
            <a href={`https://wa.me/${content.contact.whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost-dark px-8 py-4 text-base">Chat on WhatsApp</a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
