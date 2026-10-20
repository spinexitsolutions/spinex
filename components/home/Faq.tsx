"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { useContent } from "../ContentProvider";
import { SplitHeading, ease } from "../Reveal";

// Uses the same Q&A list as the chatbot, so both are edited in one place in the admin panel.
export default function Faq() {
  const { content } = useContent();
  const [open, setOpen] = useState<string | null>(content.chatbot.faqs[0]?.id ?? null);

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <SplitHeading key={content.sections.faq.heading} text={content.sections.faq.heading} className="h-display text-4xl sm:text-6xl" />
          <p className="mt-6 max-w-sm text-muted">{content.sections.faq.intro}</p>
          <button onClick={() => window.dispatchEvent(new Event("spinex:open-chat"))} className="btn-dark mt-8">
            <Sparkles size={17} /> Ask the assistant
          </button>
        </div>
        <ul className="border-t border-line">
          {content.chatbot.faqs.map((f) => {
            const isOpen = open === f.id;
            return (
              <li key={f.id} className="border-b border-line">
                <h3>
                  <button onClick={() => setOpen(isOpen ? null : f.id)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 py-6 text-left">
                    <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{f.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0, backgroundColor: isOpen ? "#120F1B" : "#F5F3FA", color: isOpen ? "#FFFFFF" : "#120F1B" }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full">
                      <Plus size={18} />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { duration: 0.25 } }} transition={{ duration: 0.45, ease }} className="overflow-hidden">
                      <p className="max-w-2xl pb-6 text-lg leading-relaxed text-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
