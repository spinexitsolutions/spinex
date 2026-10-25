"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText, PenLine } from "lucide-react";
import type { QuoteAcceptance, QuoteChange } from "@/lib/billing";

// Under a quotation on the client's link: Accept, or ask for changes.
export default function QuoteResponse({ token, version, open, expired, closed, acceptance, changes, company, total }: {
  token: string; version: string; open: boolean; expired: boolean; closed: boolean;
  acceptance: QuoteAcceptance | null; changes: QuoteChange[]; company: string; total: string;
}) {
  const [mode, setMode] = useState<"" | "accept" | "changes">("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<QuoteAcceptance | null>(acceptance);
  const [sent, setSent] = useState<QuoteChange[]>(changes);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/d/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      if (data.acceptance) setAccepted(data.acceptance);
      if (data.change) {
        setSent((s) => [...s, data.change]);
        setText("");
      }
      setMode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

  return (
    <section className="mx-auto mt-6 max-w-[210mm] print:hidden">
      {accepted ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 className="mt-0.5 shrink-0" size={22} />
          <div>
            <p className="font-semibold">Quotation accepted. Thank you!</p>
            <p className="mt-1 text-sm">Accepted by {accepted.name} on {when(accepted.at)}. We have been notified and will get in touch about the next steps and the advance payment.</p>
          </div>
        </div>
      ) : closed ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">This quotation is closed. Please contact us if you&apos;d like an updated one.</p>
      ) : expired ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">This quotation has passed its “valid till” date, so it can&apos;t be accepted online. Please ask us for an updated quotation.</p>
      ) : open ? (
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <p className="font-display text-lg font-semibold">Happy with this quotation?</p>
          <p className="mt-1 text-sm text-muted">Accept it here to confirm the work, or tell us what you&apos;d like changed.</p>
          {mode === "" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setMode("accept")} className="btn-dark px-5 py-3 text-sm"><CheckCircle2 size={16} /> Accept quotation</button>
              <button onClick={() => setMode("changes")} className="btn-ghost px-5 py-3 text-sm"><PenLine size={16} /> Request changes</button>
            </div>
          )}

          {mode === "accept" && (
            <div className="mt-5 space-y-3">
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">Your full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">Note for us (optional)</span><textarea className="input min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="e.g. Advance will be transferred tomorrow" /></label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mist p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I have read this quotation and its terms, and I accept it{company ? ` on behalf of ${company}` : ""} for {total}.</span>
              </label>
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => send({ action: "accept", name, note, agree, version })} disabled={busy || !name.trim() || !agree} className="btn-dark px-5 py-3 text-sm disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm and accept</button>
                <button onClick={() => { setMode(""); setError(""); }} className="btn-ghost px-5 py-3 text-sm">Cancel</button>
              </div>
              <p className="text-xs text-muted">Your name, the time and your internet address are saved with the quotation as a record of acceptance.</p>
            </div>
          )}

          {mode === "changes" && (
            <div className="mt-5 space-y-3">
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">Your name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold">What would you like to change?</span><textarea className="input min-h-[110px]" value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} placeholder="e.g. Please remove SEO and add 5 more product pages." /></label>
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => send({ action: "changes", name, text })} disabled={busy || !name.trim() || !text.trim()} className="btn-dark px-5 py-3 text-sm disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />} Send to us</button>
                <button onClick={() => { setMode(""); setError(""); }} className="btn-ghost px-5 py-3 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {sent.length > 0 && !accepted && (
        <div className="mt-4 rounded-2xl border border-line bg-white p-5">
          <p className="text-sm font-semibold">Changes you asked for</p>
          <ul className="mt-2 space-y-2">
            {sent.map((c) => <li key={c.id} className="rounded-xl bg-mist px-4 py-2.5 text-sm"><span className="block text-xs text-muted">{c.name} · {when(c.at)}</span><span className="whitespace-pre-line">{c.text}</span></li>)}
          </ul>
          <p className="mt-2 text-xs text-muted">We&apos;ll send you an updated quotation.</p>
        </div>
      )}
    </section>
  );
}
