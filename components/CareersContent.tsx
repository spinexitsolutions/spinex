"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Briefcase, Check, Clock, IndianRupee, Loader2, MapPin, PartyPopper, Plus, Sparkles, Upload } from "lucide-react";
import { useContent } from "./ContentProvider";
import { SplitHeading, ease } from "./Reveal";
import HumanCheck from "./HumanCheck";
import { track } from "@/lib/track";

type Form = { name: string; email: string; phone: string; city: string; role: string; experience: string; link: string; why: string };
const empty: Form = { name: "", email: "", phone: "", city: "", role: "", experience: "", link: "", why: "" };
const GENERAL = "General application";

export default function CareersContent() {
  const { content } = useContent();
  const careers = content.careers;
  const [open, setOpen] = useState<string | null>(careers.jobs[0]?.id ?? null);
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "resume", string>>>({});
  const [resume, setResume] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email.";
    if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a 10-digit phone number.";
    if (!form.role) errs.role = "Choose a role.";
    if (resume && resume.type !== "application/pdf") errs.resume = "Upload your resume as a PDF.";
    if (resume && resume.size > 3 * 1024 * 1024) errs.resume = "Resume must be under 3 MB.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setServerError("");
    try {
      const fd = new FormData();
      (Object.keys(form) as (keyof Form)[]).forEach((k) => fd.set(k, form[k]));
      fd.set("kind", "job");
      fd.set("startedAt", String(startedAt.current));
      fd.set("cfToken", cfToken);
      fd.set("website", (formRef.current?.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "");
      if (resume) fd.set("resume", resume);
      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.error || "Couldn't send your application.");
      }
      setDone(true);
      track("apply", { kind: "job", role: form.role });
      setForm(empty);
      setResume(null);
      setCfToken("");
      setHcKey((k) => k + 1);
    } catch (err) {
      setCfToken("");
      setHcKey((k) => k + 1);
      setServerError(err instanceof Error ? err.message : "Couldn't send your application.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="bg-white py-20 sm:py-24">
        <div className="container-x">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SplitHeading text="Open positions." className="h-display text-4xl sm:text-6xl" />
            <p className="max-w-md text-muted">{careers.intro}</p>
          </div>

          {!careers.open || careers.jobs.length === 0 ? (
            <div className="rounded-[28px] border border-line bg-mist p-10 text-center">
              <h3 className="font-display text-2xl font-semibold">No open roles right now.</h3>
              <p className="mt-2 text-muted">You can still send a general application below, and we&apos;ll reach out when something fits.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {careers.jobs.map((j) => {
                const isOpen = open === j.id;
                return (
                  <li key={j.id} className={`overflow-hidden rounded-[24px] border transition-colors ${isOpen ? "border-ink" : "border-line"}`}>
                    <button onClick={() => setOpen(isOpen ? null : j.id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 p-6 text-left">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lav-100 text-lav-700"><Briefcase size={20} /></span>
                      <span className="min-w-[200px] flex-1">
                        <span className="block font-display text-2xl font-semibold tracking-tight">{j.title}</span>
                        <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                          {j.type && <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {j.type}</span>}
                          {j.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {j.location}</span>}
                          {j.experience && <span>{j.experience} experience</span>}
                          {j.salary && <span className="inline-flex items-center gap-1"><IndianRupee size={13} /> {j.salary.replace(/^₹\s*/, "")}</span>}
                        </span>
                      </span>
                      <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="grid h-11 w-11 place-items-center rounded-full bg-mist"><Plus size={18} /></motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }} className="overflow-hidden">
                          <div className="grid gap-6 border-t border-line p-6 md:grid-cols-[1.4fr_1fr]">
                            <p className="leading-relaxed text-ink/80">{j.description}</p>
                            <div>
                              {j.requirements.length > 0 && (
                                <>
                                  <p className="text-sm font-semibold">You should have</p>
                                  <ul className="mt-3 space-y-2">
                                    {j.requirements.map((r) => (
                                      <li key={r} className="flex items-start gap-2.5 text-[15px]"><Check size={16} className="mt-0.5 shrink-0 text-lav-600" /> {r}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                              <button onClick={() => applyFor(j.title)} className="btn-dark mt-6">Apply for this role <ArrowDown size={16} /></button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          )}

          {careers.perks.length > 0 && (
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {careers.perks.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-2xl bg-mist p-5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lav-600 text-white"><Sparkles size={15} /></span>
                  <span className="text-[15px] leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-8 text-sm text-muted">Looking for an internship instead? <Link href="/internship" className="font-semibold text-lav-700 underline">See internships</Link></p>
        </div>
      </section>

      <section className="bg-mist py-20 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.4fr]">
          <div>
            <SplitHeading text="Apply now." className="h-display text-4xl sm:text-6xl" />
            <p className="mt-5 max-w-sm text-lg text-muted">Send your details and resume. We read every application and reply to shortlisted candidates within a week.</p>
          </div>

          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} role="status" className="grid place-items-center rounded-[28px] border border-line bg-white p-12 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-lav-600 text-white"><PartyPopper size={28} /></span>
              <h3 className="mt-6 font-display text-3xl font-semibold">Application received</h3>
              <p className="mt-3 max-w-md text-muted">Thanks for applying. If your profile fits, we&apos;ll contact you by phone or email.</p>
            </motion.div>
          ) : (
            <form ref={formRef} onSubmit={submit} noValidate className="scroll-mt-28 rounded-[28px] border border-line bg-white p-6 sm:p-10">
              <div className="grid gap-5 sm:grid-cols-2">
                <F label="Full name *" error={errors.name}><input className="input" value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} /></F>
                <F label="Email *" error={errors.email}><input className="input" type="email" value={form.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} /></F>
                <F label="Phone *" error={errors.phone}><input className="input" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" aria-invalid={!!errors.phone} /></F>
                <F label="City"><input className="input" value={form.city} onChange={set("city")} /></F>
                <F label="Role *" error={errors.role}>
                  <select className="input" value={form.role} onChange={set("role")} aria-invalid={!!errors.role}>
                    <option value="">Choose a role</option>
                    {careers.open && careers.jobs.map((j) => <option key={j.id}>{j.title}</option>)}
                    <option>{GENERAL}</option>
                  </select>
                </F>
                <F label="Experience"><input className="input" value={form.experience} onChange={set("experience")} placeholder="e.g. 2 years" /></F>
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium">Resume <span className="font-normal text-muted">PDF, up to 3 MB</span></span>
                  <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 ${errors.resume ? "border-red-300" : resume ? "border-lav-500 bg-lav-100/50" : "border-line hover:border-ink"}`}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-white"><Upload size={18} /></span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{resume ? resume.name : "Choose your resume"}</span>
                    <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
                  </label>
                  {errors.resume && <span className="mt-1.5 block text-sm text-red-600" role="alert">{errors.resume}</span>}
                </div>
                <F label="Portfolio or LinkedIn" className="sm:col-span-2"><input className="input" type="url" value={form.link} onChange={set("link")} placeholder="https://" /></F>
                <F label="Why do you want to join us?" className="sm:col-span-2"><textarea className="input min-h-[110px]" value={form.why} onChange={set("why")} /></F>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              </div>
              <HumanCheck key={hcKey} onToken={setCfToken} />
              {serverError && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{serverError}</p>}
              <button type="submit" disabled={busy} className="btn-dark mt-8 disabled:opacity-60">{busy ? <><Loader2 size={18} className="animate-spin" /> Sending</> : "Submit application"}</button>
              <p className="mt-4 text-xs text-muted">By applying you agree to our <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.</p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

function F({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-sm text-red-600" role="alert">{error}</span>}
    </label>
  );
}
