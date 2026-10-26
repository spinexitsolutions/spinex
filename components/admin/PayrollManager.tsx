"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, Loader2, Mail, Plus, RefreshCw, Save, Trash2, UserPlus, Wallet } from "lucide-react";
import { blankEmployee, daysIn, fullGross, lastMonth, monthLabel, slipStatusLabel, slipTotals, splitGross, type Employee, type Payslip } from "@/lib/payroll";
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
const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const rid = () => Math.random().toString(36).slice(2, 10);
const tone: Record<Payslip["status"], string> = { draft: "bg-mist text-muted", issued: "bg-emerald-50 text-emerald-800", revoked: "bg-red-50 text-red-700" };

// Admin → Payslips: one month's payslips for everyone, and the employees with their salary.
export default function PayrollManager({ readOnly = false }: { readOnly?: boolean }) {
  const [tab, setTab] = useState<"month" | "employees">("month");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [month, setMonth] = useState(lastMonth());
  const [months, setMonths] = useState<{ month: string; count: number }[]>([]);
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<Employee | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, p] = await Promise.all([api<Employee[]>("/api/admin/payroll/employees"), api<{ months: { month: string; count: number }[]; payslips: Payslip[] }>(`/api/admin/payroll/payslips?month=${month}`)]);
      setEmployees(e);
      setMonths(p.months);
      setSlips(p.payslips);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't load." });
    } finally {
      setLoading(false);
    }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const working = employees.filter((e) => e.active || (e.exitDate && e.exitDate >= `${month}-01`));
  const monthEnd = `${month}-${String(daysIn(month)).padStart(2, "0")}`;
  // Same rule as the server: working (or left this month), and joined by the end of the month.
  const missing = working.filter((e) => (!e.joiningDate || e.joiningDate <= monthEnd) && (!e.exitDate || e.exitDate >= `${month}-01`) && !slips.some((s) => s.employeeId === e.id));
  const sum = useMemo(() => slips.filter((s) => s.status !== "revoked").reduce((a, s) => { const t = slipTotals(s); return { gross: a.gross + t.gross, net: a.net + t.net }; }, { gross: 0, net: 0 }), [slips]);
  const drafts = slips.filter((s) => s.status === "draft").length;
  const unsent = slips.filter((s) => s.status !== "revoked" && !s.sentAt).length;

  const make = async () => {
    setBusy("make");
    setMsg(null);
    try {
      const r = await api<{ made: number; skipped: number; noSalary: string[] }>("/api/admin/payroll/payslips", { method: "POST", body: JSON.stringify({ month }) });
      setMsg({ ok: true, text: `${r.made} draft payslip${r.made === 1 ? "" : "s"} made${r.skipped ? `, ${r.skipped} already there` : ""}.${r.noSalary.length ? ` No salary set for: ${r.noSalary.join(", ")}.` : ""} Check paid days (leave without pay), then issue.` });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't make payslips." });
    } finally {
      setBusy("");
    }
  };
  const bulk = async (action: "issue" | "send") => {
    setBusy(action);
    setMsg(null);
    try {
      const r = await api<{ message: string; problems: string[] }>("/api/admin/payroll/payslips/bulk", { method: "POST", body: JSON.stringify({ month, action }) });
      setMsg({ ok: !r.problems.length, text: `${r.message}.${r.problems.length ? ` Problems: ${r.problems.slice(0, 5).join("; ")}` : ""}` });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't do that." });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-2xl font-semibold">Payslips</h2>
          <p className="text-sm text-muted">Every month: make payslips for everyone, adjust leave, then issue and email. Each payslip has a verify code and QR, like HR letters.</p>
        </div>
        <div className="flex rounded-full bg-white p-1">
          {([["month", "Monthly payslips"], ["employees", `Employees (${working.length})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{l}</button>
          ))}
        </div>
      </div>

      {msg && <p role="status" className={`rounded-2xl px-5 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {tab === "month" ? (
        <>
          <section className="flex flex-wrap items-end gap-3 rounded-3xl border border-line bg-white p-5">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Month</span>
              <input type="month" className="input w-[200px]" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </label>
            {months.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {months.slice(0, 6).map((m) => <button key={m.month} onClick={() => setMonth(m.month)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${m.month === month ? "bg-lav-600 text-white" : "bg-mist text-muted hover:text-ink"}`}>{monthLabel(m.month)} · {m.count}</button>)}
              </div>
            )}
            <button onClick={load} aria-label="Refresh" className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={15} /></button>
          </section>

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Payslips" value={String(slips.length)} sub={missing.length && !loading ? `${missing.length} employee${missing.length > 1 ? "s" : ""} without one` : "Everyone covered"} />
            <Stat label="Gross salary" value={rs(sum.gross)} sub={monthLabel(month)} />
            <Stat label="Net pay" value={rs(sum.net)} sub="To transfer" />
            <Stat label="Status" value={`${slips.length - drafts}/${slips.length} issued`} sub={unsent ? `${unsent} not emailed` : slips.length ? "All emailed" : "—"} />
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <button onClick={make} disabled={!!busy || !missing.length} className="btn-dark px-5 py-2.5 text-sm disabled:opacity-50">{busy === "make" ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />} Make payslips for {monthLabel(month)}{missing.length ? ` (${missing.length})` : ""}</button>
              <button onClick={() => bulk("issue")} disabled={!!busy || !drafts} className="btn-ghost bg-white px-5 py-2.5 text-sm disabled:opacity-50">{busy === "issue" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Issue all drafts</button>
              <button onClick={() => bulk("send")} disabled={!!busy || !unsent} className="btn-ghost bg-white px-5 py-2.5 text-sm disabled:opacity-50">{busy === "send" ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Issue and email all</button>
            </div>
          )}

          {loading ? <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div> : slips.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center">
              <Wallet className="mx-auto text-lav-600" />
              <p className="mt-3 font-semibold">No payslips for {monthLabel(month)} yet</p>
              <p className="mt-1 text-sm text-muted">{working.length ? "Press “Make payslips” to make drafts for everyone from their salary." : "Add your employees and their salary first."}</p>
              {!working.length && !readOnly && <button onClick={() => { setTab("employees"); setEditing("new"); }} className="btn-dark mt-4 px-5 py-2.5 text-sm"><UserPlus size={15} /> Add employee</button>}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-line bg-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-muted">
                  <tr><th className="px-5 py-3">Employee</th><th className="px-3 py-3 text-right">Paid days</th><th className="px-3 py-3 text-right">Gross</th><th className="px-3 py-3 text-right">Deductions</th><th className="px-3 py-3 text-right">Net pay</th><th className="px-5 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {slips.map((s) => {
                    const t = slipTotals(s);
                    return (
                      <tr key={s.id} className="cursor-pointer hover:bg-mist" onClick={() => { window.location.href = `/admin/payslips/${s.id}`; }}>
                        <td className="px-5 py-3"><a href={`/admin/payslips/${s.id}`} className="font-semibold hover:underline">{s.emp.name}</a><span className="block text-xs text-muted">{[s.emp.empCode, s.emp.designation].filter(Boolean).join(" · ")}</span></td>
                        <td className={`px-3 py-3 text-right tabular-nums ${s.paidDays < s.daysInMonth ? "font-semibold text-amber-700" : ""}`}>{s.paidDays}/{s.daysInMonth}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{rs(t.gross)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{rs(t.deductions)}</td>
                        <td className="px-3 py-3 text-right font-bold tabular-nums">{rs(t.net)}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone[s.status]}`}>{slipStatusLabel[s.status]}</span>{s.sentAt && <span className="ml-1.5 text-xs text-muted">emailed</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {!readOnly && <button onClick={() => setEditing("new")} className="btn-dark px-5 py-2.5 text-sm"><UserPlus size={15} /> Add employee</button>}
          {employees.length === 0 ? <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-muted">No employees yet. Add each employee once with their monthly salary; payslips are then made from it every month.</p> : (
            <ul className="space-y-2">
              {employees.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setEditing(e)} className="grid w-full items-center gap-2 rounded-2xl border border-line bg-white px-5 py-4 text-left transition hover:border-ink sm:grid-cols-[1.4fr_1fr_auto]">
                    <span className="min-w-0"><span className="block truncate font-semibold">{e.name}{!e.active && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-muted">Left</span>}</span><span className="block truncate text-sm text-muted">{[e.empCode, e.designation, e.department].filter(Boolean).join(" · ")}</span></span>
                    <span className="text-sm text-muted">{e.email || "No email"}</span>
                    <span className="text-right text-sm"><b className="tabular-nums">{rs(fullGross(e))}</b><span className="block text-xs text-muted">gross a month</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal open={!!editing} title={editing === "new" ? "Add employee" : "Employee and salary"} onClose={() => setEditing(null)}>
        {editing && <EmployeeForm key={editing === "new" ? "new" : editing.id} employee={editing === "new" ? null : editing} readOnly={readOnly} onDone={(m) => { setEditing(null); setMsg({ ok: true, text: m }); load(); }} />}
      </Modal>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-3xl border border-line bg-white p-5"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p><p className="mt-0.5 text-xs text-muted">{sub}</p></div>;
}

function EmployeeForm({ employee, readOnly, onDone }: { employee: Employee | null; readOnly: boolean; onDone: (m: string) => void }) {
  const [e, setE] = useState<Omit<Employee, "id" | "createdAt" | "updatedAt">>(() => (employee ? { ...employee } : blankEmployee()));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const [gross, setGross] = useState("");
  const [invite, setInvite] = useState("");
  const set = (p: Partial<Employee>) => setE((x) => ({ ...x, ...p }));

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy("save");
    setError("");
    try {
      await api(employee ? `/api/admin/payroll/employees/${employee.id}` : "/api/admin/payroll/employees", { method: employee ? "PATCH" : "POST", body: JSON.stringify(e) });
      onDone(employee ? "Saved. New payslips use the new salary (made ones keep theirs)." : `${e.name} added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
      setBusy("");
    }
  };
  const del = async () => {
    setBusy("delete");
    try {
      await api(`/api/admin/payroll/employees/${employee!.id}`, { method: "DELETE" });
      onDone("Employee deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
      setBusy("");
    }
  };
  const L = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => <label className={`block ${wide ? "sm:col-span-2" : ""}`}><span className="mb-1.5 block text-[13px] font-semibold">{label}</span>{children}</label>;

  return (
    <form onSubmit={save} className="space-y-5">
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {L({ label: "Full name *", children: <input className="input" value={e.name} onChange={(x) => set({ name: x.target.value })} required /> })}
          {L({ label: "Employee ID", children: <input className="input" value={e.empCode} onChange={(x) => set({ empCode: x.target.value })} placeholder="Auto: SPX-E-001" /> })}
          {L({ label: "Email (payslips are sent here)", children: <input className="input" type="email" value={e.email} onChange={(x) => set({ email: x.target.value })} /> })}
          {L({ label: "Phone", children: <input className="input" value={e.phone} onChange={(x) => set({ phone: x.target.value })} /> })}
          {L({ label: "Designation", children: <input className="input" value={e.designation} onChange={(x) => set({ designation: x.target.value })} placeholder="e.g. Web Developer" /> })}
          {L({ label: "Department", children: <input className="input" value={e.department} onChange={(x) => set({ department: x.target.value })} placeholder="e.g. Development" /> })}
          {L({ label: "Date of joining", children: <input className="input" type="date" value={e.joiningDate} onChange={(x) => set({ joiningDate: x.target.value })} /> })}
          {L({ label: "Last working day (if they left)", children: <input className="input" type="date" name="exitDate" value={e.exitDate ?? ""} onChange={(x) => set({ exitDate: x.target.value, ...(x.target.value ? { active: false } : {}) })} /> })}
          {L({ label: "Work location", children: <input className="input" value={e.location} onChange={(x) => set({ location: x.target.value })} /> })}
          {L({ label: "PAN", children: <input className="input uppercase" value={e.pan} onChange={(x) => set({ pan: x.target.value.toUpperCase() })} maxLength={10} /> })}
          {L({ label: "UAN (PF number, if any)", children: <input className="input" value={e.uan} onChange={(x) => set({ uan: x.target.value })} /> })}
          {L({ label: "Bank name", children: <input className="input" value={e.bankName} onChange={(x) => set({ bankName: x.target.value })} /> })}
          {L({ label: "Bank account: last 4 digits only", children: <input className="input" inputMode="numeric" value={e.bankLast4} onChange={(x) => set({ bankLast4: x.target.value.replace(/\D/g, "").slice(-4) })} placeholder="e.g. 4821" /> })}
        </div>

        <div className="rounded-2xl border border-line p-4">
          <p className="font-semibold">Monthly salary (full month)</p>
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-mist p-3">
            <label className="block flex-1"><span className="mb-1 block text-xs font-semibold">Quick fill from monthly gross</span><input className="input" type="number" min={0} value={gross} onChange={(x) => setGross(x.target.value)} placeholder="e.g. 25000" /></label>
            <button type="button" onClick={() => Number(gross) > 0 && set({ earnings: splitGross(Number(gross)) })} className="btn-ghost bg-white px-4 py-2.5 text-sm">Split: Basic 50%, HRA, Special</button>
          </div>
          <div className="mt-3 space-y-2">
            {e.earnings.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_130px_auto] gap-2">
                <input className="input" value={r.label} onChange={(x) => set({ earnings: e.earnings.map((y) => (y.id === r.id ? { ...y, label: x.target.value } : y)) })} aria-label="Component" />
                <input className="input" type="number" min={0} value={r.amount || ""} onChange={(x) => set({ earnings: e.earnings.map((y) => (y.id === r.id ? { ...y, amount: Number(x.target.value) || 0 } : y)) })} aria-label="Monthly amount" />
                <button type="button" onClick={() => set({ earnings: e.earnings.filter((y) => y.id !== r.id) })} aria-label="Remove" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => set({ earnings: [...e.earnings, { id: rid(), label: "", amount: 0 }] })} className="btn-ghost px-4 py-2 text-sm"><Plus size={15} /> Add component</button>
              <span className="text-sm">Gross <b className="tabular-nums">{rs(fullGross(e))}</b></span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <p className="font-semibold">Deductions every month</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mist p-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={e.pf} onChange={(x) => set({ pf: x.target.checked })} /><span className="text-sm"><b>PF</b><span className="block text-xs text-muted">12% of basic (basic up to ₹15,000)</span></span></label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mist p-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-lav-600" checked={e.esi} onChange={(x) => set({ esi: x.target.checked })} /><span className="text-sm"><b>ESI</b><span className="block text-xs text-muted">0.75% of gross, if gross is ₹21,000 or less</span></span></label>
            {L({ label: "Professional tax per month (₹)", children: <><input className="input" type="number" min={0} value={e.professionalTax || ""} onChange={(x) => set({ professionalTax: Number(x.target.value) || 0 })} placeholder="0" /><span className="mt-1 block text-xs text-muted">Rajasthan has no professional tax.</span></> })}
            {L({ label: "Income tax (TDS) per month (₹)", children: <input className="input" type="number" min={0} value={e.tds || ""} onChange={(x) => set({ tds: Number(x.target.value) || 0 })} placeholder="0" /> })}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-lav-600" checked={e.active} onChange={(x) => set({ active: x.target.checked })} />
          <span><span className="block font-semibold">Currently working</span><span className="block text-sm text-muted">Turn off when they leave. They stop getting new payslips; old ones stay valid.</span></span>
        </label>
      </fieldset>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={!!busy} className="btn-dark px-5 py-2.5 text-sm">{busy === "save" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {employee ? "Save" : "Add employee"}</button>
          {employee?.active && employee.email && <button type="button" disabled={!!busy} onClick={async () => { setBusy("invite"); setError(""); try { const r = await api<{ message: string }>(`/api/admin/payroll/employees/${employee.id}/invite`, { method: "POST" }); setInvite(r.message); } catch (err) { setError(err instanceof Error ? err.message : "Couldn't send."); } finally { setBusy(""); } }} className="btn-ghost px-4 py-2.5 text-sm">{busy === "invite" ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Email staff portal invite</button>}
          {invite && <span className="text-sm text-emerald-700">{invite}</span>}
          {employee && (askDelete ? (
            <span className="flex items-center gap-2 text-sm">Delete for good? <button type="button" onClick={del} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">Yes</button><button type="button" onClick={() => setAskDelete(false)} className="btn-ghost px-4 py-2 text-sm">No</button></span>
          ) : <button type="button" onClick={() => setAskDelete(true)} className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete</button>)}
        </div>
      )}
    </form>
  );
}
