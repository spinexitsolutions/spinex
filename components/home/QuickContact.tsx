"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { submitLead } from "@/lib/leads";
import HumanCheck from "../HumanCheck";
import { useContent } from "../ContentProvider";
import { SplitHeading, ease } from "../Reveal";

// Home page contact: one-tap ways to reach us, plus a short form that opens WhatsApp or email.
export default function QuickContact() {
  const { content } = useContent();
  const c = content.contact;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [need, setNeed] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState("");
  const startedAt = useRef(Date.now());
  const [cfToken, setCfToken] = useState("");
  const [hcKey, setHcKey] = useState(0);

  const methods = [
    { Icon: Phone, label: "Call us", value: `+91 ${c.phone}`, href: `tel:+91${c.phone}` },
    { Icon: MessageCircle, label: "WhatsApp", value: "Chat now", href: `https://wa.me/${c.whatsapp}` },
    { Icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    { Icon: MapPin, label: "Visit", value: c.location, href: `https://maps.google.com/?q=${encodeURIComponent(c.location)}` },
  ];

  const text = () =>
    [
      `Hi Spinex, I'm ${name}.`,
      phone && `Phone: ${phone}`,
      need.length ? `I need: ${need.join(", ")}` : "",
      message,
    ].filter(Boolean).join("\n");

  // Saves the enquiry to the admin Leads inbox; WhatsApp stays as a backup.
  const send = async (honeypot: string) => {
    if (!name.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Add your name and a 10-digit phone number so we can call you back.");
      return;
    }
    setError("");
    setSending(true);
    const res = await submitLead({ name, phone, services: need.join(", "), message, source: "home", website: honeypot, startedAt: String(startedAt.current), cfToken });
    setSending(false);
    if (res.ok) {
      setDone(name.split(" ")[0]);
      setCfToken("");
      setHcKey((k) => k + 1);
      setName("");
      setPhone("");
      setNeed([]);
      setMessage("");
    } else {
      setError(res.error ?? "Couldn't send.");
      setCfToken("");
      setHcKey((k) => k + 1);
    }
  };

  return (
    <section id="contact" className="scroll-mt-24 bg-white px-3 py-3 sm:px-5 sm:py-5">
      <div className="relative overflow-hidden rounded-[32px] bg-ink px-5 py-16 text-white sm:px-10 sm:py-24 grain">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-lav-600/30 blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-[1180px] gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <SplitHeading key={c.email + content.sections.contact.heading} text={content.sections.contact.heading} className="h-display text-4xl sm:text-6xl" />
            <p className="mt-5 max-w-md text-lg text-white/65">{content.sections.contact.intro}</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {methods.map(({ Icon, label, value, href }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.6, ease }}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-lav-400 hover:bg-white/10"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lav-600 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-white/55">{label}</span>
                    <span className="block truncate font-semibold">{value}</span>
                  </span>
                </motion.a>
              ))}
            </div>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease }}
            onSubmit={(e) => {
              e.preventDefault();
              send(((e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null)?.value ?? "");
            }}
            noValidate
            className="rounded-[28px] bg-white p-6 text-ink sm:p-8"
          >
            <h3 className="font-display text-2xl font-semibold tracking-tight">Send a quick message</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Your name *</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Phone *</span>
                <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </label>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium">What do you need?</legend>
              <div className="flex flex-wrap gap-2">
                {content.services.map((s) => {
                  const on = need.includes(s.title);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setNeed(on ? need.filter((x) => x !== s.title) : [...need, s.title])}
                      className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${on ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-ink hover:text-ink"}`}
                    >
                      {s.title}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium">Message (optional)</span>
              <textarea className="input min-h-[100px] resize-y" value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>

            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}{" "}
                {name && <a href={`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text())}`} target="_blank" rel="noreferrer" className="font-semibold underline">Send on WhatsApp instead</a>}
              </p>
            )}

            {done && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                <CheckCircle2 size={16} /> Thanks {done}, we got your message and will call you within a day.
              </p>
            )}

            <HumanCheck key={hcKey} onToken={setCfToken} />
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={sending} className="btn-dark disabled:opacity-60">
                {sending ? <><Loader2 size={17} className="animate-spin" /> Sending</> : <><Send size={17} /> Send message</>}
              </button>
              <a href={`mailto:${c.email}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink"><Mail size={16} /> Or email us</a>
            </div>
            <p className="mt-4 text-xs text-muted">By sending this form you agree to our <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.</p>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
