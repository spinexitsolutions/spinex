"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MessageCircle, Clock, Loader2, Send } from "lucide-react";
import { submitLead } from "@/lib/leads";
import HumanCheck from "../HumanCheck";
import { useContent } from "../ContentProvider";
import { SplitHeading, ease } from "../Reveal";

const steps = ["What do you need?", "How big is it?", "Any extras?"];

export default function Planner() {
  const { content } = useContent();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const plan = content.planner;
  const sizes = plan.sizes.length ? plan.sizes : [{ id: "s", label: "Standard", hint: "", factor: 1 }];
  const extras = plan.extras;
  // Days for a service, set in Admin → Project planner (7–14 days if not set).
  const timeFor = (id: string) => plan.times.find((t) => t.id === id) ?? { id, min: 7, max: 14, monthly: false };
  const isMonthly = (id: string) => timeFor(id).monthly;
  const [sizeId, setSizeId] = useState(sizes[0].id);
  const size = sizes.find((x) => x.id === sizeId) ?? sizes[0];
  const [extra, setExtra] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);
  const startedAt = useRef(Date.now());
  const [cfToken, setCfToken] = useState("");
  const [hcKey, setHcKey] = useState(0);

  // The goal picker above can pre-select services and jump straight to step 2.
  useEffect(() => {
    const onPlan = (e: Event) => {
      const ids = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(ids) && ids.length) {
        setPicked(ids);
        setStep(1);
      }
    };
    window.addEventListener("spinex:plan", onPlan);
    return () => {
      window.removeEventListener("spinex:plan", onPlan);
    };
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const chosen = content.services.filter((s) => picked.includes(s.id));
  const builds = chosen.filter((s) => !isMonthly(s.id));
  const monthly = chosen.filter((s) => isMonthly(s.id));
  const extraDays = extras.filter((e) => extra.includes(e.id)).reduce((n, e) => n + (Number(e.days) || 0), 0);
  const range = builds.reduce<[number, number]>(
    ([lo, hi], s) => {
      const t = timeFor(s.id);
      const f = Number(size.factor) || 1;
      return [Math.max(lo, (Number(t.min) || 0) * f), hi + (Number(t.max) || 0) * f];
    },
    [0, 0],
  );
  const weeks = builds.length ? [Math.max(1, Math.round((range[0] + extraDays) / 7)), Math.max(1, Math.ceil((range[1] + extraDays) / 7))] : null;
  if (weeks && weeks[1] < weeks[0]) weeks[1] = weeks[0];
  // Long builds read better in months.
  const duration = !weeks ? "" : weeks[1] > 8
    ? (() => { const a = Math.max(1, Math.round(weeks[0] / 4.3)); const b = Math.max(a, Math.ceil(weeks[1] / 4.3)); return a === b ? `${a} month${a > 1 ? "s" : ""}` : `${a}–${b} months`; })()
    : weeks[0] === weeks[1] ? `${weeks[0]} week${weeks[0] > 1 ? "s" : ""}` : `${weeks[0]}–${weeks[1]} weeks`;

  const message = () =>
    [
      `Hi Spinex, I planned a project on your website${name ? ` (${name})` : ""}:`,
      `Services: ${chosen.map((s) => s.title).join(", ") || "Not sure yet"}`,
      `Size: ${size.label} (${size.hint})`,
      `Extras: ${extras.filter((e) => extra.includes(e.id)).map((e) => e.label).join(", ") || "None"}`,
      weeks ? `Estimated build time: ${duration}` : "",
    ].filter(Boolean).join("\n");

  // Saves the plan to the admin Leads inbox.
  const sendPlan = async () => {
    if (!name.trim() || phone.replace(/\D/g, "").length < 10) {
      setSendError("Add your name and a 10-digit phone number so we can send you a quote.");
      return;
    }
    setSendError("");
    setSending(true);
    const res = await submitLead({
      name,
      phone,
      services: chosen.map((s) => s.title).join(", "),
      plan: message(),
      source: "planner",
      startedAt: String(startedAt.current),
      cfToken,
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setCfToken("");
      setHcKey((k) => k + 1);
    } else {
      setSendError(res.error ?? "Couldn't send.");
      setCfToken("");
      setHcKey((k) => k + 1);
    }
  };

  const canNext = step !== 0 || picked.length > 0;

  return (
    <section id="planner" className="scroll-mt-24 bg-mist py-24 sm:py-32">
      <div className="container-x">
        <div className="mb-12 max-w-2xl">
          <SplitHeading key={content.sections.planner.heading} text={content.sections.planner.heading} className="h-display text-4xl sm:text-6xl" />
          <p className="mt-5 text-lg text-muted">{content.sections.planner.intro}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[28px] border border-line bg-white p-6 sm:p-10">
            <ol className="mb-8 flex gap-2" aria-label="Progress">
              {steps.map((s, i) => (
                <li key={s} className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <motion.div className="h-full bg-lav-600" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.5, ease }} />
                  </div>
                  <p className={`mt-2 text-xs ${i === step ? "font-semibold text-ink" : "text-muted"}`}>Step {i + 1}</p>
                </li>
              ))}
            </ol>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease }}>
                <h3 className="font-display text-2xl font-semibold tracking-tight">{steps[step]}</h3>

                {step === 0 && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {content.services.map((s) => (
                      <Choice key={s.id} on={picked.includes(s.id)} onClick={() => toggle(picked, setPicked, s.id)} title={s.title} hint={s.short} />
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-6 grid gap-3">
                    {sizes.map((s) => (
                      <Choice key={s.id} radio on={size.id === s.id} onClick={() => setSizeId(s.id)} title={s.label} hint={s.hint} />
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {extras.map((e) => (
                        <Choice key={e.id} on={extra.includes(e.id)} onClick={() => toggle(extra, setExtra, e.id)} title={e.label} />
                      ))}
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Your name *</span>
                        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Phone *</span>
                        <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                      </label>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {step === 0 && !canNext && <p className="mt-4 text-sm text-muted">Pick at least one service to continue.</p>}
            {step === steps.length - 1 && <p className="mt-4 text-xs text-muted">By sending your plan you agree to our <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.</p>}
            {step === steps.length - 1 && <HumanCheck key={hcKey} onToken={setCfToken} />}
            {sendError && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {sendError}{" "}
                {name && <a href={`https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(message())}`} target="_blank" rel="noreferrer" className="font-semibold underline">Send on WhatsApp instead</a>}
              </p>
            )}
            {sent && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> Thanks {name.split(" ")[0]}! We got your plan and will call you on {phone} with a quote, usually within a day.
                <a href={`https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(message())}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold underline"><MessageCircle size={14} /> WhatsApp</a>
              </p>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="btn-ghost disabled:invisible">
                <ArrowLeft size={17} /> Back
              </button>
              {step < steps.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn-dark disabled:opacity-40">
                  Next <ArrowRight size={17} />
                </button>
              ) : (
                <button onClick={sendPlan} disabled={sending || sent} className="btn-dark disabled:opacity-60">
                  {sending ? <><Loader2 size={17} className="animate-spin" /> Sending</> : sent ? <><Check size={17} /> Plan sent</> : <><Send size={17} /> Send my plan</>}
                </button>
              )}
            </div>
          </div>

          <aside className="rounded-[28px] bg-ink p-6 text-white sm:p-8 lg:sticky lg:top-28 lg:self-start" aria-live="polite">
            <h3 className="font-display text-xl font-semibold">Your plan</h3>
            <ul className="mt-6 min-h-[120px] space-y-2">
              <AnimatePresence initial={false}>
                {chosen.length === 0 && (
                  <motion.li key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-white/55">
                    Nothing selected yet.
                  </motion.li>
                )}
                {chosen.map((s) => (
                  <motion.li key={s.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-lav-600"><Check size={13} /></span>
                    {s.title}
                    {isMonthly(s.id) && <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">Monthly</span>}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <dl className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-white/55">Size</dt><dd>{size.label}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/55">Extras</dt><dd className="text-right">{extra.length ? `${extra.length} selected` : "None"}</dd></div>
            </dl>

            <div className="mt-6 rounded-2xl bg-white/5 p-5">
              <p className="flex items-center gap-2 text-sm text-white/55"><Clock size={15} /> Estimated build time</p>
              <AnimatePresence mode="wait">
                <motion.p key={duration || "none"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-display mt-2 text-4xl">
                  {weeks ? duration : monthly.length ? "Ongoing" : "—"}
                </motion.p>
              </AnimatePresence>
              {monthly.length > 0 && <p className="mt-2 text-sm text-white/55">{monthly.map((s) => s.title).join(" and ")} run month to month.</p>}
              {plan.note && <p className="mt-3 text-xs text-white/55">{plan.note}</p>}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Choice({ on, onClick, title, hint, radio }: { on: boolean; onClick: () => void; title: string; hint?: string; radio?: boolean }) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={on}
      onClick={onClick}
      className={`flex min-h-[56px] items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${on ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
    >
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border ${radio ? "rounded-full" : "rounded-md"} ${on ? "border-lav-300 bg-lav-500" : "border-line"}`}>
        {on && <Check size={12} />}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        {hint && <span className={`mt-0.5 block text-sm ${on ? "text-white/65" : "text-muted"}`}>{hint}</span>}
      </span>
    </button>
  );
}
