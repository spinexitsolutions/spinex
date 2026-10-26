"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CalendarClock, Loader2, Plus, Repeat, Save, Send, Trash2 } from "lucide-react";
import { INDIAN_STATES, inr, type BillItem } from "@/lib/billing";
import { fillItem, frequencyLabel, periodLabel, type Frequency, type Recurring } from "@/lib/recurring";
import Modal from "./Modal";

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
const rid = () => Math.random().toString(36).slice(2, 10);
const dlabel = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const subtotal = (r: Pick<Recurring, "items" | "discount">) => Math.max(0, r.items.reduce((s, i) => s + i.qty * i.rate, 0) - r.discount);

// Quotes and invoices → Monthly bills: invoices made on their own every month (or 3 months / year).
export function MonthlyBills({ readOnly, defaultGst, defaultSac }: { readOnly: boolean; defaultGst: number; defaultSac: string }) {
  const [list, setList] = useState<Recurring[] | null>(null);
  const [edit, setEdit] = useState<Recurring | "new" | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(() => api<Recurring[]>("/api/admin/recurring").then(setList).catch((e) => setMsg({ ok: false, text: e.message })), []);
  useEffect(() => { load(); }, [load]);
  const now = async (r: Recurring) => {
    setBusy(r.id);
    setMsg(null);
    try {
      const out = await api<{ number: string; emailed: boolean; id: string }>(`/api/admin/recurring/${r.id}`, { method: "POST", body: JSON.stringify({ action: "now" }) });
      setMsg({ ok: true, text: `Invoice ${out.number} made${r.autoSend ? (out.emailed ? " and emailed to the client" : " (email couldn't be sent)") : ""}.` });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't make it." });
    } finally {
      setBusy("");
    }
  };
  if (!list) return <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>;
  const monthly = list.filter((r) => r.active).reduce((s, r) => s + subtotal(r) / ({ monthly: 1, quarterly: 3, yearly: 12 }[r.frequency]), 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-muted">For clients you bill every month, like SEO, social media or AMC. On the chosen day the invoice is made, emailed to the client with a Pay now link, and payment reminders follow if it isn&apos;t paid.{monthly > 0 && <> Active: <b className="text-ink">{inr(monthly, 0)}</b> a month (before GST).</>}</p>
        {!readOnly && <button onClick={() => setEdit("new")} className="btn-dark px-5 py-2.5 text-sm"><Plus size={15} /> New monthly bill</button>}
      </div>
      {msg && <p role="status" className={`rounded-2xl px-5 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
          <Repeat className="mx-auto text-lav-600" />
          <p className="mt-3 font-semibold">No monthly bills yet</p>
          <p className="mt-1 text-sm text-muted">Make one here, or open an invoice and press “Repeat every month”.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-white p-4 ${r.active ? "border-line" : "border-dashed border-line opacity-70"}`}>
              <Repeat size={18} className="text-lav-700" />
              <button onClick={() => setEdit(r)} className="min-w-[200px] flex-1 text-left">
                <span className="block font-semibold">{r.client.company || r.client.name || "No client"} <span className="font-normal text-muted">· {r.title}</span></span>
                <span className="block text-sm text-muted">{frequencyLabel[r.frequency]} on day {r.day} · {r.active ? `next ${dlabel(r.nextDate)}` : "paused"}{r.count ? ` · ${r.count} made, last ${r.lastNumber}` : ""}{r.autoSend ? " · emailed to client" : ""}</span>
              </button>
              <span className="font-semibold tabular-nums">{inr(subtotal(r), 0)}<span className="text-xs font-normal text-muted"> + GST</span></span>
              {!readOnly && r.active && <button onClick={() => now(r)} disabled={!!busy} className="btn-ghost px-3 py-2 text-sm">{busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Make next invoice now</button>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} title={edit === "new" ? "New monthly bill" : "Monthly bill"} onClose={() => setEdit(null)}>
        {edit && <RecurringForm key={edit === "new" ? "new" : edit.id} initial={edit === "new" ? null : edit} readOnly={readOnly} defaultGst={defaultGst} defaultSac={defaultSac} onDone={(t) => { setEdit(null); setMsg({ ok: true, text: t }); load(); }} />}
      </Modal>
    </div>
  );
}

function RecurringForm({ initial, readOnly, defaultGst, defaultSac, onDone }: { initial: Recurring | null; readOnly: boolean; defaultGst: number; defaultSac: string; onDone: (m: string) => void }) {
  const [r, setR] = useState<Omit<Recurring, "id" | "count" | "lastInvoiceId" | "lastNumber" | "lastDate" | "createdBy" | "createdAt" | "updatedAt"> & { id?: string }>(() => initial ?? {
    title: "SEO and social media", client: { name: "", company: "", phone: "", email: "", address: "", state: "Rajasthan", gstin: "" },
    items: [{ id: rid(), description: "SEO and social media management, {month} {year}", sac: defaultSac, qty: 1, rate: 0, gst: defaultGst }],
    discount: 0, notes: "", frequency: "monthly", day: 1, nextDate: "", endDate: "", dueDays: 7, autoSend: true, active: true,
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ask, setAsk] = useState(false);
  const set = (p: Partial<typeof r>) => setR((x) => ({ ...x, ...p }));
  const setItem = (id: string, p: Partial<BillItem>) => set({ items: r.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("save");
    setError("");
    try {
      await api(initial ? `/api/admin/recurring/${initial.id}` : "/api/admin/recurring", { method: initial ? "PATCH" : "POST", body: JSON.stringify(r) });
      onDone(initial ? "Saved." : "Monthly bill set up. The first invoice is made on its next date.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
      setBusy("");
    }
  };
  const del = async () => {
    setBusy("del");
    try {
      await api(`/api/admin/recurring/${initial!.id}`, { method: "DELETE" });
      onDone("Monthly bill deleted. Invoices already made stay.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
      setBusy("");
    }
  };
  const c = r.client;
  const setC = (p: Partial<typeof c>) => set({ client: { ...c, ...p } });
  const sampleDate = r.nextDate || new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={save} className="space-y-5 text-sm">
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Name for this bill</span><input className="input" value={r.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. SEO retainer" /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Client name *</span><input className="input" required value={c.name} onChange={(e) => setC({ name: e.target.value })} /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Company</span><input className="input" value={c.company} onChange={(e) => setC({ company: e.target.value })} /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Email (invoice is sent here)</span><input className="input" type="email" value={c.email} onChange={(e) => setC({ email: e.target.value })} /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Phone (WhatsApp)</span><input className="input" value={c.phone} onChange={(e) => setC({ phone: e.target.value })} /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">State</span><select className="input" value={c.state} onChange={(e) => setC({ state: e.target.value })}>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Client GSTIN (if any)</span><input className="input uppercase" value={c.gstin} onChange={(e) => setC({ gstin: e.target.value.toUpperCase() })} /></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Address</span><textarea className="input min-h-[56px]" value={c.address} onChange={(e) => setC({ address: e.target.value })} /></label>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <p className="font-semibold">Items</p>
          <p className="text-xs text-muted">{"{month}"}, {"{year}"} and {"{period}"} are filled in on each invoice. Example: “{fillItem(r.items[0]?.description || "SEO, {month} {year}", sampleDate, r.frequency)}”.</p>
          <div className="mt-3 space-y-2">
            {r.items.map((it) => (
              <div key={it.id} className="grid grid-cols-[1fr_70px_110px_80px_auto] items-center gap-2">
                <input className="input" value={it.description} onChange={(e) => setItem(it.id, { description: e.target.value })} aria-label="Description" />
                <input className="input" type="number" min={0} value={it.qty} onChange={(e) => setItem(it.id, { qty: Number(e.target.value) || 0 })} aria-label="Qty" />
                <input className="input" type="number" min={0} value={it.rate || ""} onChange={(e) => setItem(it.id, { rate: Number(e.target.value) || 0 })} placeholder="Rate ₹" aria-label="Rate" />
                <select className="input" value={it.gst} onChange={(e) => setItem(it.id, { gst: Number(e.target.value) })} aria-label="GST">{[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}</select>
                <button type="button" onClick={() => set({ items: r.items.filter((x) => x.id !== it.id) })} aria-label="Remove" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => set({ items: [...r.items, { id: rid(), description: "", sac: defaultSac, qty: 1, rate: 0, gst: defaultGst }] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={14} /> Add item</button>
            <p className="text-right">Before GST: <b>{inr(subtotal(r), 0)}</b></p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">How often</span><select className="input" value={r.frequency} onChange={(e) => set({ frequency: e.target.value as Frequency })}>{(Object.keys(frequencyLabel) as Frequency[]).map((f) => <option key={f} value={f}>{frequencyLabel[f]}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">On day of the month</span><select className="input" value={r.day} onChange={(e) => set({ day: Number(e.target.value) })}>{Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Pay within</span><select className="input" value={r.dueDays} onChange={(e) => set({ dueDays: Number(e.target.value) })}>{[0, 3, 5, 7, 10, 15, 30].map((d) => <option key={d} value={d}>{d ? `${d} days` : "Same day"}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Next invoice on</span><input className="input" type="date" value={r.nextDate} onChange={(e) => set({ nextDate: e.target.value })} /><span className="mt-1 block text-xs text-muted">{r.nextDate ? `For ${periodLabel(r.nextDate, r.frequency)}` : "Empty = the next chosen day"}</span></label>
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Stop after (optional)</span><input className="input" type="date" value={r.endDate} onChange={(e) => set({ endDate: e.target.value })} /></label>
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-line p-4"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={r.autoSend} onChange={(e) => set({ autoSend: e.target.checked })} /><span><b>Email the invoice to the client</b> (and WhatsApp, if set up) with a Pay now link. Off = it is made and you send it yourself.</span></label>
        {initial && <label className="flex items-start gap-3 rounded-2xl border border-line p-4"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={r.active} onChange={(e) => set({ active: e.target.checked })} /><span><b>Active</b>. Untick to pause (for example while the client is on a break).</span></label>}
      </fieldset>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700" role="alert">{error}</p>}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={!!busy || !r.items.length} className="btn-dark px-5 py-2.5 text-sm">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {initial ? "Save" : "Set up monthly bill"}</button>
          {initial && (ask ? <span className="flex items-center gap-2">Delete it? <button type="button" onClick={del} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">Yes</button><button type="button" onClick={() => setAsk(false)} className="btn-ghost px-4 py-2 text-sm">No</button></span> : <button type="button" onClick={() => setAsk(true)} className="ml-auto rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={14} className="inline" /> Delete</button>)}
        </div>
      )}
    </form>
  );
}

type RSettings = { enabled: boolean; steps: string; email: boolean; whatsapp: boolean; summary: boolean; message: string };

// Quotes and invoices → Payment reminders.
export function PaymentRemindersCard({ readOnly }: { readOnly: boolean }) {
  const [d, setD] = useState<{ settings: RSettings; state: { lastRun?: string; lastResult?: string }; canWhatsApp: boolean } | null>(null);
  const [s, setS] = useState<RSettings | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { api<NonNullable<typeof d>>("/api/admin/billing/reminders").then((x) => { setD(x); setS(x.settings); setSaved(JSON.stringify(x.settings)); }).catch(() => undefined); }, []);
  if (!d || !s) return <div className="grid place-items-center rounded-3xl border border-line bg-white py-10 text-muted"><Loader2 className="animate-spin" /></div>;
  const save = async (next = s) => {
    setBusy(true);
    setMsg("");
    try {
      const out = await api<RSettings>("/api/admin/billing/reminders", { method: "PUT", body: JSON.stringify(next) });
      setS(out);
      setSaved(JSON.stringify(out));
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };
  const steps = s.steps.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  const stepText = steps.map((n) => (n < 0 ? `${-n} day${n === -1 ? "" : "s"} before` : n === 0 ? "on the due date" : `${n} day${n === 1 ? "" : "s"} after`)).join(", ");
  return (
    <section className={`rounded-3xl border p-6 ${s.enabled ? "border-emerald-200 bg-emerald-50/40" : "border-line bg-white"}`}>
      <fieldset disabled={readOnly} className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" role="switch" aria-checked={s.enabled} onClick={() => { const n = { ...s, enabled: !s.enabled }; setS(n); save(n); }} className={`relative h-8 w-14 shrink-0 rounded-full transition ${s.enabled ? "bg-emerald-600" : "bg-line"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${s.enabled ? "left-7" : "left-1"}`} /></button>
          <div className="flex-1"><p className="flex items-center gap-2 font-display text-lg font-semibold"><BellRing size={18} /> Payment reminders are {s.enabled ? "on" : "off"}</p><p className="text-sm text-muted">Unpaid invoices get a polite reminder with a Pay now link: {stepText}. Each one once. Stops when the invoice is paid.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Days from the due date</span><input className="input" value={s.steps} onChange={(e) => setS({ ...s, steps: e.target.value })} placeholder="-3, 0, 3, 7, 15" /><span className="mt-1 block text-xs text-muted">Minus = before the due date, 0 = on it, plus = after it.</span></label>
          <div className="space-y-2 pt-6">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={s.email} onChange={(e) => setS({ ...s, email: e.target.checked })} /> Email the client</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.checked })} /> WhatsApp the client {!d.canWhatsApp && <span className="text-xs text-amber-700">(needs your WhatsApp panel link with {"{to}"}, or the Cloud API, in API keys)</span>}</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={s.summary} onChange={(e) => setS({ ...s, summary: e.target.checked })} /> Email me a list of who was reminded</label>
          </div>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Message</span><textarea className="input min-h-[100px]" value={s.message} onChange={(e) => setS({ ...s, message: e.target.value })} /><span className="mt-1 block text-xs text-muted">Use {"{name}"}, {"{number}"}, {"{amount}"} (still due), {"{due}"} (e.g. “was due on 5 November (3 days ago)”), {"{link}"} and {"{brand}"}.</span></label>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted"><CalendarClock size={13} /> Checked every morning by the scheduler (Automation and backups). Last check: {d.state.lastRun ? `${d.state.lastRun}, ${d.state.lastResult ?? ""}` : "never"}. To skip one invoice, open it and press “Stop reminders”.</p>
        {!readOnly && <div className="flex items-center gap-3"><button type="button" onClick={() => save()} disabled={busy || JSON.stringify(s) === saved} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted"><Save size={15} /> Save</button>{msg && <span className="text-sm text-muted">{msg}</span>}</div>}
      </fieldset>
    </section>
  );
}
