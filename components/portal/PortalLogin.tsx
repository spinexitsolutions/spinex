"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

// Client login: email → 6-digit code → portal.
export default function PortalLogin({ initialEmail = "", brand }: { initialEmail?: string; brand: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
    return data;
  };

  const askCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await post("/api/portal/login/request", { email });
      setNote(d.message);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/portal/login/verify", { email, code });
      window.location.href = "/portal";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_30px_80px_-40px_rgba(18,15,27,.5)] sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lav-700">{brand}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Client portal</h1>
      <p className="mt-2 text-muted">See your project progress, files, invoices and support requests.</p>

      {step === "email" ? (
        <form onSubmit={askCode} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Your email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy || !email.trim()} className="btn-dark w-full justify-center py-3.5 disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />} Email me a login code</button>
          <p className="text-center text-xs text-muted">No password needed. We send a 6-digit code to the email you gave us.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8 space-y-4">
          {note && <p className="rounded-xl bg-lav-100 px-4 py-3 text-sm text-lav-700">{note}</p>}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">6-digit code</span>
            <input className="input text-center font-mono text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          </label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy || code.length !== 6} className="btn-dark w-full justify-center py-3.5 disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin" /> : null} Log in</button>
          <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={14} /> Use another email or send again</button>
        </form>
      )}
    </div>
  );
}
