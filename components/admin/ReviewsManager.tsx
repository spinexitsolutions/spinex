"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Plus, RefreshCw, Save, Send, Star, Trash2, X } from "lucide-react";
import { requestStatusLabel, type ReviewRequest, type ReviewSettings, type SiteReview } from "@/lib/reviews";

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
type Google = { name?: string; rating?: number; count?: number; mapsUrl?: string; reviews?: SiteReview[]; fetchedAt?: string; error?: string; errorAt?: string };
type Data = { settings: ReviewSettings; google: Google; hasKey: boolean; writeUrl: string; requests: ReviewRequest[]; canEdit: boolean };
const tone: Record<ReviewRequest["status"], string> = { scheduled: "bg-mist text-muted", sent: "bg-lav-100 text-lav-700", clicked: "bg-emerald-50 text-emerald-800", cancelled: "bg-mist text-muted line-through", failed: "bg-red-50 text-red-700" };
const when = (iso: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "");
const rid = () => Math.random().toString(36).slice(2, 10);
const wa = (p: string) => { const d = p.replace(/\D/g, ""); return d.length === 10 ? `91${d}` : d; };

// Admin → Google reviews: rating and reviews on the website, and asking clients for a review.
export default function ReviewsManager({ goApiKeys }: { goApiKeys?: () => void }) {
  const [tab, setTab] = useState<"site" | "ask">("site");
  const [data, setData] = useState<Data | null>(null);
  const [s, setS] = useState<ReviewSettings | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    try {
      const d = await api<Data>("/api/admin/reviews");
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
  const dirty = JSON.stringify(s) !== saved;

  const save = async (next = s) => {
    setBusy("save");
    setMsg(null);
    try {
      const out = await api<ReviewSettings>("/api/admin/reviews", { method: "PUT", body: JSON.stringify(next) });
      setS(out);
      setSaved(JSON.stringify(out));
      setMsg({ ok: true, text: "Saved" });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy("");
    }
  };
  const refresh = async () => {
    if (dirty) await save();
    setBusy("refresh");
    setMsg(null);
    try {
      await api("/api/admin/reviews", { method: "POST", body: JSON.stringify({ action: "refresh" }) });
      setMsg({ ok: true, text: "Loaded from Google." });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't reach Google." });
    } finally {
      setBusy("");
    }
  };
  const g = data.google;
  const L = (p: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) => <label className={`block ${p.wide ? "sm:col-span-2" : ""}`}><span className="mb-1.5 block text-[13px] font-semibold">{p.label}</span>{p.children}{p.hint && <span className="mt-1 block text-xs text-muted">{p.hint}</span>}</label>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-2xl font-semibold">Google reviews</h2>
          <p className="text-sm text-muted">Show your Google rating on the home page, and ask happy clients for a review when a project is done.</p>
        </div>
        {data.writeUrl && <a href={data.writeUrl} target="_blank" rel="noreferrer" className="btn-ghost bg-white px-4 py-2.5 text-sm"><ExternalLink size={15} /> Your review link</a>}
      </div>
      <div className="flex flex-wrap gap-2">
        {([["site", "On the website"], ["ask", `Ask for reviews (${data.requests.filter((r) => r.status !== "cancelled").length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {msg && <p role="status" className={`rounded-2xl px-5 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {tab === "site" ? (
        <fieldset disabled={ro} className="space-y-5">
          <section className={`flex flex-wrap items-center gap-4 rounded-3xl border p-6 ${s.show ? "border-emerald-200 bg-emerald-50/50" : "border-line bg-white"}`}>
            <button type="button" role="switch" aria-checked={s.show} onClick={() => { const n = { ...s, show: !s.show }; setS(n); save(n); }} className={`relative h-8 w-14 shrink-0 rounded-full transition ${s.show ? "bg-emerald-600" : "bg-line"}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${s.show ? "left-7" : "left-1"}`} />
            </button>
            <div className="flex-1"><p className="font-display text-lg font-semibold">Google reviews on the home page: {s.show ? "on" : "off"}</p><p className="text-sm text-muted">Shown after Testimonials. Move it in Home page sections.</p></div>
          </section>

          <section className="rounded-3xl border border-line bg-white p-6">
            <h3 className="font-display text-lg font-semibold">Where the reviews come from</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {([["google", "Live from Google (recommended)", "Your real rating and up to 5 recent reviews, updated twice a day. Needs a Places API key and your Place ID."], ["manual", "Typed in here", "Copy your rating and favourite reviews from Google yourself. No API key needed."]] as const).map(([k, t, d]) => (
                <label key={k} className={`cursor-pointer rounded-2xl border p-4 ${s.mode === k ? "border-lav-500 bg-lav-100/40" : "border-line"}`}>
                  <span className="flex items-center gap-2 font-semibold"><input type="radio" className="accent-lav-600" checked={s.mode === k} onChange={() => setS({ ...s, mode: k })} /> {t}</span>
                  <span className="mt-1 block text-sm text-muted">{d}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {L({ label: "Google Place ID", hint: "Find it at developers.google.com/maps/documentation/places/web-service/place-id (search your business name). Starts with ChIJ…", children: <input className="input font-mono text-sm" value={s.placeId} onChange={(e) => setS({ ...s, placeId: e.target.value.trim() })} placeholder="ChIJ…" /> })}
              {L({ label: "“Write a review” link (optional)", hint: "Leave empty to make it from the Place ID. Or paste the link from Google Business Profile → Ask for reviews.", children: <input className="input" value={s.reviewUrl} onChange={(e) => setS({ ...s, reviewUrl: e.target.value })} placeholder="https://g.page/r/…/review" /> })}
              {L({ label: "Section title", children: <input className="input" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /> })}
              <div className="grid grid-cols-2 gap-3">
                {L({ label: "Show reviews with at least", children: <select className="input" value={s.minRating} onChange={(e) => setS({ ...s, minRating: Number(e.target.value) })}>{[5, 4, 3, 1].map((n) => <option key={n} value={n}>{n === 1 ? "Any rating" : `${n} stars`}</option>)}</select> })}
                {L({ label: "How many", children: <select className="input" value={s.maxReviews} onChange={(e) => setS({ ...s, maxReviews: Number(e.target.value) })}>{[3, 4, 5, 6, 9, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select> })}
              </div>
            </div>

            {s.mode === "google" ? (
              <div className="mt-5 rounded-2xl bg-mist p-5 text-sm">
                {!data.hasKey && <p className="mb-3 text-amber-800">Add the Places API key in {goApiKeys ? <button type="button" onClick={goApiKeys} className="font-semibold underline">API keys</button> : "API keys"} → Google reviews on the website. In console.cloud.google.com turn on <b>Places API (New)</b> and create a key restricted to it.</p>}
                {g.fetchedAt ? (
                  <p><b>{g.name || "Your business"}</b>: {Number(g.rating ?? 0).toFixed(1)} ★ from {g.count ?? 0} reviews · {(g.reviews ?? []).length} review texts · loaded {when(g.fetchedAt)}</p>
                ) : <p className="text-muted">Not loaded yet.</p>}
                {g.error && (!g.fetchedAt || (g.errorAt ?? "") > g.fetchedAt) && <p className="mt-2 text-red-700">Last problem: {g.error}</p>}
                <button type="button" onClick={refresh} disabled={!!busy || !s.placeId} className="btn-ghost mt-3 bg-white px-4 py-2 text-sm">{busy === "refresh" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Load from Google now</button>
                <p className="mt-2 text-xs text-muted">Google gives at most 5 reviews through its API, picked by Google. Your full list stays on Google Maps (the site links to it).</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  {L({ label: "Rating (e.g. 4.9)", children: <input className="input" type="number" step={0.1} min={0} max={5} value={s.manualRating || ""} onChange={(e) => setS({ ...s, manualRating: Number(e.target.value) || 0 })} /> })}
                  {L({ label: "Number of reviews", children: <input className="input" type="number" min={0} value={s.manualCount || ""} onChange={(e) => setS({ ...s, manualCount: Number(e.target.value) || 0 })} /> })}
                  {L({ label: "Google Maps link", children: <input className="input" value={s.manualMapsUrl} onChange={(e) => setS({ ...s, manualMapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" /> })}
                </div>
                {s.manualReviews.map((r) => (
                  <div key={r.id} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_110px_140px_auto]">
                    <input className="input" value={r.name} onChange={(e) => setS({ ...s, manualReviews: s.manualReviews.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)) })} placeholder="Name as on Google" />
                    <select className="input" value={r.rating} onChange={(e) => setS({ ...s, manualReviews: s.manualReviews.map((x) => (x.id === r.id ? { ...x, rating: Number(e.target.value) } : x)) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}</select>
                    <input className="input" value={r.when} onChange={(e) => setS({ ...s, manualReviews: s.manualReviews.map((x) => (x.id === r.id ? { ...x, when: e.target.value } : x)) })} placeholder="e.g. 2 months ago" />
                    <button type="button" onClick={() => setS({ ...s, manualReviews: s.manualReviews.filter((x) => x.id !== r.id) })} aria-label="Remove" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    <textarea className="input min-h-[70px] sm:col-span-4" value={r.text} onChange={(e) => setS({ ...s, manualReviews: s.manualReviews.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)) })} placeholder="The review, word for word" />
                  </div>
                ))}
                <button type="button" onClick={() => setS({ ...s, manualReviews: [...s.manualReviews, { id: rid(), name: "", photo: "", rating: 5, text: "", when: "", url: "" }] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={15} /> Add a review</button>
                <p className="text-xs text-muted">Only add real reviews, copied from your Google profile.</p>
              </div>
            )}
          </section>
          {!ro && <div className="flex items-center gap-3"><button type="button" onClick={() => save()} disabled={!dirty || !!busy} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button></div>}
        </fieldset>
      ) : (
        <Ask data={data} s={s} setS={setS} dirty={dirty} save={save} reload={load} ro={ro} />
      )}
    </div>
  );
}

function Ask({ data, s, setS, dirty, save, reload, ro }: { data: Data; s: ReviewSettings; setS: (x: ReviewSettings) => void; dirty: boolean; save: (n?: ReviewSettings) => Promise<void>; reload: () => void; ro: boolean }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", project: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("ask");
    setError("");
    try {
      await api("/api/admin/reviews/requests", { method: "POST", body: JSON.stringify(f) });
      setF({ name: "", email: "", phone: "", project: "" });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setBusy("");
    }
  };
  const act = async (r: ReviewRequest, action: "send" | "cancel") => {
    setBusy(r.id);
    setError("");
    try {
      await api(`/api/admin/reviews/requests/${r.id}`, { method: "POST", body: JSON.stringify({ action }) });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't do that.");
    } finally {
      setBusy("");
    }
  };
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="space-y-5">
      {!data.writeUrl && <p className="rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-800">Add your Google Place ID or review link in “On the website” first. The request emails need it.</p>}
      {!ro && (
        <form onSubmit={ask} className="rounded-3xl border border-line bg-white p-6">
          <h3 className="font-display text-lg font-semibold">Ask a client now</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <input className="input" required placeholder="Client name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className="input" required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className="input" placeholder="Phone (for WhatsApp)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <input className="input" placeholder="Project, e.g. your website" value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })} />
          </div>
          {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={!!busy || !data.writeUrl} className="btn-dark mt-3 px-5 py-2.5 text-sm disabled:opacity-50">{busy === "ask" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Email the review request</button>
        </form>
      )}

      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">Ask automatically</h3>
        <fieldset disabled={ro} className="mt-3 space-y-3 text-sm">
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={s.askOnProjectDone} onChange={(e) => setS({ ...s, askOnProjectDone: e.target.checked })} /><span><b>When a project is marked Completed</b> in the client portal</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={s.askOnLeadWon} onChange={(e) => setS({ ...s, askOnLeadWon: e.target.checked })} /><span><b>When a lead is marked Won</b> (only if it has an email)</span></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Send after</span><select className="input" value={s.delayDays} onChange={(e) => setS({ ...s, delayDays: Number(e.target.value) })}>{[0, 1, 2, 3, 7, 14].map((d) => <option key={d} value={d}>{d ? `${d} day${d > 1 ? "s" : ""}` : "Right away"}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">One reminder if not opened, after</span><select className="input" value={s.reminderDays} onChange={(e) => setS({ ...s, reminderDays: Number(e.target.value) })}>{[0, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d ? `${d} days` : "No reminder"}</option>)}</select></label>
            <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Email subject</span><input className="input" value={s.subject} onChange={(e) => setS({ ...s, subject: e.target.value })} /></label>
            <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Email text</span><textarea className="input min-h-[110px]" value={s.message} onChange={(e) => setS({ ...s, message: e.target.value })} /><span className="mt-1 block text-xs text-muted">Use {"{name}"}, {"{project}"} and {"{brand}"}. The email starts with “Hi name,” and ends with a “Write a Google review” button.</span></label>
          </div>
          <p className="text-xs text-muted">Nobody is asked twice within 6 months. Sent by the scheduler (Automation and backups), so it must be running.</p>
          {!ro && <button type="button" onClick={() => save()} disabled={!dirty || !!busy} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted"><Save size={15} /> Save</button>}
        </fieldset>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">Requests</h3>
        {data.requests.length === 0 ? <p className="mt-2 text-sm text-muted">No review requests yet.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {data.requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <Star size={16} className={r.status === "clicked" ? "text-amber-400" : "text-muted"} fill={r.status === "clicked" ? "currentColor" : "none"} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.name} <span className="font-normal text-muted">· {r.project || "—"}</span></span>
                  <span className="block truncate text-xs text-muted">{[r.email, r.source === "project" ? "Project completed" : r.source === "lead" ? "Lead won" : `Asked by ${r.by || "team"}`, r.status === "scheduled" ? `sends ${when(r.sendAt)}` : r.sentAt && `sent ${when(r.sentAt)}`, r.reminded && "reminder sent", r.clickedAt && `opened ${when(r.clickedAt)}`, r.error].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[r.status]}`}>{requestStatusLabel[r.status]}</span>
                {r.phone && r.status !== "cancelled" && <a href={`https://wa.me/${wa(r.phone)}?text=${encodeURIComponent(`Hi ${r.name.split(" ")[0]}, thank you for working with us! If you're happy with our work, could you leave us a quick Google review? ${origin}/r/${r.token}`)}`} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5 text-xs">WhatsApp</a>}
                {!ro && (r.status === "scheduled" || r.status === "failed") && <button onClick={() => act(r, "send")} disabled={!!busy} className="btn-ghost px-3 py-1.5 text-xs">{busy === r.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send now</button>}
                {!ro && r.status === "scheduled" && <button onClick={() => act(r, "cancel")} disabled={!!busy} className="rounded-full px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"><X size={12} className="inline" /> Cancel</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
