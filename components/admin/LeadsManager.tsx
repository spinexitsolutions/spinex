"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, BellRing, MailPlus, FilePlus2, Megaphone, FileSpreadsheet, FileText, Inbox, Loader2, Mail, MessageCircle, Phone, RefreshCw, Search, Trash2, UserRound } from "lucide-react";
import { LEAD_SOURCES, LEAD_STATUSES, LOST_REASONS, NOTE_OUTCOMES, NOTE_TYPES, leadStatusLabel, type Lead, type LeadStatus } from "@/lib/leads";
import { formatDate } from "@/lib/interns";
import Modal from "./Modal";
import AdLeadsSetup from "./AdLeadsSetup";
import LeadFollowupsSetup from "./LeadFollowupsSetup";
import { useLive } from "./live";

const badge: Record<LeadStatus, string> = {
  new: "bg-lav-600 text-white",
  contacted: "bg-lav-100 text-lav-700",
  quote: "bg-amber-50 text-amber-800",
  won: "bg-emerald-50 text-emerald-800",
  lost: "bg-mist text-muted",
};

// Today in India (the follow-up dates are Indian dates).
const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

type Member = { id: string; name: string; role: string };
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
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data as T;
}

type Filter = LeadStatus | "all" | "due" | "mine";

export default function LeadsManager({ onNewCount, readOnly = false, goApiKeys }: { onNewCount?: (n: number) => void; readOnly?: boolean; goApiKeys?: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Lead | null>(null);
  const [openAsLost, setOpenAsLost] = useState(false);
  const [msg, setMsg] = useState("");
  const [team, setTeam] = useState<Member[]>([]);
  const [channel, setChannel] = useState("all");
  const [showReport, setShowReport] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [showFollowups, setShowFollowups] = useState(false);
  const [myId, setMyId] = useState("");

  useEffect(() => {
    api<Member[]>("/api/admin/team").then(setTeam).catch(() => undefined);
    api<{ uid: string }>("/api/auth/me").then((m) => setMyId(m.uid)).catch(() => undefined);
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2600);
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const quiet = opts?.silent === true;
    if (!quiet) setLoading(true);
    setLoadError("");
    try {
      setLeads(await api<Lead[]>("/api/admin/leads"));
    } catch (e) {
      if (!quiet) setLoadError(e instanceof Error ? e.message : "Couldn't load leads.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);
  useLive("leads", load);

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

  // Calling, WhatsApp-ing or emailing a new lead marks it Contacted.
  const touched = (l: Lead) => {
    if (!readOnly && l.status === "new") void update(l, { status: "contacted" }, "Marked as Contacted");
  };
  // Marking Lost asks why, so open the lead with Lost picked.
  const pickStatus = (l: Lead, status: LeadStatus) => {
    if (status === "lost") { setOpenAsLost(true); setOpen(l); return; }
    void update(l, { status });
  };

  // Why leads were lost, most common first.
  const lostWhy = Object.entries(
    leads.filter((l) => l.status === "lost").reduce<Record<string, number>>((acc, l) => {
      const r = l.lostReason || "Reason not added";
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length, due: leads.filter(isDue).length, mine: leads.filter((l) => myId && l.assignedTo === myId && l.status !== "won" && l.status !== "lost").length };
    LEAD_STATUSES.forEach((s) => (c[s] = leads.filter((l) => l.status === s).length));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, myId]);

  const wonValue = leads.filter((l) => l.status === "won").reduce((n, l) => n + (Number(l.value) || 0), 0);

  // Leads by where they came from (ad, search, Instagram…), most first.
  const bySource = Object.values(
    leads.reduce<Record<string, { name: string; total: number; won: number; value: number; campaigns: Record<string, number> }>>((acc, l) => {
      const name = l.track?.channel || "Not recorded";
      const row = (acc[name] ??= { name, total: 0, won: 0, value: 0, campaigns: {} });
      row.total++;
      if (l.status === "won") { row.won++; row.value += Number(l.value) || 0; }
      const camp = l.track?.utmCampaign;
      if (camp) row.campaigns[camp] = (row.campaigns[camp] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  const list = leads.filter((l) => {
    if (channel !== "all" && (l.track?.channel || "Not recorded") !== channel) return false;
    if (filter === "due" ? !isDue(l) : filter === "mine" ? !(myId && l.assignedTo === myId && l.status !== "won" && l.status !== "lost") : filter !== "all" && l.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || [l.name, l.phone, l.email, l.services, l.message].some((v) => (v || "").toLowerCase().includes(q));
  });

  if (loading) return <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted"><Loader2 className="animate-spin" /></div>;
  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
        <p className="font-semibold text-red-700">{loadError}</p>
        <button onClick={() => load()} className="btn-ghost mt-4"><RefreshCw size={16} /> Try again</button>
      </div>
    );
  }

  const tiles: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...LEAD_STATUSES.map((s) => ({ id: s as Filter, label: leadStatusLabel[s] })),
    { id: "due", label: "Follow-up due" },
    { id: "mine", label: "Given to me" },
  ];

  return (
    <div className="space-y-5">
      {/* Phones: one row of small chips you swipe sideways, so the list starts right away. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filter leads">
        {tiles.map((t) => (
          <button key={t.id} role="tab" onClick={() => setFilter(t.id)} aria-selected={filter === t.id} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium ${filter === t.id ? "border-ink bg-ink text-white" : t.id === "due" && counts.due > 0 ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-white"}`}>
            {t.label} <span className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${filter === t.id ? "bg-white/20" : "bg-mist"}`}>{counts[t.id]}</span>
          </button>
        ))}
      </div>
      <div className="hidden grid-cols-4 gap-3 sm:grid xl:grid-cols-8">
        {tiles.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)} aria-pressed={filter === t.id} className={`rounded-2xl border p-4 text-left transition-colors ${filter === t.id ? "border-ink bg-ink text-white" : t.id === "due" && counts.due > 0 ? "border-red-200 bg-red-50 hover:border-red-400" : "border-line bg-white hover:border-ink"}`}>
            <p className="font-display text-3xl font-semibold">{counts[t.id]}</p>
            <p className={`whitespace-nowrap text-sm ${filter === t.id ? "text-white/70" : "text-muted"}`}>{t.label}</p>
          </button>
        ))}
      </div>

      {wonValue > 0 && <p className="text-sm text-muted">Won so far: <b className="text-ink">₹{wonValue.toLocaleString("en-IN")}</b></p>}

      {filter === "lost" && lostWhy.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-4" data-lost-reasons>
          <p className="text-sm font-semibold">Why leads were lost</p>
          <ul className="mt-3 space-y-2">
            {lostWhy.map(([r, n]) => (
              <li key={r} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <span className="relative overflow-hidden rounded-lg bg-mist px-3 py-1.5">
                  <span aria-hidden className="absolute inset-y-0 left-0 bg-red-100" style={{ width: `${(n / counts.lost) * 100}%` }} />
                  <span className="relative">{r}</span>
                </span>
                <span className="tabular-nums text-muted">{n} ({Math.round((n / counts.lost) * 100)}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3 max-sm:-order-none">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-mist px-3">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone or message" className="h-11 w-full bg-transparent text-sm outline-none" aria-label="Search leads" />
        </label>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Filter by source" className="h-11 rounded-full border border-line bg-white px-4 text-sm">
          <option value="all">All sources</option>
          {bySource.map((r) => <option key={r.name} value={r.name}>{r.name} ({r.total})</option>)}
        </select>
        {/* On phones these slide sideways in one row instead of stacking. */}
        <div className="-mx-3 flex w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3 [scrollbar-width:none] sm:contents [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setShowReport((v) => !v)} aria-pressed={showReport} className="btn-ghost shrink-0 whitespace-nowrap px-4 py-2.5 text-sm"><BarChart3 size={16} /> Where leads come from</button>
          <button onClick={() => setShowAds(true)} className="btn-ghost shrink-0 whitespace-nowrap px-4 py-2.5 text-sm"><Megaphone size={16} /> Get leads from ads</button>
          <button onClick={() => setShowFollowups(true)} className="btn-ghost shrink-0 whitespace-nowrap px-4 py-2.5 text-sm"><MailPlus size={16} /> Follow-up emails</button>
          <a href="/api/admin/leads/export" className="btn-ghost shrink-0 whitespace-nowrap px-4 py-2.5 text-sm"><FileSpreadsheet size={16} /> Download Excel</a>
          <button onClick={() => load()} aria-label="Refresh" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={16} /></button>
        </div>
      </div>

      {showReport && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-mist text-left text-[13px] text-muted">
              <tr><th className="px-4 py-3 font-semibold">Came via</th><th className="px-4 py-3 text-right font-semibold">Leads</th><th className="px-4 py-3 text-right font-semibold">Won</th><th className="px-4 py-3 text-right font-semibold">Won value</th><th className="px-4 py-3 font-semibold">Top campaigns</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bySource.map((r) => (
                <tr key={r.name} className="cursor-pointer hover:bg-mist/60" onClick={() => setChannel(r.name)}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right">{r.total}</td>
                  <td className="px-4 py-3 text-right">{r.won}{r.total ? <span className="text-muted"> ({Math.round((r.won / r.total) * 100)}%)</span> : null}</td>
                  <td className="px-4 py-3 text-right">{r.value ? `₹${r.value.toLocaleString("en-IN")}` : "–"}</td>
                  <td className="px-4 py-3 text-muted">{Object.entries(r.campaigns).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} (${n})`).join(", ") || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">Click a row to see only those leads. For ads, add UTM tags to your ad links (e.g. ?utm_source=instagram&amp;utm_medium=paid&amp;utm_campaign=diwali-offer) to see each campaign by name. Google Ads is detected automatically.</p>
        </div>
      )}

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
                  {l.track?.channel && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800" title={l.track.utmCampaign ? `Campaign: ${l.track.utmCampaign}` : undefined}><Megaphone size={11} /> {l.track.channel}</span>}
                  {isDue(l) && <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"><BellRing size={11} /> Follow up{l.followUp < today() ? " (late)" : " today"}</span>}
                  {!isDue(l) && l.followUp && l.status !== "won" && l.status !== "lost" && <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-muted">Follow up {formatDate(l.followUp)}</span>}
                  {l.status === "lost" && l.lostReason && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">{l.lostReason}</span>}
                  {l.assignedName && <span className="flex items-center gap-1 rounded-full bg-lav-100 px-2 py-0.5 text-[11px] font-medium text-lav-700"><UserRound size={11} /> {l.assignedTo === myId ? "You" : l.assignedName}</span>}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted">{isDue(l) && l.followUpNote ? `⏰ ${l.followUpNote}` : l.history?.length ? `💬 ${ago(l.history[l.history.length - 1].at)}: ${[l.history[l.history.length - 1].outcome, l.history[l.history.length - 1].note].filter(Boolean).join(" · ")}` : [l.services, l.budget, l.message].filter(Boolean).join(" · ") || l.phone}</span>
              </button>
              <span className="text-sm text-muted">{ago(l.createdAt)}</span>
              <select value={l.status} disabled={readOnly} onChange={(e) => pickStatus(l, e.target.value as LeadStatus)} aria-label={`Status for ${l.name}`} className={`min-h-10 rounded-full border-0 px-3 text-sm font-semibold outline-none disabled:opacity-100 ${badge[l.status]}`}>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{leadStatusLabel[s]}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <a href={`tel:${l.phone}`} onClick={() => touched(l)} aria-label={`Call ${l.name}`} title="Call" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"><Phone size={16} /></a>
                <a href={`https://wa.me/${waNumber(l.phone)}?text=${encodeURIComponent(`Hi ${l.name}, this is Spinex IT Solutions. Thanks for your enquiry!`)}`} target="_blank" rel="noreferrer" onClick={() => touched(l)} aria-label={`WhatsApp ${l.name}`} title="WhatsApp" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-emerald-50 hover:text-emerald-700"><MessageCircle size={16} /></a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal open={!!open} title={open?.name ?? ""} onClose={() => { setOpen(null); setOpenAsLost(false); }} wide>
        {open && (
          <LeadDetail
            key={`${open.id}-${openAsLost}`}
            lead={leads.find((x) => x.id === open.id) ?? open}
            startLost={openAsLost}
            onTouch={() => touched(leads.find((x) => x.id === open.id) ?? open)}
            onLead={replace}
            team={team}
            myId={myId}
            readOnly={readOnly}
            onSave={async (patch) => {
              const saved = await update(open, patch, "Lead saved");
              if (saved) { setOpen(null); setOpenAsLost(false); }
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
      <Modal open={showAds} title="Get leads from ads" onClose={() => setShowAds(false)}>
        {showAds && <AdLeadsSetup goApiKeys={goApiKeys} />}
      </Modal>
      <Modal open={showFollowups} title="Automatic follow-up emails" onClose={() => setShowFollowups(false)}>
        {showFollowups && <LeadFollowupsSetup />}
      </Modal>
    </div>
  );
}

function LeadDetail({ lead, team, myId, readOnly, onSave, onDelete, startLost = false, onTouch, onLead }: { lead: Lead; team: Member[]; myId: string; readOnly: boolean; onSave: (patch: Partial<Lead>) => Promise<void>; onDelete: () => void; startLost?: boolean; onTouch?: () => void; onLead?: (l: Lead) => void }) {
  const [status, setStatus] = useState<LeadStatus>(startLost ? "lost" : lead.status);
  const [lostReason, setLostReason] = useState(lead.lostReason || "");
  const [lostNote, setLostNote] = useState(lead.lostNote || "");
  const needReason = status === "lost" && !lostReason;
  const [value, setValue] = useState(lead.value);
  const [followUp, setFollowUp] = useState(lead.followUp);
  const [notes, setNotes] = useState(lead.notes);
  const [followUpNote, setFollowUpNote] = useState(lead.followUpNote || "");
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo || "");
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<{ id: string; type: string; number: string; status: string }[]>([]);
  const [making, setMaking] = useState(false);

  useEffect(() => {
    api<{ id: string; type: string; number: string; status: string }[]>(`/api/admin/billing?leadId=${lead.id}`).then(setDocs).catch(() => undefined);
  }, [lead.id]);

  const makeQuote = async () => {
    setMaking(true);
    try {
      // Save first so the quotation gets the latest deal value.
      if (value !== lead.value) await onSave({ value });
      const d = await api<{ id: string }>("/api/admin/billing", { method: "POST", body: JSON.stringify({ type: "quote", leadId: lead.id }) });
      window.location.href = `/admin/billing/${d.id}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't make the quotation.");
      setMaking(false);
    }
  };
  const quick = (days: number) => {
    const d = new Date(Date.now() + 5.5 * 3600 * 1000 + days * 86400000).toISOString().slice(0, 10);
    setFollowUp(d);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${lead.phone}`} onClick={() => { onTouch?.(); if (status === "new") setStatus("contacted"); }} className="btn-dark px-4 py-2.5 text-sm"><Phone size={15} /> Call {lead.phone}</a>
        <a href={`https://wa.me/${waNumber(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, this is Spinex IT Solutions. Thanks for your enquiry!`)}`} target="_blank" rel="noreferrer" onClick={() => { onTouch?.(); if (status === "new") setStatus("contacted"); }} className="btn-ghost px-4 py-2.5 text-sm"><MessageCircle size={15} /> WhatsApp</a>
        {lead.email && <a href={`mailto:${lead.email}`} onClick={() => { onTouch?.(); if (status === "new") setStatus("contacted"); }} className="btn-ghost px-4 py-2.5 text-sm"><Mail size={15} /> Email</a>}
        {!readOnly && <button onClick={makeQuote} disabled={making} className="btn-ghost px-4 py-2.5 text-sm">{making ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />} Make quotation</button>}
      </div>
      {docs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {docs.map((d) => (
            <a key={d.id} href={`/admin/billing/${d.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-lav-100 px-3 py-1.5 text-xs font-semibold text-lav-700 hover:bg-lav-200">
              <FileText size={13} /> {d.type === "quote" ? "Quote" : "Invoice"} {d.number}
            </a>
          ))}
        </div>
      )}

      <dl className="mt-6 grid gap-4 rounded-2xl bg-mist p-5 sm:grid-cols-2">
        <Info label="Phone" value={lead.phone} />
        <Info label="Email" value={lead.email} />
        <Info label="Needs" value={lead.services} />
        <Info label="Budget" value={lead.budget} />
        <Info label="Form" value={LEAD_SOURCES[lead.source] ?? lead.source} />
        <Info label="Received" value={`${formatDate(lead.createdAt.slice(0, 10))}, ${new Date(lead.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`} />
      </dl>

      {(lead.followups?.length || lead.noFollowups) ? (
        <div className="mt-4 rounded-2xl border border-line p-5" data-followups>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto flex items-center gap-2 text-sm font-semibold"><MailPlus size={15} className="text-lav-700" /> Automatic follow-up emails</p>
            {!readOnly && <button onClick={() => onSave({ noFollowups: !lead.noFollowups })} className="btn-ghost px-3 py-1.5 text-xs">{lead.noFollowups ? "Turn back on" : "Stop for this lead"}</button>}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {(lead.followups ?? []).map((f, i) => <li key={i} className="flex gap-2"><span className={f.ok ? "text-emerald-700" : "text-red-600"}>{f.ok ? "Sent" : "Failed"}</span><span className="text-muted">{new Date(f.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</span><span className="truncate">{f.subject}</span></li>)}
          </ul>
          {lead.noFollowups && <p className="mt-2 text-xs text-amber-700">Stopped: no more follow-up emails will go to this lead.</p>}
        </div>
      ) : null}

      {lead.track && (
        <div className="mt-4 rounded-2xl border border-line p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><Megaphone size={15} className="text-emerald-700" /> Where they came from</p>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <Info label="Came via" value={lead.track.channel} />
            <Info label="First found you via" value={lead.track.firstChannel && lead.track.firstChannel !== lead.track.channel ? `${lead.track.firstChannel}${lead.track.firstAt ? ` (${formatDate(lead.track.firstAt.slice(0, 10))})` : ""}` : "Same"} />
            {lead.track.utmCampaign && <Info label="Campaign" value={lead.track.utmCampaign} />}
            {lead.track.utmTerm && <Info label="Keyword" value={lead.track.utmTerm} />}
            {lead.track.utmContent && <Info label="Ad / post" value={lead.track.utmContent} />}
            {(lead.track.utmSource || lead.track.utmMedium) && <Info label="Source / medium" value={[lead.track.utmSource, lead.track.utmMedium].filter(Boolean).join(" / ")} />}
            {lead.track.referrer && <Info label="Came from website" value={lead.track.referrer} />}
            <Info label="First page they saw" value={lead.track.landingPage} />
            <Info label="Sent the form on" value={lead.track.formPage} />
          </dl>
        </div>
      )}

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

      <History lead={lead} readOnly={readOnly} onLead={(l) => { onLead?.(l); if (status === "new" && l.status === "contacted") setStatus("contacted"); if (l.followUp !== lead.followUp) { setFollowUp(l.followUp); setFollowUpNote(l.followUpNote || ""); } }} />

      <fieldset disabled={readOnly} className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
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
          <span className="mb-1.5 block text-[13px] font-semibold">Given to</span>
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Nobody</option>
            {team.map((m) => <option key={m.id} value={m.id}>{m.id === myId ? `${m.name} (you)` : m.name}</option>)}
            {assignedTo && !team.some((m) => m.id === assignedTo) && <option value={assignedTo}>{lead.assignedName || "Removed member"}</option>}
          </select>
        </label>
        {status === "lost" && (
          <div className="sm:col-span-3 grid gap-4 rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:grid-cols-[260px_1fr]" data-lost-box>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Why was it lost? *</span>
              <select className="input bg-white" value={lostReason} onChange={(e) => setLostReason(e.target.value)} required>
                <option value="">Choose a reason</option>
                {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                {lostReason && !(LOST_REASONS as readonly string[]).includes(lostReason) && <option value={lostReason}>{lostReason}</option>}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">What did they say?</span>
              <textarea className="input min-h-[76px] bg-white" value={lostNote} onChange={(e) => setLostNote(e.target.value)} placeholder="e.g. Got a quote for ₹8,000 from a freelancer, ours was ₹18,000" />
            </label>
          </div>
        )}
        <div className="sm:col-span-3 grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-[200px_1fr]">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold">Follow up on</span>
            <input className="input" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
            <span className="mt-2 flex flex-wrap gap-1.5">
              {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([l, d]) => (
                <button key={l} type="button" onClick={() => quick(Number(d))} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-ink">{l}</button>
              ))}
              {followUp && <button type="button" onClick={() => setFollowUp("")} className="rounded-full px-2.5 py-1 text-xs text-muted hover:text-ink">Clear</button>}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold">What to do</span>
            <input className="input" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="e.g. Call and ask if the quotation is fine" />
            <span className="mt-1 block text-xs text-muted">On that morning the person this lead is given to (or you) gets a reminder email, if reminders are on in Admin → Automation.</span>
          </label>
        </div>
        <label className="block sm:col-span-3">
          <span className="mb-1.5 block text-[13px] font-semibold">Private notes (team only, the client never sees these)</span>
          <textarea className="input min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Called on Monday, wants a quote for 8 pages" />
        </label>
      </fieldset>

      {!readOnly && <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onDelete} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete</button>
        <button
          disabled={saving || needReason}
          title={needReason ? "Choose why it was lost" : undefined}
          onClick={async () => {
            setSaving(true);
            await onSave({ status, value, followUp, followUpNote, notes, ...(status === "lost" ? { lostReason, lostNote } : {}), ...(assignedTo !== (lead.assignedTo || "") ? { assignedTo } : {}) });
            setSaving(false);
          }}
          className="btn-dark disabled:opacity-60"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving</> : needReason ? "Choose a reason to save" : "Save"}
        </button>
      </div>}
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

// Every call, WhatsApp, email or meeting with the lead and what they said, newest first.
function History({ lead, readOnly, onLead }: { lead: Lead; readOnly: boolean; onLead: (l: Lead) => void }) {
  const [type, setType] = useState<string>("Call");
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [next, setNext] = useState("");
  const [nextNote, setNextNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const items = [...(lead.history ?? [])].reverse();
  const inDays = (days: number) => new Date(Date.now() + 5.5 * 3600 * 1000 + days * 86400000).toISOString().slice(0, 10);
  const add = async () => {
    setBusy(true);
    setErr("");
    try {
      const body: Record<string, string> = { action: "log", type, outcome, note };
      if (next) { body.followUp = next; body.followUpNote = nextNote; }
      onLead(await api<Lead>(`/api/admin/leads/${lead.id}`, { method: "POST", body: JSON.stringify(body) }));
      setOutcome(""); setNote(""); setNext(""); setNextNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't add it.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (entryId: string) => {
    if (!confirm("Remove this entry from the history?")) return;
    try {
      onLead(await api<Lead>(`/api/admin/leads/${lead.id}`, { method: "POST", body: JSON.stringify({ action: "unlog", entryId }) }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't remove it.");
    }
  };
  return (
    <div className="mt-6 rounded-2xl border border-line p-5" data-lead-history>
      <p className="flex items-center gap-2 text-sm font-semibold"><MessageCircle size={15} className="text-lav-700" /> Conversation history {items.length > 0 && <span className="font-normal text-muted">({items.length})</span>}</p>
      {!readOnly && (
        <div className="mt-4 space-y-3 rounded-xl bg-mist p-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="How you talked">
            {NOTE_TYPES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${type === t ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>{t}</button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">What happened</span>
              <select className="input bg-white" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="">Choose…</option>
                {NOTE_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">What did they say?</span>
              <textarea className="input min-h-[70px] bg-white" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Wants 5 pages, will confirm budget after talking to partner" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Next follow-up (optional)</span>
              <input className="input bg-white" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
              <span className="mt-2 flex flex-wrap gap-1.5">
                {([["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]] as const).map(([l, d]) => (
                  <button key={l} type="button" onClick={() => setNext(inDays(d))} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs hover:border-ink">{l}</button>
                ))}
              </span>
            </label>
            {next ? (
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold">What to do then</span>
                <input className="input bg-white" value={nextNote} onChange={(e) => setNextNote(e.target.value)} placeholder="e.g. Call back about the budget" />
              </label>
            ) : <span />}
          </div>
          {err && <p className="text-sm text-red-700">{err}</p>}
          <button type="button" onClick={add} disabled={busy || (!outcome && !note.trim())} className="btn-dark px-4 py-2 text-sm disabled:bg-line disabled:text-muted">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Add to history</button>
        </div>
      )}
      {items.length > 0 ? (
        <ol className="mt-4 space-y-3 border-l-2 border-lav-200 pl-4">
          {items.map((h) => (
            <li key={h.id} className="relative">
              <span aria-hidden className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-lav-500" />
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span className="font-semibold text-ink">{h.type}</span>
                {h.outcome && <span className="rounded-full bg-lav-100 px-2 py-0.5 font-medium text-lav-700">{h.outcome}</span>}
                <span>{new Date(h.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</span>
                {h.by && <span>· {h.by}</span>}
                {!readOnly && <button type="button" onClick={() => remove(h.id)} aria-label="Remove entry" className="ml-auto text-muted hover:text-red-600"><Trash2 size={13} /></button>}
              </p>
              {h.note && <p className="mt-1 whitespace-pre-wrap text-sm">{h.note}</p>}
            </li>
          ))}
        </ol>
      ) : <p className="mt-3 text-sm text-muted">Nothing yet. After each call or message, add what they said here.</p>}
    </div>
  );
}
