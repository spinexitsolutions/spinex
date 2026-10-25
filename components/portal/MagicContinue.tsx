"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

// One-time login link: the person presses the button, so link scanners in email apps can't use it up.
export default function MagicContinue({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/portal/magic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: token }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) window.location.href = "/portal";
    else {
      setError(data.error || "This link didn't work.");
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <button onClick={go} disabled={busy} className="btn-dark w-full justify-center py-3.5">{busy ? <Loader2 size={17} className="animate-spin" /> : null} Open my client portal</button>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error} <a href="/portal/login" className="font-semibold underline">Log in with email</a></p>}
    </div>
  );
}
