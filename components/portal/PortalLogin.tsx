"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";

// Email → 6-digit code → portal. Used by the client portal and the staff portal (inside LoginShell).
export default function PortalLogin({ initialEmail = "", api = "/api/portal/login", next = "/portal", placeholder = "you@company.com", intro = "Log in with the email you shared with us. We’ll send you a 6-digit code, no password needed." }: {
  initialEmail?: string; api?: string; next?: string; placeholder?: string; intro?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0); // seconds before "send again"
  const [focus, setFocus] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
    return data;
  };

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await post(`${api}/request`, { email });
      setStep("code");
      setCode("");
      setWait(45);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    setBusy(true);
    setError("");
    try {
      await post(`${api}/verify`, { email, code: value });
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const steps = (
    <ol className="mt-8 flex items-center gap-2.5 text-[13px] text-muted" aria-label="Login steps">
      {["Email", "Code", "Your portal"].map((s, i) => {
        const now = (step === "email" ? 0 : 1) === i, done = step === "code" && i === 0;
        return (
          <li key={s} className="flex items-center gap-2.5">
            {i > 0 && <span aria-hidden className="h-px w-6 bg-line" />}
            <span className={`flex items-center gap-1.5 ${now ? "font-semibold text-ink" : ""}`}>
              <span className={`grid h-[22px] w-[22px] place-items-center rounded-full border text-[11px] font-semibold ${now ? "border-ink bg-ink text-white" : done ? "border-lav-600 bg-lav-600 text-white" : "border-line bg-mist"}`}>{i + 1}</span>
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );

  const err = error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>;

  if (step === "email") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); send(); }}>
        <h1 className="h-display text-4xl sm:text-[2.6rem]">Welcome back</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{intro}</p>
        <label className="mt-8 block">
          <span className="mb-2 block text-sm font-semibold">Email</span>
          <span className="relative block">
            <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted/70" />
            <input className="input py-3.5 pl-12 text-base" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={placeholder} autoFocus={!initialEmail} />
          </span>
        </label>
        {err}
        <button disabled={busy || !email.trim()} className="btn-dark mt-4 w-full justify-center py-4 text-base disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin" /> : null} Email me a login code {!busy && <ArrowRight size={18} />}
        </button>
        {steps}
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6) verify(); }}>
      <h1 className="h-display text-4xl sm:text-[2.6rem]">Check your email</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-muted">Enter the 6-digit code we just sent. It works for 10 minutes.</p>
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-mist px-4 py-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lav-100 text-lav-600"><Mail size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{email}</span>
          <span className="block text-xs text-muted">Code sent. Check spam too.</span>
        </span>
        <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="text-sm font-semibold text-lav-700 hover:underline">Change</button>
      </div>
      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold">Login code</span>
        {/* One real input for typing and phone auto-fill; the six boxes just show its digits. */}
        <span className="relative grid grid-cols-6 gap-2 sm:gap-2.5" onClick={() => codeRef.current?.focus()}>
          {Array.from({ length: 6 }, (_, i) => {
            const active = focus && (i === code.length || (i === 5 && code.length === 6));
            return (
              <span key={i} aria-hidden className={`grid h-14 place-items-center rounded-2xl border-[1.5px] bg-white font-display text-2xl font-semibold transition sm:h-[60px] ${active ? "border-lav-600 ring-4 ring-lav-100" : code[i] ? "border-ink/20" : "border-line"}`}>
                {code[i] ?? (active ? <span className="tx-caret h-6 w-0.5 bg-ink" /> : "")}
              </span>
            );
          })}
          <input ref={codeRef} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required aria-label="6-digit code"
            value={code} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); if (v.length === 6 && !busy) verify(v); }} />
        </span>
      </label>
      {err}
      <button disabled={busy || code.length !== 6} className="btn-dark mt-4 w-full justify-center py-4 text-base disabled:opacity-50">
        {busy ? <Loader2 size={18} className="animate-spin" /> : null} Log in
      </button>
      <p className="mt-4 text-center text-sm text-muted">
        Didn’t get it?{" "}
        {wait > 0 ? <span className="font-semibold text-lav-700">Send again in 0:{String(wait).padStart(2, "0")}</span>
          : <button type="button" disabled={busy} onClick={send} className="font-semibold text-lav-700 hover:underline">Send again</button>}
      </p>
      {steps}
    </form>
  );
}
