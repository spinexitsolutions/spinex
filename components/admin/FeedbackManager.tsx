"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, Loader2, MessageSquareHeart, Save, Send, Star, Undo2, X } from "lucide-react";
import { feedbackStatusLabel, type Feedback, type FeedbackSettings } from "@/lib/feedback";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data as T;
}
type Data = { settings: FeedbackSettings; list: Feedback[]; stats: { asked: number; answered: number; avg: number; waitingApproval: number }; canEdit: boolean };
const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "");
const Stars = ({ n }: { n: number }) => <span className="inline-flex" aria-label={`${n} of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={15} className={i <= n ? "text-amber-400" : "text-line"} fill="currentColor" strokeWidth={0} />)}</span>;

// Admin → Client feedback: answers from clients, approving good ones for the website, and the automatic requests.
export default function FeedbackManager() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"answers" | "ask">("answers");
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [s, setS] = useState<FeedbackSettings | null>(null);
  const [saved, setSaved] = useState("");
  const [f, setF] = useState({ name: "", email: "", phone: "", project: "" });
  const load = useCallback(async () => {
    try {
      const d = await api<Data>("/api/admin/feedback");
      setData(d);
      setS((x) => x ?? d.settings);
      setSaved((x) => x || JSON.stringify(d.settings));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't load." });
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!data || !s) return <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>;
  const ro = !data.canEdit;
  const act = async (fb: Feedback, action: string) => {
    setBusy(`${action}:${fb.id}`);
    setMsg(null);
    try {
      await api(`/api/admin/feedback/${fb.id}`, { method: "POST", body: JSON.stringify({ action, quote: quotes[fb.id] ?? fb.quote }) });
      setMsg({ ok: true, text: action === "approve" ? "Added to Testimonials on the home page." : action === "unpublish" ? "Taken off the website." : action === "hide" ? "Kept private." : "Done." });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't do that." });
    } finally {
      setBusy("");
    }
  };
  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("ask");
    setMsg(null);
    try {
      await api("/api/admin/feedback/requests", { method: "POST", body: JSON.stringify(f) });
      setF({ name: "", email: "", phone: "", project: "" });
      setMsg({ ok: true, text: "Feedback request emailed." });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't send." });
    } finally {
      setBusy("");
    }
  };
  const saveSettings = async () => {
    setBusy("settings");
    try {
      const out = await api<FeedbackSettings>("/api/admin/feedback", { method: "PUT", body: JSON.stringify(s) });
      setS(out);
      setSaved(JSON.stringify(out));
      setMsg({ ok: true, text: "Saved" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy("");
    }
  };
  const answers = data.list.filter((x) => x.response);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">Client feedback</h2>
        <p className="text-sm text-muted">When a project is done, the client gets a short form: a star rating and a few words. Good feedback goes to Testimonials on the home page after you approve it. Low ratings alert you at once.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Asked", String(data.stats.asked)], ["Answered", String(data.stats.answered)], ["Average rating", data.stats.avg ? `${data.stats.avg.toFixed(1)} ★` : "—"], ["Waiting for your approval", String(data.stats.waitingApproval)]].map(([k, v]) => (
          <div key={k} className="rounded-3xl border border-line bg-white p-5"><p className="text-sm text-muted">{k}</p><p className="mt-1 font-display text-2xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {([["answers", `Answers (${answers.length})`], ["ask", "Ask and settings"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>{l}</button>)}
      </div>
      {msg && <p role="status" className={`rounded-2xl px-5 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {tab === "answers" ? (
        answers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center"><MessageSquareHeart className="mx-auto text-lav-600" /><p className="mt-3 font-semibold">No feedback yet</p><p className="mt-1 text-sm text-muted">Mark a project Completed in Client portal, or ask a client from “Ask and settings”.</p></div>
        ) : (
          <ul className="space-y-3">
            {answers.map((fb) => {
              const r = fb.response!;
              const canShow = r.publish && !!r.liked;
              return (
                <li key={fb.id} className={`rounded-3xl border bg-white p-5 ${r.rating <= 3 ? "border-red-200" : fb.approval === "approved" ? "border-emerald-200" : "border-line"}`}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold"><Stars n={r.rating} /> {r.displayName || fb.name}{r.company && <span className="font-normal text-muted">· {[r.role, r.company].filter(Boolean).join(", ")}</span>}</p>
                      <p className="text-xs text-muted">{fb.project || "Project"} · answered {when(r.at)} · {fb.email}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${fb.approval === "approved" ? "bg-emerald-50 text-emerald-800" : fb.approval === "hidden" ? "bg-mist text-muted" : r.rating <= 3 ? "bg-red-50 text-red-700" : canShow ? "bg-amber-50 text-amber-800" : "bg-mist text-muted"}`}>{fb.approval === "approved" ? "On the website" : fb.approval === "hidden" ? "Private" : r.rating <= 3 ? "Needs a call" : canShow ? "Waiting for approval" : "Private (not allowed on website)"}</span>
                  </div>
                  {r.liked && <p className="mt-3 text-sm"><b className="text-muted">Liked:</b> {r.liked}</p>}
                  {r.better && <p className="mt-1 text-sm"><b className="text-muted">Could be better (private):</b> {r.better}</p>}
                  {!ro && canShow && fb.approval !== "approved" && (
                    <div className="mt-3 space-y-2">
                      <textarea className="input min-h-[70px] text-sm" value={quotes[fb.id] ?? fb.quote ?? r.liked} onChange={(e) => setQuotes({ ...quotes, [fb.id]: e.target.value })} aria-label="Text for the website" />
                      <p className="text-xs text-muted">You can fix spelling, but keep the client&apos;s meaning.</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => act(fb, "approve")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{busy === `approve:${fb.id}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve for website</button>
                        {fb.approval !== "hidden" && <button onClick={() => act(fb, "hide")} disabled={!!busy} className="btn-ghost px-4 py-2 text-sm"><EyeOff size={14} /> Keep private</button>}
                      </div>
                    </div>
                  )}
                  {!ro && fb.approval === "approved" && <button onClick={() => act(fb, "unpublish")} disabled={!!busy} className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-mist"><Undo2 size={13} /> Take off the website</button>}
                  {fb.phone && r.rating <= 3 && <a href={`tel:${fb.phone}`} className="btn-ghost mt-3 px-4 py-2 text-sm">Call {fb.name.split(" ")[0]}</a>}
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <div className="space-y-5">
          {!ro && (
            <form onSubmit={ask} className="rounded-3xl border border-line bg-white p-6">
              <h3 className="font-display text-lg font-semibold">Ask a client now</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <input className="input" required placeholder="Client name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <input className="input" required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <input className="input" placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                <input className="input" placeholder="Project, e.g. your website" value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })} />
              </div>
              <button disabled={!!busy} className="btn-dark mt-3 px-5 py-2.5 text-sm">{busy === "ask" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Email the feedback form</button>
            </form>
          )}
          <section className="rounded-3xl border border-line bg-white p-6">
            <h3 className="font-display text-lg font-semibold">Ask automatically</h3>
            <fieldset disabled={ro} className="mt-3 space-y-3 text-sm">
              <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={s.autoOnProjectDone} onChange={(e) => setS({ ...s, autoOnProjectDone: e.target.checked })} /><span><b>When a project is marked Completed</b> in Client portal. (This replaces the direct Google review email; the thank-you page links to Google.)</span></label>
              <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={s.autoOnLeadWon} onChange={(e) => setS({ ...s, autoOnLeadWon: e.target.checked })} /><span><b>When a lead is marked Won</b> (only if it has an email)</span></label>
              <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={s.showGoogleAfter} onChange={(e) => setS({ ...s, showGoogleAfter: e.target.checked })} /><span><b>After the form, invite them to write a Google review</b> (shown to everyone, as Google asks)</span></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Send after</span><select className="input" value={s.delayDays} onChange={(e) => setS({ ...s, delayDays: Number(e.target.value) })}>{[0, 1, 2, 3, 7].map((d) => <option key={d} value={d}>{d ? `${d} day${d > 1 ? "s" : ""}` : "Right away"}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">One reminder if no answer, after</span><select className="input" value={s.reminderDays} onChange={(e) => setS({ ...s, reminderDays: Number(e.target.value) })}>{[0, 3, 5, 7].map((d) => <option key={d} value={d}>{d ? `${d} days` : "No reminder"}</option>)}</select></label>
                <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Email subject</span><input className="input" value={s.subject} onChange={(e) => setS({ ...s, subject: e.target.value })} /></label>
                <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Email text</span><textarea className="input min-h-[90px]" value={s.message} onChange={(e) => setS({ ...s, message: e.target.value })} /><span className="mt-1 block text-xs text-muted">Use {"{name}"}, {"{project}"}, {"{brand}"}. Ends with a “Rate our work” button.</span></label>
              </div>
              {!ro && <button type="button" onClick={saveSettings} disabled={!!busy || JSON.stringify(s) === saved} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted"><Save size={15} /> Save</button>}
            </fieldset>
          </section>
          <section className="rounded-3xl border border-line bg-white p-6">
            <h3 className="font-display text-lg font-semibold">Requests</h3>
            {data.list.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {data.list.map((fb) => (
                  <li key={fb.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="min-w-0 flex-1"><span className="block font-semibold">{fb.name} <span className="font-normal text-muted">· {fb.project || "—"}</span></span><span className="block truncate text-xs text-muted">{[fb.email, fb.source === "project" ? "Project completed" : fb.source === "lead" ? "Lead won" : `Asked by ${fb.by || "team"}`, fb.status === "scheduled" ? `sends ${when(fb.sendAt)}` : fb.sentAt && `sent ${when(fb.sentAt)}`, fb.reminded && "reminder sent", fb.error].filter(Boolean).join(" · ")}</span></span>
                    <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-muted">{fb.response ? `${fb.response.rating} ★` : feedbackStatusLabel[fb.status]}</span>
                    {fb.phone && !fb.response && fb.status !== "cancelled" && <a href={`https://wa.me/${fb.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(`Hi ${fb.name.split(" ")[0]}, could you tell us how we did? It takes a minute: ${origin}/f/${fb.token}`)}`} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5 text-xs">WhatsApp</a>}
                    {!ro && (fb.status === "scheduled" || fb.status === "failed") && <button onClick={() => act(fb, "send")} disabled={!!busy} className="btn-ghost px-3 py-1.5 text-xs"><Send size={12} /> Send now</button>}
                    {!ro && fb.status === "scheduled" && <button onClick={() => act(fb, "cancel")} disabled={!!busy} className="rounded-full px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"><X size={12} className="inline" /> Cancel</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
