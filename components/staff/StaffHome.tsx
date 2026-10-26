"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, FileText, Loader2, LogIn, LogOut, Send, X } from "lucide-react";
import {
  dayLetter, dayStatusLabel, leaveDays, leaveStatusLabel, monthDates, rangeText, weekday,
  type AttendanceSettings, type DayStatus, type LeaveRequest, type MonthSummary,
} from "@/lib/leave";
import { monthLabel } from "@/lib/payroll";

type Balance = { id: string; label: string; paid: boolean; perYear: number; used: number; pending: number; left: number | null };
type Slip = { id: string; month: string; net: number; token: string; number: string };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.href = "/staff/login";
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}
const time = (iso: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");
const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const dayTone: Record<DayStatus, string> = {
  na: "bg-transparent text-muted/40", future: "bg-white text-muted", off: "bg-mist text-muted", holiday: "bg-sky-50 text-sky-700",
  present: "bg-emerald-50 text-emerald-800", half: "bg-amber-50 text-amber-800", absent: "bg-red-50 text-red-700",
  leave: "bg-lav-100 text-lav-700", "half-leave": "bg-lav-100 text-lav-700", unpaid: "bg-orange-50 text-orange-800", "half-unpaid": "bg-orange-50 text-orange-800",
};
const statusTone: Record<LeaveRequest["status"], string> = { pending: "bg-amber-50 text-amber-800", approved: "bg-emerald-50 text-emerald-800", rejected: "bg-red-50 text-red-700", cancelled: "bg-mist text-muted" };

export default function StaffHome(props: {
  brand: string; logo: string; emp: { name: string; designation: string; empCode: string }; today: string; checkIn: string; checkOut: string;
  settings: AttendanceSettings; month: string; summary: MonthSummary; leaves: LeaveRequest[]; balance: Balance[]; payslips: Slip[];
}) {
  const { brand, logo, emp, today, settings, month, summary, leaves, balance, payslips } = props;
  const [checkIn, setCheckIn] = useState(props.checkIn);
  const [checkOut, setCheckOut] = useState(props.checkOut);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ type: settings.leaveTypes[0]?.id ?? "", from: today, to: today, half: false, reason: "" });
  const days = useMemo(() => leaveDays(settings, form.from, form.to || form.from, form.half && form.from === form.to), [settings, form]);
  const chosen = balance.find((b) => b.id === form.type);
  const overLimit = !!chosen?.perYear && chosen.used + chosen.pending + days > chosen.perYear;
  const holidayToday = settings.holidays.find((h) => h.date === today);
  const offToday = settings.weeklyOff.includes(weekday(today));
  const upcomingHolidays = settings.holidays.filter((h) => h.date >= today).slice(0, 5);

  const check = async (action: "in" | "out") => {
    setBusy(action);
    setMsg(null);
    try {
      const r = await post("/api/staff/checkin", { action });
      setCheckIn(r.day?.checkIn ?? "");
      setCheckOut(r.day?.checkOut ?? "");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setBusy("");
    }
  };
  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("apply");
    setMsg(null);
    try {
      await post("/api/staff/leave", { ...form, to: form.to || form.from });
      window.location.reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't apply." });
      setBusy("");
    }
  };
  const cancel = async (id: string) => {
    setBusy(id);
    try {
      await post(`/api/staff/leave/${id}`, {});
      window.location.reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't cancel." });
      setBusy("");
    }
  };
  const logout = async () => {
    await fetch("/api/staff/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/staff/login";
  };

  const dates = monthDates(month);
  const lead = (weekday(dates[0]) + 6) % 7; // calendar starts on Monday

  return (
    <div className="min-h-screen bg-mist">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          {logo ? <img src={logo} alt="" className="h-9 w-9 object-contain" /> : null}
          <div className="mr-auto"><p className="font-display text-lg font-semibold leading-tight">{brand}</p><p className="text-xs text-white/55">Staff portal</p></div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/15"><LogOut size={15} /> Log out</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6">
        <div>
          <p className="text-sm text-muted">Hello</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{emp.name}</h1>
          <p className="text-sm text-muted">{[emp.designation, emp.empCode].filter(Boolean).join(" · ")}</p>
        </div>

        {msg && <p role="alert" className={`rounded-2xl px-5 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-[24px] border border-line bg-white p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Clock size={18} className="text-lav-700" /> Today</h2>
            <p className="mt-1 text-sm text-muted" suppressHydrationWarning>{new Date(`${today}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}{holidayToday ? ` · Holiday: ${holidayToday.label}` : offToday ? " · Weekly off" : ""}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-mist p-4"><p className="text-xs text-muted">Checked in</p><p className="mt-1 text-xl font-semibold" suppressHydrationWarning>{time(checkIn) || "—"}</p></div>
              <div className="rounded-2xl bg-mist p-4"><p className="text-xs text-muted">Checked out</p><p className="mt-1 text-xl font-semibold" suppressHydrationWarning>{time(checkOut) || "—"}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!checkIn ? (
                <button onClick={() => check("in")} disabled={!!busy} className="btn-dark px-5 py-2.5 text-sm">{busy === "in" ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Check in</button>
              ) : (
                <button onClick={() => check("out")} disabled={!!busy} className="btn-ghost px-5 py-2.5 text-sm">{busy === "out" ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />} {checkOut ? "Check out again" : "Check out"}</button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">{settings.mode === "checkin" ? "Please check in every working day. A working day without a check-in or leave is counted as absent." : "Checking in is optional, but it helps keep a record."}</p>
          </section>

          <section className="rounded-[24px] border border-line bg-white p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarDays size={18} className="text-lav-700" /> Leave balance {today.slice(0, 4)}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {balance.map((b) => (
                <div key={b.id} className="rounded-2xl bg-mist p-4">
                  <p className="text-sm font-semibold">{b.label}</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{b.left === null ? b.used : b.left}<span className="text-sm font-normal text-muted">{b.left === null ? " taken" : ` of ${b.perYear} left`}</span></p>
                  <p className="text-xs text-muted">{[b.left === null ? "" : `${b.used} taken`, b.pending ? `${b.pending} waiting` : "", b.paid ? "" : "no pay for these days"].filter(Boolean).join(" · ") || "No limit"}</p>
                </div>
              ))}
            </div>
            {upcomingHolidays.length > 0 && <p className="mt-4 text-sm text-muted">Coming holidays: {upcomingHolidays.map((h) => `${h.label} (${rangeText(h.date, h.date)})`).join(", ")}</p>}
          </section>
        </div>

        <section className="rounded-[24px] border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold">Apply for leave</h2>
          <form onSubmit={apply} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">Type</span>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{settings.leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.label}{t.paid ? "" : " (unpaid)"}</option>)}</select>
            </label>
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">From</span><input className="input" type="date" required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })} /></label>
            <label className="block"><span className="mb-1.5 block text-[13px] font-semibold">To</span><input className="input" type="date" required min={form.from} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
            <label className="block md:col-span-2"><span className="mb-1.5 block text-[13px] font-semibold">Reason</span><input className="input" required maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Family function in Ajmer" /></label>
            <div className="flex items-end gap-3">
              {form.from === form.to && <label className="flex h-12 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-lav-600" checked={form.half} onChange={(e) => setForm({ ...form, half: e.target.checked })} /> Half day</label>}
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-3">
              <button disabled={!!busy || !days} className="btn-dark px-5 py-2.5 text-sm disabled:opacity-50">{busy === "apply" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Apply for {days} day{days === 1 ? "" : "s"}</button>
              <span className="text-sm text-muted">{days ? "Weekly offs and holidays are not counted." : "These days are weekly offs or holidays."}</span>
              {overLimit && <span className="text-sm font-semibold text-amber-700">This is more than your {chosen?.label.toLowerCase()} left. HR may make the extra days unpaid.</span>}
            </div>
          </form>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-[24px] border border-line bg-white p-6">
            <h2 className="font-display text-lg font-semibold">My leave</h2>
            {leaves.length === 0 ? <p className="mt-3 text-sm text-muted">No leave yet.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {leaves.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{rangeText(l.from, l.to, l.half)} <span className="font-normal text-muted">· {l.typeLabel} · {l.days} day{l.days === 1 ? "" : "s"}</span></span>
                      <span className="block truncate text-xs text-muted">{l.reason}{l.decisionNote ? ` · Note: ${l.decisionNote}` : ""}</span>
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[l.status]}`}>{leaveStatusLabel[l.status]}</span>
                    {(l.status === "pending" || (l.status === "approved" && l.from > today)) && (
                      <button onClick={() => cancel(l.id)} disabled={!!busy} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">{busy === l.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Cancel</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[24px] border border-line bg-white p-6">
            <h2 className="font-display text-lg font-semibold">{monthLabel(month)}</h2>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
              {dates.map((d) => {
                const st = summary.days[d];
                return <span key={d} title={`${rangeText(d, d)}: ${dayStatusLabel[st] || "Coming up"}`} className={`grid aspect-square place-items-center rounded-lg text-xs font-semibold ${dayTone[st]} ${d === today ? "ring-2 ring-ink" : ""}`}>{Number(d.slice(8))}<span className="block text-[9px] font-bold leading-none">{dayLetter[st]}</span></span>;
              })}
            </div>
            <p className="mt-3 text-xs text-muted">P present · ½ half day · L paid leave · U unpaid leave · A absent · H holiday · – weekly off</p>
          </section>
        </div>

        <section className="rounded-[24px] border border-line bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><FileText size={18} className="text-lav-700" /> My payslips</h2>
          {payslips.length === 0 ? <p className="mt-3 text-sm text-muted">Your payslips will show here once HR issues them.</p> : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {payslips.map((p) => (
                <li key={p.id}><a href={`/p/${p.token}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:border-ink"><CheckCircle2 size={17} className="text-emerald-600" /><span className="min-w-0 flex-1"><span className="block font-semibold" suppressHydrationWarning>{monthLabel(p.month)}</span><span className="block text-xs text-muted">{p.number}</span></span><b className="tabular-nums">{rs(p.net)}</b></a></li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
