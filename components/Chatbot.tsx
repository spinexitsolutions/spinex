"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Check, MessageSquare, Mic, Pause, Send, Sparkles, Square, X } from "lucide-react";
import { useContent } from "./ContentProvider";
import { localAnswer } from "@/lib/chat";
import { voiceSettings } from "@/lib/content";
import { listen, speak, stopListening, stopSpeaking, unlockAudio, voiceSupported, type VoiceLang } from "@/lib/voice";
import { submitLead } from "@/lib/leads";
import { checkPhone, isEmail } from "@/lib/phone";
import HumanCheck from "./HumanCheck";
import { ease } from "./Reveal";
import { useFloatLift } from "@/lib/useFloatLift";

type Msg = { role: "user" | "assistant"; content: string };
type Lead = { name: string; phone: string; email: string; needs: string };
type Phase = "idle" | "listening" | "thinking" | "speaking";
const LANGS: [VoiceLang, string][] = [["en", "English"], ["hi", "Hindi"], ["hinglish", "Hinglish"]];
const MIC_HELP: Record<string, string> = {
  denied: "Please allow the microphone for this website, then tap the mic again.",
  "no-mic": "No microphone found on this device.",
  error: "Couldn't hear that. Tap the mic and try again.",
};

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
  const voice = voiceSettings(content);
  const [canTalk, setCanTalk] = useState(false);
  const [talking, setTalking] = useState(false); // full voice mode
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [spoken, setSpoken] = useState("");
  const [vlang, setVlang] = useState<VoiceLang>(voice.lang);
  const [micNote, setMicNote] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadDone, setLeadDone] = useState(false);
  const run = useRef(0); // bumps to cancel a running listen/answer/speak loop
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;
  const startedAt = useRef(Date.now());

  useEffect(() => setCanTalk(voice.enabled && voiceSupported()), [voice.enabled]);
  useEffect(() => setVlang(voice.lang), [voice.lang]);

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
    if (!open) endTalk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  // Sends a question and returns the answer (from the AI when a key is set, otherwise from the FAQ list).
  async function ask(q: string, spokenMode: boolean): Promise<string> {
    const next: Msg[] = [...msgsRef.current, { role: "user", content: q }];
    msgsRef.current = next;
    setMsgs(next);
    setTyping(true);
    let reply = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m, i) => !(i === 0 && m.role === "assistant")), voice: spokenMode, lang: spokenMode ? vlang : undefined, leadDone }),
      });
      if (res.ok) {
        const data = await res.json();
        reply = data.reply ?? "";
        if (data.lead && !leadDone) setLead({ name: data.lead.name ?? "", phone: data.lead.phone ?? "", email: data.lead.email ?? "", needs: data.lead.needs ?? "" });
      }
    } catch {
      /* offline or no API key: use built-in answers */
    }
    if (!reply) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
      reply = localAnswer(q, content);
    }
    const withReply: Msg[] = [...msgsRef.current, { role: "assistant", content: reply }];
    msgsRef.current = withReply;
    setMsgs(withReply);
    setTyping(false);
    return reply;
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || typing) return;
    setInput("");
    await ask(q, false);
  }

  // Mic in the text box: hear one question, then send it.
  async function micOnce() {
    stopSpeaking();
    setMicNote("");
    setPhase("listening");
    try {
      const said = await listen(vlang, (w) => setInput(w));
      setPhase("idle");
      if (said) send(said);
    } catch (e) {
      setPhase("idle");
      setMicNote(MIC_HELP[(e as Error).message] ?? MIC_HELP.error);
    }
  }

  // Full voice mode: listen → answer → speak, again and again, until the visitor stops it.
  async function loop(id: number) {
    while (run.current === id) {
      setHeard("");
      setPhase("listening");
      let said = "";
      // Phones often stop listening after a short pause or before the visitor starts talking;
      // keep listening (up to 4 tries) instead of switching off.
      for (let tries = 0; tries < 4 && !said; tries++) {
        try {
          said = await listen(vlang, setHeard);
        } catch (e) {
          if (run.current !== id) return;
          const why = (e as Error).message;
          if (why === "error" && tries < 3) continue;
          setMicNote(MIC_HELP[why] ?? MIC_HELP.error);
          setPhase("idle");
          return;
        }
        if (run.current !== id) return;
      }
      if (!said) {
        setPhase("idle");
        return;
      }
      setPhase("thinking");
      const reply = await ask(said, true);
      if (run.current !== id) return;
      setSpoken(reply);
      setPhase("speaking");
      await speak(reply, vlang, voice.voice, voice.engine);
      if (run.current !== id) return;
      // A details card on screen waits for the visitor before listening again.
      if (leadRef.current) {
        setPhase("idle");
        return;
      }
    }
  }
  const leadRef = useRef<Lead | null>(null);
  leadRef.current = lead;

  function startTalk() {
    unlockAudio();
    setMicNote("");
    setTalking(true);
    const id = ++run.current;
    const hello = msgsRef.current.length <= 1 ? voice.greeting.trim() : "";
    setSpoken(hello);
    if (hello) {
      setPhase("speaking");
      // Started inside the tap, so phones allow the sound.
      speak(hello, vlang, voice.voice, voice.engine).then(() => {
        if (run.current === id) void loop(id);
      });
    } else loop(id);
  }

  function listenAgain() {
    unlockAudio();
    stopSpeaking();
    stopListening();
    setMicNote("");
    const id = ++run.current;
    loop(id);
  }

  function pauseTalk() {
    run.current++;
    stopSpeaking();
    stopListening();
    setPhase("idle");
  }

  function endTalk() {
    run.current++;
    stopSpeaking();
    stopListening();
    setPhase("idle");
    setTalking(false);
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Ask our AI assistant"}
        title={open ? undefined : "Ask our AI assistant"}
        className={`fixed bottom-5 right-5 z-50 flex h-14 items-center rounded-full border border-white/15 bg-ink text-white shadow-[0_14px_40px_-12px_rgba(18,15,27,0.6)] ${open ? "w-14 justify-center max-sm:hidden" : "gap-2.5 p-1.5 sm:pr-5"}`}
        data-chat-launcher
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        initial={{ scale: 0 }}
        animate={{ scale: menuOpen ? 0.6 : 1, opacity: menuOpen ? 0 : 1, y: -lift }}
        style={{ pointerEvents: menuOpen ? "none" : undefined }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
              {/* Glowing orb: a slowly turning colour ring around the sparkle */}
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full">
                <span aria-hidden className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,#8b7bff,#c56cf0,#5ec8ff,#8b7bff)] motion-safe:animate-[spin_6s_linear_infinite]" />
                <span className="relative grid h-[34px] w-[34px] place-items-center rounded-full bg-ink"><AiSparkle /></span>
              </span>
              <span className="hidden whitespace-nowrap text-[15px] font-semibold sm:inline">Ask Spinex AI</span>
              <span aria-hidden className="hidden h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.25)] sm:inline-block" />
            </motion.span>
          )}
        </AnimatePresence>
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
            // Phones: almost full screen, above the bottom bar, with its own close button in the header.
            className="fixed inset-2 z-[60] flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_30px_80px_-20px_rgba(18,15,27,0.45)] sm:inset-auto sm:bottom-24 sm:right-5 sm:z-50 sm:h-[min(600px,calc(100dvh-8rem))] sm:w-[390px]"
            data-lenis-prevent
          >
            <div className="flex items-center gap-3 bg-ink px-5 py-4 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-lav-600"><Sparkles size={18} /></span>
              <div>
                <p className="font-semibold">{bot.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {talking ? "Voice mode" : "Replies instantly"}</p>
              </div>
              {canTalk && !talking && (
                <button type="button" onClick={startTalk} data-chat-talk className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-[13px] font-semibold transition hover:bg-white/20">
                  <AudioLines size={15} /> Talk
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" data-chat-close
                className={`${canTalk && !talking ? "" : "ml-auto"} grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20`}>
                <X size={20} />
              </button>
            </div>

            {talking ? (
              <VoicePane
                phase={phase} heard={heard} spoken={spoken} lang={vlang} note={micNote}
                setLang={(l) => { setVlang(l); if (phase === "listening") { stopListening(); } }}
                onOrb={() => (phase === "listening" ? pauseTalk() : listenAgain())}
                onMain={() => (phase === "idle" ? listenAgain() : pauseTalk())}
                onText={endTalk} onEnd={endTalk}
                leadCard={lead && <LeadCard lead={lead} msgs={msgs} startedAt={startedAt.current} done={leadDone} onChange={setLead} onSent={() => setLeadDone(true)} onClose={() => setLead(null)} dark />}
              />
            ) : (<>
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
              {lead && <LeadCard lead={lead} msgs={msgs} startedAt={startedAt.current} done={leadDone} onChange={setLead} onSent={() => setLeadDone(true)} onClose={() => setLead(null)} />}
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
              <input ref={field} value={input} onChange={(e) => setInput(e.target.value)} placeholder={phase === "listening" ? "Listening…" : canTalk ? "Type or tap the mic…" : "Type your question…"} className="min-w-0 flex-1 rounded-full bg-mist px-4 py-3 text-[14.5px] outline-none focus:ring-2 focus:ring-lav-200" aria-label="Message" />
              {canTalk && (
                <button type="button" onClick={() => (phase === "listening" ? stopListening() : micOnce())} aria-label={phase === "listening" ? "Stop listening" : "Speak your question"} data-chat-mic
                  className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${phase === "listening" ? "bg-red-500 text-white" : "bg-lav-100 text-lav-600 hover:bg-lav-200"}`}>
                  {phase === "listening" && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-red-400/40" />}
                  <Mic size={18} />
                </button>
              )}
              <button type="submit" disabled={!input.trim() || typing} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white transition disabled:opacity-40">
                <Send size={17} />
              </button>
            </form>
            {micNote && <p className="px-4 pb-2 text-center text-xs text-red-600">{micNote}</p>}
            </>)}
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
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path className="origin-center motion-safe:animate-[spx-twinkle_2.8s_ease-in-out_infinite]" style={{ transformBox: "fill-box" }} d="M10 2.5c.5 3.9 1.9 5.9 5.9 6.6-4 .7-5.4 2.7-5.9 6.6-.5-3.9-1.9-5.9-5.9-6.6 4-.7 5.4-2.7 5.9-6.6Z" />
      <path className="origin-center motion-safe:animate-[spx-twinkle_2.8s_ease-in-out_1.4s_infinite]" style={{ transformBox: "fill-box" }} d="M17.5 13.5c.3 2 1 3 3 3.4-2 .3-2.7 1.3-3 3.4-.3-2.1-1-3.1-3-3.4 2-.4 2.7-1.4 3-3.4Z" />
    </svg>
  );
}

// Voice mode screen: the glowing orb, what was heard or said, and the controls.
function VoicePane({ phase, heard, spoken, lang, note, setLang, onOrb, onMain, onText, onEnd, leadCard }: {
  phase: Phase; heard: string; spoken: string; lang: VoiceLang; note: string; setLang: (l: VoiceLang) => void;
  onOrb: () => void; onMain: () => void; onText: () => void; onEnd: () => void; leadCard: React.ReactNode;
}) {
  const label = { listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…", idle: "Tap the mic to speak" }[phase];
  const text = phase === "listening" ? heard : phase === "thinking" ? heard : spoken;
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-y-auto bg-[radial-gradient(120%_80%_at_50%_20%,#2a1f6b,#120f1b_70%)] px-5 pb-5 pt-5 text-center text-white" data-voice-pane>
      <div className="flex rounded-full bg-white/[0.08] p-1 text-xs" role="group" aria-label="Language">
        {LANGS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setLang(k)} aria-pressed={lang === k} className={`rounded-full px-3 py-1.5 transition ${lang === k ? "bg-white font-semibold text-ink" : "text-white/60 hover:text-white"}`}>{l}</button>
        ))}
      </div>

      <button type="button" onClick={onOrb} aria-label={phase === "listening" ? "Stop listening" : "Speak now"} className={`relative grid place-items-center transition-all duration-500 ${leadCard ? "mb-3 mt-5 h-24 w-24" : "mb-5 mt-9 h-40 w-40"}`}>
        {(phase === "listening" || phase === "speaking") && (
          <>
            <motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-lav-400/40" animate={{ scale: [1, 1.25], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
            <motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-lav-400/30" animate={{ scale: [1, 1.25], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.8 }} />
          </>
        )}
        <span aria-hidden className={`absolute inset-[6%] rounded-full bg-[conic-gradient(from_200deg,#8b7bff,#c56cf0,#5ec8ff,#8b7bff)] shadow-[0_0_60px_rgba(139,123,255,.55)] ${phase === "thinking" ? "animate-[spin_1.6s_linear_infinite]" : "motion-safe:animate-[spin_8s_linear_infinite]"}`} />
        <span className="relative grid h-[76%] w-[76%] place-items-center rounded-full bg-[#16122a]">
          {phase === "speaking" ? <Bars /> : phase === "thinking" ? <Sparkles size={30} /> : <Mic size={leadCard ? 26 : 36} className={phase === "listening" ? "" : "opacity-70"} />}
        </span>
      </button>

      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lav-300" aria-live="polite">{label}</p>
      {text && !leadCard && <p className="mt-3 max-w-[30ch] text-[16px] font-medium leading-relaxed">{phase === "listening" || phase === "thinking" ? `“${text}”` : text}</p>}
      {note && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{note}</p>}
      {leadCard}

      <div className="mt-auto flex items-center gap-4 pt-6">
        <button type="button" onClick={onText} aria-label="Back to text chat" className="grid h-12 w-12 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"><MessageSquare size={19} /></button>
        <button type="button" onClick={onMain} aria-label={phase === "idle" ? "Speak" : "Pause"} data-voice-main className="grid h-16 w-16 place-items-center rounded-full bg-white text-ink transition hover:scale-105">
          {phase === "idle" ? <Mic size={24} /> : phase === "speaking" ? <Pause size={22} fill="currentColor" /> : <Square size={20} fill="currentColor" />}
        </button>
        <button type="button" onClick={onEnd} aria-label="End voice mode" className="grid h-12 w-12 place-items-center rounded-full bg-red-500 transition hover:bg-red-600"><X size={20} /></button>
      </div>
      <p className="mt-3 text-[11.5px] text-white/45">{phase === "speaking" ? "Tap the orb to interrupt and speak" : "Your words appear as you speak"}</p>
    </div>
  );
}

function Bars() {
  return (
    <span className="flex h-10 items-center gap-1" aria-hidden>
      {[0.5, 0.8, 1, 0.65, 0.9, 0.45].map((h, i) => (
        <motion.i key={i} className="block w-[5px] rounded-full bg-gradient-to-b from-[#c56cf0] to-[#8b7bff]" style={{ height: `${h * 100}%` }} animate={{ scaleY: [0.4, 1, 0.55, 0.9, 0.4] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.09 }} />
      ))}
    </span>
  );
}

// The details the assistant collected, shown for the visitor to check and send. Saved as a lead ("AI assistant").
function LeadCard({ lead, msgs, startedAt, done, onChange, onSent, onClose, dark = false }: {
  lead: Lead; msgs: Msg[]; startedAt: number; done: boolean; onChange: (l: Lead) => void; onSent: () => void; onClose: () => void; dark?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cfToken, setCfToken] = useState("");
  const set = (k: keyof Lead) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...lead, [k]: e.target.value });
  // "neha at the rate gmail dot com" → neha@gmail.com, and "98290 12345" → 9829012345, when the field is left.
  const tidy = (k: "email" | "phone") => () => onChange({ ...lead, [k]: k === "email" ? tidyEmail(lead.email) : tidyPhone(lead.phone) });

  async function sendLead() {
    setErr("");
    if (!lead.name.trim()) return setErr("Please add your name.");
    const phone = tidyPhone(lead.phone);
    const email = tidyEmail(lead.email);
    if (phone !== lead.phone || email !== lead.email) onChange({ ...lead, phone, email });
    if (!checkPhone(phone).ok) return setErr("Please check the mobile number (10 digits).");
    if (!isEmail(email)) return setErr("Please check the email address.");
    setBusy(true);
    const talk = msgs.slice(-12).map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`).join("\n");
    const r = await submitLead({ name: lead.name, phone, email, services: lead.needs, message: `From the AI assistant on the website.\n\n${talk}`.slice(0, 1900), source: "assistant", startedAt: String(startedAt), cfToken, website: "" });
    setBusy(false);
    if (r.ok) onSent();
    else setErr(r.error || "Couldn't send. Please try again or use WhatsApp.");
  }

  const box = `mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[13.5px] outline-none ${dark ? "border-line bg-white text-ink" : "border-line bg-white"}`;
  return (
    <div className={`w-full rounded-2xl border border-line bg-white p-4 text-left text-ink ${dark ? "mt-4" : ""}`} data-lead-card>
      {done ? (
        <p className="flex items-center gap-2 text-[14px] font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={14} strokeWidth={3} /></span> Details sent. Our team will contact you soon.</p>
      ) : (
        <>
          <p className="text-[14px] font-semibold">Check your details</p>
          <p className="text-xs text-muted">We&apos;ll send these to the Spinex team so they can contact you.</p>
          <div className="mt-2.5 grid gap-2">
            <label className="text-xs text-muted">Name<input className={box} value={lead.name} onChange={set("name")} autoComplete="name" /></label>
            <label className="text-xs text-muted">Mobile number<input className={box} type="tel" value={lead.phone} onChange={set("phone")} onBlur={tidy("phone")} inputMode="tel" autoComplete="tel" maxLength={16} /></label>
            <label className="text-xs text-muted">Email<input className={box} type="email" value={lead.email} onChange={set("email")} onBlur={tidy("email")} inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} /></label>
            <label className="text-xs text-muted">What you need<input className={box} value={lead.needs} onChange={set("needs")} /></label>
          </div>
          <HumanCheck onToken={setCfToken} />
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={sendLead} disabled={busy} className="flex-1 rounded-full bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Send to the team"}</button>
            <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2.5 text-[13.5px]">Not now</button>
          </div>
        </>
      )}
    </div>
  );
}

function tidyEmail(v: string) {
  let e = v.trim().toLowerCase();
  if (!e.includes("@")) e = e.replace(/\s*(at the rate of|at the rate|at sign|attherate|at)\s+/, "@");
  return e.replace(/\s*(dot|point)\s*/g, ".").replace(/\s+/g, "").replace(/\.+/g, ".");
}
const tidyPhone = (v: string) => v.trim().replace(/(?!^\+)[^\d]/g, "");
