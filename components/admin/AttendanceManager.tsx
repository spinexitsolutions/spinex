"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import {
  dayLetter, dayStatusLabel, leaveDays, leaveStatusLabel, rangeText, shortDay, todayIST, weekday,
  type AttendanceSettings, type DayMark, type LeaveRequest, type MonthSummary,
} from "@/lib/leave";
import { monthLabel } from "@/lib/payroll";
import { dayTone } from "@/components/staff/StaffHome";
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
type Balance = { id: string; label: string; perYear: number; used: number; pending: number; left: number | null };
type Grid = { settings: AttendanceSettings; dates: string[]; employees: { id: string; name: string; empCode: string; designation: string; summary: MonthSummary }[]; leaves: LeaveRequest[] };
const tone: Record<LeaveRequest["status"], string> = { pending: "bg-amber-50 text-amber-800", approved: "bg-emerald-50 text-emerald-800", rejected: "bg-red-50 text-red-700", cancelled: "bg-mist text-muted" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const rid = () => Math.random().toString(36).slice(2, 10);

// Admin → Attendance and leave.
export default function AttendanceManager({ readOnly = false, onPending }: { readOnly?: boolean; onPending?: (n: number) => void }) {
  const [tab, setTab] = useState<"leave" | "grid" | "settings">("leave");
  const [pending, setPending] = useState(0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-2xl font-semibold">Attendance and leave</h2>
          <p className="text-sm text-muted">Employees apply for leave and check in at <b>/staff</b>. Approved leave and absences flow into payslips as paid days.</p>
        </div>
        <a href="/staff/login" target="_blank" rel="noreferrer" className="btn-ghost bg-white px-4 py-2.5 text-sm"><ExternalLink size={15} /> Staff login page</a>
      </div>
      <div className="flex flex-wrap gap-2">
        {([["leave", `Leave requests${pending ? ` (${pending} waiting)` : ""}`], ["grid", "Monthly attendance"], ["settings", "Holidays and leave rules"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {tab === "leave" && <LeaveRequests readOnly={readOnly} onPending={(n) => { setPending(n); onPending?.(n); }} />}
      {tab === "grid" && <MonthGrid readOnly={readOnly} />}
      {tab === "settings" && <Settings readOnly={readOnly} />}
    </div>
  );
}

function LeaveRequests({ readOnly, onPending }: { readOnly: boolean; onPending: (n: number) => void }) {
  const [data, setData] = useState<{ leaves: LeaveRequest[]; balances: Record<string, Balance[]>; pending: number; settings: AttendanceSettings } | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    try {
      const d = await api<NonNullable<typeof data>>(`/api/admin/leaves${filter ? `?status=${filter}` : ""}`);
      setData(d);
      onPending(d.pending);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't load." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (l: LeaveRequest, action: "approve" | "approve-unpaid" | "reject" | "cancel") => {
    setBusy(`${action}:${l.id}`);
    setMsg(null);
    try {
      const r = await api<LeaveRequest & { emailed: boolean }>(`/api/admin/leaves/${l.id}`, { method: "POST", body: JSON.stringify({ action, note: note[l.id] ?? "" }) });
      setMsg({ ok: true, text: `${l.empName}: ${leaveStatusLabel[r.status].toLowerCase()}.${action !== "cancel" ? (r.emailed ? " Emailed to them." : " (Email not sent: check email settings.)") : ""}` });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't do that." });
    } finally {
      setBusy("");
    }
  };

  if (!data) return <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {[["", "All"], ["pending", "Waiting"], ["approved", "Approved"], ["rejected", "Not approved"], ["cancelled", "Cancelled"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${filter === k ? "bg-lav-600 text-white" : "bg-white text-muted hover:text-ink"}`}>{l}</button>
        ))}
        <button onClick={load} aria-label="Refresh" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white hover:border-ink"><RefreshCw size={14} /></button>
        {!readOnly && <button onClick={() => setAdding(true)} className="btn-dark ml-auto px-4 py-2 text-sm"><Plus size={15} /> Add leave for someone</button>}
      </div>
      {msg && <p role="status" className={`rounded-2xl px-5 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      {data.leaves.length === 0 ? <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-muted">No leave requests{filter ? " here" : " yet"}.</p> : (
        <ul className="space-y-2">
          {data.leaves.map((l) => {
            const bal = data.balances[l.employeeId]?.find((b) => b.id === l.type);
            const over = l.status === "pending" && !!bal?.perYear && bal.used + l.days > bal.perYear;
            return (
              <li key={l.id} className={`rounded-2xl border bg-white px-5 py-4 ${l.status === "pending" ? "border-amber-300" : "border-line"}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{l.empName} <span className="font-normal text-muted">· {l.typeLabel}{l.paid ? "" : " (unpaid)"}</span></p>
                    <p className="text-sm">{rangeText(l.from, l.to, l.half)} · <b>{l.days}</b> working day{l.days === 1 ? "" : "s"}</p>
                    {l.reason && <p className="mt-1 text-sm text-muted">“{l.reason}”</p>}
                    <p className="mt-1 text-xs text-muted">
                      {l.byAdmin ? `Added by ${l.decidedBy}` : `Applied ${shortDay(l.createdAt.slice(0, 10))}`}
                      {bal && (bal.perYear ? ` · ${bal.label}: ${bal.used} of ${bal.perYear} used this year${bal.pending ? `, ${bal.pending} waiting` : ""}` : ` · ${bal.label}: ${bal.used} taken this year`)}
                      {l.decidedBy && !l.byAdmin && l.status !== "pending" ? ` · ${leaveStatusLabel[l.status]} by ${l.decidedBy}` : ""}{l.decisionNote ? ` · “${l.decisionNote}”` : ""}
                    </p>
                    {over && <p className="mt-1 text-xs font-semibold text-amber-700">More than the yearly limit. You can approve it as paid, or approve it as unpaid (leave without pay).</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[l.status]}`}>{leaveStatusLabel[l.status]}</span>
                </div>
                {!readOnly && l.status !== "cancelled" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {l.status === "pending" && <input className="input h-10 max-w-xs flex-1 text-sm" placeholder="Note to them (optional)" value={note[l.id] ?? ""} onChange={(e) => setNote({ ...note, [l.id]: e.target.value })} />}
                    {(l.status === "pending" || l.status === "rejected") && <button onClick={() => act(l, "approve")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy === `approve:${l.id}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>}
                    {(l.status === "pending" || l.status === "rejected") && l.paid && <button onClick={() => act(l, "approve-unpaid")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">{busy === `approve-unpaid:${l.id}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve as unpaid</button>}
                    {(l.status === "pending" || l.status === "approved") && <button onClick={() => act(l, "reject")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">{busy === `reject:${l.id}` ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Don&apos;t approve</button>}
                    {l.status === "approved" && <button onClick={() => act(l, "cancel")} disabled={!!busy} className="rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-mist">Cancel leave</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={adding} title="Add leave for someone" onClose={() => setAdding(false)}>
        {adding && <AddLeave settings={data.settings} onDone={(t) => { setAdding(false); setMsg({ ok: true, text: t }); load(); }} />}
      </Modal>
    </>
  );
}

function AddLeave({ settings, onDone }: { settings: AttendanceSettings; onDone: (m: string) => void }) {
  const [emps, setEmps] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const today = todayIST();
  const [f, setF] = useState({ employeeId: "", type: settings.leaveTypes[0]?.id ?? "", from: today, to: today, half: false, reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api<{ id: string; name: string; active: boolean }[]>("/api/admin/payroll/employees").then((e) => setEmps(e.filter((x) => x.active))).catch(() => undefined); }, []);
  const days = leaveDays(settings, f.from, f.to, f.half && f.from === f.to);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/leaves", { method: "POST", body: JSON.stringify(f) });
      onDone(`Leave added for ${emps.find((x) => x.id === f.employeeId)?.name ?? "the employee"} (approved).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add.");
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-muted">For someone who told you directly (phone, WhatsApp). It is added as approved.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Employee</span><select className="input" required value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}><option value="">Choose…</option>{emps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Type</span><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{settings.leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.label}{t.paid ? "" : " (unpaid)"}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">From</span><input className="input" type="date" required value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to })} /></label>
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">To</span><input className="input" type="date" required min={f.from} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
        <label className="block sm:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Reason</span><input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>
      </div>
      {f.from === f.to && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={f.half} onChange={(e) => setF({ ...f, half: e.target.checked })} /> Half day</label>}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <button disabled={busy || !days || !f.employeeId} className="btn-dark px-5 py-2.5 text-sm disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add {days} day{days === 1 ? "" : "s"}</button>
    </form>
  );
}

function MonthGrid({ readOnly }: { readOnly: boolean }) {
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [data, setData] = useState<Grid | null>(null);
  const [error, setError] = useState("");
  const [pick, setPick] = useState<{ eid: string; name: string; date: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try { setData(await api<Grid>(`/api/admin/attendance?month=${month}`)); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load."); }
  }, [month]);
  useEffect(() => { load(); }, [load]);
  const mark = async (m: DayMark | "") => {
    if (!pick) return;
    setBusy(true);
    try {
      await api("/api/admin/attendance/mark", { method: "POST", body: JSON.stringify({ employeeId: pick.eid, date: pick.date, mark: m }) });
      setPick(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-line bg-white p-5">
        <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Month</span><input type="month" className="input w-[200px]" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
        <p className="pb-2 text-sm text-muted">{readOnly ? "Each day's status." : "Click a day to mark it present, half day or absent. Leave and holidays fill in by themselves."} Totals go into that month&apos;s payslips.</p>
      </div>
      {error && <p className="rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
      {!data ? <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div> : data.employees.length === 0 ? <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-muted">No employees for {monthLabel(month)}. Add them in Payslips → Employees.</p> : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 z-10 min-w-[160px] bg-white px-4 py-2 text-left text-[11px] uppercase tracking-[0.08em] text-muted">Employee</th>
                {data.dates.map((d) => <th key={d} className={`min-w-[28px] px-0.5 py-2 text-center font-semibold ${data.settings.weeklyOff.includes(weekday(d)) ? "text-muted/60" : "text-muted"}`}>{Number(d.slice(8))}<span className="block text-[9px] font-normal">{"SMTWTFS"[weekday(d)]}</span></th>)}
                {["Present", "Leave", "Absent", "Pay cut"].map((h) => <th key={h} className="px-2 py-2 text-right text-[11px] uppercase tracking-[0.06em] text-muted">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.employees.map((e) => (
                <tr key={e.id}>
                  <td className="sticky left-0 z-10 bg-white px-4 py-2"><span className="block truncate font-semibold">{e.name}</span><span className="block truncate text-[11px] text-muted">{e.empCode}</span></td>
                  {data.dates.map((d) => {
                    const st = e.summary.days[d];
                    const can = !readOnly && st !== "na";
                    return (
                      <td key={d} className="p-0.5">
                        <button disabled={!can} onClick={() => setPick({ eid: e.id, name: e.name, date: d })} title={`${shortDay(d)}: ${dayStatusLabel[st] || "Coming up"}`} className={`grid h-7 w-full min-w-[26px] place-items-center rounded-md text-[10px] font-bold ${dayTone[st]} ${can ? "hover:ring-2 hover:ring-lav-400" : ""}`}>{dayLetter[st]}</button>
                      </td>
                    );
                  })}
                  <td className="px-2 text-right tabular-nums">{e.summary.present + e.summary.half / 2}</td>
                  <td className="px-2 text-right tabular-nums">{e.summary.paidLeave + e.summary.unpaidLeave}</td>
                  <td className="px-2 text-right tabular-nums">{e.summary.absent}</td>
                  <td className={`px-2 pr-4 text-right font-bold tabular-nums ${e.summary.lop ? "text-red-600" : ""}`}>{e.summary.lop}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-muted">P present · ½ half day · L paid leave · U unpaid leave · A absent · H holiday · – weekly off. “Pay cut” = days without pay (absent, unpaid leave, half days, days before joining).</p>
        </div>
      )}
      <Modal open={!!pick} title={pick ? `${pick.name}, ${shortDay(pick.date)}` : ""} onClose={() => setPick(null)}>
        <div className="grid gap-2 sm:grid-cols-2">
          {([["present", "Present"], ["half", "Half day"], ["absent", "Absent (no pay)"], ["", "Automatic (leave, check-in, default)"]] as [DayMark | "", string][]).map(([m, l]) => (
            <button key={l} onClick={() => mark(m)} disabled={busy} className="rounded-2xl border border-line px-4 py-3 text-left text-sm font-semibold hover:border-ink">{l}</button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">For leave, use Leave requests (or “Add leave for someone”) so it counts against their balance.</p>
      </Modal>
    </>
  );
}

function Settings({ readOnly }: { readOnly: boolean }) {
  const [s, setS] = useState<AttendanceSettings | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [h, setH] = useState({ date: "", label: "" });
  useEffect(() => { api<AttendanceSettings>("/api/admin/attendance/settings").then((x) => { setS(x); setSaved(JSON.stringify(x)); }).catch(() => undefined); }, []);
  if (!s) return <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>;
  const dirty = JSON.stringify(s) !== saved;
  const save = async () => {
    setBusy(true);
    try {
      const x = await api<AttendanceSettings>("/api/admin/attendance/settings", { method: "PUT", body: JSON.stringify(s) });
      setS(x);
      setSaved(JSON.stringify(x));
      setMsg({ ok: true, text: "Saved" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <fieldset disabled={readOnly} className="space-y-5">
      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">How attendance is counted</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([["present", "Present unless marked", "Every working day counts as present. You mark absences, and leave comes from requests. Best for a small office."], ["checkin", "By check-in", "Employees press Check in on the staff portal. A past working day with no check-in and no leave counts as absent."]] as const).map(([k, t, d]) => (
            <label key={k} className={`cursor-pointer rounded-2xl border p-4 ${s.mode === k ? "border-lav-500 bg-lav-100/40" : "border-line"}`}>
              <span className="flex items-center gap-2 font-semibold"><input type="radio" className="accent-lav-600" checked={s.mode === k} onChange={() => setS({ ...s, mode: k })} /> {t}</span>
              <span className="mt-1 block text-sm text-muted">{d}</span>
            </label>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold">Weekly off</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((d, i) => {
            const on = s.weeklyOff.includes(i);
            return <button type="button" key={d} onClick={() => setS({ ...s, weeklyOff: on ? s.weeklyOff.filter((x) => x !== i) : [...s.weeklyOff, i] })} className={`rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-ink text-white" : "bg-mist text-muted"}`}>{d}</button>;
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">Leave types</h3>
        <p className="text-sm text-muted">Days allowed per calendar year (0 = no limit). Unpaid leave cuts pay for those days.</p>
        <div className="mt-3 space-y-2">
          {s.leaveTypes.map((t) => (
            <div key={t.id} className="grid grid-cols-[1fr_100px_auto_auto] items-center gap-2">
              <input className="input" value={t.label} onChange={(e) => setS({ ...s, leaveTypes: s.leaveTypes.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)) })} aria-label="Leave name" />
              <input className="input" type="number" min={0} value={t.perYear} onChange={(e) => setS({ ...s, leaveTypes: s.leaveTypes.map((x) => (x.id === t.id ? { ...x, perYear: Number(e.target.value) || 0 } : x)) })} aria-label="Days per year" title="Days per year" />
              <label className="flex items-center gap-1.5 whitespace-nowrap text-sm"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={t.paid} onChange={(e) => setS({ ...s, leaveTypes: s.leaveTypes.map((x) => (x.id === t.id ? { ...x, paid: e.target.checked } : x)) })} /> Paid</label>
              <button type="button" onClick={() => setS({ ...s, leaveTypes: s.leaveTypes.filter((x) => x.id !== t.id) })} disabled={s.leaveTypes.length < 2} aria-label="Remove" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setS({ ...s, leaveTypes: [...s.leaveTypes, { id: rid(), label: "Earned leave", paid: true, perYear: 12 }] })} className="btn-ghost mt-3 px-4 py-2 text-sm"><Plus size={15} /> Add leave type</button>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h3 className="font-display text-lg font-semibold">Holidays</h3>
        <p className="text-sm text-muted">Paid days off for everyone. Leave over a holiday doesn&apos;t count it.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="input w-[180px]" type="date" value={h.date} onChange={(e) => setH({ ...h, date: e.target.value })} aria-label="Holiday date" />
          <input className="input flex-1" value={h.label} onChange={(e) => setH({ ...h, label: e.target.value })} placeholder="e.g. Diwali" aria-label="Holiday name" />
          <button type="button" onClick={() => { if (!h.date) return; setS({ ...s, holidays: [...s.holidays.filter((x) => x.date !== h.date), { date: h.date, label: h.label || "Holiday" }].sort((a, b) => a.date.localeCompare(b.date)) }); setH({ date: "", label: "" }); }} className="btn-ghost px-4 text-sm"><Plus size={15} /> Add</button>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {s.holidays.map((x) => (
            <li key={x.date} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-[120px] font-semibold tabular-nums">{shortDay(x.date)}</span><span className="flex-1">{x.label}</span><span className="text-xs text-muted">{DAYS[weekday(x.date)]}</span>
              <button type="button" onClick={() => setS({ ...s, holidays: s.holidays.filter((y) => y.date !== x.date) })} aria-label={`Remove ${x.label}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
            </li>
          ))}
          {s.holidays.length === 0 && <li className="py-2 text-sm text-muted">No holidays added yet.</li>}
        </ul>
      </section>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={!dirty || busy} className="btn-dark px-5 py-2.5 text-sm disabled:bg-line disabled:text-muted">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
          {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
        </div>
      )}
    </fieldset>
  );
}
