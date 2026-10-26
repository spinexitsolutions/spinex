"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Check, Copy, ExternalLink, Link2, Loader2, Phone, Plus, Save, Trash2, Video, X } from "lucide-react";
import { bookingStatusLabel, dateLabel, timeLabel, type Booking, type BookingSettings } from "@/lib/booking";
import { useLive } from "./live";

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
type Data = { bookings: Booking[]; upcoming: number; settings: BookingSettings; google: { ready: boolean; connected: boolean; email: string; redirectUri: string; error: string }; bookUrl: string; canEdit: boolean; isOwner: boolean };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const tone: Record<Booking["status"], string> = { confirmed: "bg-emerald-50 text-emerald-800", cancelled: "bg-mist text-muted", done: "bg-lav-100 text-lav-700", noshow: "bg-amber-50 text-amber-800" };
const waNumber = (p: string) => { const d = p.replace(/\D/g, ""); return d.length === 10 ? `91${d}` : d; };

// Admin → Call bookings: upcoming and past calls, and the booking settings (with the on/off switch).
export default function BookingsManager({ goApiKeys }: { goApiKeys?: () => void }) {
  const [tab, setTab] = useState<"upcoming" | "past" | "settings">("upcoming");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    try { setData(await api<Data>(`/api/admin/bookings?when=${tab === "past" ? "past" : "upcoming"}`)); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load."); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);
  useLive("bookings", load);
  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get("google");
    if (g) {
      setTab("settings");
      setMsg(g === "ok" ? "Google Calendar connected. New calls get their own Google Meet link." : g === "denied" ? "Google access wasn't given." : "Couldn't connect Google Calendar. See the message in Settings.");
      window.history.replaceState(null, "", "/admin#bookings");
    }
  }, []);

  if (!data) return <div className="grid place-items-center py-16 text-muted">{error || <Loader2 className="animate-spin" />}</div>;
  const s = data.settings;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-2xl font-semibold">Call bookings</h2>
          <p className="text-sm text-muted">Visitors pick a free time on <b>/book</b> for a free consultation call. You get an alert, the call goes in your calendar with a Meet link, and both of you get reminders.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${s.enabled ? "bg-emerald-50 text-emerald-800" : "bg-mist text-muted"}`}>{s.enabled ? "Booking is on" : "Booking is off"}</span>
        <a href="/book" target="_blank" rel="noreferrer" className="btn-ghost bg-white px-4 py-2.5 text-sm"><ExternalLink size={15} /> Open booking page</a>
      </div>
      {msg && <p role="status" className="rounded-2xl bg-lav-100/60 px-5 py-3 text-sm text-lav-700">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        {([["upcoming", `Upcoming (${data.upcoming})`], ["past", "Past and cancelled"], ["settings", "Settings"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {tab === "settings" ? <Settings data={data} onSaved={(x) => { setData({ ...data, settings: x }); }} reload={load} goApiKeys={goApiKeys} /> : <List data={data} past={tab === "past"} reload={load} />}
    </div>
  );
}

function List({ data, past, reload }: { data: Data; past: boolean; reload: () => void }) {
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const act = async (b: Booking, action: string) => {
    setBusy(`${action}:${b.id}`);
    setError("");
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: "POST", body: JSON.stringify({ action, note: notes[b.id] ?? b.note }) });
      setAsk("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy("");
    }
  };
  if (!data.bookings.length) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
        <CalendarCheck className="mx-auto text-lav-600" />
        <p className="mt-3 font-semibold">{past ? "No past calls yet" : "No calls booked yet"}</p>
        <p className="mt-1 text-sm text-muted">{data.settings.enabled ? "Share your booking link in ads, WhatsApp status and email signature." : "Turn booking on in Settings first."}</p>
        {data.settings.enabled && <p className="mt-3 font-mono text-xs">{data.bookUrl}</p>}
      </div>
    );
  }
  let lastDate = "";
  return (
    <div className="space-y-2">
      {error && <p className="rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
      {data.bookings.map((b) => {
        const head = b.date !== lastDate ? (lastDate = b.date) : "";
        const live = b.status === "confirmed" && Date.parse(b.end) > Date.now();
        return (
          <div key={b.id}>
            {head && <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-[0.12em] text-muted">{dateLabel(b.date)}</p>}
            <div className={`rounded-2xl border bg-white px-5 py-4 ${live && Date.parse(b.start) - Date.now() < 3 * 3600e3 ? "border-lav-400" : "border-line"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="w-[86px] shrink-0 font-display text-lg font-semibold">{timeLabel(b.time)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{b.name}{b.company && <span className="font-normal text-muted"> · {b.company}</span>}</p>
                  <p className="text-sm text-muted">{[b.topic, b.phone, b.email].filter(Boolean).join(" · ")}</p>
                  {b.message && <p className="mt-1 text-sm">“{b.message}”</p>}
                  {b.cancelledBy && <p className="mt-1 text-xs text-muted">Cancelled by {b.cancelledBy === "client" ? "the client" : b.cancelledBy}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[b.status]}`}>{bookingStatusLabel[b.status]}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 pl-0 sm:pl-[98px]">
                {b.meetLink && b.status === "confirmed" && <a href={b.meetLink} target="_blank" rel="noreferrer" className="btn-dark px-4 py-2 text-sm"><Video size={14} /> Join Meet</a>}
                <a href={`tel:${b.phone}`} className="btn-ghost px-3 py-2 text-sm"><Phone size={14} /> Call</a>
                <a href={`https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(`Hi ${b.name.split(" ")[0]}, this is about our call on ${dateLabel(b.date, { day: "numeric", month: "short" })} at ${timeLabel(b.time)}.`)}`} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-sm">WhatsApp</a>
                {data.canEdit && b.status === "confirmed" && !live && <button onClick={() => act(b, "done")} disabled={!!busy} className="btn-ghost px-3 py-2 text-sm"><Check size={14} /> Call done</button>}
                {data.canEdit && b.status === "confirmed" && !live && <button onClick={() => act(b, "noshow")} disabled={!!busy} className="btn-ghost px-3 py-2 text-sm">Didn&apos;t join</button>}
                {data.canEdit && b.status === "confirmed" && live && (ask === b.id ? (
                  <span className="flex items-center gap-2 text-sm">Cancel and email {b.name.split(" ")[0]}? <button onClick={() => act(b, "cancel")} disabled={!!busy} className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white">{busy === `cancel:${b.id}` ? <Loader2 size={13} className="animate-spin" /> : null} Yes</button><button onClick={() => setAsk("")} className="rounded-full px-3 py-1.5 text-muted hover:bg-mist">No</button></span>
                ) : <button onClick={() => setAsk(b.id)} className="rounded-full px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><X size={14} className="inline" /> Cancel</button>)}
                {data.canEdit && (b.status === "done" || b.status === "noshow") && <button onClick={() => act(b, "reopen")} disabled={!!busy} className="rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-mist">Undo</button>}
              </div>
              {data.canEdit && (
                <div className="mt-3 flex gap-2 sm:pl-[98px]">
                  <input className="input h-10 flex-1 text-sm" placeholder="Private note (what was discussed, next step)" value={notes[b.id] ?? b.note} onChange={(e) => setNotes({ ...notes, [b.id]: e.target.value })} />
                  {(notes[b.id] ?? b.note) !== b.note && <button onClick={() => act(b, "note")} disabled={!!busy} className="btn-ghost px-3 text-sm"><Save size={14} /> Save</button>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Settings({ data, onSaved, reload, goApiKeys }: { data: Data; onSaved: (s: BookingSettings) => void; reload: () => void; goApiKeys?: () => void }) {
  const [s, setS] = useState<BookingSettings>(data.settings);
  const [saved, setSaved] = useState(JSON.stringify(data.settings));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [block, setBlock] = useState("");
  const [copied, setCopied] = useState(false);
  const dirty = JSON.stringify(s) !== saved;
  const ro = !data.canEdit;
  const g = data.google;

  const save = async (next = s) => {
    setBusy(true);
    setMsg(null);
    try {
      const out = await api<BookingSettings>("/api/admin/bookings/settings", { method: "PUT", body: JSON.stringify(next) });
      setS(out);
      setSaved(JSON.stringify(out));
      onSaved(out);
      setMsg({ ok: true, text: out.enabled ? "Saved. Booking is on." : "Saved. Booking is off." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    await api("/api/admin/google/disconnect", { method: "POST" }).catch(() => undefined);
    reload();
  };
  const L = (p: { label: string; children: React.ReactNode; hint?: string }) => <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">{p.label}</span>{p.children}{p.hint && <span className="mt-1 block text-xs text-muted">{p.hint}</span>}</label>;

  return (
    <fieldset disabled={ro} className="space-y-5">
      <section className={`flex flex-wrap items-center gap-4 rounded-3xl border p-6 ${s.enabled ? "border-emerald-200 bg-emerald-50/50" : "border-line bg-white"}`}>
        <button type="button" role="switch" aria-checked={s.enabled} onClick={() => { const next = { ...s, enabled: !s.enabled }; setS(next); save(next); }} disabled={busy || ro}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${s.enabled ? "bg-emerald-600" : "bg-line"}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${s.enabled ? "left-7" : "left-1"}`} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold">Call booking is {s.enabled ? "on" : "off"}</p>
          <p className="text-sm text-muted">{s.enabled ? "Visitors can book on the booking page, and a “Book a free call” button shows on the contact page." : "The booking page says booking is closed and sends people to the contact form."}</p>
        </div>
        <div className="flex min-w-[260px] gap-2">
          <input readOnly className="input font-mono text-xs" value={data.bookUrl} onFocus={(e) => e.target.select()} />
          <button type="button" onClick={() => navigator.clipboard?.writeText(data.bookUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className="btn-ghost shrink-0 bg-white px-3 text-sm"><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">The call</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {L({ label: "Length", children: <select className="input" value={s.duration} onChange={(e) => setS({ ...s, duration: Number(e.target.value) })}>{[15, 20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select> })}
          {L({ label: "Break after each call", children: <select className="input" value={s.buffer} onChange={(e) => setS({ ...s, buffer: Number(e.target.value) })}>{[0, 5, 10, 15, 30, 45, 60].map((m) => <option key={m} value={m}>{m ? `${m} minutes` : "None"}</option>)}</select> })}
          {L({ label: "Earliest booking", hint: "from now", children: <select className="input" value={s.minNoticeHours} onChange={(e) => setS({ ...s, minNoticeHours: Number(e.target.value) })}>{[0, 1, 2, 3, 6, 12, 24, 48].map((h) => <option key={h} value={h}>{h ? `${h} hour${h > 1 ? "s" : ""} later` : "Any time"}</option>)}</select> })}
          {L({ label: "Book up to", children: <select className="input" value={s.daysAhead} onChange={(e) => setS({ ...s, daysAhead: Number(e.target.value) })}>{[7, 14, 21, 30, 60].map((d) => <option key={d} value={d}>{d} days ahead</option>)}</select> })}
          {L({ label: "Most calls in a day", children: <input className="input" type="number" min={0} max={50} value={s.maxPerDay} onChange={(e) => setS({ ...s, maxPerDay: Number(e.target.value) || 0 })} />, hint: "0 = no limit" })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {L({ label: "Page title", children: <input className="input" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /> })}
          {L({ label: "Topics to choose from (one per line)", hint: "Leave empty to use your services", children: <textarea className="input min-h-[46px]" rows={2} value={s.topics.join("\n")} onChange={(e) => setS({ ...s, topics: e.target.value.split("\n") })} /> })}
        </div>
        <div className="mt-4">{L({ label: "Text under the title", children: <textarea className="input min-h-[70px]" value={s.intro} onChange={(e) => setS({ ...s, intro: e.target.value })} /> })}</div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">When you take calls (India time)</h3>
        <div className="mt-3 space-y-2">
          {s.week.map((d, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] items-center gap-3 sm:grid-cols-[160px_140px_140px]">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={d.on} onChange={(e) => setS({ ...s, week: s.week.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })} /> {DAYS[i]}</label>
              {d.on ? (
                <>
                  <input className="input h-10" type="time" step={900} value={d.start} onChange={(e) => setS({ ...s, week: s.week.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })} aria-label={`${DAYS[i]} from`} />
                  <input className="input h-10" type="time" step={900} value={d.end} onChange={(e) => setS({ ...s, week: s.week.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })} aria-label={`${DAYS[i]} to`} />
                </>
              ) : <span className="text-sm text-muted">No calls</span>}
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold">Days off (holidays, travel)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input type="date" className="input h-10 w-[180px]" value={block} onChange={(e) => setBlock(e.target.value)} aria-label="Day off" />
          <button type="button" onClick={() => { if (block) setS({ ...s, blocked: Array.from(new Set([...s.blocked, block])).sort() }); setBlock(""); }} className="btn-ghost px-4 text-sm"><Plus size={14} /> Add</button>
          {s.blocked.map((d) => <span key={d} className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1.5 text-sm">{dateLabel(d, { day: "numeric", month: "short", year: "numeric" })}<button type="button" onClick={() => setS({ ...s, blocked: s.blocked.filter((x) => x !== d) })} aria-label="Remove" className="text-muted hover:text-red-600"><Trash2 size={12} /></button></span>)}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">How you meet</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {([["google", Video, "Google Meet, a new link per call", "Needs Google Calendar connected (below). The call goes in your calendar, the client gets an invite, and your busy times are hidden from the booking page."], ["link", Link2, "One fixed meeting link", "The same Meet, Zoom or Teams link for every call."], ["phone", Phone, "Phone call", "You call the client on their number at that time."]] as const).map(([k, I, t, d]) => (
            <label key={k} className={`cursor-pointer rounded-2xl border p-4 ${s.meetMode === k ? "border-lav-500 bg-lav-100/40" : "border-line"}`}>
              <span className="flex items-center gap-2 font-semibold"><input type="radio" className="accent-lav-600" checked={s.meetMode === k} onChange={() => setS({ ...s, meetMode: k })} /><I size={16} /> {t}</span>
              <span className="mt-1 block text-sm text-muted">{d}</span>
            </label>
          ))}
        </div>
        {s.meetMode !== "phone" && <div className="mt-4 max-w-xl">{L({ label: s.meetMode === "google" ? "Backup meeting link (used if Google can't make one)" : "Meeting link", children: <input className="input" value={s.meetLink} onChange={(e) => setS({ ...s, meetLink: e.target.value })} placeholder="https://meet.google.com/abc-defg-hij" /> })}</div>}

        {s.meetMode === "google" && (
          <div className={`mt-5 rounded-2xl p-5 ${g.connected ? "bg-emerald-50" : "bg-mist"}`}>
            {g.connected ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex-1 text-sm text-emerald-800"><b>Google Calendar connected</b>{g.email ? ` (${g.email})` : ""}. Each call gets its own Meet link.</p>
                {data.isOwner && <button type="button" onClick={disconnect} className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Disconnect</button>}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="font-semibold">Connect Google Calendar (one time, owner only)</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-muted">
                  <li>On <b>console.cloud.google.com</b> make a project and turn on the <b>Google Calendar API</b>.</li>
                  <li>OAuth consent screen: External, add your own Gmail as a test user (or publish it).</li>
                  <li>Credentials → Create credentials → <b>OAuth client ID</b> → Web application. Add this <b>Authorised redirect URI</b>: <code className="break-all rounded bg-white px-1.5 py-0.5 text-ink">{g.redirectUri}</code></li>
                  <li>Paste the client ID and secret in {goApiKeys ? <button type="button" onClick={goApiKeys} className="font-semibold text-lav-700 underline">API keys</button> : "API keys"} → Google Calendar (call booking).</li>
                  <li>Come back here and press Connect.</li>
                </ol>
                {g.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-red-700">{g.error}</p>}
                {data.isOwner ? (
                  g.ready ? <a href="/api/admin/google/connect" className="btn-dark inline-flex px-5 py-2.5 text-sm"><CalendarCheck size={15} /> Connect Google Calendar</a> : <p className="text-amber-700">Add the OAuth client ID and secret in API keys first.</p>
                ) : <p className="text-muted">Ask the owner to connect it.</p>}
                <p className="text-xs text-muted">Until it is connected, the backup link above (or a phone call) is used.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-lav-600" checked={s.reminders} onChange={(e) => setS({ ...s, reminders: e.target.checked })} />
          <span><span className="block font-semibold">Send reminders</span><span className="block text-sm text-muted">The client gets an email the day before and about an hour before. You get an email (and WhatsApp, if alerts are on) an hour before. Needs the scheduler from Automation and backups running every hour.</span></span>
        </label>
      </section>

      {!ro && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => save()} disabled={!dirty || busy} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save settings</button>
          {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
        </div>
      )}
    </fieldset>
  );
}
