"use client";

import { motion, type Variants } from "framer-motion";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

const line: Variants = {
  hidden: { y: "110%" },
  show: (i: number) => ({ y: "0%", transition: { duration: 0.9, delay: 0.06 * i, ease } }),
};

// Headline that rises word by word from behind a mask.
export function SplitHeading({ text, className = "", as = "h2" }: { text: string; className?: string; as?: "h1" | "h2" }) {
  const Tag = as === "h1" ? motion.h1 : motion.h2;
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top" aria-hidden>
          <motion.span className="inline-block" variants={line} custom={i}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export { ease };
