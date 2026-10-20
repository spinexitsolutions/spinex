"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, FileSpreadsheet, Inbox, Loader2, Mail, MessageCircle, Phone, RefreshCw, Search, Trash2 } from "lucide-react";
import { LEAD_SOURCES, LEAD_STATUSES, leadStatusLabel, type Lead, type LeadStatus } from "@/lib/leads";
import { formatDate } from "@/lib/interns";
import Modal from "./Modal";

const badge: Record<LeadStatus, string> = {
  new: "bg-lav-600 text-white",
  contacted: "bg-lav-100 text-lav-700",
  quote: "bg-amber-50 text-amber-800",
  won: "bg-emerald-50 text-emerald-800",
  lost: "bg-mist text-muted",
};

const today = () => new Date().toISOString().slice(0, 10);
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};
function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} days ago`;
  return formatDate(iso.slice(0, 10));
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data as T;
}

type Filter = LeadStatus | "all" | "due";

export default function LeadsManager({ onNewCount }: { onNewCount?: (n: number) => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Lead | null>(null);
  const [msg, setMsg] = useState("");

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2600);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setLeads(await api<Lead[]>("/api/admin/leads"));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onNewCount?.(leads.filter((l) => l.status === "new").length);
  }, [leads, onNewCount]);

  const isDue = (l: Lead) => !!l.followUp && l.followUp <= today() && l.status !== "won" && l.status !== "lost";
  const replace = (l: Lead) => setLeads((all) => all.map((x) => (x.id === l.id ? l : x)));

  const update = async (l: Lead, patch: Partial<Lead>, done?: string) => {
    const before = l;
    replace({ ...l, ...patch });
    try {
      const saved = await api<Lead>(`/api/admin/leads/${l.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      replace(saved);
      if (done) flash(done);
      return saved;
    } catch (e) {
      replace(before);
      flash(e instanceof Error ? e.message : "Couldn't save.");
      return null;
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length, due: leads.filter(isDue).length };
    LEAD_STATUSES.forEach((s) => (c[s] = leads.filter((l) => l.status === s).length));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  const wonValue = leads.filter((l) => l.status === "won").reduce((n, l) => n + (Number(l.value) || 0), 0);

  const list = leads.filter((l) => {
    if (filter === "due" ? !isDue(l) : filter !== "all" && l.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || [l.name, l.phone, l.email, l.services, l.message].some((v) => (v || "").toLowerCase().includes(q));
  });

  if (loading) return <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted"><Loader2 className="animate-spin" /></div>;
  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
        <p className="font-semibold text-red-700">{loadError}</p>
        <button onClick={load} className="btn-ghost mt-4"><RefreshCw size={16} /> Try again</button>
      </div>
    );
  }

  const tiles: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...LEAD_STATUSES.map((s) => ({ id: s as Filter, label: leadStatusLabel[s] })),
    { id: "due", label: "Follow-up due" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)} aria-pressed={filter === t.id} className={`rounded-2xl border p-4 text-left transition-colors ${filter === t.id ? "border-ink bg-ink text-white" : t.id === "due" && counts.due > 0 ? "border-red-200 bg-red-50 hover:border-red-400" : "border-line bg-white hover:border-ink"}`}>
            <p className="font-display text-3xl font-semibold">{counts[t.id]}</p>
            <p className={`text-sm ${filter === t.id ? "text-white/70" : "text-muted"}`}>{t.label}</p>
          </button>
        ))}
      </div>

      {wonValue > 0 && <p className="text-sm text-muted">Won so far: <b className="text-ink">₹{wonValue.toLocaleString("en-IN")}</b></p>}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-mist px-3">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone or message" className="h-11 w-full bg-transparent text-sm outline-none" aria-label="Search leads" />
        </label>
        <a href="/api/admin/leads/export" className="btn-ghost px-4 py-2.5 text-sm"><FileSpreadsheet size={16} /> Download Excel</a>
        <button onClick={load} aria-label="Refresh" className="grid h-11 w-11 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={16} /></button>
      </div>

      <div className="space-y-2">
        {leads.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
            <Inbox className="mx-auto text-lav-600" size={32} />
            <p className="mt-3 font-semibold">No enquiries yet</p>
            <p className="mt-1 text-sm text-muted">Messages from the contact form, home page and project planner will show up here.</p>
          </div>
        )}
        {leads.length > 0 && list.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-muted">Nothing here.</p>}

        <AnimatePresence initial={false}>
          {list.map((l) => (
            <motion.div key={l.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border bg-white p-4 ${l.status === "new" ? "border-lav-300" : "border-line"}`}>
              <button onClick={() => setOpen(l)} className="min-w-[220px] flex-1 text-left">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {l.status === "new" && <span className="h-2 w-2 rounded-full bg-lav-600" aria-label="New" />}
                  {l.name}
                  <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-muted">{LEAD_SOURCES[l.source] ?? l.source}</span>
                  {isDue(l) && <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"><BellRing size={11} /> Follow up</span>}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted">{[l.services, l.budget, l.message].filter(Boolean).join(" · ") || l.phone}</span>
              </button>
              <span className="text-sm text-muted">{ago(l.createdAt)}</span>
              <select value={l.status} onChange={(e) => update(l, { status: e.target.value as LeadStatus })} aria-label={`Status for ${l.name}`} className={`min-h-10 rounded-full border-0 px-3 text-sm font-semibold outline-none ${badge[l.status]}`}>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{leadStatusLabel[s]}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <a href={`tel:${l.phone}`} aria-label={`Call ${l.name}`} title="Call" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"><Phone size={16} /></a>
                <a href={`https://wa.me/${waNumber(l.phone)}?text=${encodeURIComponent(`Hi ${l.name}, this is Spinex IT Solutions. Thanks for your enquiry!`)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${l.name}`} title="WhatsApp" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-emerald-50 hover:text-emerald-700"><MessageCircle size={16} /></a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal open={!!open} title={open?.name ?? ""} onClose={() => setOpen(null)} wide>
        {open && (
          <LeadDetail
            lead={leads.find((x) => x.id === open.id) ?? open}
            onSave={async (patch) => {
              const saved = await update(open, patch, "Lead saved");
              if (saved) setOpen(null);
            }}
            onDelete={async () => {
              if (!confirm(`Delete the enquiry from ${open.name}? This can't be undone.`)) return;
              try {
                await api(`/api/admin/leads/${open.id}`, { method: "DELETE" });
                setLeads((all) => all.filter((x) => x.id !== open.id));
                setOpen(null);
                flash("Lead deleted");
              } catch (e) {
                flash(e instanceof Error ? e.message : "Couldn't delete.");
              }
            }}
          />
        )}
      </Modal>

      <AnimatePresence>
        {msg && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} role="status" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">{msg}</motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeadDetail({ lead, onSave, onDelete }: { lead: Lead; onSave: (patch: Partial<Lead>) => Promise<void>; onDelete: () => void }) {
  const [status, setStatus] = useState(lead.status);
  const [value, setValue] = useState(lead.value);
  const [followUp, setFollowUp] = useState(lead.followUp);
  const [notes, setNotes] = useState(lead.notes);
  const [saving, setSaving] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${lead.phone}`} className="btn-dark px-4 py-2.5 text-sm"><Phone size={15} /> Call {lead.phone}</a>
        <a href={`https://wa.me/${waNumber(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, this is Spinex IT Solutions. Thanks for your enquiry!`)}`} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-2.5 text-sm"><MessageCircle size={15} /> WhatsApp</a>
        {lead.email && <a href={`mailto:${lead.email}`} className="btn-ghost px-4 py-2.5 text-sm"><Mail size={15} /> Email</a>}
      </div>

      <dl className="mt-6 grid gap-4 rounded-2xl bg-mist p-5 sm:grid-cols-2">
        <Info label="Phone" value={lead.phone} />
        <Info label="Email" value={lead.email} />
        <Info label="Needs" value={lead.services} />
        <Info label="Budget" value={lead.budget} />
        <Info label="Came from" value={LEAD_SOURCES[lead.source] ?? lead.source} />
        <Info label="Received" value={`${formatDate(lead.createdAt.slice(0, 10))}, ${new Date(lead.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`} />
      </dl>

      {lead.message && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Message</p>
          <p className="mt-1 whitespace-pre-wrap rounded-2xl border border-line p-4 text-[15px] leading-relaxed">{lead.message}</p>
        </div>
      )}
      {lead.plan && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Project plan</p>
          <p className="mt-1 whitespace-pre-wrap rounded-2xl border border-line p-4 text-[15px] leading-relaxed">{lead.plan}</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{leadStatusLabel[s]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Deal value (₹)</span>
          <input className="input" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 25000" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Follow up on</span>
          <input className="input" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </label>
        <label className="block sm:col-span-3">
          <span className="mb-1.5 block text-[13px] font-semibold">Notes (only you see these)</span>
          <textarea className="input min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Called on Monday, wants a quote for 8 pages" />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onDelete} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete</button>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ status, value, followUp, notes });
            setSaving(false);
          }}
          className="btn-dark disabled:opacity-60"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving</> : "Save"}
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value || "Not given"}</dd>
    </div>
  );
}
