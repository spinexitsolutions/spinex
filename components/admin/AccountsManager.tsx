"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Landmark, Loader2, Plus, ReceiptText, Repeat, Save, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { inr, todayIST } from "@/lib/billing";
import { EXPENSE_CATEGORIES, PAID_VIA, fyMonths, fyOf, monthName, type Expense, type MonthRow } from "@/lib/accounts";
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
const dlabel = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const rs = (n: number) => inr(n, 0);

type Report = { fy: string; today: string; months: MonthRow[]; totals: Omit<MonthRow, "month"> };
type Gst = {
  gstOn: boolean; ourGstin: string; from: string; to: string;
  sales: { number: string; date: string; client: string; gstin: string; state: string; type: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; rates: string }[];
  purchases: { date: string; vendor: string; gstin: string; billNo: string; category: string; taxable: number; gst: number; total: number }[];
  totals: { taxable: number; cgst: number; sgst: number; igst: number; gstOut: number; gstIn: number; eligibleIn: number; payable: number; carryForward: number };
};
type Tab = "pl" | "expenses" | "gst";

// Admin → Expenses and profit: add expenses, see monthly profit and loss, and the GST summary for the CA.
export default function AccountsManager({ readOnly }: { readOnly: boolean }) {
  const today = todayIST();
  const [tab, setTab] = useState<Tab>("pl");
  const [fy, setFy] = useState(fyOf(today));
  const [month, setMonth] = useState(today.slice(0, 7));
  const fys = useMemo(() => {
    const y = Number(fyOf(today).slice(0, 4));
    return [0, 1, 2, 3].map((i) => `${y - i}-${String((y - i + 1) % 100).padStart(2, "0")}`);
  }, [today]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-line bg-white p-1" role="tablist">
          {([["pl", "Profit and loss", BarChart3], ["expenses", "Expenses", Wallet], ["gst", "GST for CA", Landmark]] as const).map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-ink text-white" : "text-muted hover:text-ink"}`}><Icon size={15} /> {label}</button>
          ))}
        </div>
        {tab === "pl" && (
          <select aria-label="Financial year" className="input ml-auto w-auto" value={fy} onChange={(e) => setFy(e.target.value)}>
            {fys.map((f) => <option key={f} value={f}>FY {f} (Apr to Mar)</option>)}
          </select>
        )}
      </div>
      {tab === "pl" && <ProfitLoss fy={fy} openMonth={(m) => { setMonth(m); setTab("expenses"); }} />}
      {tab === "expenses" && <Expenses month={month} setMonth={setMonth} readOnly={readOnly} />}
      {tab === "gst" && <GstSummary today={today} />}
    </div>
  );
}

