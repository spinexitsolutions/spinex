"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePlus2, FileText, Loader2, ReceiptIndianRupee, RefreshCw, Save, Search } from "lucide-react";
import { INDIAN_STATES, computeTotals, defaultProfile, docTitle, inr, statusLabel, validGstin, type BillDoc, type BillingProfile } from "@/lib/billing";
import ImageField from "./ImageField";

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

const tone: Record<string, string> = {
  draft: "bg-mist text-muted", sent: "bg-lav-100 text-lav-700", accepted: "bg-emerald-50 text-emerald-800", rejected: "bg-mist text-muted line-through",
  unpaid: "bg-amber-50 text-amber-800", "partly-paid": "bg-amber-50 text-amber-800", paid: "bg-emerald-50 text-emerald-800", cancelled: "bg-mist text-muted line-through",
};

type Tab = "all" | "quote" | "invoice" | "due";

export default function BillingManager({ canEditProfile }: { canEditProfile: boolean }) {
  const [docs, setDocs] = useState<BillDoc[]>([]);
  const [profile, setProfile] = useState<BillingProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [d, p] = await Promise.all([api<BillDoc[]>("/api/admin/billing"), api<BillingProfile>("/api/admin/billing/settings")]);
      setDocs(d);
      setProfile(p);
      if (!p.legalName || (!p.gstin && !p.bankName && !p.upi)) setShowProfile(canEditProfile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load.");
    } finally {
      setLoading(false);
    }
  }, [canEditProfile]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => docs.map((d) => ({ d, t: computeTotals(d, profile) })), [docs, profile]);
  const unpaid = rows.filter(({ d }) => d.type === "invoice" && (d.status === "unpaid" || d.status === "partly-paid"));
  const dueTotal = unpaid.reduce((s, r) => s + r.t.balance, 0);
  const today = new Date().toISOString().slice(0, 10);

  const list = rows.filter(({ d }) => {
    if (tab === "quote" && d.type !== "quote") return false;
    if (tab === "invoice" && d.type !== "invoice") return false;
    if (tab === "due" && !unpaid.some((u) => u.d.id === d.id)) return false;
    const s = q.trim().toLowerCase();
    return !s || [d.number, d.client.name, d.client.company, d.client.phone].some((v) => (v || "").toLowerCase().includes(s));
  });

  const create = async (type: "quote" | "invoice") => {
    setCreating(type);
    try {
      const d = await api<BillDoc>("/api/admin/billing", { method: "POST", body: JSON.stringify({ type }) });
      window.location.href = `/admin/billing/${d.id}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't create.");
      setCreating("");
    }
  };

  if (loading) return <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="rounded-3xl border border-red-200 bg-white p-8 text-center"><p className="font-semibold text-red-700">{error}</p><button onClick={load} className="btn-ghost mt-4"><RefreshCw size={16} /> Try again</button></div>;

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "all", label: "All", n: docs.length },
    { id: "quote", label: "Quotations", n: docs.filter((d) => d.type === "quote").length },
    { id: "invoice", label: "Invoices", n: docs.filter((d) => d.type === "invoice").length },
    { id: "due", label: "Payment due", n: unpaid.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => create("quote")} disabled={!!creating} className="btn-dark px-5 py-2.5 text-sm">{creating === "quote" ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={16} />} New quotation</button>
        <button onClick={() => create("invoice")} disabled={!!creating} className="btn-ghost px-5 py-2.5 text-sm">{creating === "invoice" ? <Loader2 size={15} className="animate-spin" /> : <ReceiptIndianRupee size={16} />} New invoice</button>
        <button onClick={() => setShowProfile((v) => !v)} className="btn-ghost ml-auto px-5 py-2.5 text-sm">{showProfile ? "Hide" : "Billing details"}</button>
      </div>
      <p className="text-sm text-muted">Tip: open a lead in <b>Leads</b> and press <b>Make quotation</b> to fill in the client automatically.</p>

      {showProfile && <ProfileForm initial={profile} canEdit={canEditProfile} onSaved={setProfile} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`rounded-2xl border p-4 text-left transition-colors ${tab === t.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
            <p className="font-display text-3xl font-semibold">{t.n}</p>
            <p className={`text-sm ${tab === t.id ? "text-white/70" : "text-muted"}`}>{t.label}</p>
          </button>
        ))}
      </div>
      {dueTotal > 0 && <p className="text-sm text-muted">Waiting to be paid: <b className="text-ink">{inr(dueTotal, 0)}</b></p>}

      <label className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4">
        <Search size={16} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, client or phone" className="h-12 w-full bg-transparent text-sm outline-none" aria-label="Search" />
      </label>

      <div className="space-y-2">
        {docs.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
            <FileText className="mx-auto text-lav-600" size={30} />
            <p className="mt-3 font-semibold">No quotations or invoices yet</p>
            <p className="mt-1 text-sm text-muted">Fill in your billing details first, then make your first quotation.</p>
          </div>
        )}
        {docs.length > 0 && list.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-muted">Nothing here.</p>}
        {list.map(({ d, t }) => {
          const overdue = d.type === "invoice" && t.balance > 0 && d.status !== "cancelled" && d.dueDate && d.dueDate < today;
          return (
            <a key={d.id} href={`/admin/billing/${d.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
              <span className="w-28 text-xs font-semibold uppercase tracking-[0.1em] text-muted">{docTitle(d.type, t.gstOn)}</span>
              <span className="min-w-[180px] flex-1">
                <span className="block font-semibold">{d.client.company || d.client.name || "No client yet"}</span>
                <span className="block text-sm text-muted">{d.number} · {d.date}</span>
              </span>
              {overdue && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Overdue</span>}
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[d.status] ?? "bg-mist"}`}>{statusLabel[d.status]}</span>
              <span className="w-28 text-right font-semibold">{inr(t.total, 0)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ProfileForm({ initial, canEdit, onSaved }: { initial: BillingProfile; canEdit: boolean; onSaved: (p: BillingProfile) => void }) {
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);
  const set = (patch: Partial<BillingProfile>) => setP((x) => ({ ...x, ...patch }));

  const save = async () => {
    setSaving(true);
    setNote("");
    try {
      const out = await api<BillingProfile>("/api/admin/billing/settings", { method: "PUT", body: JSON.stringify(p) });
      setP(out);
      onSaved(out);
      setNote("Saved");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const text = (k: keyof BillingProfile, label: string, hint?: string, wide?: boolean) => (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <input className="input" value={String(p[k] ?? "")} onChange={(e) => set({ [k]: e.target.value } as Partial<BillingProfile>)} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
  const area = (k: keyof BillingProfile, label: string, hint?: string) => (
    <label className="block md:col-span-2">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <textarea className="input min-h-[90px]" value={String(p[k] ?? "")} onChange={(e) => set({ [k]: e.target.value } as Partial<BillingProfile>)} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
  const number = (k: keyof BillingProfile, label: string) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      <input className="input" type="number" min={0} value={Number(p[k]) || 0} onChange={(e) => set({ [k]: Number(e.target.value) || 0 } as Partial<BillingProfile>)} />
    </label>
  );

  return (
    <section className="rounded-3xl border border-line bg-white p-6">
      <h3 className="font-display text-lg font-semibold">Billing details</h3>
      <p className="mt-1 text-sm text-muted">Printed on every quotation and invoice. These stay private: they are not part of the public website.{!canEdit && " Only the owner or an admin can change them."}</p>
      <fieldset disabled={!canEdit} className="mt-5 grid gap-5 disabled:opacity-70 md:grid-cols-2">
        {text("legalName", "Business name (as on GST)")}
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Your state</span>
          <select className="input" value={p.state} onChange={(e) => set({ state: e.target.value })}>
            {INDIAN_STATES.filter((s) => s !== "Outside India").map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted">Clients in this state get CGST + SGST, others get IGST.</span>
        </label>
        {area("address", "Address", "One line per row")}
        {text("gstin", "GSTIN", p.gstin && !validGstin(p.gstin) ? "This doesn't look like a valid GSTIN" : "Leave empty if you are not registered: then no GST is charged.")}
        {text("pan", "PAN (optional)")}
        {text("phone", "Phone")}
        {text("email", "Email")}
        {text("website", "Website")}
        <div className="md:col-span-2 mt-2 border-t border-line pt-5 text-sm font-semibold text-lav-700">Payment details (printed on invoices)</div>
        {text("bankName", "Bank name")}
        {text("accountName", "Account holder name")}
        {text("accountNumber", "Account number")}
        {text("ifsc", "IFSC")}
        {text("upi", "UPI ID", "e.g. spinex@okaxis. Clients on a phone get a Pay by UPI link.")}
        <div className="md:col-span-2 mt-2 border-t border-line pt-5 text-sm font-semibold text-lav-700">Defaults for new documents</div>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Default GST rate</span>
          <select className="input" value={p.defaultGst} onChange={(e) => set({ defaultGst: Number(e.target.value) })}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select>
        </label>
        {text("defaultSac", "Default SAC code", "998314 is commonly used for IT design and development services. Check with your CA.")}
        {number("quoteValidDays", "Quotation valid for (days)")}
        {number("invoiceDueDays", "Invoice due in (days)")}
        {text("quotePrefix", "Quotation number starts with", "e.g. QT gives QT/2026-27/001")}
        {text("invoicePrefix", "Invoice number starts with", "e.g. INV gives INV/2026-27/001")}
        {area("quoteTerms", "Quotation terms", "One per line")}
        {area("invoiceTerms", "Invoice terms", "One per line")}
        <div className="md:col-span-2">
          <span className="mb-1.5 block text-[13px] font-semibold">Signature or stamp (optional)</span>
          <ImageField id="billing-signature" value={p.signature} onChange={(v) => set({ signature: v })} />
        </div>
      </fieldset>
      {canEdit && (
        <div className="mt-6 flex items-center gap-3">
          <button onClick={save} disabled={!dirty || saving} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save billing details</button>
          {note && <span className="text-sm text-muted">{note}</span>}
        </div>
      )}
    </section>
  );
}
