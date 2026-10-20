"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Check, MessageCircle } from "lucide-react";
import { useContent } from "../ContentProvider";
import { ease } from "../Reveal";


// Plain-language goal picker: tap what you want, see how we'd help, then plan it.
export default function Goals() {
  const { content } = useContent();
  const goals = content.goals;
  const [goalId, setGoalId] = useState(content.goals[0]?.id ?? "");
  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  // The planner block can be hidden in Admin > Home page; then send people to the contact page's planner.
  const plannerShown = (content.homeLayout ?? []).find((b) => b.id === "planner")?.visible ?? true;
  if (!goal) return null;
  const services = goal.services.map((id) => content.services.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);

  const planIt = () => {
    window.dispatchEvent(new CustomEvent("spinex:plan", { detail: goal.services }));
    document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" });
  };
  const whatsapp = `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(`Hi Spinex, I want to ${goal.label}. Can you help?`)}`;

  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-0 h-[480px] w-[480px] rounded-full bg-lav-700/30 blur-[140px]" />
      <div className="container-x relative">
        <p className="text-lav-300">{content.sections.goals.heading}</p>

        {/* Fill-in-the-blank sentence */}
        <h2 className="h-display mt-4 max-w-5xl text-4xl sm:text-6xl" aria-live="polite">
          I want to{" "}
          <span className="relative inline-block overflow-hidden align-bottom">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={goal.id}
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.45, ease }}
                className="inline-block pb-[0.08em] text-lav-300"
              >
                {goal.label}.
              </motion.span>
            </AnimatePresence>
            <span aria-hidden className="absolute bottom-0 left-0 h-[3px] w-full bg-lav-400/60" />
          </span>
        </h2>

        <div className="mt-10 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Choose your goal">
          {goals.map((g) => {
            const on = g.id === goal.id;
            return (
              <button
                key={g.id}
                role="radio"
                aria-checked={on}
                onClick={() => setGoalId(g.id)}
                className={`relative min-h-12 rounded-full border px-5 text-[15px] font-medium transition-colors ${on ? "border-transparent text-ink" : "border-white/20 text-white/80 hover:border-white/50 hover:text-white"}`}
              >
                {on && <motion.span layoutId="goal-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <span className="relative">{g.short}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }} transition={{ duration: 0.5, ease }} className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="rounded-[28px] border border-white/10 bg-ink-2 p-7 sm:p-9">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Here&apos;s what we&apos;d do</h3>
              <ul className="mt-6 space-y-4">
                {goal.steps.map((s, i) => (
                  <motion.li key={s} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1, ease }} className="flex items-start gap-3 text-lg">
                    <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lav-500"><Check size={13} /></span>
                    {s}
                  </motion.li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                {plannerShown ? (
                  <button onClick={planIt} className="btn-light">Plan this project <ArrowDown size={16} /></button>
                ) : (
                  <Link href="/contact#planner" className="btn-light">Plan this project <ArrowUpRight size={16} /></Link>
                )}
                <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost-dark"><MessageCircle size={16} /> Ask on WhatsApp</a>
              </div>
            </div>

            <div>
              <p className="mb-4 text-sm text-white/55">Services that help</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease }} className="overflow-hidden rounded-[22px] bg-white text-ink">
                    <img src={s.image} alt="" loading="lazy" className="h-32 w-full object-cover" />
                    <div className="p-5">
                      <h4 className="font-display text-lg font-semibold tracking-tight">{s.title}</h4>
                      <p className="mt-1 text-sm text-muted">{s.short}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
