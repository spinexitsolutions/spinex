"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Check, Code2, Megaphone, Palette, Clapperboard, Heart, Briefcase, MessageCircle, Sparkles, Upload, Loader2, PartyPopper, type LucideIcon } from "lucide-react";
import { useContent } from "./ContentProvider";
import HumanCheck from "./HumanCheck";
import { track } from "@/lib/track";
import { Reveal, SplitHeading, ease } from "./Reveal";

const roleIcons: Record<string, LucideIcon> = { "r-web": Code2, "r-design": Palette, "r-video": Clapperboard, "r-social": Heart, "r-marketing": Megaphone };

const steps = [
  { title: "Apply", text: "Fill the form below. It takes about two minutes." },
  { title: "Short call", text: "We call you to know you and what you want to learn." },
  { title: "Small task", text: "A small practice task related to your role." },
  { title: "Start", text: "You join the team and start on real projects." },
];

type Form = { name: string; email: string; phone: string; city: string; college: string; role: string; duration: string; mode: string; link: string; why: string };
const empty: Form = { name: "", email: "", phone: "", city: "", college: "", role: "", duration: "", mode: "", link: "", why: "" };

export default function InternshipContent() {
  const { content } = useContent();
  const intern = content.internship;
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "resume", string>>>({});
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");
  const startedAt = useRef(Date.now());
  const [cfToken, setCfToken] = useState("");
  const [hcKey, setHcKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const applyFor = (title: string) => {
    setForm((f) => ({ ...f, role: title }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) e.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email, like name@gmail.com.";
    if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a 10-digit phone number.";
    if (!form.role) e.role = "Choose the role you want to apply for.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const whatsappText = () =>
    [
      `Internship application: ${form.role}`,
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone}`,
      form.college && `College / course: ${form.college}`,
    ].filter(Boolean).join("\n");

  const submit = async () => {
    setServerError("");
    if (!validate()) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    if (resume && resume.type !== "application/pdf") {
      setErrors((e) => ({ ...e, resume: "Upload your resume as a PDF." }));
      return;
    }
    if (resume && resume.size > 3 * 1024 * 1024) {
      setErrors((e) => ({ ...e, resume: "Resume must be under 3 MB." }));
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData(formRef.current ?? undefined);
      (Object.keys(form) as (keyof Form)[]).forEach((k) => fd.set(k, form[k]));
      fd.set("startedAt", String(startedAt.current));
      fd.set("cfToken", cfToken);
      fd.set("kind", "internship");
      if (resume) fd.set("resume", resume);
      else fd.delete("resume");
      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.error || "Couldn't send your application. Try again.");
      }
      setDone(true);
      track("apply", { kind: "internship", role: form.role });
      setForm(empty);
      setResume(null);
      setCfToken("");
      setHcKey((k) => k + 1);
    } catch (e) {
      setCfToken("");
      setHcKey((k) => k + 1);
      setServerError(e instanceof Error ? e.message : "Couldn't send your application. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Roles */}
      <section className="bg-white py-24 sm:py-28">
        <div className="container-x">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SplitHeading text="Open roles." className="h-display text-4xl sm:text-6xl" />
            <p className="max-w-md text-muted">{intern.intro}</p>
          </div>

          {!intern.open ? (
            <div className="rounded-[28px] border border-line bg-mist p-10 text-center">
              <h3 className="font-display text-2xl font-semibold">Applications are closed right now.</h3>
              {/^https?:\/\//i.test(content.contact.instagram?.trim() ?? "") && (
                <p className="mt-2 text-muted">
                  <a href={content.contact.instagram.trim()} target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-4 hover:text-lav-700">Follow us on Instagram</a> to hear when the next batch opens.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {intern.roles.map((r, i) => {
                const Icon = roleIcons[r.id] ?? Briefcase;
                const chosen = form.role === r.title;
                return (
                  <motion.article
                    key={r.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease }}
                    className={`group flex flex-col rounded-[24px] border p-6 transition-colors ${chosen ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}
                  >
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 ${chosen ? "bg-lav-600" : "bg-lav-100 text-lav-700"}`}>
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight">{r.title}</h3>
                    <p className={`mt-2 ${chosen ? "text-white/70" : "text-muted"}`}>{r.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {r.skills.map((s) => (
                        <span key={s} className={`rounded-full px-2.5 py-1 text-xs ${chosen ? "bg-white/10 text-white/80" : "bg-mist text-muted"}`}>{s}</span>
                      ))}
                    </div>
                    <button onClick={() => applyFor(r.title)} className={`mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${chosen ? "bg-white text-ink" : "bg-ink text-white hover:bg-lav-700"}`}>
                      {chosen ? <><Check size={16} /> Selected</> : <>Apply for this role <ArrowDown size={16} /></>}
                    </button>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Perks and process */}
      <section className="bg-ink py-24 text-white sm:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-2">
          <div>
            <SplitHeading text="What you get." className="h-display text-4xl sm:text-5xl" />
            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
              {intern.perks.map((p, i) => (
                <motion.li key={p} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, ease }} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lav-600"><Sparkles size={14} /></span>
                  <span className="text-[15px] leading-snug">{p}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          <div>
            <SplitHeading text="How it works." className="h-display text-4xl sm:text-5xl" />
            <ol className="relative mt-10 space-y-6 border-l border-white/15 pl-8">
              {steps.map((s, i) => (
                <motion.li key={s.title} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, ease }} className="relative">
                  <span className="absolute -left-[49px] grid h-9 w-9 place-items-center rounded-full bg-white font-display text-sm font-bold text-ink">{i + 1}</span>
                  <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-1 text-white/65">{s.text}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Application form */}
      {intern.open && (
        <section className="bg-mist py-24 sm:py-28">
          <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.4fr]">
            <div>
              <SplitHeading text="Apply now." className="h-display text-4xl sm:text-6xl" />
              <Reveal delay={0.1}>
                <p className="mt-5 max-w-sm text-lg text-muted">Fill the form and attach your resume. We read every application and reply within a few days.</p>
              </Reveal>
            </div>

            {done ? (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }} role="status" className="grid place-items-center rounded-[28px] border border-line bg-white p-10 text-center sm:p-16">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-lav-600 text-white"><PartyPopper size={28} /></span>
                <h3 className="mt-6 font-display text-3xl font-semibold tracking-tight">Application received</h3>
                <p className="mt-3 max-w-md text-muted">Thanks for applying. We&apos;ll review it and contact you on the phone number or email you gave us.</p>
                <button onClick={() => setDone(false)} className="btn-ghost mt-8">Submit another application</button>
              </motion.div>
            ) : (
            <form ref={formRef} noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="scroll-mt-28 rounded-[28px] border border-line bg-white p-6 shadow-[0_30px_70px_-40px_rgba(18,15,27,0.35)] sm:p-10">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required error={errors.name}><input className="input" value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} /></Field>
                <Field label="Email" required error={errors.email}><input className="input" type="email" value={form.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} /></Field>
                <Field label="Phone" required error={errors.phone}><input className="input" type="tel" inputMode="numeric" value={form.phone} onChange={set("phone")} autoComplete="tel" aria-invalid={!!errors.phone} /></Field>
                <Field label="City"><input className="input" value={form.city} onChange={set("city")} autoComplete="address-level2" /></Field>
                <Field label="College and course" className="sm:col-span-2"><input className="input" value={form.college} onChange={set("college")} placeholder="e.g. BCA 2nd year, XYZ College" /></Field>
                <Field label="Role" required error={errors.role}>
                  <select className="input" value={form.role} onChange={set("role")} aria-invalid={!!errors.role}>
                    <option value="">Choose a role</option>
                    {intern.roles.map((r) => <option key={r.id}>{r.title}</option>)}
                  </select>
                </Field>
                <Field label="How long can you intern?">
                  <select className="input" value={form.duration} onChange={set("duration")}>
                    <option value="">Choose duration</option>
                    {intern.durations.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium">Work mode</legend>
                  <div className="flex flex-wrap gap-2">
                    {intern.modes.map((m) => {
                      const on = form.mode === m;
                      return (
                        <button key={m} type="button" aria-pressed={on} onClick={() => setForm({ ...form, mode: m })} className={`min-h-11 rounded-full border px-4 text-sm transition-colors ${on ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-ink hover:text-ink"}`}>
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium">Resume <span className="font-normal text-muted">PDF, up to 3 MB</span></span>
                  <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition-colors ${errors.resume ? "border-red-300" : resume ? "border-lav-500 bg-lav-100/50" : "border-line hover:border-ink"}`}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-white"><Upload size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{resume ? resume.name : "Choose your resume"}</span>
                      <span className="block text-sm text-muted">{resume ? `${(resume.size / 1024 / 1024).toFixed(1)} MB, tap to change` : "Optional, but it helps us a lot"}</span>
                    </span>
                    <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { setResume(e.target.files?.[0] ?? null); setErrors((x) => ({ ...x, resume: undefined })); }} />
                  </label>
                  {errors.resume && <span className="mt-1.5 block text-sm text-red-600" role="alert">{errors.resume}</span>}
                </div>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <Field label="Portfolio link" hint="Behance, GitHub, Drive or LinkedIn" className="sm:col-span-2"><input className="input" type="url" value={form.link} onChange={set("link")} placeholder="https://" /></Field>
                <Field label="Why do you want to join?" className="sm:col-span-2"><textarea className="input min-h-[120px] resize-y" value={form.why} onChange={set("why")} /></Field>
              </div>

              {serverError && (
                <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {serverError}{" "}
                  <a href={`https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(whatsappText())}`} target="_blank" rel="noreferrer" className="font-semibold underline">Apply on WhatsApp instead</a>
                </p>
              )}
              <HumanCheck key={hcKey} onToken={setCfToken} />
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={submitting} className="btn-dark disabled:opacity-60">
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> Sending</> : <>Submit application</>}
                </button>
                <a href={`https://wa.me/${content.contact.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
                  <MessageCircle size={16} /> Questions? Ask on WhatsApp
                </a>
              </div>
              <p className="mt-4 text-xs text-muted">By applying you agree to our <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>. If you are under 18, a parent or guardian must apply with you.</p>
            </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function Field({ label, hint, error, required, className = "", children }: { label: string; hint?: string; error?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-lav-600"> *</span>}
        {hint && <span className="ml-2 font-normal text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-sm text-red-600" role="alert">{error}</span>}
    </label>
  );
}
