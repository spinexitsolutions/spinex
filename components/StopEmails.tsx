"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MailX } from "lucide-react";

export default function StopEmails({ token, brand, name, stopped }: { token: string; brand: string; name: string; stopped: boolean }) {
  const [done, setDone] = useState(stopped);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stop = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/leads/stop", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      if (!r.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Couldn't do that. Please try again, or just reply to the email.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-8 text-center">
      {done ? <CheckCircle2 size={42} className="mx-auto text-emerald-600" /> : <MailX size={42} className="mx-auto text-lav-700" />}
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{done ? "Done, no more follow-up emails" : "Stop follow-up emails?"}</h1>
      <p className="mt-2 text-muted">
        {done ? `${brand} won't send you any more automatic follow-ups about your enquiry. If you need us, just reply to any email or call us.` : `${name ? `Hi ${name}, ` : ""}${brand} sends a couple of short follow-ups after an enquiry. You can stop them here.`}
      </p>
      {!done && (
        <button onClick={stop} disabled={busy} className="btn-dark mt-6 px-6 py-3 text-sm disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <MailX size={16} />} Stop the emails</button>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
