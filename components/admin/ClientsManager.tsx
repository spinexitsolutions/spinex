"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Plus, RefreshCw, Search, UsersRound } from "lucide-react";
import { projectProgress, shortDate, type PortalClient } from "@/lib/portal";
import Modal from "./Modal";

type Row = PortalClient & { openTickets: number; unreadTickets: number };

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

// Admin → Client portal: everyone who can log in to the portal.
export default function ClientsManager({ readOnly = false }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await api<Row[]>("/api/admin/clients"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load clients.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => !n || `${r.name} ${r.company} ${r.email} ${r.phone}`.toLowerCase().includes(n));
  }, [rows, q]);
  const unread = rows.reduce((s, r) => s + r.unreadTickets, 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const c = await api<PortalClient>("/api/admin/clients", { method: "POST", body: JSON.stringify(form) });
      window.location.href = `/admin/clients/${c.id}`;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't add the client.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Client portal</h2>
          <p className="text-sm text-muted">Clients log in at <b>/portal</b> with their email (a 6-digit code, no password) to see project progress, files, invoices and support.</p>
        </div>
        <a href="/portal/login" target="_blank" rel="noreferrer" className="btn-ghost ml-auto bg-white px-4 py-2.5 text-sm">Open portal login</a>
        {!readOnly && <button onClick={() => setAdding(true)} className="btn-dark px-5 py-2.5 text-sm"><Plus size={16} /> Add client</button>}
      </div>

      {unread > 0 && (
        <p className="flex items-center gap-2 rounded-2xl border border-lav-200 bg-lav-100/60 px-5 py-3 text-sm text-lav-700"><MessageSquare size={16} /> <b>{unread}</b> support {unread > 1 ? "requests need" : "request needs"} a reply.</p>
      )}

      <div className="flex items-center gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-line bg-white px-4">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, email or phone" aria-label="Search clients" className="h-full w-full bg-transparent text-sm outline-none" />
        </label>
        <button onClick={load} aria-label="Refresh" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white hover:border-ink"><RefreshCw size={15} /></button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      {loading ? (
        <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
          <UsersRound className="mx-auto text-lav-600" />
          <p className="mt-3 font-semibold">{rows.length ? "No clients match." : "No clients yet"}</p>
          <p className="mt-1 text-sm text-muted">{rows.length ? "Try another search." : "Add a client, add their project, then send them the portal invite."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => {
            const active = c.projects.filter((p) => p.status !== "completed");
            const main = active[0] ?? c.projects[0];
            return (
              <a key={c.id} href={`/admin/clients/${c.id}`} className="grid items-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-ink sm:grid-cols-[1.3fr_1fr_auto]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{c.company || c.name}{!c.active && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-muted">Login off</span>}</span>
                  <span className="block truncate text-sm text-muted">{[c.company ? c.name : "", c.email].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="min-w-0 text-sm">
                  {main ? (
                    <>
                      <span className="block truncate">{main.title || "Project"} <span className="text-muted">· {projectProgress(main)}%</span></span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-mist"><span className="block h-full rounded-full bg-lav-600" style={{ width: `${projectProgress(main)}%` }} /></span>
                    </>
                  ) : <span className="text-muted">No projects yet</span>}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted sm:justify-end">
                  {c.unreadTickets > 0 && <span className="rounded-full bg-lav-600 px-2.5 py-1 font-bold text-white">{c.unreadTickets} new</span>}
                  {c.openTickets > 0 && c.unreadTickets === 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{c.openTickets} open</span>}
                  {c.lastLoginAt ? `Last login ${shortDate(c.lastLoginAt)}` : c.invitedAt ? "Invited, not logged in yet" : "Not invited yet"}
                </span>
              </a>
            );
          })}
        </div>
      )}

      <Modal open={adding} title="Add client" onClose={() => setAdding(false)}>
        <form onSubmit={add} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Contact name *</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Company</span><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Email * <span className="font-normal text-muted">(used to log in)</span></span><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Phone</span><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</p>}
          <button disabled={saving} className="btn-dark px-5 py-2.5 text-sm">{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add and open</button>
        </form>
      </Modal>
    </div>
  );
}
