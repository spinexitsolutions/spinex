"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import AnimText from "./AnimText";
import { useContentMaybe } from "./ContentProvider";
import { speedFactor, typeSettings } from "@/lib/typography";

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

// Section heading; its animation is picked in Admin → Fonts & text (rises word by word by default).
export function SplitHeading({ text, className = "", as = "h2" }: { text: string; className?: string; as?: "h1" | "h2" }) {
  const Tag = as;
  const ref = useRef<HTMLHeadingElement>(null);
  const seen = useInView(ref, { once: true, margin: "-60px" });
  const t = typeSettings(useContentMaybe()?.content.typography);
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      <span aria-hidden>
        <AnimText words={text.split(" ").filter(Boolean).map((w) => ({ w }))} anim={t.headAnim} play={seen} speed={speedFactor(t.speed)} highlight="plain" />
      </span>
    </Tag>
  );
}

export { ease };
