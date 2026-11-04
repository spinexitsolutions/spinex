"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import { useContent } from "./ContentProvider";
import { localAnswer } from "@/lib/chat";
import { ease } from "./Reveal";
import { useFloatLift } from "@/lib/useFloatLift";

type Msg = { role: "user" | "assistant"; content: string };

export default function Chatbot() {
  const { content } = useContent();
  const bot = content.chatbot;
  const [open, setOpen] = useState(false);
  const { lift, menuOpen } = useFloatLift();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && msgs.length === 0) setMsgs([{ role: "assistant", content: bot.greeting }]);
    if (open) setTimeout(() => field.current?.focus(), 350);
  }, [open, msgs.length, bot.greeting]);

  useEffect(() => {
    const openChat = () => {
      setOpen(true);
    };
    window.addEventListener("spinex:open-chat", openChat);
    return () => {
      window.removeEventListener("spinex:open-chat", openChat);
    };
  }, []);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || typing) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setTyping(true);

    let reply = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m, i) => !(i === 0 && m.role === "assistant")) }),
      });
      if (res.ok) reply = (await res.json()).reply ?? "";
    } catch {
      /* offline or no API key: use built-in answers */
    }
    if (!reply) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
      reply = localAnswer(q, content);
    }
    setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    setTyping(false);
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Ask our AI assistant"}
        title={open ? undefined : "Ask our AI assistant"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-lav-400 via-lav-600 to-lav-700 text-white ring-2 ring-white/70 shadow-[0_14px_40px_-10px_rgb(var(--c-lav-700)/0.7)]"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        initial={{ scale: 0 }}
        animate={{ scale: menuOpen ? 0.6 : 1, opacity: menuOpen ? 0 : 1, y: -lift }}
        style={{ pointerEvents: menuOpen ? "none" : undefined }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? "x" : "chat"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
            {open ? <X size={22} /> : <AiSparkle />}
          </motion.span>
        </AnimatePresence>
        {!open && <span className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-ink px-1.5 py-px text-[9px] font-bold leading-tight tracking-wide text-white">AI</span>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={bot.name}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.4, ease }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-24 right-3 z-50 flex h-[min(600px,calc(100dvh-8rem))] w-[calc(100vw-1.5rem)] max-w-[390px] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_30px_80px_-20px_rgba(18,15,27,0.45)] sm:right-5"
            data-lenis-prevent
          >
            <div className="flex items-center gap-3 bg-ink px-5 py-4 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-lav-600"><Sparkles size={18} /></span>
              <div>
                <p className="font-semibold">{bot.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Replies instantly</p>
              </div>
            </div>

            <div ref={list} className="flex-1 space-y-3 overflow-y-auto bg-mist p-4">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
                  <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${m.role === "user" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-line bg-white"}`}>
                    {m.content}
                  </p>
                </motion.div>
              ))}
              {typing && (
                <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3.5" aria-label="Typing">
                  {[0, 1, 2].map((d) => (
                    <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-lav-500" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: d * 0.15 }} />
                  ))}
                </div>
              )}
              {msgs.length <= 1 && !typing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {bot.faqs.slice(0, 4).map((f) => (
                    <button key={f.id} onClick={() => send(f.q)} className="rounded-full border border-lav-200 bg-white px-3.5 py-2.5 text-[13px] text-lav-700 transition hover:bg-lav-100">
                      {f.q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-line p-3">
              <input ref={field} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" className="flex-1 rounded-full bg-mist px-4 py-3 text-[14.5px] outline-none focus:ring-2 focus:ring-lav-200" aria-label="Message" />
              <button type="submit" disabled={!input.trim() || typing} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white transition disabled:opacity-40">
                <Send size={17} />
              </button>
            </form>
            <a href={`https://wa.me/${content.contact.whatsapp}`} target="_blank" rel="noreferrer" className="border-t border-line py-2.5 text-center text-xs text-muted hover:text-ink">
              Prefer a person? Chat with us on WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// The assistant's button icon: a large and a small four-point sparkle that gently twinkle.
function AiSparkle() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path className="origin-center motion-safe:animate-[spx-twinkle_2.8s_ease-in-out_infinite]" style={{ transformBox: "fill-box" }} d="M10 2.5c.5 3.9 1.9 5.9 5.9 6.6-4 .7-5.4 2.7-5.9 6.6-.5-3.9-1.9-5.9-5.9-6.6 4-.7 5.4-2.7 5.9-6.6Z" />
      <path className="origin-center motion-safe:animate-[spx-twinkle_2.8s_ease-in-out_1.4s_infinite]" style={{ transformBox: "fill-box" }} d="M17.5 13.5c.3 2 1 3 3 3.4-2 .3-2.7 1.3-3 3.4-.3-2.1-1-3.1-3-3.4 2-.4 2.7-1.4 3-3.4Z" />
    </svg>
  );
}
