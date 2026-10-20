"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, ClipboardPaste, ExternalLink, FileSpreadsheet, FileText, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Users, X } from "lucide-react";
import { STATUSES, statusLabel, blankIntern, parseApplication, formatDate, type Intern, type Status } from "@/lib/interns";
import { useContent } from "../ContentProvider";

const badge: Record<Status, string> = {
  applied: "bg-mist text-ink",
  selected: "bg-lav-100 text-lav-700",
  active: "bg-amber-50 text-amber-800",
  completed: "bg-emerald-50 text-emerald-800",
  rejected: "bg-red-50 text-red-700",
};

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

export default function InternsManager({ mode }: { mode: "interns" | "certificates" }) {
  const { content } = useContent();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [kind, setKind] = useState<"internship" | "job">("internship");
  const [editing, setEditing] = useState<Intern | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2800);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setInterns(await api<Intern[]>("/api/admin/interns"));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load interns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (i: Intern) => setInterns((all) => (all.some((x) => x.id === i.id) ? all.map((x) => (x.id === i.id ? i : x)) : [i, ...all]));

  const changeStatus = async (i: Intern, status: Status) => {
    const canMail = !!i.email && (status === "selected" || status === "rejected");
    const notify = canMail && confirm(`Email ${i.name || "this person"} that they were ${status === "selected" ? (i.kind === "job" ? "shortlisted" : "selected") : "not selected"}?\n\nOK = change status and send email\nCancel = change status only`);
    replace({ ...i, status });
    try {
      const saved = await api<Intern & { emailed?: boolean }>(`/api/admin/interns/${i.id}`, { method: "PATCH", body: JSON.stringify({ status, notify }) });
      replace(saved);
      if (notify) flash(saved.emailed ? `Email sent to ${i.email}` : "Status saved, but the email couldn't be sent. Check email settings.");
    } catch (e) {
      replace(i);
      flash(e instanceof Error ? e.message : "Couldn't update status.");
    }
  };

  const del = async (i: Intern) => {
    if (!confirm(`Delete ${i.name || "this intern"}? Their resume is deleted too. This can't be undone.`)) return;
    setBusy(i.id);
    try {
      await api(`/api/admin/interns/${i.id}`, { method: "DELETE" });
      setInterns((all) => all.filter((x) => x.id !== i.id));
      flash("Intern deleted");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't delete.");
    } finally {
      setBusy(null);
    }
  };

  // Issues the certificate (once), optionally emails the intern, then opens it in this tab.
  const certificate = async (i: Intern) => {
    if (i.certId) {
      window.location.href = `/admin/certificate/${i.id}`;
      return;
    }
    const notify = !!i.email && confirm(`Issue the certificate for ${i.name}?\n\nOK = issue and email them\nCancel = issue without email`);
    setBusy(i.id);
    try {
      const updated = await api<Intern & { emailed?: boolean }>(`/api/admin/interns/${i.id}/certificate`, { method: "POST", body: JSON.stringify({ notify }) });
      replace(updated);
      if (notify && !updated.emailed) alert(`Certificate ${updated.certId} issued, but the email couldn't be sent. Check email settings.`);
      window.location.href = `/admin/certificate/${updated.id}`;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't issue certificate.");
      setBusy(null);
    }
  };

  const ofKind = interns.filter((i) => (i.kind || "internship") === kind);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: ofKind.length };
    STATUSES.forEach((s) => (c[s] = ofKind.filter((i) => i.status === s).length));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interns, kind]);

  const list = ofKind.filter((i) => {
    if (filter !== "all" && i.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || [i.name, i.email, i.phone, i.role, i.college, i.certId].some((v) => (v || "").toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
        <p className="font-semibold text-red-700">{loadError}</p>
        <button onClick={load} className="btn-ghost mt-4"><RefreshCw size={16} /> Try again</button>
      </div>
    );
  }

  if (mode === "certificates") {
    const issued = interns.filter((i) => i.certId).sort((a, b) => b.certId.localeCompare(a.certId));
    return (
      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold">Issued certificates</h2>
        <p className="mt-1 text-sm text-muted">
          Anyone can check these at <b className="text-ink">/verify</b> by typing the certificate number. To issue a new one, go to Interns and press Certificate.
        </p>
        <div className="mt-6 divide-y divide-line">
          {issued.length === 0 && <p className="py-8 text-center text-muted">No certificates issued yet.</p>}
          {issued.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="rounded-lg bg-mist px-2.5 py-1 font-mono text-sm">{i.certId}</span>
              <span className="font-semibold">{i.name}</span>
              <span className="text-sm text-muted">{i.role}</span>
              <span className="text-sm text-muted">Issued {formatDate(i.issuedOn)}</span>
              <a href={`/admin/certificate/${i.id}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm hover:border-ink">
                <ExternalLink size={14} /> Open
              </a>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex w-fit rounded-full border border-line bg-white p-1" role="tablist" aria-label="Applicant type">
        {(["internship", "job"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setFilter("all"); }} className={`min-h-10 rounded-full px-5 text-sm font-semibold ${kind === k ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
            {k === "internship" ? "Interns" : "Job applicants"} ({interns.filter((i) => (i.kind || "internship") === k).length})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(["all", ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s} className={`rounded-2xl border p-4 text-left transition-colors ${filter === s ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
            <p className="font-display text-3xl font-semibold">{counts[s]}</p>
            <p className={`text-sm ${filter === s ? "text-white/70" : "text-muted"}`}>{s === "all" ? "All" : statusLabel[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-mist px-3">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, role or certificate no." className="h-11 w-full bg-transparent text-sm outline-none" aria-label="Search interns" />
        </label>
        <button onClick={() => setEditing({ ...blankIntern(), kind })} className="btn-dark px-4 py-2.5 text-sm"><Plus size={16} /> {kind === "job" ? "Add applicant" : "Add intern"}</button>
        <button onClick={() => { setPasteText(""); setPasting(true); }} className="btn-ghost px-4 py-2.5 text-sm"><ClipboardPaste size={16} /> Paste application</button>
        <a href="/api/admin/interns/export" className="btn-ghost px-4 py-2.5 text-sm"><FileSpreadsheet size={16} /> Download Excel</a>
        <button onClick={load} aria-label="Refresh list" className="grid h-11 w-11 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={16} /></button>
      </div>

      <div className="space-y-2">
        {interns.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
            <Users className="mx-auto text-lav-600" size={32} />
            <p className="mt-3 font-semibold">No interns yet</p>
            <p className="mt-1 text-sm text-muted">Applications from the Internship page show up here. You can also add someone yourself.</p>
          </div>
        )}
        {interns.length > 0 && list.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-muted">No interns match this search.</p>}

        <AnimatePresence initial={false}>
          {list.map((i) => (
            <motion.div key={i.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-white p-4">
              <button onClick={() => setEditing(i)} className="min-w-[200px] flex-1 text-left">
                <span className="flex items-center gap-2 font-semibold">
                  {i.name || "Unnamed"}
                  {i.source === "website" && i.status === "applied" && <span className="rounded-full bg-lav-600 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>}
                </span>
                <span className="block text-sm text-muted">{[i.role, i.phone, i.college].filter(Boolean).join(", ")}</span>
              </button>
              <span className="text-sm text-muted">{i.startDate ? `${formatDate(i.startDate)} to ${i.endDate ? formatDate(i.endDate) : "now"}` : `Applied ${formatDate(i.createdAt.slice(0, 10))}`}</span>
              <select value={i.status} onChange={(e) => changeStatus(i, e.target.value as Status)} aria-label={`Status for ${i.name}`} className={`min-h-10 rounded-full border-0 px-3 text-sm font-semibold outline-none ${badge[i.status]}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
              <div className="flex items-center gap-1">
                {i.resumeId && (
                  <a href={`/api/admin/interns/${i.id}/resume`} target="_blank" rel="noreferrer" aria-label={`Resume of ${i.name}`} title="Resume" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink">
                    <FileText size={16} />
                  </a>
                )}
                {(i.kind || "internship") === "internship" && (i.status === "completed" || i.certId) && (
                  <button onClick={() => certificate(i)} disabled={busy === i.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-lav-600 px-4 text-sm font-semibold text-white hover:bg-lav-700 disabled:opacity-60">
                    {busy === i.id ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />} {i.certId ? "Certificate" : "Issue certificate"}
                  </button>
                )}
                <button onClick={() => setEditing(i)} aria-label={`Edit ${i.name}`} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"><Pencil size={16} /></button>
                <button onClick={() => del(i)} disabled={busy === i.id} aria-label={`Delete ${i.name}`} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal open={pasting} title="Paste an application" onClose={() => setPasting(false)}>
        <p className="text-sm text-muted">For applications that came on WhatsApp or email. Paste the whole message and the details fill in.</p>
        <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} className="input mt-4 min-h-[220px] font-mono text-sm" placeholder={"Internship application: Web development\n\nName: ...\nEmail: ...\nPhone: ..."} autoFocus />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setPasting(false)} className="btn-ghost">Cancel</button>
          <button
            disabled={!pasteText.trim()}
            className="btn-dark disabled:opacity-40"
            onClick={() => {
              const parsed = Object.fromEntries(Object.entries(parseApplication(pasteText)).filter(([, v]) => v)) as Partial<Intern>;
              setPasting(false);
              setEditing({ ...blankIntern(), ...parsed });
            }}
          >
            Fill details
          </button>
        </div>
      </Modal>

      <Modal open={!!editing} title={editing?.id ? "Edit intern" : "Add intern"} onClose={() => setEditing(null)} wide>
        {editing && (
          <InternForm
            value={editing}
            roles={[...(content.internship?.roles.map((r) => r.title) ?? []), ...(content.careers?.jobs.map((j) => j.title) ?? []), "General application"]}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              replace(saved);
              setEditing(null);
              flash("Intern saved");
            }}
          />
        )}
      </Modal>

      <AnimatePresence>
        {msg && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} role="status" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">
              {msg}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InternForm({ value, roles, onSaved, onCancel }: { value: Intern; roles: string[]; onSaved: (v: Intern) => void; onCancel: () => void }) {
  const [v, setV] = useState<Intern>(value);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Intern) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const roleOptions = Array.from(new Set([...roles, v.role].filter(Boolean)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) {
      setError("Enter the intern's name.");
      return;
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      setError("End date can't be before the start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { id, certId, issuedOn, resumeId, resumeName, source, createdAt, ...fields } = v;
      void certId; void issuedOn; void resumeId; void resumeName; void source; void createdAt;
      const saved = await api<Intern>(id ? `/api/admin/interns/${id}` : "/api/admin/interns", { method: id ? "PATCH" : "POST", body: JSON.stringify(fields) });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Full name *"><input className="input" value={v.name} onChange={set("name")} autoFocus /></F>
        <F label="Status">
          <select className="input" value={v.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
        </F>
        <F label="Email"><input className="input" type="email" value={v.email} onChange={set("email")} /></F>
        <F label="Phone"><input className="input" type="tel" value={v.phone} onChange={set("phone")} /></F>
        <F label="Role">
          <select className="input" value={v.role} onChange={set("role")}>
            <option value="">Choose a role</option>
            {roleOptions.map((r) => <option key={r}>{r}</option>)}
          </select>
        </F>
        <F label="College and course"><input className="input" value={v.college} onChange={set("college")} /></F>
        <F label="City"><input className="input" value={v.city} onChange={set("city")} /></F>
        <F label="Experience"><input className="input" value={v.experience} onChange={set("experience")} /></F>
        <F label="Work mode"><input className="input" value={v.mode} onChange={set("mode")} /></F>
        <F label="Start date"><input className="input" type="date" value={v.startDate} onChange={set("startDate")} /></F>
        <F label="End date"><input className="input" type="date" value={v.endDate} onChange={set("endDate")} /></F>
        <F label="Mentor"><input className="input" value={v.mentor} onChange={set("mentor")} /></F>
        <F label="Resume or portfolio link"><input className="input" type="url" value={v.link} onChange={set("link")} /></F>
        <F label="Worked on (printed on the certificate)" className="sm:col-span-2"><input className="input" value={v.work} onChange={set("work")} placeholder="e.g. Client websites and landing pages" /></F>
        {v.why && <F label="Why they want to join" className="sm:col-span-2"><textarea className="input min-h-[80px]" value={v.why} onChange={set("why")} /></F>}
        <F label="Private notes" className="sm:col-span-2"><textarea className="input min-h-[80px]" value={v.notes} onChange={set("notes")} /></F>
      </div>
      {v.resumeId && (
        <a href={`/api/admin/interns/${v.id}/resume`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lav-700 underline">
          <FileText size={15} /> Open resume ({v.resumeName || "PDF"})
        </a>
      )}
      {v.certId && <p className="mt-4 text-sm text-muted">Certificate <b className="font-mono text-ink">{v.certId}</b>. Changes to name, role or dates show on the certificate.</p>}
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-dark disabled:opacity-60">{saving ? <><Loader2 size={16} className="animate-spin" /> Saving</> : "Save intern"}</button>
      </div>
    </form>
  );
}

function F({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl sm:p-8 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-mist"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
