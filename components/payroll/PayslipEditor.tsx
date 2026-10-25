"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Ban, CheckCircle2, Copy, Eye, FileDown, Loader2, Mail, MessageCircle, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { PAY_MODES, monthLabel, recalc, slipStatusLabel, slipTotals, type Payslip, type SlipDeduction, type SlipEarning } from "@/lib/payroll";
import { verifyLabel, verifyLink, type Letterhead } from "@/lib/letters";
import PayslipDocument from "./PayslipDocument";
import PrintShell from "../billing/PrintShell";

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
const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const editable = (p: Payslip) => JSON.stringify({ paidDays: p.paidDays, earnings: p.earnings, deductions: p.deductions, esiOn: p.esiOn, paymentDate: p.paymentDate, paymentMode: p.paymentMode, note: p.note, emp: p.emp });

export default function PayslipEditor({ id, logo, verifyBase, readOnly }: { id: string; logo: string; verifyBase: string; readOnly: boolean }) {
  const [slip, setSlip] = useState<Payslip | null>(null);
  const [head, setHead] = useState<Letterhead | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<"edit" | "pdf">("edit");
  const [qr, setQr] = useState("");
  const [askDelete, setAskDelete] = useState(false);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3800);
  };
  const take = (p: Payslip) => {
    setSlip(p);
    setSaved(editable(p));
  };

  useEffect(() => {
    api<{ payslip: Payslip; letterhead: Letterhead }>(`/api/admin/payroll/payslips/${id}`).then((d) => { take(d.payslip); setHead(d.letterhead); }).catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    if (!slip?.verifyCode || slip.status !== "issued") return setQr("");
    QRCode.toDataURL(verifyLink(verifyBase, slip.verifyCode), { margin: 0, width: 240, color: { dark: "#1D1A26", light: "#FFFFFF" } }).then(setQr).catch(() => setQr(""));
  }, [slip?.verifyCode, slip?.status, verifyBase]);

  const dirty = !!slip && editable(slip) !== saved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const totals = useMemo(() => (slip ? slipTotals(slip) : null), [slip]);

  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-semibold text-red-700">{error}</p><Link href="/admin#payslips" className="btn-ghost mt-4">Back to payslips</Link></div></div>;
  if (!slip || !head || !totals) return <div className="grid min-h-screen place-items-center text-muted"><Loader2 className="animate-spin" /></div>;

  const locked = readOnly || slip.status !== "draft";
  const set = (patch: Partial<Payslip>) => setSlip((p) => (p ? recalc({ ...p, ...patch }) : p));
  const setEarning = (rid_: string, patch: Partial<SlipEarning>) => set({ earnings: slip.earnings.map((r) => (r.id === rid_ ? { ...r, ...patch } : r)) });
  const setDeduction = (rid_: string, patch: Partial<SlipDeduction>) => set({ deductions: slip.deductions.map((r) => (r.id === rid_ ? { ...r, ...patch } : r)) });
  const setEmp = (patch: Partial<Payslip["emp"]>) => set({ emp: { ...slip.emp, ...patch } });

  const save = async () => {
    setBusy("save");
    try {
      take(await api<Payslip>(`/api/admin/payroll/payslips/${id}`, { method: "PATCH", body: JSON.stringify({ ...JSON.parse(editable(slip)), version: slip.updatedAt }) }));
      flash("Saved");
      return true;
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't save.");
      return false;
    } finally {
      setBusy("");
    }
  };
  const act = async (action: "issue" | "revoke" | "draft") => {
    if (dirty && !(await save())) return;
    setBusy(action);
    try {
      take(await api<Payslip>(`/api/admin/payroll/payslips/${id}`, { method: "POST", body: JSON.stringify({ action }) }));
      flash(action === "issue" ? "Issued. It now has a verification code." : action === "revoke" ? "Revoked. Verification now shows it as withdrawn." : "It's a draft again. Make your changes, then issue it.");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't do that.");
    } finally {
      setBusy("");
    }
  };
  const send = async () => {
    if (dirty && !(await save())) return;
    setBusy("send");
    try {
      const r = await api<{ message: string; payslip: Payslip }>(`/api/admin/payroll/payslips/${id}/send`, { method: "POST" });
      take(r.payslip);
      flash(r.message);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setBusy("");
    }
  };
  const del = async () => {
    setBusy("delete");
    try {
      await api(`/api/admin/payroll/payslips/${id}`, { method: "DELETE" });
      window.location.href = "/admin#payslips";
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't delete.");
      setBusy("");
    }
  };

  const fileName = `Payslip ${monthLabel(slip.month)} - ${slip.emp.name}`;
  const doc = <PayslipDocument slip={slip} head={head} logo={logo} qr={qr} verifyUrl={verifyLabel(verifyBase)} />;
  if (view === "pdf") return <PrintShell fileName={fileName} extra={<button onClick={() => setView("edit")} className="btn-ghost px-4 py-2.5 text-sm"><ArrowLeft size={16} /> Back to editing</button>}>{doc}</PrintShell>;

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/p/${slip.token}` : "";
  const lop = slip.daysInMonth - slip.paidDays;
  const tone = slip.status === "issued" ? "bg-emerald-50 text-emerald-800" : slip.status === "revoked" ? "bg-red-50 text-red-700" : "bg-mist text-muted";

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/admin#payslips" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink" aria-label="Back to payslips"><ArrowLeft size={17} /></Link>
          <div className="mr-auto min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Payslip · {monthLabel(slip.month)}</p>
            <h1 className="truncate font-display text-xl font-semibold">{slip.emp.name || "Employee"} <span className={`ml-1 rounded-full px-2.5 py-1 align-middle text-xs font-semibold ${tone}`}>{slipStatusLabel[slip.status]}{slip.sentAt ? " · emailed" : ""}</span></h1>
          </div>
          <button onClick={() => setView("pdf")} className="btn-ghost px-4 py-2.5 text-sm"><FileDown size={15} /> PDF</button>
          {!readOnly && slip.status === "draft" && <button onClick={save} disabled={!dirty || !!busy} className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-50">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {dirty ? "Save" : "Saved"}</button>}
          {!readOnly && slip.status === "draft" && <button onClick={() => act("issue")} disabled={!!busy} className="btn-ghost px-4 py-2.5 text-sm"><CheckCircle2 size={15} /> Issue</button>}
          {!readOnly && slip.status !== "revoked" && <button onClick={send} disabled={!!busy} className="btn-dark px-4 py-2.5 text-sm">{busy === "send" ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} {slip.status === "draft" ? "Issue and email" : slip.sentAt ? "Email again" : "Email to employee"}</button>}
          {!readOnly && slip.status !== "draft" && <button onClick={() => act("draft")} disabled={!!busy} className="btn-ghost px-4 py-2.5 text-sm"><Pencil size={15} /> Edit again</button>}
          {!readOnly && slip.status === "issued" && <button onClick={() => act("revoke")} disabled={!!busy} className="rounded-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Ban size={15} className="inline" /> Revoke</button>}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,760px)]">
        <div className="space-y-5">
          {slip.status !== "draft" && (
            <section className="rounded-3xl border border-line bg-white p-5">
              <p className="text-sm">{slip.status === "issued" ? <>Issued as <b>{slip.number}</b> with verification code <b className="font-mono">{slip.verifyCode}</b>. To change anything, press <b>Edit again</b> (the old code stops working, a new one is given when you issue it again).</> : <>Revoked. The verify page shows it as withdrawn. Press <b>Edit again</b> to correct and issue it again.</>}</p>
              {slip.status === "issued" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(shareLink).then(() => flash("Link copied"))} className="btn-ghost px-4 py-2 text-sm"><Copy size={14} /> Copy employee link</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Hi ${slip.emp.name.split(" ")[0]}, your payslip for ${monthLabel(slip.month)} from ${head.legalName}: ${shareLink}`)}`} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-2 text-sm"><MessageCircle size={14} /> WhatsApp</a>
                  <a href={`/p/${slip.token}`} target="_blank" rel="noreferrer" className="btn-ghost px-4 py-2 text-sm"><Eye size={14} /> Open as employee</a>
                </div>
              )}
            </section>
          )}

          <Box title="Days" note="Paid days come from Attendance and leave. You can still change them by hand. Basic, HRA and allowances are paid for the days worked; PF and ESI are worked out again.">
            {slip.attendance ? (
              <p className="mb-4 rounded-2xl bg-lav-100/60 px-4 py-3 text-sm text-lav-700">
                From attendance: <b>{slip.attendance.present}</b> present{slip.attendance.paidLeave ? <>, <b>{slip.attendance.paidLeave}</b> paid leave</> : null}{slip.attendance.half ? <>, <b>{slip.attendance.half}</b> half day{slip.attendance.half > 1 ? "s" : ""}</> : null}{slip.attendance.absent ? <>, <b>{slip.attendance.absent}</b> absent</> : null}{slip.attendance.unpaidLeave ? <>, <b>{slip.attendance.unpaidLeave}</b> unpaid leave</> : null}. Pay cut for <b>{slip.attendance.lop}</b> day{slip.attendance.lop === 1 ? "" : "s"}.
              </p>
            ) : <p className="mb-4 rounded-2xl bg-mist px-4 py-3 text-sm text-muted">Paid days were typed by hand.</p>}
            {!locked && <button type="button" onClick={async () => { if (dirty && !(await save())) return; setBusy("att"); try { take(await api<Payslip>(`/api/admin/payroll/payslips/${id}`, { method: "POST", body: JSON.stringify({ action: "attendance" }) })); flash("Paid days updated from attendance"); } catch (e) { flash(e instanceof Error ? e.message : "Couldn't update."); } finally { setBusy(""); } }} disabled={!!busy} className="btn-ghost mb-4 px-4 py-2 text-sm">{busy === "att" ? <Loader2 size={14} className="animate-spin" /> : null} Update from attendance</button>}
            <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-3">
              <F label="Days in month"><input className="input bg-mist" value={slip.daysInMonth} readOnly /></F>
              <F label="Paid days"><input className="input" type="number" step={0.5} min={0} max={slip.daysInMonth} value={slip.paidDays} onChange={(e) => set({ paidDays: Math.max(0, Math.min(slip.daysInMonth, Number(e.target.value) || 0)) })} /></F>
              <F label="Leave without pay"><input className="input bg-mist" value={lop} readOnly /></F>
            </fieldset>
          </Box>

          <Box title="Earnings" note="Monthly rate comes from the employee's salary. Untick “For days worked” for one-time pay like a bonus or overtime.">
            <fieldset disabled={locked} className="space-y-2">
              {slip.earnings.map((r) => (
                <div key={r.id} className="space-y-2 rounded-2xl border border-line p-2">
                  <div className="flex gap-2">
                    <input className="input flex-1" value={r.label} onChange={(e) => setEarning(r.id, { label: e.target.value })} aria-label="Earning name" />
                    <button type="button" onClick={() => set({ earnings: slip.earnings.filter((x) => x.id !== r.id) })} aria-label="Remove" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="flex items-center gap-2 text-xs text-muted">{r.prorate ? "Monthly rate" : "Amount"}
                      <input className="input w-[120px]" type="number" min={0} value={r.prorate ? r.full : r.amount} onChange={(e) => setEarning(r.id, r.prorate ? { full: Number(e.target.value) || 0 } : { amount: Number(e.target.value) || 0, full: Number(e.target.value) || 0 })} />
                    </label>
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={r.prorate} onChange={(e) => setEarning(r.id, { prorate: e.target.checked, full: r.prorate ? r.full : r.amount })} /> For days worked</label>
                    <span className="ml-auto text-sm font-semibold tabular-nums">{rs(r.amount)}</span>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => set({ earnings: [...slip.earnings, { id: rid(), label: "Bonus", full: 0, amount: 0, prorate: false }] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={15} /> Add earning</button>
            </fieldset>
          </Box>

          <Box title="Deductions" note="PF is 12% of basic (basic counted up to ₹15,000). ESI is 0.75% of gross, for full salary of ₹21,000 or less. Add salary advance recovery or other cuts here.">
            <fieldset disabled={locked} className="space-y-2">
              {slip.deductions.map((d) => (
                <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-2 rounded-2xl border border-line p-2">
                  <input className="input" value={d.label} onChange={(e) => setDeduction(d.id, { label: e.target.value })} aria-label="Deduction name" />
                  {d.auto ? <span className="px-3 text-right text-sm font-semibold tabular-nums">{rs(d.amount)} <span className="block text-[11px] font-normal text-muted">auto</span></span>
                    : <input className="input" type="number" min={0} value={d.amount} onChange={(e) => setDeduction(d.id, { amount: Number(e.target.value) || 0 })} aria-label="Amount" />}
                  <button type="button" onClick={() => set({ deductions: slip.deductions.filter((x) => x.id !== d.id) })} aria-label="Remove" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
              {slip.deductions.some((d) => d.auto === "esi") && (
                <label className="flex items-center gap-2 px-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={slip.esiOn} onChange={(e) => set({ esiOn: e.target.checked })} /> Deduct ESI this month</label>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => set({ deductions: [...slip.deductions, { id: rid(), label: "Salary advance recovery", amount: 0, auto: "" }] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={15} /> Add deduction</button>
                {!slip.deductions.some((d) => d.auto === "pf") && <button type="button" onClick={() => set({ deductions: [{ id: rid(), label: "Provident fund (PF)", amount: 0, auto: "pf" }, ...slip.deductions] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={15} /> PF</button>}
              </div>
            </fieldset>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-mist p-4 text-center text-sm">
              <p><span className="block text-xs text-muted">Gross</span><b className="tabular-nums">{rs(totals.gross)}</b></p>
              <p><span className="block text-xs text-muted">Deductions</span><b className="tabular-nums">{rs(totals.deductions)}</b></p>
              <p><span className="block text-xs text-muted">Net pay</span><b className="text-lg text-lav-700 tabular-nums">{rs(totals.net)}</b></p>
            </div>
          </Box>

          <Box title="Payment">
            <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
              <F label="Pay date"><input className="input" type="date" value={slip.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} /></F>
              <F label="Paid by"><select className="input" value={slip.paymentMode} onChange={(e) => set({ paymentMode: e.target.value })}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select></F>
              <F label="Note on the payslip (optional)" wide><input className="input" value={slip.note} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Includes Diwali bonus" maxLength={300} /></F>
            </fieldset>
          </Box>

          <Box title="Employee details on this payslip" note="Copied from the employee when the payslip was made. Changes here are for this payslip only.">
            <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
              <F label="Name"><input className="input" value={slip.emp.name} onChange={(e) => setEmp({ name: e.target.value })} /></F>
              <F label="Employee ID"><input className="input" value={slip.emp.empCode} onChange={(e) => setEmp({ empCode: e.target.value })} /></F>
              <F label="Email (payslip is sent here)"><input className="input" type="email" value={slip.emp.email} onChange={(e) => setEmp({ email: e.target.value })} /></F>
              <F label="Designation"><input className="input" value={slip.emp.designation} onChange={(e) => setEmp({ designation: e.target.value })} /></F>
              <F label="Department"><input className="input" value={slip.emp.department} onChange={(e) => setEmp({ department: e.target.value })} /></F>
              <F label="PAN"><input className="input uppercase" value={slip.emp.pan} onChange={(e) => setEmp({ pan: e.target.value.toUpperCase() })} maxLength={10} /></F>
              <F label="UAN (PF)"><input className="input" value={slip.emp.uan} onChange={(e) => setEmp({ uan: e.target.value })} /></F>
              <div className="grid grid-cols-[1fr_110px] gap-3">
                <F label="Bank"><input className="input" value={slip.emp.bankName} onChange={(e) => setEmp({ bankName: e.target.value })} /></F>
                <F label="A/c last 4"><input className="input" inputMode="numeric" value={slip.emp.bankLast4} onChange={(e) => setEmp({ bankLast4: e.target.value.replace(/\D/g, "").slice(-4) })} /></F>
              </div>
            </fieldset>
          </Box>

          {!readOnly && !slip.number && (askDelete ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">Delete this draft? <button onClick={del} disabled={!!busy} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">Yes, delete</button><button onClick={() => setAskDelete(false)} className="btn-ghost px-4 py-2 text-sm">No</button></p>
          ) : <button onClick={() => setAskDelete(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete draft</button>)}
        </div>

        <div className="xl:sticky xl:top-[88px] xl:self-start">
          <p className="mb-2 text-sm text-muted">Preview</p>
          <div className="overflow-x-auto rounded-2xl"><div className="min-w-[700px] origin-top">{doc}</div></div>
        </div>
      </div>
      {msg && <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"><p role="status" className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl">{msg}</p></div>}
    </div>
  );
}

function Box({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
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
