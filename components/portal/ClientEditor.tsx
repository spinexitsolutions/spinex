"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Ban, CalendarClock, CheckCircle2, Download, FileText, Link2, Loader2, LogOut, Mail, MessageSquare, Plus, ReceiptText, RefreshCw, Save, Send, ShieldCheck, Trash2, Undo2,
} from "lucide-react";
import {
  amcState, amcStateLabel, blankAmc, blankProject, fileSizeText, projectProgress, projectStatusLabel, shortDate, ticketKindLabel, ticketStatusLabel, yearEnd,
  type AmcPlan, type AmcState, type PortalClient, type PortalFile, type PortalProject, type StageStatus, type Ticket,
} from "@/lib/portal";
import { inr } from "@/lib/billing";
import PortalUpload from "./PortalUpload";

type BillRow = { id: string; type: string; title: string; number: string; date: string; status: string; name: string; company: string; email: string; total: number; balance: number };
type Data = { client: PortalClient; files: PortalFile[]; tickets: Ticket[]; billing: BillRow[]; seeBilling: boolean };
type Tab = "projects" | "amc" | "files" | "invoices" | "support" | "details";

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
const editable = (c: PortalClient) => ({ name: c.name, company: c.company, email: c.email, phone: c.phone, notes: c.notes, active: c.active, projects: c.projects, billingIds: c.billingIds, amcs: c.amcs });

