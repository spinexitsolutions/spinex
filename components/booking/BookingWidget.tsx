"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock, Loader2, Video } from "lucide-react";
import { dateLabel, timeLabel } from "@/lib/booking";
import HumanCheck from "../HumanCheck";

type Day = { date: string; slots: string[] };

// Pick a day and a time, then (for a new booking) fill in a short form. In "move" mode it changes an existing call.
export default function BookingWidget({ topics, duration, moveToken, onMoved }: { topics: string[]; duration: number; moveToken?: string; onMoved?: (when: string) => void }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [step, setStep] = useState<"pick" | "form" | "done">("pick");
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", topic: topics[0] ?? "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ when: string; meetLink: string; token: string } | null>(null);
  const [cfToken, setCfToken] = useState("");
  const startedAt = useRef(Date.now());

  const load = async () => {
    setError("");
    try {
      const r = await fetch(`/api/booking/slots${moveToken ? `?except=${moveToken}` : ""}`, { cache: "no-store" });
      const d = await r.json();
      setDays(d.days ?? []);
      if (d.days?.length && !d.days.some((x: Day) => x.date === date)) setDate(d.days[0].date);
    } catch {
      setDays([]);
      setError("Couldn't load the free times. Please refresh.");
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const chosen = days?.find((d) => d.date === date);
  const taken = async (msg: string) => {
    setError(msg);
    setTime("");
    setStep("pick");
    await load();
  };

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    try {
      const { attributionForLead } = await import("@/lib/attribution");
      const website = ((e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
      const r = await fetch("/api/booking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, date, time, startedAt: String(startedAt.current), cfToken, website, track: attributionForLead() }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409 && d.taken) return taken(d.error);
      if (!r.ok) {
        setErrors(d.errors ?? {});
        throw new Error(d.error || "Couldn't book. Please try again.");
      }
      setDone({ when: d.when, meetLink: d.meetLink, token: d.token });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't book.");
    } finally {
      setBusy(false);
    }
  };

  const move = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/booking/${moveToken}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "move", date, time }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409 && d.taken) return taken(d.error);
      if (!r.ok) throw new Error(d.error || "Couldn't change the time.");
      onMoved?.(d.when);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change the time.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done" && done) {
    return (
      <div className="rounded-[28px] border border-line bg-white p-8 text-center sm:p-10">
        <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Your call is booked</h2>
        <p className="mt-2 text-lg">{done.when} <span className="text-muted">(India time)</span></p>
        <p className="mt-3 text-muted">We&apos;ve emailed you the details{done.meetLink ? " and the Google Meet link" : ""}. You&apos;ll get a reminder before the call.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {done.meetLink && <a href={done.meetLink} target="_blank" rel="noreferrer" className="btn-dark px-5 py-3 text-sm"><Video size={16} /> Google Meet link</a>}
          <a href={`/b/${done.token}`} className="btn-ghost px-5 py-3 text-sm">Change or cancel</a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-line bg-white p-5 sm:p-8">
      {step === "pick" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><CalendarCheck size={20} className="text-lav-700" /> {moveToken ? "Choose a new time" : "Choose a day and time"}</h2>
            <span className="flex items-center gap-1.5 text-sm text-muted"><Clock size={14} /> {duration} minutes · India time</span>
          </div>
          {error && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">{error}</p>}
          {days === null ? (
            <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
          ) : days.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-mist p-6 text-center text-muted">No free times in the coming days. Please send us a message on the contact page and we&apos;ll set up a time.</p>
          ) : (
            <>
              <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Day">
                {days.map((d) => (
                  <button key={d.date} data-date={d.date} role="option" aria-selected={d.date === date} onClick={() => { setDate(d.date); setTime(""); }}
                    className={`shrink-0 rounded-2xl border px-4 py-3 text-center transition ${d.date === date ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                    <span className={`block text-xs ${d.date === date ? "text-white/70" : "text-muted"}`}>{dateLabel(d.date, { weekday: "short" })}</span>
                    <span className="block font-display text-xl font-semibold">{Number(d.date.slice(8))}</span>
                    <span className={`block text-xs ${d.date === date ? "text-white/70" : "text-muted"}`}>{dateLabel(d.date, { month: "short" })}</span>
                  </button>
                ))}
              </div>
              {chosen && (
                <>
                  <p className="mt-5 text-sm font-semibold">{dateLabel(chosen.date)}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" role="listbox" aria-label="Time">
                    {chosen.slots.map((t) => (
                      <button key={t} data-time={t} role="option" aria-selected={t === time} onClick={() => setTime(t)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${t === time ? "border-lav-600 bg-lav-600 text-white" : "border-line hover:border-lav-500"}`}>{timeLabel(t)}</button>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {moveToken ? (
                  <button onClick={move} disabled={!time || busy} className="btn-dark px-6 py-3 text-sm disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : null} Move my call to {time ? `${dateLabel(date, { day: "numeric", month: "short" })}, ${timeLabel(time)}` : "…"}</button>
                ) : (
                  <button onClick={() => setStep("form")} disabled={!time} className="btn-dark px-6 py-3 text-sm disabled:opacity-50">Continue{time ? ` with ${dateLabel(date, { day: "numeric", month: "short" })}, ${timeLabel(time)}` : ""}</button>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <form onSubmit={book} className="space-y-4" noValidate>
          <button type="button" onClick={() => setStep("pick")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={15} /> {dateLabel(date)}, {timeLabel(time)}</button>
          <h2 className="font-display text-xl font-semibold">Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name *" error={errors.name}><input className="input" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone (WhatsApp) *" error={errors.phone}><input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email *" error={errors.email}><input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="The meeting link is sent here" /></Field>
            <Field label="Company / business"><input className="input" autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            {topics.length > 0 && (
              <Field label="What do you want to talk about?"><select className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>{topics.map((t) => <option key={t}>{t}</option>)}<option>Something else</option></select></Field>
            )}
            <Field label="Anything we should know first? (optional)" wide><textarea className="input min-h-[90px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="e.g. We sell sarees in Jaipur and want an online store with COD." maxLength={1500} /></Field>
          </div>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <HumanCheck onToken={setCfToken} />
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy} className="btn-dark px-6 py-3 text-sm disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />} Book my free call</button>
        </form>
      )}
    </div>
  );
}

function Field({ label, error, children, wide }: { label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
