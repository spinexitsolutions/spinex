"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";
import { useContent } from "./ContentProvider";
import { submitLead } from "@/lib/leads";
import { ease } from "./Reveal";
import HumanCheck from "./HumanCheck";

type Form = { name: string; phone: string; email: string; services: string; budget: string; message: string };
const empty: Form = { name: "", phone: "", email: "", services: "", budget: "", message: "" };

// Contact page form: saves the enquiry to the admin Leads inbox.
export default function ContactForm({ defaultService = "", source = "contact" }: { defaultService?: string; source?: "contact" | "product" }) {
  const { content } = useContent();
  const [form, setForm] = useState<Form>({ ...empty, services: defaultService });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Form | null>(null);
  const startedAt = useRef(Date.now());
  const [cfToken, setCfToken] = useState("");
  const [hcKey, setHcKey] = useState(0);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const whatsapp = (f: Form) =>
    `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(`Hi Spinex, I'm ${f.name}. ${f.services ? `I need help with ${f.services}. ` : ""}${f.message}`.trim())}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Enter your name.";
    if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a 10-digit phone number.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Check the email address.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    setError("");
    const res = await submitLead({ ...form, source, startedAt: String(startedAt.current), cfToken, website: ((e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null)?.value ?? "" });
    setSending(false);
    if (res.ok) {
      setDone(form);
      setHcKey((k) => k + 1);
      setForm({ ...empty, services: defaultService });
    } else {
      if (res.errors) setErrors(res.errors);
      setError(res.error ?? "Couldn't send.");
    }
  };

  return (
    <div className="rounded-[28px] border border-line bg-white p-6 shadow-[0_30px_70px_-40px_rgba(18,15,27,0.35)] sm:p-10">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease }} role="status" className="py-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
            <h3 className="mt-5 font-display text-3xl font-semibold tracking-tight">Thanks, {done.name.split(" ")[0]}!</h3>
            <p className="mx-auto mt-2 max-w-sm text-muted">We&apos;ve got your enquiry and will call you on {done.phone} within a day.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={whatsapp(done)} target="_blank" rel="noreferrer" className="btn-dark"><MessageCircle size={17} /> Chat on WhatsApp now</a>
              <button onClick={() => setDone(null)} className="btn-ghost">Send another</button>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name *" error={errors.name}><input className="input" value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} /></Field>
              <Field label="Phone *" error={errors.phone}><input className="input" value={form.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} /></Field>
              <Field label="Email" error={errors.email}><input className="input" value={form.email} onChange={set("email")} type="email" autoComplete="email" aria-invalid={!!errors.email} /></Field>
              <Field label="What do you need?">
                <select className="input" value={form.services} onChange={set("services")}>
                  <option value="">Not sure yet</option>
                  {defaultService && !content.services.some((s) => s.title === defaultService) && <option>{defaultService}</option>}
                  {content.services.map((s) => <option key={s.id}>{s.title}</option>)}
                </select>
              </Field>
              <Field label="Budget" className="sm:col-span-2">
                <select className="input" value={form.budget} onChange={set("budget")}>
                  <option value="">To discuss</option>
                  <option>Under ₹25,000</option>
                  <option>₹25,000 – ₹75,000</option>
                  <option>₹75,000 – ₹2,00,000</option>
                  <option>Above ₹2,00,000</option>
                </select>
              </Field>
              <Field label="Tell us about the project" className="sm:col-span-2">
                <textarea className="input min-h-[140px] resize-y" value={form.message} onChange={set("message")} />
              </Field>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            </div>
            {error && (
              <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}{" "}
                <a href={whatsapp(form)} target="_blank" rel="noreferrer" className="font-semibold underline">Send on WhatsApp instead</a>
              </p>
            )}
            <HumanCheck key={hcKey} onToken={setCfToken} />
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={sending} className="btn-dark disabled:opacity-60">
                {sending ? <><Loader2 size={18} className="animate-spin" /> Sending</> : <><Send size={18} /> Send enquiry</>}
              </button>
              <a href={`https://wa.me/${content.contact.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
                <MessageCircle size={16} /> Or chat on WhatsApp
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">By sending this form you agree to our <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-sm text-red-600" role="alert">{error}</span>}
    </label>
  );
}