export default function ClientEditor({ id, initialTab = "projects", readOnly = false, me }: { id: string; initialTab?: string; readOnly?: boolean; me: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [client, setClient] = useState<PortalClient | null>(null);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState<Tab>((["projects", "amc", "files", "invoices", "support", "details"].includes(initialTab) ? initialTab : "projects") as Tab);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3500);
  };

  useEffect(() => {
    api<Data>(`/api/admin/clients/${id}`).then((d) => {
      setData(d);
      setClient(d.client);
      setSaved(JSON.stringify(editable(d.client)));
    }).catch((e) => setError(e.message));
  }, [id]);

  const dirty = !!client && JSON.stringify(editable(client)) !== saved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-semibold text-red-700">{error}</p><Link href="/admin#clients" className="btn-ghost mt-4">Back to admin</Link></div></div>;
  if (!data || !client) return <div className="grid min-h-screen place-items-center text-muted"><Loader2 className="animate-spin" /></div>;

  const set = (patch: Partial<PortalClient>) => setClient((c) => (c ? { ...c, ...patch } : c));
  const setProject = (pid: string, patch: Partial<PortalProject>) => set({ projects: client.projects.map((p) => (p.id === pid ? { ...p, ...patch } : p)) });

  const save = async () => {
    setBusy("save");
    try {
      const out = await api<PortalClient>(`/api/admin/clients/${id}`, { method: "PATCH", body: JSON.stringify({ ...editable(client), version: client.updatedAt }) });
      setClient(out);
      setSaved(JSON.stringify(editable(out)));
      setData((d) => (d ? { ...d, client: out } : d));
      flash("Saved. The client sees it now.");
      return true;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save.");
      return false;
    } finally {
      setBusy("");
    }
  };

  const access = async (action: "invite" | "link" | "logout") => {
    if (dirty && !(await save())) return;
    setBusy(action);
    try {
      const r = await api<{ message?: string; url?: string }>(`/api/admin/clients/${id}/access`, { method: "POST", body: JSON.stringify({ action }) });
      if (r.url) {
        setLink(r.url);
        navigator.clipboard?.writeText(r.url).then(() => flash("Login link copied. It works once, for 7 days.")).catch(() => flash("Login link ready below."));
      } else flash(r.message ?? "Done");
      if (action === "invite") setClient((c) => (c ? { ...c, invitedAt: new Date().toISOString() } : c));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy("");
    }
  };

  const tabs: [Tab, string, number?][] = [
    ["projects", "Projects", client.projects.length],
    ["amc", "AMC", client.amcs.length],
    ["files", "Files", data.files.length],
    ["invoices", "Invoices", client.billingIds.length],
    ["support", "Support", data.tickets.filter((t) => t.teamUnread).length || undefined],
    ["details", "Details"],
  ];

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin#clients" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink" aria-label="Back to clients"><ArrowLeft size={17} /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Client portal</p>
            <h1 className="truncate font-display text-xl font-semibold">{client.company || client.name || "Client"}</h1>
          </div>
          {!client.active && <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-muted">Login switched off</span>}
          {readOnly ? <span className="rounded-full bg-lav-100 px-3 py-1.5 text-xs font-semibold text-lav-700">View only</span> : (
            <button onClick={save} disabled={!dirty || busy === "save"} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {dirty ? "Save" : "Saved"}</button>
          )}
        </div>
        <nav className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-4 sm:px-6">
          {tabs.map(([k, label, n]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
              {label}{n ? <span className={`rounded-full px-1.5 text-[11px] ${k === "support" ? "bg-lav-600 text-white" : "bg-mist"}`}>{n}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 sm:px-6">
        {!readOnly && (
          <section className="flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-white p-4">
            <button onClick={() => access("invite")} disabled={!!busy || !client.active} className="btn-dark px-4 py-2.5 text-sm"><Mail size={15} /> {client.invitedAt ? "Email invite again" : "Email portal invite"}</button>
            <button onClick={() => access("link")} disabled={!!busy || !client.active} className="btn-ghost px-4 py-2.5 text-sm"><Link2 size={15} /> Copy one-time login link</button>
            <button onClick={() => access("logout")} disabled={!!busy || !client.active} className="btn-ghost px-4 py-2.5 text-sm"><LogOut size={15} /> Log out everywhere</button>
            <span className="ml-auto text-xs text-muted">{client.lastLoginAt ? `Last login ${new Date(client.lastLoginAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : client.invitedAt ? `Invited ${shortDate(client.invitedAt)}, not logged in yet` : "Not invited yet"}</span>
            {link && <p className="w-full break-all rounded-xl bg-mist px-3 py-2 font-mono text-xs">{link} <span className="font-sans text-muted">· works once, for 7 days. Send it on WhatsApp if email doesn&apos;t reach them.</span></p>}
          </section>
        )}

        {tab === "projects" && <Projects client={client} readOnly={readOnly} me={me} set={set} setProject={setProject} />}
        {tab === "amc" && <Amcs id={id} client={client} readOnly={readOnly} seeBilling={data.seeBilling} dirty={dirty} save={save} set={set}
          onClient={(c) => { setClient(c); setSaved(JSON.stringify(editable(c))); setData((d) => (d ? { ...d, client: c } : d)); }} flash={flash} />}
        {tab === "files" && <Files id={id} client={client} files={data.files} readOnly={readOnly} onFiles={(files) => setData((d) => (d ? { ...d, files } : d))} flash={flash} />}
        {tab === "invoices" && (data.seeBilling ? <Invoices client={client} billing={data.billing} readOnly={readOnly} set={set} /> : <Box title="Quotations and invoices in the portal"><p className="text-sm text-muted">Linking quotations and invoices needs access to Quotes and invoices. Ask the owner, or ask someone from accounts to link them. This client has {client.billingIds.length} linked now.</p></Box>)}
        {tab === "support" && <Support tickets={data.tickets} client={client} readOnly={readOnly} onTicket={(t) => setData((d) => (d ? { ...d, tickets: d.tickets.map((x) => (x.id === t.id ? t : x)) } : d))} flash={flash} />}
        {tab === "details" && <Details id={id} client={client} readOnly={readOnly} set={set} />}
      </div>

      {msg && <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"><p role="status" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">{msg}</p></div>}
    </div>
  );
}

function Box({ title, note, children, right }: { title: string; note?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
    </label>
  );
}

// ---------- Projects ----------
function Projects({ client, readOnly, me, set, setProject }: { client: PortalClient; readOnly: boolean; me: string; set: (p: Partial<PortalClient>) => void; setProject: (id: string, p: Partial<PortalProject>) => void }) {
  const [open, setOpen] = useState(client.projects[0]?.id ?? "");
  const add = () => {
    const p = blankProject();
    set({ projects: [p, ...client.projects] });
    setOpen(p.id);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {client.projects.map((p) => (
          <button key={p.id} onClick={() => setOpen(p.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${open === p.id ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>{p.title || "New project"} · {projectProgress(p)}%</button>
        ))}
        {!readOnly && <button onClick={add} className="btn-ghost bg-white px-4 py-2 text-sm"><Plus size={15} /> Add project</button>}
      </div>
      {client.projects.length === 0 && <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-muted">No projects yet. Add one to show the client its progress.</p>}
      {client.projects.filter((p) => p.id === open).map((p) => <ProjectEditor key={p.id} p={p} readOnly={readOnly} me={me} set={(patch) => setProject(p.id, patch)} remove={() => { set({ projects: client.projects.filter((x) => x.id !== p.id) }); setOpen(client.projects.find((x) => x.id !== p.id)?.id ?? ""); }} />)}
    </div>
  );
}

function ProjectEditor({ p, readOnly, me, set, remove }: { p: PortalProject; readOnly: boolean; me: string; set: (patch: Partial<PortalProject>) => void; remove: () => void }) {
  const [update, setUpdate] = useState("");
  const [askRemove, setAskRemove] = useState(false);
  const setStage = (sid: string, patch: Partial<PortalProject["stages"][number]>) => set({ stages: p.stages.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  const moveStage = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= p.stages.length) return;
    const next = [...p.stages];
    [next[i], next[j]] = [next[j], next[i]];
    set({ stages: next });
  };
  // Marking a stage current marks the ones before it done and the ones after it to do.
  const makeCurrent = (i: number) => set({ stages: p.stages.map((s, k) => ({ ...s, status: (k < i ? "done" : k === i ? "current" : "todo") as StageStatus, date: k < i && !s.date ? new Date().toISOString().slice(0, 10) : s.date })) });

  return (
    <>
      <Box title="Project" note="What the client sees at the top of their portal." right={<span className="rounded-full bg-lav-100 px-3 py-1.5 text-sm font-bold text-lav-700">{projectProgress(p)}% done</span>}>
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
          <F label="Project name"><input className="input" value={p.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. E-commerce website" /></F>
          <F label="Type"><input className="input" value={p.type} onChange={(e) => set({ type: e.target.value })} placeholder="e.g. Shopify store" /></F>
          <F label="Status">
            <select className="input" value={p.status} onChange={(e) => set({ status: e.target.value as PortalProject["status"] })}>
              {(Object.keys(projectStatusLabel) as PortalProject["status"][]).map((s) => <option key={s} value={s}>{projectStatusLabel[s]}</option>)}
            </select>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Start date"><input className="input" type="date" value={p.startDate} onChange={(e) => set({ startDate: e.target.value })} /></F>
            <F label="Target date"><input className="input" type="date" value={p.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></F>
          </div>
          <F label="Next step (shown in a dark box)" wide><textarea className="input min-h-[70px]" value={p.nextStep} onChange={(e) => set({ nextStep: e.target.value })} placeholder="e.g. Please send product photos and prices by Friday. We'll then add them to the store." /></F>
        </fieldset>
      </Box>

      <Box title="Stages" note="Press “Now” on the stage you are working on. Earlier stages are marked done.">
        <div className="space-y-2">
          {p.stages.map((s, i) => (
            <div key={s.id} className={`grid items-center gap-2 rounded-2xl border px-3 py-2 sm:grid-cols-[1fr_130px_150px_auto] ${s.status === "current" ? "border-lav-500 bg-lav-100/40" : "border-line"}`}>
              <input className="input" disabled={readOnly} value={s.title} onChange={(e) => setStage(s.id, { title: e.target.value })} aria-label="Stage name" />
              <select className="input" disabled={readOnly} value={s.status} onChange={(e) => setStage(s.id, { status: e.target.value as StageStatus })} aria-label="Stage status">
                <option value="todo">Coming up</option><option value="current">In progress</option><option value="done">Done</option>
              </select>
              <input className="input" disabled={readOnly} type="date" value={s.date} onChange={(e) => setStage(s.id, { date: e.target.value })} aria-label="Date (done or planned)" title="Date done (or planned)" />
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <button onClick={() => makeCurrent(i)} className="rounded-full px-3 py-2 text-xs font-bold text-lav-700 hover:bg-lav-100">Now</button>
                  <button onClick={() => moveStage(i, -1)} disabled={i === 0} aria-label="Move up" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-mist disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button onClick={() => moveStage(i, 1)} disabled={i === p.stages.length - 1} aria-label="Move down" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-mist disabled:opacity-30"><ArrowDown size={14} /></button>
                  <button onClick={() => set({ stages: p.stages.filter((x) => x.id !== s.id) })} aria-label="Remove stage" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        {!readOnly && <button onClick={() => set({ stages: [...p.stages, { id: rid(), title: "", status: "todo", date: "" }] })} className="btn-ghost mt-3 px-4 py-2 text-sm"><Plus size={15} /> Add stage</button>}
      </Box>

      <Box title="Updates" note="Short notes the client sees on their timeline, newest first.">
        {!readOnly && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea className="input min-h-[70px] flex-1" value={update} onChange={(e) => setUpdate(e.target.value)} placeholder="e.g. Home page design is ready. Please check it and share your feedback." />
            <button onClick={() => { if (!update.trim()) return; set({ updates: [{ id: rid(), at: new Date().toISOString(), text: update.trim(), by: me }, ...p.updates] }); setUpdate(""); }} className="btn-dark self-start px-5 py-2.5 text-sm"><Plus size={15} /> Add update</button>
          </div>
        )}
        <ul className="mt-4 space-y-2">
          {[...p.updates].sort((a, b) => b.at.localeCompare(a.at)).map((u) => (
            <li key={u.id} className="flex gap-3 rounded-2xl bg-mist px-4 py-3">
              <span className="min-w-0 flex-1"><span className="block text-xs text-muted">{shortDate(u.at)}{u.by ? ` · ${u.by}` : ""}</span><span className="block whitespace-pre-line text-sm">{u.text}</span></span>
              {!readOnly && <button onClick={() => set({ updates: p.updates.filter((x) => x.id !== u.id) })} aria-label="Remove update" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>}
            </li>
          ))}
          {p.updates.length === 0 && <li className="text-sm text-muted">No updates yet.</li>}
        </ul>
        <p className="mt-3 text-xs text-muted">Press Save at the top to publish new updates to the client.</p>
      </Box>

      <Box title="Links" note="e.g. the test website, design file or Google Drive folder.">
        <div className="space-y-2">
          {p.links.map((l) => (
            <div key={l.id} className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
              <input className="input" disabled={readOnly} value={l.label} onChange={(e) => set({ links: p.links.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)) })} placeholder="Label, e.g. Test website" />
              <input className="input" disabled={readOnly} value={l.url} onChange={(e) => set({ links: p.links.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)) })} placeholder="https://" />
              {!readOnly && <button onClick={() => set({ links: p.links.filter((x) => x.id !== l.id) })} aria-label="Remove link" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
        {!readOnly && <button onClick={() => set({ links: [...p.links, { id: rid(), label: "", url: "" }] })} className="btn-ghost mt-3 px-4 py-2 text-sm"><Plus size={15} /> Add link</button>}
      </Box>

      {!readOnly && (
        askRemove ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">Remove this project from the portal? <button onClick={remove} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">Yes, remove</button><button onClick={() => setAskRemove(false)} className="btn-ghost px-4 py-2 text-sm">No</button></p>
        ) : <button onClick={() => setAskRemove(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Remove project</button>
      )}
    </>
  );
}

// ---------- Files ----------
function Files({ id, client, files, readOnly, onFiles, flash }: { id: string; client: PortalClient; files: PortalFile[]; readOnly: boolean; onFiles: (f: PortalFile[]) => void; flash: (m: string) => void }) {
  const [askDelete, setAskDelete] = useState("");
  const del = async (fid: string) => {
    try {
      const r = await api<{ files: PortalFile[] }>(`/api/admin/clients/${id}/files?fid=${fid}`, { method: "DELETE" });
      onFiles(r.files);
      flash("File deleted");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't delete.");
    }
    setAskDelete("");
  };
  const name = (pid: string) => client.projects.find((p) => p.id === pid)?.title ?? "";
  return (
    <>
      {!readOnly && (
        <Box title="Share a file with the client" note="Designs, reports, invoices or final files. The client can download it from their portal.">
          <PortalUpload url={`/api/admin/clients/${id}/files`} projects={client.projects.map((p) => ({ id: p.id, title: p.title }))} onDone={(d) => onFiles((d as { files: PortalFile[] }).files)} />
        </Box>
      )}
      <Box title="All files" note="Files you shared and files the client sent.">
        {files.length === 0 ? <p className="text-sm text-muted">No files yet.</p> : (
          <ul className="divide-y divide-line">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                <FileText size={17} className="shrink-0 text-lav-700" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{f.name}</span>
                  <span className="block truncate text-xs text-muted">{[f.by === "client" ? `From client (${f.byName})` : `Shared by ${f.byName || "team"}`, fileSizeText(f.size), shortDate(f.uploadedAt), name(f.projectId), f.note].filter(Boolean).join(" · ")}</span>
                </span>
                <a href={`/api/portal/files/${f.id}`} className="btn-ghost px-3 py-2 text-sm"><Download size={14} /> Download</a>
                {!readOnly && (askDelete === f.id ? (
                  <span className="flex items-center gap-1 text-sm"><button onClick={() => del(f.id)} className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white">Delete</button><button onClick={() => setAskDelete("")} className="rounded-full px-3 py-1.5 text-muted hover:bg-mist">No</button></span>
                ) : <button onClick={() => setAskDelete(f.id)} aria-label={`Delete ${f.name}`} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>)}
              </li>
            ))}
          </ul>
        )}
      </Box>
    </>
  );
}

// ---------- Invoices ----------
function Invoices({ client, billing, readOnly, set }: { client: PortalClient; billing: BillRow[]; readOnly: boolean; set: (p: Partial<PortalClient>) => void }) {
  const [q, setQ] = useState("");
  const linked = new Set(client.billingIds);
  const matches = (b: BillRow) => (client.email && b.email.toLowerCase() === client.email.toLowerCase()) || (client.company && b.company.trim().toLowerCase() === client.company.trim().toLowerCase());
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return billing
      .filter((b) => !n || `${b.number} ${b.name} ${b.company} ${b.email}`.toLowerCase().includes(n))
      .sort((a, b) => Number(linked.has(b.id)) - Number(linked.has(a.id)) || Number(matches(b)) - Number(matches(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing, q, client.billingIds, client.email, client.company]);
  const toggle = (bid: string) => set({ billingIds: linked.has(bid) ? client.billingIds.filter((x) => x !== bid) : [...client.billingIds, bid] });
  return (
    <Box title="Quotations and invoices in the portal" note="Tick the ones this client should see. They can open, download and pay them by UPI. Suggestions with the same email or company are at the top. Press Save when done.">
      <input className="input mb-4" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, name or company" />
      {rows.length === 0 ? <p className="text-sm text-muted">No quotations or invoices yet. Make them in Quotes and invoices.</p> : (
        <ul className="divide-y divide-line">
          {rows.slice(0, 200).map((b) => (
            <li key={b.id}>
              <label className="flex cursor-pointer flex-wrap items-center gap-3 py-3">
                <input type="checkbox" disabled={readOnly} className="h-4 w-4 accent-lav-600" checked={linked.has(b.id)} onChange={() => toggle(b.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{b.number} <span className="font-normal text-muted">· {b.title}</span>{matches(b) && !linked.has(b.id) && <span className="ml-2 rounded-full bg-lav-100 px-2 py-0.5 text-[11px] font-semibold text-lav-700">Suggested</span>}</span>
                  <span className="block truncate text-xs text-muted">{[b.company || b.name, b.email, shortDate(b.date)].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-right text-sm tabular-nums"><b>{inr(b.total, 0)}</b>{b.balance > 0 && <span className="block text-xs text-lav-700">{inr(b.balance, 0)} due</span>}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}

// ---------- Support ----------
function Support({ tickets, client, readOnly, onTicket, flash }: { tickets: Ticket[]; client: PortalClient; readOnly: boolean; onTicket: (t: Ticket) => void; flash: (m: string) => void }) {
  const [open, setOpen] = useState(tickets.find((t) => t.teamUnread)?.id ?? tickets[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState("");
  const t = tickets.find((x) => x.id === open);

  useEffect(() => {
    if (t?.teamUnread && !readOnly) api<Ticket>(`/api/admin/clients/tickets/${t.id}`, { method: "POST", body: JSON.stringify({ action: "read" }) }).then(onTicket).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.id]);

  const act = async (body: unknown, kind: string) => {
    if (!t) return;
    setBusy(kind);
    try {
      const out = await api<Ticket & { emailed?: boolean }>(`/api/admin/clients/tickets/${t.id}`, { method: "POST", body: JSON.stringify(body) });
      onTicket(out);
      if (kind === "send") {
        setReply("");
        flash(out.emailed ? "Reply sent and emailed to the client" : "Reply saved. The email couldn't be sent, but the client sees it in the portal.");
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy("");
    }
  };

  if (!tickets.length) return <Box title="Support requests"><p className="text-sm text-muted">{client.name.split(" ")[0] || "The client"} hasn&apos;t sent any support requests yet.</p></Box>;
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <ul className="space-y-2">
        {tickets.map((x) => (
          <li key={x.id}>
            <button onClick={() => setOpen(x.id)} className={`w-full rounded-2xl border px-4 py-3 text-left ${x.id === open ? "border-ink bg-white" : "border-line bg-white hover:border-lav-300"}`}>
              <span className="flex items-center gap-2 font-semibold"><MessageSquare size={15} className="shrink-0 text-lav-700" /><span className="truncate">{x.subject}</span>{x.teamUnread && <span className="ml-auto rounded-full bg-lav-600 px-2 py-0.5 text-[10px] font-bold text-white">New</span>}</span>
              <span className="mt-0.5 block text-xs text-muted">{x.urgent && <b className="text-red-600">Urgent · </b>}{ticketKindLabel[x.kind]} · {ticketStatusLabel[x.status]} · {shortDate(x.updatedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
      {t && (
        <Box title={t.subject} note={`${ticketStatusLabel[t.status]}${t.projectId ? ` · ${client.projects.find((p) => p.id === t.projectId)?.title ?? ""}` : ""}`} right={!readOnly && (t.status === "closed"
          ? <button onClick={() => act({ action: "reopen" }, "reopen")} disabled={!!busy} className="btn-ghost px-4 py-2 text-sm"><Undo2 size={15} /> Reopen</button>
          : <button onClick={() => act({ action: "close" }, "close")} disabled={!!busy} className="btn-ghost px-4 py-2 text-sm"><CheckCircle2 size={15} /> Close</button>)}>
          <TicketTags t={t} />
          <div className="space-y-3">
            {t.messages.map((m) => (
              <div key={m.id} className={`rounded-2xl p-4 ${m.from === "team" ? "ml-8 bg-lav-100/60" : "mr-8 bg-mist"}`}>
                <p className="text-xs text-muted"><b className="text-ink">{m.from === "team" ? `${m.name} (team)` : m.name}</b> · {new Date(m.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="mt-1 whitespace-pre-line text-sm">{m.text}</p>
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="mt-5 space-y-2">
              <textarea className="input min-h-[100px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply. The client gets it by email and in the portal." />
              <button onClick={() => reply.trim() && act({ message: reply }, "send")} disabled={!!busy || !reply.trim()} className="btn-dark px-5 py-2.5 text-sm disabled:opacity-60">{busy === "send" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send reply</button>
            </div>
          )}
        </Box>
      )}
    </div>
  );
}

export function TicketTags({ t }: { t: Ticket }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
      {t.urgent && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-red-700"><AlertTriangle size={13} /> Urgent</span>}
      <span className="rounded-full bg-mist px-3 py-1 text-muted">{ticketKindLabel[t.kind]}</span>
      {t.amcCovered ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800"><ShieldCheck size={13} /> Covered by {t.amcTitle || "AMC"}</span>
        : t.amcTitle ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Not covered: {t.amcTitle} had ended</span>
        : <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">No AMC: paid work</span>}
    </div>
  );
}

// ---------- AMC ----------
export const amcTone: Record<AmcState, string> = { upcoming: "bg-mist text-muted", active: "bg-emerald-50 text-emerald-800", expiring: "bg-amber-50 text-amber-800", expired: "bg-red-50 text-red-700" };

function Amcs({ id, client, readOnly, seeBilling, dirty, save, set, onClient, flash }: {
  id: string; client: PortalClient; readOnly: boolean; seeBilling: boolean; dirty: boolean; save: () => Promise<boolean>;
  set: (p: Partial<PortalClient>) => void; onClient: (c: PortalClient) => void; flash: (m: string) => void;
}) {
  const [busy, setBusy] = useState("");
  const [askRemove, setAskRemove] = useState("");
  const setAmc = (aid: string, patch: Partial<AmcPlan>) => set({ amcs: client.amcs.map((a) => (a.id === aid ? { ...a, ...patch } : a)) });

  const act = async (a: AmcPlan, action: "renew" | "invoice") => {
    if (dirty && !(await save())) return;
    setBusy(`${action}:${a.id}`);
    try {
      const r = await api<{ client?: PortalClient; id?: string; number?: string }>(`/api/admin/clients/${id}/amc`, { method: "POST", body: JSON.stringify({ action, amcId: a.id, endDate: a.endDate }) });
      if (r.client) {
        onClient(r.client);
        flash(`Renewed. New end date ${shortDate(r.client.amcs.find((x) => x.id === a.id)?.endDate ?? "")}.`);
      } else if (r.id) {
        flash(`Invoice ${r.number} made and shown in the client's portal. Opening it…`);
        setTimeout(() => { window.location.href = `/admin/billing/${r.id}`; }, 900);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <Box title="Maintenance plans (AMC)" note="The client sees the plan, what it covers and its end date in their portal. Support requests show whether they are covered. Renewal reminders go out by themselves (Automation and backups)."
        right={!readOnly && <button onClick={() => set({ amcs: [blankAmc(), ...client.amcs] })} className="btn-dark px-4 py-2.5 text-sm"><Plus size={15} /> Add AMC plan</button>}>
        {client.amcs.length === 0 && <p className="text-sm text-muted">No AMC yet. Add one when the client takes a yearly maintenance plan.</p>}
      </Box>
      {client.amcs.map((a) => {
        const st = amcState(a);
        return (
          <Box key={a.id} title={a.title || "AMC plan"} note={a.startDate && a.endDate ? `${shortDate(a.startDate)} to ${shortDate(a.endDate)}` : "Add the dates"}
            right={<span className={`rounded-full px-3 py-1.5 text-sm font-bold ${amcTone[st]}`}>{amcStateLabel(a)}</span>}>
            <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
              <F label="Plan name"><input className="input" value={a.title} onChange={(e) => setAmc(a.id, { title: e.target.value })} placeholder="e.g. Website AMC (Basic)" /></F>
              <F label="Yearly price for renewal (₹, before GST)"><input className="input" type="number" min={0} value={a.amount || ""} onChange={(e) => setAmc(a.id, { amount: Number(e.target.value) || 0 })} placeholder="e.g. 12000" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Start date"><input className="input" type="date" value={a.startDate} onChange={(e) => setAmc(a.id, { startDate: e.target.value, endDate: e.target.value && (!a.endDate || a.endDate <= e.target.value) ? yearEnd(e.target.value) : a.endDate })} /></F>
                <F label="End date"><input className="input" type="date" value={a.endDate} onChange={(e) => setAmc(a.id, { endDate: e.target.value })} /></F>
              </div>
              <F label="Reply time (shown to the client)"><input className="input" value={a.responseTime} onChange={(e) => setAmc(a.id, { responseTime: e.target.value })} placeholder="e.g. Within 1 working day" /></F>
              <F label="What's included (one point per line)" wide><textarea className="input min-h-[110px]" value={a.covers} onChange={(e) => setAmc(a.id, { covers: e.target.value })} /></F>
            </fieldset>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
              <input type="checkbox" disabled={readOnly} className="mt-1 h-4 w-4 accent-lav-600" checked={a.remind} onChange={(e) => setAmc(a.id, { remind: e.target.checked })} />
              <span><span className="block font-semibold">Send renewal reminders</span><span className="block text-sm text-muted">Emails before the end date, as set in Automation and backups. {a.sent.length ? `${a.sent.filter((k) => k.startsWith(`${a.endDate}:`)).length} sent for this term.` : "None sent for this term yet."}</span></span>
            </label>
            {!readOnly && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {seeBilling && <button onClick={() => act(a, "invoice")} disabled={!!busy || !a.endDate || !a.amount} className="btn-ghost px-4 py-2.5 text-sm">{busy === `invoice:${a.id}` ? <Loader2 size={15} className="animate-spin" /> : <ReceiptText size={15} />} Make renewal invoice{a.amount ? "" : " (add price first)"}</button>}
                <button onClick={() => act(a, "renew")} disabled={!!busy || !a.endDate} className="btn-dark px-4 py-2.5 text-sm">{busy === `renew:${a.id}` ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Renew for 1 year</button>
                <span className="text-xs text-muted">Renew after the client pays. The plan moves one year ahead and reminders start again.</span>
              </div>
            )}
            {a.renewals.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-2xl bg-mist px-4 py-3 text-xs text-muted">
                {[...a.renewals].reverse().map((r) => <li key={r.at} className="flex items-center gap-2"><CalendarClock size={13} /> Renewed {shortDate(r.at)}{r.by ? ` by ${r.by}` : ""}: {shortDate(r.from)} to {shortDate(r.to)}</li>)}
              </ul>
            )}
            {!readOnly && (askRemove === a.id ? (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">Remove this plan? <button onClick={() => { set({ amcs: client.amcs.filter((x) => x.id !== a.id) }); setAskRemove(""); }} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">Yes, remove</button><button onClick={() => setAskRemove("")} className="btn-ghost px-4 py-2 text-sm">No</button></p>
            ) : <button onClick={() => setAskRemove(a.id)} className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Remove plan</button>)}
          </Box>
        );
      })}
      {!readOnly && client.amcs.length > 0 && <p className="text-xs text-muted">Press Save at the top after changing a plan.</p>}
    </div>
  );
}

// ---------- Details ----------
function Details({ id, client, readOnly, set }: { id: string; client: PortalClient; readOnly: boolean; set: (p: Partial<PortalClient>) => void }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const del = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/clients/${id}`, { method: "DELETE" });
      window.location.href = "/admin#clients";
    } catch {
      setBusy(false);
    }
  };
  return (
    <>
      <Box title="Client details">
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
          <F label="Contact name"><input className="input" value={client.name} onChange={(e) => set({ name: e.target.value })} /></F>
          <F label="Company"><input className="input" value={client.company} onChange={(e) => set({ company: e.target.value })} /></F>
          <F label="Email (used to log in)"><input className="input" type="email" value={client.email} onChange={(e) => set({ email: e.target.value })} /></F>
          <F label="Phone"><input className="input" value={client.phone} onChange={(e) => set({ phone: e.target.value })} /></F>
          <F label="Private notes (the client never sees these)" wide><textarea className="input min-h-[90px]" value={client.notes} onChange={(e) => set({ notes: e.target.value })} /></F>
        </fieldset>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
          <input type="checkbox" disabled={readOnly} className="mt-1 h-4 w-4 accent-lav-600" checked={client.active} onChange={(e) => set({ active: e.target.checked })} />
          <span><span className="block font-semibold">Client can log in</span><span className="block text-sm text-muted">Turn off to block their portal access (for example after the project ends). Changing the email also logs them out.</span></span>
        </label>
      </Box>
      {!readOnly && (
        <Box title="Delete client" note="Removes the client, their projects, shared files and support requests. Quotations and invoices stay in Quotes and invoices.">
          {ask ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">Delete {client.company || client.name} for good?
              <button onClick={del} disabled={busy} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">{busy ? "Deleting…" : "Yes, delete"}</button>
              <button onClick={() => setAsk(false)} className="btn-ghost px-4 py-2 text-sm">No</button>
            </span>
          ) : <button onClick={() => setAsk(true)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Ban size={15} /> Delete client</button>}
        </Box>
      )}
    </>
  );
}

