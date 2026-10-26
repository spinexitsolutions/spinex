"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, Plus, Save, Send, Trash2, TriangleAlert } from "lucide-react";
import type { FollowupSettings } from "@/lib/lead-followups";

type Status = { settings: FollowupSettings; emailReady: boolean; bookingOn: boolean; sent30: number; stopped: number; canEdit: boolean };
type Preview = { subject: string; paras: string[]; button: { label: string; url: string } };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data as T;
}
const hours = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => (h === 24 ? "midnight" : `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`);

// Admin → Leads → Follow-up emails: automatic emails to new leads until someone marks them Contacted.
export default function LeadFollowupsSetup() {
  const [st, setSt] = useState<Status | null>(null);
  const [s, setS] = useState<FollowupSettings | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<{ i: number; p: Preview } | null>(null);
  useEffect(() => {
    api<Status>("/api/admin/lead-followups").then((d) => { setSt(d); setS(d.settings); }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);
  if (!st || !s) return <div className="grid place-items-center py-10 text-muted">{msg?.text || <Loader2 className="animate-spin" />}</div>;
  const ro = !st.canEdit;
  const step = (i: number, patch: Partial<FollowupSettings["steps"][number]>) => setS({ ...s, steps: s.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const save = async (next = s) => {
    setBusy("save");
    setMsg(null);
    try {
      const d = await api<{ settings: FollowupSettings }>("/api/admin/lead-followups", { method: "PUT", body: JSON.stringify(next) });
      setS(d.settings);
      setSt({ ...st, settings: d.settings });
      setMsg({ ok: true, text: d.settings.enabled ? "Saved. Follow-up emails are on for new leads." : "Saved. Follow-up emails are off." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy("");
    }
  };
  const show = async (i: number, send = false) => {
    setBusy(send ? `send${i}` : `prev${i}`);
    setMsg(null);
    try {
      const d = await api<Preview & { to?: string }>("/api/admin/lead-followups", { method: "POST", body: JSON.stringify({ step: i, settings: s, sendTo: send }) });
      if (send) setMsg({ ok: true, text: `Test email sent to ${d.to}.` });
      else setPreview({ i, p: d });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't do that." });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">When a new lead comes in and nobody has marked it <b className="text-ink">Contacted</b> yet, these emails go out on their own, with your work and a Book a call link. They stop as soon as the lead is moved out of New, or if the person clicks “stop these emails”. Leads that came in before you turn this on don&apos;t get them.</p>
      {!st.emailReady && <p className="flex gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><TriangleAlert size={16} className="mt-0.5 shrink-0" /> Email sending isn&apos;t set up yet. Add the SMTP details in API keys first.</p>}

      <label className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4">
        <span><b>Send follow-up emails</b><span className="block text-sm text-muted">{s.enabled && s.enabledAt ? `On since ${new Date(s.enabledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.` : "Off."} {st.sent30} sent in the last 30 days{st.stopped ? `, ${st.stopped} people stopped them` : ""}.</span></span>
        <input type="checkbox" name="followupsOn" className="h-5 w-5" disabled={ro || busy === "save"} checked={s.enabled} onChange={(e) => save({ ...s, enabled: e.target.checked })} />
      </label>

      <div className="space-y-3">
        {s.steps.map((x, i) => (
          <div key={i} data-step={i} className={`rounded-2xl border p-4 ${x.on ? "border-line" : "border-dashed border-line opacity-70"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={x.on} disabled={ro} onChange={(e) => step(i, { on: e.target.checked })} /> Email {i + 1}:</label>
              <label className="flex items-center gap-1.5 text-sm">after <input type="number" min={1} max={60} aria-label={`Days for email ${i + 1}`} className="input w-20 py-1.5" value={x.day} disabled={ro} onChange={(e) => step(i, { day: Number(e.target.value) || 1 })} /> days</label>
              <span className="ml-auto flex gap-1.5">
                <button type="button" onClick={() => show(i)} className="btn-ghost px-3 py-1.5 text-xs">{busy === `prev${i}` ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Preview</button>
                <button type="button" onClick={() => show(i, true)} disabled={!st.emailReady} className="btn-ghost px-3 py-1.5 text-xs">{busy === `send${i}` ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send me a test</button>
                {!ro && s.steps.length > 1 && <button type="button" aria-label="Remove this email" onClick={() => setS({ ...s, steps: s.steps.filter((_, j) => j !== i) })} className="btn-ghost px-2 py-1.5 text-xs text-red-600"><Trash2 size={13} /></button>}
              </span>
            </div>
            <input className="input mt-3" aria-label={`Subject ${i + 1}`} value={x.subject} disabled={ro} onChange={(e) => step(i, { subject: e.target.value })} />
            <textarea className="input mt-2 min-h-[150px] text-sm" aria-label={`Message ${i + 1}`} value={x.body} disabled={ro} onChange={(e) => step(i, { body: e.target.value })} />
          </div>
        ))}
        {!ro && s.steps.length < 4 && (
          <button type="button" onClick={() => setS({ ...s, steps: [...s.steps, { day: (s.steps[s.steps.length - 1]?.day ?? 0) + 5, on: true, subject: "One last note about your {service}", body: "Hi {name},\n\nWe don't want to fill your inbox, so this is our last follow-up. Whenever you're ready, book a call here: {book}\n\nTeam {brand}" }] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={14} /> Add another email</button>
        )}
        <p className="text-xs text-muted">Fill-ins: {"{name}"} first name · {"{service}"} what they asked about · {"{portfolio}"} your work page · {"{book}"} the {st.bookingOn ? "Book a call page" : "contact page (call booking is off)"} · {"{brand}"} · {"{phone}"} · {"{whatsapp}"}. A “stop these emails” link is added at the bottom.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-1"><span className="mb-1.5 block text-[13px] font-semibold">Work page link</span><input className="input" value={s.portfolioPath} disabled={ro} onChange={(e) => setS({ ...s, portfolioPath: e.target.value })} /></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Send from (India time)</span><select className="input" value={s.fromHour} disabled={ro} onChange={(e) => setS({ ...s, fromHour: Number(e.target.value) })}>{hours.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Until</span><select className="input" value={s.toHour} disabled={ro} onChange={(e) => setS({ ...s, toHour: Number(e.target.value) })}>{[...hours.slice(1), 24].map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></label>
      </div>

      {msg && <p role="status" className={`rounded-2xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      {!ro && <button onClick={() => save()} disabled={!!busy} className="btn-dark px-5 py-2.5 text-sm">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>}

      {preview && (
        <div className="rounded-2xl border border-lav-200 bg-lav-50/40 p-5" data-preview>
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-lav-700">Preview of email {preview.i + 1} (to “Rahul Sharma”, about Website design)</p><button onClick={() => setPreview(null)} className="text-xs text-muted hover:text-ink">Close</button></div>
          <p className="mt-3 font-semibold">{preview.p.subject}</p>
          <div className="mt-2 space-y-2 text-sm">{preview.p.paras.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
          <span className="mt-3 inline-block rounded-full bg-lav-600 px-4 py-2 text-sm text-white">{preview.p.button.label}</span>
        </div>
      )}
    </div>
  );
}
