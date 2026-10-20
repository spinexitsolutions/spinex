"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { useContent } from "../ContentProvider";

export default function LoginForm() {
  const { content } = useContent();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState("");
  const [code, setCode] = useState("");

  const go = () => {
    // Only go back to admin pages after login
    window.location.href = next && next.startsWith("/admin") ? next : "/admin";
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticket, code }) });
      const data = await res.json().catch(() => ({}));
      if (data.restart) { setTicket(""); setCode(""); }
      if (!res.ok) throw new Error(data.error || "Couldn't log in. Try again.");
      if (typeof data.backupLeft === "number" && data.backupLeft <= 2) alert(`You have ${data.backupLeft} backup code${data.backupLeft === 1 ? "" : "s"} left. Make new ones in Admin → My account.`);
      go();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in. Try again.");
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't log in. Try again.");
      if (data.needCode) {
        setTicket(data.ticket);
        setLoading(false);
        return;
      }
      go();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in. Try again.");
      setLoading(false);
    }
  };

  if (ticket) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-5">
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submitCode} className="w-full max-w-sm rounded-3xl bg-white p-8" noValidate>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lav-300"><KeyRound size={18} /></span>
          <h1 className="mt-6 font-display text-2xl font-semibold">Enter your code</h1>
          <p className="mt-1 text-sm text-muted">Open your authenticator app (Google Authenticator or similar) and type the 6-digit code for Spinex Admin.</p>
          <input className="input mt-6 text-center font-mono text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={11} value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" aria-label="Code" />
          <p className="mt-2 text-xs text-muted">Lost your phone? Type one of your backup codes instead (like abcde-12345).</p>
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
          <button disabled={loading || code.trim().length < 6} className="btn-dark mt-6 w-full disabled:opacity-50">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Checking</> : "Log in"}
          </button>
          <button type="button" onClick={() => { setTicket(""); setCode(""); setError(""); }} className="mt-3 w-full text-sm text-muted hover:text-ink">Back</button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8" noValidate>
        <div className="flex items-center gap-3">
          {content.brand.logo && <img src={content.brand.logo} alt="" className="h-12 w-12 object-contain" />}
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lav-300"><Lock size={18} /></span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">Spinex admin</h1>
        <p className="mt-1 text-sm text-muted">Log in to manage the website, interns and certificates.</p>
        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-medium">Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={loading || !email || !password} className="btn-dark mt-6 w-full disabled:opacity-50">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Logging in</> : "Log in"}
        </button>
        <a href="/admin/forgot" className="mt-4 block text-center text-sm text-muted hover:text-ink">Forgot password?</a>
      </motion.form>
    </div>
  );
}