function Card({ label, value, sub, tone, Icon }: { label: string; value: string; sub?: string; tone?: "good" | "bad"; Icon: typeof Wallet }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <p className="flex items-center gap-2 text-sm text-muted"><Icon size={15} /> {label}</p>
      <p className={`mt-2 font-display text-2xl font-semibold tabular-nums ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function ProfitLoss({ fy, openMonth }: { fy: string; openMonth: (m: string) => void }) {
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setR(null);
    api<Report>(`/api/admin/accounts/report?fy=${fy}`).then(setR).catch((e) => setError(e.message));
  }, [fy]);
  if (!r) return <div className="grid place-items-center py-16 text-muted">{error || <Loader2 className="animate-spin" />}</div>;
  const t = r.totals;
  const thisMonth = r.today.slice(0, 7);
  const shown = r.months.filter((m) => m.month <= thisMonth || m.sales || m.expenses || m.salaries);
  const peak = Math.max(1, ...shown.map((m) => Math.max(m.sales, m.expenses + m.salaries)));
  const cats = Object.entries(t.byCategory).sort((a, b) => b[1] - a[1]);
  const costs = t.expenses + t.salaries;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card Icon={ReceiptText} label="Sales (before GST)" value={rs(t.sales)} sub={`Received ${rs(t.received)} of ${rs(t.invoiced)} invoiced`} />
        <Card Icon={Wallet} label="Expenses (before GST)" value={rs(t.expenses)} sub={cats[0] ? `Biggest: ${cats[0][0]}` : "None added yet"} />
        <Card Icon={Landmark} label="Salaries (issued payslips)" value={rs(t.salaries)} />
        <Card Icon={t.profit >= 0 ? TrendingUp : TrendingDown} label={t.profit >= 0 ? "Profit" : "Loss"} value={rs(Math.abs(t.profit))} tone={t.profit >= 0 ? "good" : "bad"} sub={t.sales ? `${Math.round((t.profit / t.sales) * 100)}% of sales` : undefined} />
      </div>

      <div className="rounded-3xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-auto font-semibold">Month by month</p>
          <span className="flex items-center gap-1.5 text-xs text-muted"><i className="h-2.5 w-2.5 rounded-sm bg-lav-600" /> Sales</span>
          <span className="flex items-center gap-1.5 text-xs text-muted"><i className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Expenses + salaries</span>
          <a href={`/api/admin/accounts/report?fy=${r.fy}&format=csv`} className="btn-ghost px-3 py-2 text-sm"><Download size={14} /> Download (Excel)</a>
        </div>
        <div className="mt-5 flex items-end gap-1.5 sm:gap-3" aria-hidden>
          {r.months.map((m) => (
            <button key={m.month} onClick={() => openMonth(m.month)} title={`${monthName(m.month)}: sales ${rs(m.sales)}, costs ${rs(m.expenses + m.salaries)}, ${m.profit >= 0 ? "profit" : "loss"} ${rs(Math.abs(m.profit))}`} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
              <span className="flex h-[150px] w-full items-end justify-center gap-0.5">
                <span data-bar className="block w-2.5 shrink-0 rounded-t bg-lav-600 sm:w-4 transition group-hover:opacity-80" style={{ height: `${Math.round((m.sales / peak) * 150)}px` }} />
                <span className="block w-2.5 shrink-0 rounded-t bg-amber-400 sm:w-4 transition group-hover:opacity-80" style={{ height: `${Math.round(((m.expenses + m.salaries) / peak) * 150)}px` }} />
              </span>
              <span className={`mt-1.5 block w-full text-center text-[11px] ${m.month === thisMonth ? "font-semibold text-ink" : "text-muted"}`}>{monthName(m.month, { month: "short" })}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-mist text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Month</th><th className="px-4 py-3 text-right">Sales</th><th className="px-4 py-3 text-right">Expenses</th><th className="px-4 py-3 text-right">Salaries</th><th className="px-4 py-3 text-right">Profit / loss</th><th className="px-4 py-3 text-right">GST collected</th><th className="px-4 py-3 text-right">GST on expenses</th></tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.month} data-month={m.month} className="cursor-pointer border-t border-line hover:bg-mist/60" onClick={() => openMonth(m.month)}>
                <td className="px-4 py-3 font-semibold">{monthName(m.month)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rs(m.sales)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rs(m.expenses)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rs(m.salaries)}</td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${m.profit < 0 ? "text-red-600" : m.profit > 0 ? "text-emerald-700" : ""}`}>{m.profit < 0 ? "−" : ""}{rs(Math.abs(m.profit))}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">{rs(m.gstOut)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">{rs(m.gstIn)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-ink/10 font-semibold">
            <tr><td className="px-4 py-3">Total FY {r.fy}</td><td className="px-4 py-3 text-right tabular-nums">{rs(t.sales)}</td><td className="px-4 py-3 text-right tabular-nums">{rs(t.expenses)}</td><td className="px-4 py-3 text-right tabular-nums">{rs(t.salaries)}</td><td data-total-profit className={`px-4 py-3 text-right tabular-nums ${t.profit < 0 ? "text-red-600" : "text-emerald-700"}`}>{t.profit < 0 ? "−" : ""}{rs(Math.abs(t.profit))}</td><td className="px-4 py-3 text-right tabular-nums">{rs(t.gstOut)}</td><td className="px-4 py-3 text-right tabular-nums">{rs(t.gstIn)}</td></tr>
          </tfoot>
        </table>
      </div>

      {cats.length > 0 && (
        <div className="rounded-3xl border border-line bg-white p-5">
          <p className="font-semibold">Where the money went</p>
          <ul className="mt-4 space-y-2.5">
            {[...cats, ...(t.salaries ? [["Salaries", t.salaries] as [string, number]] : [])].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
              <li key={c} className="grid grid-cols-[150px_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[220px_1fr_auto]">
                <span className="truncate">{c}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-mist"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${(v / Math.max(1, costs)) * 100}%` }} /></span>
                <span className="tabular-nums">{rs(v)} <span className="text-xs text-muted">({Math.round((v / Math.max(1, costs)) * 100)}%)</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted">How it&apos;s worked out: sales are invoices by invoice date, before GST (quotations and cancelled invoices aren&apos;t counted). Expenses are before GST. Salaries are the gross pay on issued payslips for that month. GST isn&apos;t income or a cost, so it&apos;s shown separately. This is a management report; your CA&apos;s books are the final word.</p>
    </div>
  );
}

const blank = (date: string): Expense => ({ id: "", date, category: "Rent", vendor: "", description: "", amount: 0, gst: 0, vendorGstin: "", billNo: "", paidVia: "Bank transfer", repeat: false, copiedTo: "", createdBy: "", createdAt: "", updatedAt: "" });

function Expenses({ month, setMonth, readOnly }: { month: string; setMonth: (m: string) => void; readOnly: boolean }) {
  const [list, setList] = useState<Expense[] | null>(null);
  const [edit, setEdit] = useState<Expense | null>(null);
  const [cat, setCat] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => {
    setList(null);
    api<Expense[]>(`/api/admin/expenses?month=${month}`).then(setList).catch((e) => setMsg(e.message));
  }, [month]);
  useEffect(() => { load(); }, [load]);
  const today = todayIST();
  const shown = (list ?? []).filter((e) => !cat || e.category === cat);
  const total = shown.reduce((s, e) => s + e.amount, 0);
  const gst = shown.reduce((s, e) => s + e.gst, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input type="month" aria-label="Month" className="input w-auto" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <select aria-label="Category" className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {!readOnly && <button onClick={() => setEdit(blank(month === today.slice(0, 7) ? today : `${month}-01`))} className="btn-dark ml-auto px-5 py-2.5 text-sm"><Plus size={15} /> Add expense</button>}
      </div>
      {msg && <p role="status" className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm text-emerald-800">{msg}</p>}
      {!list ? (
        <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
          <Wallet className="mx-auto text-lav-600" />
          <p className="mt-3 font-semibold">No expenses in {monthName(month, { month: "long", year: "numeric" })}</p>
          <p className="mt-1 text-sm text-muted">Add rent, software, ads, freelancer payments and other bills. Tick “Repeats every month” for rent and subscriptions and they&apos;ll be added on their own.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-mist text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Paid to / for</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">GST</th><th className="px-4 py-3 text-right">Total paid</th></tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} data-expense={e.id} onClick={() => setEdit(e)} className="cursor-pointer border-t border-line hover:bg-mist/60">
                  <td className="whitespace-nowrap px-4 py-3">{dlabel(e.date)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium">{e.category}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5 font-medium">{e.vendor || e.description}{e.repeat && <Repeat size={13} className="text-lav-700" aria-label="Repeats every month" />}</span>{e.vendor && e.description && <span className="block text-xs text-muted">{e.description}</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inr(e.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{e.gst ? inr(e.gst) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{inr(e.amount + e.gst)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink/10 font-semibold">
              <tr><td className="px-4 py-3" colSpan={3}>{shown.length} expense{shown.length === 1 ? "" : "s"}</td><td className="px-4 py-3 text-right tabular-nums" data-expense-total>{inr(total)}</td><td className="px-4 py-3 text-right tabular-nums">{inr(gst)}</td><td className="px-4 py-3 text-right tabular-nums">{inr(total + gst)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}
      <Modal open={!!edit} title={edit?.id ? "Expense" : "Add expense"} onClose={() => setEdit(null)}>
        {edit && <ExpenseForm key={edit.id || "new"} initial={edit} readOnly={readOnly} onDone={(text, date) => { setEdit(null); setMsg(text); if (date && date.slice(0, 7) !== month) setMonth(date.slice(0, 7)); else load(); }} />}
      </Modal>
    </div>
  );
}

function ExpenseForm({ initial, readOnly, onDone }: { initial: Expense; readOnly: boolean; onDone: (msg: string, date?: string) => void }) {
  const [f, setF] = useState(initial);
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : "");
  const [gst, setGst] = useState(initial.gst ? String(initial.gst) : "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setF((x) => ({ ...x, [k]: v }));
  const a = Number(amount) || 0;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("save");
    setError("");
    try {
      const body = JSON.stringify({ ...f, amount: a, gst: Number(gst) || 0 });
      await api<Expense>(f.id ? `/api/admin/expenses/${f.id}` : "/api/admin/expenses", { method: f.id ? "PATCH" : "POST", body });
      onDone(f.id ? "Expense saved." : `Expense of ${inr(a + (Number(gst) || 0))} added.`, f.date);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    if (!confirmDelete()) return;
    setBusy("delete");
    try {
      await api(`/api/admin/expenses/${f.id}`, { method: "DELETE" });
      onDone("Expense deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
      setBusy("");
    }
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
        <L label="Date"><input type="date" className="input" value={f.date} onChange={(e) => set("date", e.target.value)} required /></L>
        <L label="Category"><select className="input" name="category" value={f.category} onChange={(e) => set("category", e.target.value)}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></L>
        <L label="Paid to"><input className="input" name="vendor" value={f.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="e.g. Landlord, Google, Freelancer name" /></L>
        <L label="What for (optional)"><input className="input" name="description" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Office rent, Figma yearly plan" /></L>
        <L label="Amount before GST (₹)"><input className="input" name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" /></L>
        <L label="GST on the bill (₹)">
          <input className="input" name="gst" inputMode="decimal" value={gst} onChange={(e) => setGst(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0 if no GST bill" />
          <span className="mt-1.5 flex flex-wrap gap-1.5">{[5, 12, 18, 28].map((p) => <button key={p} type="button" onClick={() => setGst(String(Math.round(a * p) / 100))} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-ink">{p}%</button>)}</span>
        </L>
        <L label="Vendor GSTIN (for input credit)"><input className="input uppercase placeholder:normal-case" name="vendorGstin" value={f.vendorGstin} onChange={(e) => set("vendorGstin", e.target.value.toUpperCase())} maxLength={15} placeholder="Only if their bill shows it" /></L>
        <L label="Bill / invoice no"><input className="input" value={f.billNo} onChange={(e) => set("billNo", e.target.value)} /></L>
        <L label="Paid via"><select className="input" value={f.paidVia} onChange={(e) => set("paidVia", e.target.value)}>{PAID_VIA.map((c) => <option key={c}>{c}</option>)}</select></L>
        <label className="flex items-start gap-3 self-end rounded-2xl border border-line p-3 text-sm">
          <input type="checkbox" name="repeat" className="mt-0.5" checked={f.repeat} onChange={(e) => set("repeat", e.target.checked)} />
          <span><b>Repeats every month</b><span className="block text-xs text-muted">Added again on the same date each month (rent, subscriptions). Untick to stop.</span></span>
        </label>
      </fieldset>
      <p className="rounded-2xl bg-mist px-4 py-3 text-sm">Total paid: <b className="tabular-nums">{inr(a + (Number(gst) || 0))}</b>{Number(gst) > 0 && !f.vendorGstin && <span className="block text-xs text-amber-700">Without the vendor&apos;s GSTIN this GST can&apos;t usually be claimed back.</span>}</p>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={!!busy} className="btn-dark px-5 py-2.5 text-sm">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {f.id ? "Save" : "Add expense"}</button>
          {f.id && <button type="button" onClick={remove} disabled={!!busy} className="btn-ghost ml-auto px-4 py-2.5 text-sm text-red-600"><Trash2 size={15} /> Delete</button>}
        </div>
      )}
      {f.createdBy && <p className="text-xs text-muted">Added by {f.createdBy}{f.createdAt ? ` on ${dlabel(f.createdAt.slice(0, 10))}` : ""}</p>}
    </form>
  );
}
const confirmDelete = () => typeof window === "undefined" || window.confirm("Delete this expense?");

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">{label}</span>{children}</label>;
}

function GstSummary({ today }: { today: string }) {
  const ranges = useMemo(() => {
    const m = today.slice(0, 7);
    const prev = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
    const fy = fyOf(today);
    const ms = fyMonths(fy);
    const qs = [0, 1, 2, 3].map((q) => ({ id: `q${q + 1}`, label: `Q${q + 1} FY ${fy} (${monthName(ms[q * 3], { month: "short" })} to ${monthName(ms[q * 3 + 2], { month: "short" })})`, from: `${ms[q * 3]}-01`, to: `${ms[q * 3 + 2]}-31` })).filter((q) => q.from <= today);
    return [
      { id: "this", label: `This month (${monthName(m, { month: "long" })})`, from: `${m}-01`, to: `${m}-31` },
      { id: "last", label: `Last month (${monthName(prev, { month: "long" })})`, from: `${prev}-01`, to: `${prev}-31` },
      ...qs,
      { id: "fy", label: `Whole FY ${fy}`, from: `${ms[0]}-01`, to: `${ms[11]}-31` },
    ];
  }, [today]);
  const [pick, setPick] = useState("last");
  const range = ranges.find((r) => r.id === pick) ?? ranges[0];
  const [g, setG] = useState<Gst | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setG(null);
    api<Gst>(`/api/admin/accounts/gst?from=${range.from}&to=${range.to}`).then(setG).catch((e) => setError(e.message));
  }, [range.from, range.to]);
  const t = g?.totals;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Period" className="input w-auto" value={pick} onChange={(e) => setPick(e.target.value)}>{ranges.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
        <a href={`/api/admin/accounts/gst?from=${range.from}&to=${range.to}&format=csv`} className="btn-dark ml-auto px-5 py-2.5 text-sm"><Download size={15} /> Download for CA (Excel)</a>
      </div>
      {!g || !t ? (
        <div className="grid place-items-center py-16 text-muted">{error || <Loader2 className="animate-spin" />}</div>
      ) : (
        <>
          {!g.gstOn && <p className="rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-900">Your GSTIN isn&apos;t set in Quotes and invoices → Billing details, so invoices don&apos;t charge GST. Add it there once you&apos;re GST registered.</p>}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-3xl border border-line bg-white p-5">
              <p className="text-sm text-muted">GST collected on sales</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums" data-gst-out>{inr(t.gstOut)}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted">CGST</dt><dd className="font-semibold tabular-nums">{inr(t.cgst)}</dd></div><div><dt className="text-muted">SGST</dt><dd className="font-semibold tabular-nums">{inr(t.sgst)}</dd></div><div><dt className="text-muted">IGST</dt><dd className="font-semibold tabular-nums">{inr(t.igst)}</dd></div></dl>
              <p className="mt-2 text-xs text-muted">On {inr(t.taxable, 0)} of sales, {g.sales.length} invoice{g.sales.length === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-3xl border border-line bg-white p-5">
              <p className="text-sm text-muted">GST paid on expenses (input credit)</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums" data-gst-in>{inr(t.eligibleIn)}</p>
              <p className="mt-3 text-xs text-muted">{t.gstIn !== t.eligibleIn ? `${inr(t.gstIn - t.eligibleIn)} more was paid on bills without the vendor's GSTIN, so it isn't counted.` : `From ${g.purchases.length} bill${g.purchases.length === 1 ? "" : "s"} with GST.`}</p>
            </div>
            <div className={`rounded-3xl p-5 ${t.payable ? "bg-ink text-white" : "border border-line bg-white"}`}>
              <p className={`text-sm ${t.payable ? "text-white/70" : "text-muted"}`}>GST to pay</p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums" data-gst-payable>{inr(t.payable)}</p>
              <p className={`mt-3 text-xs ${t.payable ? "text-white/70" : "text-muted"}`}>{t.carryForward ? `Extra credit of ${inr(t.carryForward)} carries forward to next period.` : "Collected minus input credit. Your CA confirms the final figure when filing GSTR-3B."}</p>
            </div>
          </div>

          <Section title="Sales (for GSTR-1)" empty="No invoices in this period.">
            {g.sales.length > 0 && (
              <table className="w-full min-w-[940px] text-[13px]">
                <thead className="bg-mist text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">GSTIN</th><th className="px-4 py-3 text-right">Taxable</th><th className="px-4 py-3 text-right">CGST</th><th className="px-4 py-3 text-right">SGST</th><th className="px-4 py-3 text-right">IGST</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
                <tbody>{g.sales.map((s) => <tr key={s.number} className="border-t border-line [&>td]:whitespace-nowrap"><td className="px-4 py-2.5 font-medium">{s.number}</td><td className="whitespace-nowrap px-4 py-2.5">{dlabel(s.date)}</td><td className="max-w-[200px] truncate px-4 py-2.5" title={s.client}>{s.client}</td><td className="px-4 py-2.5 font-mono text-xs">{s.gstin || <span className="font-sans text-muted">B2C</span>}</td><td className="px-4 py-2.5 text-right tabular-nums">{inr(s.taxable)}</td><td className="px-4 py-2.5 text-right tabular-nums">{inr(s.cgst)}</td><td className="px-4 py-2.5 text-right tabular-nums">{inr(s.sgst)}</td><td className="px-4 py-2.5 text-right tabular-nums">{inr(s.igst)}</td><td className="px-4 py-2.5 text-right font-semibold tabular-nums">{inr(s.total)}</td></tr>)}</tbody>
              </table>
            )}
          </Section>
          <Section title="Expenses with GST (input credit)" empty="No expenses with GST in this period.">
            {g.purchases.length > 0 && (
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-mist text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">GSTIN</th><th className="px-4 py-3">Bill no</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">GST</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
                <tbody>{g.purchases.map((p, i) => <tr key={i} className="border-t border-line"><td className="whitespace-nowrap px-4 py-2.5">{dlabel(p.date)}</td><td className="px-4 py-2.5">{p.vendor}<span className="block text-xs text-muted">{p.category}</span></td><td className="px-4 py-2.5 font-mono text-xs">{p.gstin || <span className="font-sans text-amber-700">Missing</span>}</td><td className="px-4 py-2.5">{p.billNo}</td><td className="px-4 py-2.5 text-right tabular-nums">{inr(p.taxable)}</td><td className="px-4 py-2.5 text-right tabular-nums">{inr(p.gst)}</td><td className="px-4 py-2.5 text-right font-semibold tabular-nums">{inr(p.total)}</td></tr>)}</tbody>
              </table>
            )}
          </Section>
          <p className="text-xs text-muted">This summary is for your CA. They file GSTR-1 (sales) and GSTR-3B (tax payable) and check input credit against GSTR-2B.</p>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <p className="px-5 py-4 font-semibold">{title}</p>
      {children ? <div className="overflow-x-auto">{children}</div> : <p className="px-5 pb-5 text-sm text-muted">{empty}</p>}
    </div>
  );
}
