"use client";

import { motion } from "framer-motion";
import { Code2, Gauge, Handshake, LayoutGrid, Megaphone, PenTool, ShieldCheck, Video } from "lucide-react";
import { useContent } from "./ContentProvider";
import { Reveal, SplitHeading } from "./Reveal";

const values = [
  { Icon: Gauge, title: "Speed is a feature", text: "Every page is tuned to load fast on mobile data, because slow sites lose customers." },
  { Icon: LayoutGrid, title: "Clarity over decoration", text: "Visitors should know what you do and how to reach you within seconds." },
  { Icon: ShieldCheck, title: "Built to last", text: "Secure setups, clean code and backups, so your site keeps working after launch." },
  { Icon: Handshake, title: "You own everything", text: "Domains, code, accounts and designs stay in your name. No lock-in." },
];

// One team for everything (shown under the intro).
const TEAM = [
  { Icon: PenTool, title: "Design", text: "Brand, UI, creatives" },
  { Icon: Code2, title: "Development", text: "Websites, apps, software" },
  { Icon: Megaphone, title: "Marketing", text: "SEO, ads, social" },
  { Icon: Video, title: "Content", text: "Video, reels, copy" },
];

// "A, b c." → "A, *b c.*" so the part after the first comma can show lighter.
function softTail(title: string) {
  const t = title.replace(/\*/g, "");
  const i = t.indexOf(",");
  if (i < 0 || i === t.length - 1) return t;
  return `${t.slice(0, i + 1)} *${t.slice(i + 1).trim()}*`;
}

export default function AboutIntro() {
  const { content } = useContent();

  return (
    <>
      <section className="bg-white py-24 sm:py-32">
        <div className="container-x">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-lav-700">Who we are</p>
          {/* Words after the first comma show lighter, e.g. "Logic and creativity, *in equal measure.*" */}
          <SplitHeading text={softTail(content.about.title)} markClass="text-ink/25" className="h-display mt-4 max-w-6xl text-[2.6rem] sm:text-6xl lg:text-[5.2rem]" />
          <div className="mt-12 grid items-start gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-16">
            <Reveal delay={0.1}><p className="text-lg leading-relaxed text-muted sm:text-[19px] sm:leading-[1.75]">{content.about.body}</p></Reveal>
            {content.about.philosophy && (
              <Reveal delay={0.2}>
                <div className="relative overflow-hidden rounded-[28px] bg-ink p-8 text-white sm:p-10">
                  <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-[260px] w-[320px] rounded-full bg-lav-600/50 blur-[90px]" />
                  <span aria-hidden className="relative block h-9 font-display text-7xl font-semibold leading-[0.8] text-lav-400">&ldquo;</span>
                  <p className="relative text-xl leading-relaxed sm:text-[22px]">{content.about.philosophy}</p>
                </div>
              </Reveal>
            )}
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-14 lg:grid-cols-4">
            {TEAM.map(({ Icon, title, text }, i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="flex items-center gap-3.5 rounded-[22px] border border-line p-4 sm:p-5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-lav-100 text-lav-600 sm:h-12 sm:w-12"><Icon size={21} /></span>
                <span className="min-w-0">
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-[13.5px] text-muted">{text}</span>
                </span>
              </motion.li>
            ))}
          </ul>
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
