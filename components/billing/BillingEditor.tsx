"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, FileCheck2, FileText, Loader2, Mail, MessageCircle, Plus, Save, Trash2 } from "lucide-react";
import {
  GST_RATES, INDIAN_STATES, docSigners, INVOICE_STATUSES, QUOTE_STATUSES, blankItem, computeTotals, docTitle, inr, stateFromGstin, statusLabel, validGstin,
  type BillDoc, type BillingProfile,
} from "@/lib/billing";
import BillDocument from "./BillDocument";
import PrintShell from "./PrintShell";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Try again."), { data });
  return data as T;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const waNumber = (p: string) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

export default function BillingEditor({ id, logo }: { id: string; logo: string }) {
  const [doc, setDoc] = useState<BillDoc | null>(null);
  const [saved, setSaved] = useState("");
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<"edit" | "pdf">("edit");

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3200);
  };

  useEffect(() => {
    Promise.all([api<BillDoc>(`/api/admin/billing/${id}`), api<BillingProfile>("/api/admin/billing/settings")])
      .then(([d, p]) => {
        setDoc(d);
        setSaved(JSON.stringify(d));
        setProfile(p);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const dirty = !!doc && JSON.stringify(doc) !== saved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const totals = useMemo(() => (doc && profile ? computeTotals(doc, profile) : null), [doc, profile]);

  const set = (patch: Partial<BillDoc>) => setDoc((d) => (d ? { ...d, ...patch } : d));
  const setClient = (patch: Partial<BillDoc["client"]>) => setDoc((d) => (d ? { ...d, client: { ...d.client, ...patch } } : d));
  const setItem = (iid: string, patch: Partial<BillDoc["items"][number]>) => setDoc((d) => (d ? { ...d, items: d.items.map((x) => (x.id === iid ? { ...x, ...patch } : x)) } : d));

  const save = useCallback(async () => {
    if (!doc) return null;
    setBusy("save");
    try {
      const out = await api<BillDoc>(`/api/admin/billing/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ date: doc.date, dueDate: doc.dueDate, status: doc.status, client: doc.client, items: doc.items, discount: doc.discount, paid: doc.paid, notes: doc.notes, terms: doc.terms, signers: doc.signers ?? null }),
      });
      setDoc(out);
      setSaved(JSON.stringify(out));
      flash("Saved");
      return out;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save.");
      return null;
    } finally {
      setBusy("");
    }
  }, [doc]);

  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-semibold text-red-700">{error}</p><Link href="/admin#billing" className="btn-ghost mt-4">Back to admin</Link></div></div>;
  if (!doc || !profile || !totals) return <div className="grid min-h-screen place-items-center text-muted"><Loader2 className="animate-spin" /></div>;

  const title = docTitle(doc.type, totals.gstOn);
  const statuses = doc.type === "quote" ? QUOTE_STATUSES : INVOICE_STATUSES;
  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/d/${doc.shareToken}` : "";
  const waText = `Hi ${doc.client.name.split(" ")[0] || ""}, here is ${title.toLowerCase()} ${doc.number} from ${profile.legalName} for ${inr(totals.total, 0)}. View and download: ${shareLink}`;

  const toInvoice = async () => {
    if (dirty && !(await save())) return;
    if (!confirm("Make an invoice from this quotation? It gets the next invoice number.")) return;
    setBusy("invoice");
    try {
      const inv = await api<BillDoc>("/api/admin/billing", { method: "POST", body: JSON.stringify({ fromQuote: doc.id }) });
      window.location.href = `/admin/billing/${inv.id}`;
    } catch (e) {
      const existing = (e as { data?: { id?: string } }).data?.id;
      if (existing) window.location.href = `/admin/billing/${existing}`;
      else flash(e instanceof Error ? e.message : "Couldn't make the invoice.");
      setBusy("");
    }
  };

  const send = async () => {
    if (dirty && !(await save())) return;
    setBusy("send");
    try {
      const r = await api<{ message: string }>(`/api/admin/billing/${doc.id}/send`, { method: "POST" });
      flash(r.message);
      const fresh = await api<BillDoc>(`/api/admin/billing/${doc.id}`);
      setDoc(fresh);
      setSaved(JSON.stringify(fresh));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!confirm(`Delete quotation ${doc.number}? This can't be undone.`)) return;
    try {
      await api(`/api/admin/billing/${doc.id}`, { method: "DELETE" });
      window.location.href = "/admin#billing";
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't delete.");
    }
  };

  const fileName = `${title} ${doc.number.replace(/\//g, "-")} - ${doc.client.company || doc.client.name || "client"}`;

  if (view === "pdf") {
    return (
      <PrintShell fileName={fileName} extra={<button onClick={() => setView("edit")} className="btn-ghost px-4 py-2.5 text-sm"><ArrowLeft size={16} /> Back to editing</button>}>
        <BillDocument doc={doc} profile={profile} logo={logo} />
      </PrintShell>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin#billing" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink" aria-label="Back to quotes and invoices"><ArrowLeft size={17} /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
            <h1 className="truncate font-display text-xl font-semibold">{doc.number} · {doc.client.company || doc.client.name || "New client"}</h1>
          </div>
          <select value={doc.status} onChange={(e) => set({ status: e.target.value as BillDoc["status"] })} className="input h-10 w-auto py-0 text-sm font-semibold" aria-label="Status">
            {statuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
          <button onClick={() => setView("pdf")} className="btn-ghost px-4 py-2.5 text-sm"><FileText size={16} /> PDF</button>
          <button onClick={save} disabled={!dirty || busy === "save"} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">
            {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {dirty ? "Save" : "Saved"}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Box title="Share">
            <div className="flex flex-wrap gap-2">
              <button onClick={send} disabled={busy === "send"} className="btn-dark px-4 py-2.5 text-sm"><Mail size={15} /> {busy === "send" ? "Sending…" : "Email to client"}</button>
              {doc.client.phone && <a href={`https://wa.me/${waNumber(doc.client.phone)}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-2.5 text-sm"><MessageCircle size={15} /> WhatsApp</a>}
              <button onClick={() => navigator.clipboard?.writeText(shareLink).then(() => flash("Client link copied"))} className="btn-ghost px-4 py-2.5 text-sm"><Copy size={15} /> Copy client link</button>
              {doc.type === "quote" && !doc.invoiceId && <button onClick={toInvoice} disabled={busy === "invoice"} className="btn-ghost px-4 py-2.5 text-sm"><FileCheck2 size={15} /> Make invoice</button>}
              {doc.type === "quote" && doc.invoiceId && doc.invoiceId !== "pending" && <Link href={`/admin/billing/${doc.invoiceId}`} className="btn-ghost px-4 py-2.5 text-sm"><FileCheck2 size={15} /> Open invoice</Link>}
              {doc.fromQuote && <Link href={`/admin/billing/${doc.fromQuote}`} className="btn-ghost px-4 py-2.5 text-sm">Quote {doc.fromQuoteNumber}</Link>}
            </div>
            <p className="mt-3 text-xs text-muted">The client link opens a view-only page where they can download the PDF. Save before sharing so they see the latest version.</p>
          </Box>

          {!profile.gstin && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              GST is not added because your GSTIN is empty. Add it in <Link href="/admin#billing" className="font-semibold underline">Quotes and invoices → Billing details</Link> to charge GST.
            </p>
          )}

          <Box title="Client">
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Contact name"><input className="input" value={doc.client.name} onChange={(e) => setClient({ name: e.target.value })} /></F>
              <F label="Company / business"><input className="input" value={doc.client.company} onChange={(e) => setClient({ company: e.target.value })} /></F>
              <F label="Phone"><input className="input" value={doc.client.phone} onChange={(e) => setClient({ phone: e.target.value })} /></F>
              <F label="Email"><input className="input" type="email" value={doc.client.email} onChange={(e) => setClient({ email: e.target.value })} /></F>
              <F label="Address" wide><textarea className="input min-h-[70px]" value={doc.client.address} onChange={(e) => setClient({ address: e.target.value })} /></F>
              <F label="Client GSTIN (if any)" hint={doc.client.gstin && !validGstin(doc.client.gstin) ? "This doesn't look like a valid GSTIN" : undefined}>
                <input className="input uppercase" maxLength={15} value={doc.client.gstin} onChange={(e) => {
                  const g = e.target.value.toUpperCase();
                  const st = stateFromGstin(g);
                  setClient({ gstin: g, ...(st && g.length >= 2 ? { state: st } : {}) });
                }} />
              </F>
              <F label="State (place of supply)" hint={totals.gstOn ? (totals.exportSupply ? "Outside India: no GST (export under LUT)" : totals.interState ? "Other state: IGST" : doc.client.state ? "Same state: CGST + SGST" : "Pick a state") : undefined}>
                <select className="input" value={doc.client.state} onChange={(e) => setClient({ state: e.target.value })}>
                  <option value="">Choose</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
            </div>
          </Box>

          <Box title="Dates">
            <div className="grid gap-4 sm:grid-cols-2">
              <F label={doc.type === "quote" ? "Quote date" : "Invoice date"}><input className="input" type="date" value={doc.date} onChange={(e) => set({ date: e.target.value })} /></F>
              <F label={doc.type === "quote" ? "Valid till" : "Due date"}><input className="input" type="date" value={doc.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></F>
            </div>
          </Box>

          <Box title="Items">
            <div className="space-y-3">
              {doc.items.map((it, i) => (
                <div key={it.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-3 w-5 text-sm text-muted">{i + 1}</span>
                    <textarea className="input min-h-[60px] flex-1" placeholder="e.g. Business website, 8 pages, mobile friendly" value={it.description} onChange={(e) => setItem(it.id, { description: e.target.value })} aria-label={`Item ${i + 1} description`} />
                    <button onClick={() => set({ items: doc.items.filter((x) => x.id !== it.id) })} disabled={doc.items.length === 1} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30" aria-label="Remove item"><Trash2 size={16} /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 pl-8 sm:grid-cols-[90px_80px_1fr_100px_auto] sm:items-end">
                    <F label="SAC"><input className="input" value={it.sac} onChange={(e) => setItem(it.id, { sac: e.target.value.replace(/[^\d]/g, "").slice(0, 8) })} /></F>
                    <F label="Qty"><input className="input" type="number" min={0} step="any" value={it.qty} onChange={(e) => setItem(it.id, { qty: Number(e.target.value) || 0 })} /></F>
                    <F label="Rate (₹, before GST)"><input className="input" type="number" min={0} step="any" value={it.rate} onChange={(e) => setItem(it.id, { rate: Number(e.target.value) || 0 })} /></F>
                    <F label="GST"><select className="input" value={it.gst} onChange={(e) => setItem(it.id, { gst: Number(e.target.value) })}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select></F>
                    <p className="pb-3 text-right font-semibold">{inr(totals.lines.find((l) => l.id === it.id)?.amount ?? 0)}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => set({ items: [...doc.items, blankItem(profile.defaultGst, profile.defaultSac, uid())] })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-lav-300 py-3.5 font-semibold text-lav-700 hover:bg-lav-100"><Plus size={17} /> Add item</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <F label="Discount (₹, before GST)"><input className="input" type="number" min={0} step="any" value={doc.discount} onChange={(e) => set({ discount: Number(e.target.value) || 0 })} /></F>
              {doc.type === "invoice" && <F label="Payment received (₹)" hint={`Balance due: ${inr(totals.balance)}`}><input className="input" type="number" min={0} step="any" value={doc.paid} onChange={(e) => {
                const paid = Number(e.target.value) || 0;
                set({ paid, ...(doc.status !== "cancelled" ? { status: paid <= 0 ? "unpaid" : paid >= totals.total ? "paid" : "partly-paid" } : {}) });
              }} /></F>}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-x-6 gap-y-1 rounded-2xl bg-mist px-5 py-4 text-sm">
              <span>Subtotal <b>{inr(totals.subtotal)}</b></span>
              {totals.gstOn && <span>GST <b>{inr(totals.tax)}</b></span>}
              <span className="text-base">Total <b>{inr(totals.total)}</b></span>
            </div>
          </Box>

          <Box title="Signatures on this document">
            {(profile.signers ?? []).length === 0 ? (
              <p className="text-sm text-muted">No people added yet. Add them in <Link href="/admin#billing" className="font-semibold text-lav-700 underline">Quotes and invoices → Billing details → Signatures</Link>.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {(profile.signers ?? []).map((sg) => {
                    const on = docSigners(doc, profile).some((x) => x.id === sg.id);
                    return (
                      <label key={sg.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${on ? "border-lav-500 bg-lav-100 font-semibold text-lav-700" : "border-line"}`}>
                        <input type="checkbox" className="h-4 w-4 accent-lav-600" checked={on} onChange={() => {
                          const current = docSigners(doc, profile).map((x) => x.id);
                          const next = on ? current.filter((id) => id !== sg.id) : (profile.signers ?? []).map((x) => x.id).filter((id) => id === sg.id || current.includes(id));
                          set({ signers: next });
                        }} />
                        {sg.name || "Unnamed"}{sg.title ? <span className="font-normal text-muted">· {sg.title}</span> : null}
                      </label>
                    );
                  })}
                </div>
                {doc.signers !== null && doc.signers !== undefined && <button onClick={() => set({ signers: null })} className="mt-3 text-xs font-semibold text-lav-700 underline">Use the default ticks again</button>}
              </>
            )}
          </Box>

          <Box title="Notes and terms">
            <div className="space-y-4">
              <F label="Notes (shown on the document)"><textarea className="input min-h-[70px]" value={doc.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. Includes 1 year free maintenance" /></F>
              <F label="Terms (one per line)"><textarea className="input min-h-[100px]" value={doc.terms} onChange={(e) => set({ terms: e.target.value })} /></F>
            </div>
          </Box>

          {doc.type === "quote" && !doc.invoiceId && <button onClick={remove} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete quotation</button>}
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-2 text-sm font-semibold text-muted">Live preview</p>
          <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-2xl">
            <div className="origin-top-left">
              <BillDocument doc={doc} profile={profile} logo={logo} />
            </div>
          </div>
        </div>
      </div>

      {msg && <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"><p role="status" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">{msg}</p></div>}
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function F({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
