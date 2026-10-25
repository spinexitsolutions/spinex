"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

type Kind = "problem" | "change" | "question" | "renewal";
const KINDS: [Kind, string, string][] = [
  ["problem", "Something isn't working", "Subject, e.g. Contact form not sending emails"],
  ["change", "Change request", "Subject, e.g. Change phone number in footer"],
  ["question", "Question", "Subject, e.g. How do I add a new product?"],
  ["renewal", "Renew my AMC", "Subject"],
];

export function NewTicket({ projects, initialProject = "", initialKind = "", initialSubject = "", initialMessage = "", amc }: {
  projects: { id: string; title: string }[]; initialProject?: string; initialKind?: string; initialSubject?: string; initialMessage?: string;
  amc?: { title: string; covered: boolean; label: string; responseTime: string } | null;
}) {
  const [kind, setKind] = useState<Kind>((KINDS.find((k) => k[0] === initialKind)?.[0] ?? "problem") as Kind);
  const [urgent, setUrgent] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [projectId, setProjectId] = useState(initialProject);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await post("/api/portal/tickets", { subject, message, projectId, kind, urgent });
      window.location.href = `/portal/support?t=${d.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send.");
      setBusy(false);
    }
  };
  return (
    <form onSubmit={send} className="space-y-3 rounded-[24px] border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type of request">
        {KINDS.filter((k) => k[0] !== "renewal" || amc).map(([k, label]) => (
          <button type="button" key={k} role="radio" aria-checked={kind === k} onClick={() => { setKind(k); if (k === "renewal" && !subject) setSubject(`Please renew my ${amc?.title || "AMC"}`); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${kind === k ? "bg-ink text-white" : "bg-mist text-muted hover:text-ink"}`}>{label}</button>
        ))}
      </div>
      {amc && (
        <p className={`rounded-xl px-4 py-2.5 text-sm ${amc.covered ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {amc.covered ? `Covered by your ${amc.title} (${amc.label.toLowerCase()}).${amc.responseTime ? ` We reply ${amc.responseTime.charAt(0).toLowerCase()}${amc.responseTime.slice(1)}.` : ""}` : `Your ${amc.title} has ended, so this may be charged separately. Choose “Renew my AMC” to renew it.`}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={KINDS.find((k) => k[0] === kind)?.[2]} maxLength={140} required />
        {projects.length > 0 && (
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project">
            <option value="">General</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title || "Project"}</option>)}
          </select>
        )}
      </div>
      <textarea className="input min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={kind === "problem" ? "What happened, on which page, and since when? Add screenshots in Files if it helps." : "Tell us what you need. Add page links or screenshots in Files if it helps."} maxLength={5000} required />
      {kind === "problem" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-red-600" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          <span><b>Urgent</b> <span className="text-muted">· the website is down, or customers can&apos;t order or contact you</span></span>
        </label>
      )}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <button disabled={busy} className="btn-dark px-5 py-2.5 text-sm">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send request</button>
    </form>
  );
}

export function TicketReply({ id, closed }: { id: string; closed: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const act = async (body: unknown, kind: string) => {
    setBusy(kind);
    setError("");
    try {
      await post(`/api/portal/tickets/${id}`, body);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send.");
      setBusy("");
    }
  };
  return (
    <div className="space-y-3">
      <textarea className="input min-h-[100px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={closed ? "Write to reopen this request" : "Write a reply"} maxLength={5000} />
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => message.trim() && act({ message }, "send")} disabled={!!busy || !message.trim()} className="btn-dark px-5 py-2.5 text-sm disabled:opacity-60">{busy === "send" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send</button>
        {!closed && <button onClick={() => act({ action: "close" }, "close")} disabled={!!busy} className="btn-ghost bg-white px-5 py-2.5 text-sm"><CheckCircle2 size={15} /> Mark as solved</button>}
      </div>
    </div>
  );
}
