"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { useContent } from "../ContentProvider";

export default function LoginForm() {
  const { content } = useContent();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't log in. Try again.");
      // Only go back to admin pages after login
      window.location.href = next && next.startsWith("/admin") ? next : "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8" noValidate>
        <div className="flex items-center gap-3">
          <img src={content.brand.logo} alt="" className="h-12 w-12 object-contain" />
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
      </motion.form>
    </div>
  );
}
