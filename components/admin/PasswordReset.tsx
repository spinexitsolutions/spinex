"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";

const shell = (children: React.ReactNode) => (
  <div className="grid min-h-screen place-items-center bg-ink px-5">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-white p-8">{children}</motion.div>
  </div>
);

// /admin/forgot: asks for the email and sends a reset link.
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Something went wrong.");
      setDone(d.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return shell(
    done ? (
      <>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Mail size={18} /></span>
        <h1 className="mt-6 font-display text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted">{done}</p>
        <a href="/admin/login" className="btn-ghost mt-6 w-full justify-center">Back to login</a>
      </>
    ) : (
      <form onSubmit={submit} noValidate>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lav-300"><KeyRound size={18} /></span>
        <h1 className="mt-6 font-display text-2xl font-semibold">Forgot password</h1>
        <p className="mt-1 text-sm text-muted">Type your admin email. We&apos;ll send a link to set a new password.</p>
        <input className="input mt-6" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="you@example.com" aria-label="Email" />
        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={busy || !/^\S+@\S+\.\S+$/.test(email)} className="btn-dark mt-6 w-full disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}</button>
        <a href="/admin/login" className="mt-4 block text-center text-sm text-muted hover:text-ink">Back to login</a>
      </form>
    ),
  );
}

// /admin/reset?token=…: sets the new password.
export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Something went wrong.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  if (!token) return shell(<><h1 className="font-display text-2xl font-semibold">Link not complete</h1><p className="mt-2 text-sm text-muted">Open the link from the email again, or ask for a new one.</p><a href="/admin/forgot" className="btn-dark mt-6 w-full justify-center">Ask for a new link</a></>);
  return shell(
    done ? (
      <>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={18} /></span>
        <h1 className="mt-6 font-display text-2xl font-semibold">Password changed</h1>
        <p className="mt-2 text-sm text-muted">Log in with your new password. You were logged out on other devices.</p>
        <a href="/admin/login" className="btn-dark mt-6 w-full justify-center">Log in</a>
      </>
    ) : (
      <form onSubmit={submit} noValidate>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lav-300"><KeyRound size={18} /></span>
        <h1 className="mt-6 font-display text-2xl font-semibold">Set a new password</h1>
        <label className="mt-6 block"><span className="mb-1.5 block text-sm font-medium">New password</span><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
        <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium">Type it again</span><input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
        <p className="mt-2 text-xs text-muted">At least 8 characters.</p>
        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={busy || pw.length < 8 || !pw2} className="btn-dark mt-6 w-full disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : "Save new password"}</button>
      </form>
    ),
  );
}
