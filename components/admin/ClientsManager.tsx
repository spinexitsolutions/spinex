"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Loader2, MessageSquare, Plus, RefreshCw, Search, ShieldCheck, UsersRound } from "lucide-react";
import { amcState, amcStateLabel, mainAmc, projectProgress, shortDate, ticketKindLabel, ticketStatusLabel, type PortalClient, type Ticket } from "@/lib/portal";
import Modal from "./Modal";
import { useLive } from "./live";

type Row = PortalClient & { openTickets: number; unreadTickets: number };
type OpenTicket = Omit<Ticket, "messages"> & { messages: number; last: string; lastFrom: string };
type View = "all" | "requests" | "amc";
const amcChip = { upcoming: "bg-mist text-muted", active: "bg-emerald-50 text-emerald-800", expiring: "bg-amber-50 text-amber-800", expired: "bg-red-50 text-red-700" } as const;
// Renewals worth chasing: ending within 30 days, or ended in the last 60.
const amcDue = (c: PortalClient) => {
  const a = mainAmc(c.amcs);
  if (!a) return false;
  const st = amcState(a);
  return st === "expiring" || (st === "expired" && Date.now() - Date.parse(`${a.endDate}T00:00:00Z`) < 60 * 86400000);
};

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
  const [view, setView] = useState<View>("all");
  const [tickets, setTickets] = useState<OpenTicket[] | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const quiet = opts?.silent === true;
    if (!quiet) setLoading(true);
    if (!quiet) setError("");
    try {
      const [r, t] = await Promise.all([api<Row[]>("/api/admin/clients"), api<OpenTicket[]>("/api/admin/clients/tickets")]);
      setRows(r);
      setTickets(t);
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Couldn't load clients.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLive("clients", load);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => (view !== "amc" || amcDue(r)) && (!n || `${r.name} ${r.company} ${r.email} ${r.phone}`.toLowerCase().includes(n)));
  }, [rows, q, view]);
  const dueCount = rows.filter(amcDue).length;
  const urgent = (tickets ?? []).filter((t) => t.urgent && t.status === "open").length;
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

      {urgent > 0 && (
        <button onClick={() => setView("requests")} className="flex w-full items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-left text-sm text-red-700"><AlertTriangle size={16} /> <b>{urgent}</b> urgent {urgent > 1 ? "problems are" : "problem is"} waiting for the team.</button>
      )}
      {unread > 0 && (
        <button onClick={() => setView("requests")} className="flex w-full items-center gap-2 rounded-2xl border border-lav-200 bg-lav-100/60 px-5 py-3 text-left text-sm text-lav-700"><MessageSquare size={16} /> <b>{unread}</b> support {unread > 1 ? "requests need" : "request needs"} a reply.</button>
      )}
      {dueCount > 0 && view !== "amc" && (
        <button onClick={() => setView("amc")} className="flex w-full items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-left text-sm text-amber-800"><CalendarClock size={16} /> <b>{dueCount}</b> AMC {dueCount > 1 ? "renewals are" : "renewal is"} due soon or just ended.</button>
      )}

      <div className="flex flex-wrap gap-2">
        {([["all", `All clients (${rows.length})`], ["requests", `Open requests (${tickets?.length ?? 0})`], ["amc", `AMC due (${dueCount})`]] as [View, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === k ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>{label}</button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-line bg-white px-4">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, email or phone" aria-label="Search clients" className="h-full w-full bg-transparent text-sm outline-none" />
        </label>
        <button onClick={() => load()} aria-label="Refresh" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white hover:border-ink"><RefreshCw size={15} /></button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      {view === "requests" && !loading ? (
        (tickets ?? []).length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-muted">No open support requests. All caught up.</p>
        ) : (
          <ul className="space-y-2">
            {(tickets ?? []).map((t) => (
              <li key={t.id}>
                <a href={`/admin/clients/${t.clientId}?tab=support`} className={`block rounded-2xl border bg-white px-5 py-4 transition hover:border-ink ${t.urgent && t.status === "open" ? "border-red-300" : "border-line"}`}>
                  <span className="flex flex-wrap items-center gap-2">
                    {t.urgent && <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Urgent</span>}
                    <b className="min-w-0 truncate">{t.subject}</b>
                    {t.teamUnread && <span className="rounded-full bg-lav-600 px-2 py-0.5 text-[11px] font-bold text-white">New</span>}
                    <span className="ml-auto text-xs text-muted">{ticketStatusLabel[t.status]} · {shortDate(t.updatedAt)}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-semibold text-ink">{t.clientName}</span> · {ticketKindLabel[t.kind]} ·
                    {t.amcCovered ? <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck size={12} /> AMC</span> : <span className="text-amber-700">{t.amcTitle ? "AMC ended" : "No AMC"}</span>}
                  </span>
                  {t.last && <span className="mt-1.5 block truncate text-sm text-muted">{t.lastFrom === "team" ? "You: " : ""}{t.last}</span>}
                </a>
              </li>
            ))}
          </ul>
        )
      ) : loading ? (
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
                  {(() => { const a = mainAmc(c.amcs); return a ? <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${amcChip[amcState(a)]}`}>{a.title}: {amcStateLabel(a)}</span> : null; })()}
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
