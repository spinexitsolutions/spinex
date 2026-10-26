// Attendance and leave: shared types and the day-by-day rules (used by the server, admin screens and the staff portal).

export type LeaveType = { id: string; label: string; paid: boolean; perYear: number }; // perYear 0 = no limit
export type Holiday = { date: string; label: string };
export type AttendanceSettings = {
  mode: "present" | "checkin"; // present: everyone is present unless marked; checkin: no check-in on a working day = absent
  weeklyOff: number[]; // 0 = Sunday … 6 = Saturday
  holidays: Holiday[];
  leaveTypes: LeaveType[];
};

export const defaultAttendanceSettings: AttendanceSettings = {
  mode: "present",
  weeklyOff: [0],
  holidays: [],
  leaveTypes: [
    { id: "casual", label: "Casual leave", paid: true, perYear: 12 },
    { id: "sick", label: "Sick leave", paid: true, perYear: 6 },
    { id: "unpaid", label: "Unpaid leave", paid: false, perYear: 0 },
  ],
};

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveRequest = {
  id: string;
  employeeId: string;
  empName: string;
  type: string; // LeaveType id
  typeLabel: string;
  paid: boolean; // copied from the type when applied, so later policy changes don't rewrite history
  from: string;
  to: string;
  half: boolean; // half day (only for a one-day leave)
  days: number; // working days in the range (weekly off and holidays not counted)
  reason: string;
  status: LeaveStatus;
  byAdmin: boolean; // added by the team instead of applied by the employee
  decidedBy: string;
  decidedAt: string;
  decisionNote: string;
  createdAt: string;
  updatedAt: string;
};
export const leaveStatusLabel: Record<LeaveStatus, string> = { pending: "Waiting for approval", approved: "Approved", rejected: "Not approved", cancelled: "Cancelled" };

// Admin's mark on a day, or the employee's check-in.
export type DayMark = "present" | "half" | "absent";
export type AttendanceDay = { employeeId: string; date: string; mark?: DayMark | ""; checkIn?: string; checkOut?: string };

export type DayStatus = "na" | "future" | "off" | "holiday" | "present" | "half" | "absent" | "leave" | "half-leave" | "unpaid" | "half-unpaid";
export const dayStatusLabel: Record<DayStatus, string> = {
  na: "Not joined", future: "", off: "Weekly off", holiday: "Holiday", present: "Present", half: "Half day", absent: "Absent",
  leave: "Paid leave", "half-leave": "Half day paid leave", unpaid: "Unpaid leave", "half-unpaid": "Half day unpaid leave",
};
export const dayLetter: Record<DayStatus, string> = { na: "", future: "", off: "–", holiday: "H", present: "P", half: "½", absent: "A", leave: "L", "half-leave": "L½", unpaid: "U", "half-unpaid": "U½" };
// Days of pay lost for each status.
export const lopOf: Record<DayStatus, number> = { na: 0, future: 0, off: 0, holiday: 0, present: 0, half: 0.5, absent: 1, leave: 0, "half-leave": 0, unpaid: 1, "half-unpaid": 0.5 };

export const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const dayMs = 86400000;
export const addDay = (d: string, n = 1) => new Date(Date.parse(`${d}T00:00:00Z`) + n * dayMs).toISOString().slice(0, 10);
export const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();
export const datesBetween = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDay(d)) out.push(d);
  return out;
};
export const monthDates = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return datesBetween(`${month}-01`, `${month}-${String(last).padStart(2, "0")}`);
};
export const shortDay = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");
export const rangeText = (from: string, to: string, half = false) => (from === to ? `${shortDay(from)}${half ? " (half day)" : ""}` : `${shortDay(from)} to ${shortDay(to)}`);

export const isHoliday = (s: AttendanceSettings, d: string) => s.holidays.find((h) => h.date === d);
export const isWorkingDay = (s: AttendanceSettings, d: string) => !s.weeklyOff.includes(weekday(d)) && !isHoliday(s, d);

// Working days a leave takes (weekly off and holidays in between are free).
export function leaveDays(s: AttendanceSettings, from: string, to: string, half: boolean) {
  if (!from || !to || to < from) return 0;
  if (half && from === to) return isWorkingDay(s, from) ? 0.5 : 0;
  return datesBetween(from, to).filter((d) => isWorkingDay(s, d)).length;
}

// One employee's status on one day. Order: not joined / left → approved leave → admin's mark → weekly off/holiday → check-in → default.
export function dayStatus(
  d: string,
  ctx: { s: AttendanceSettings; today: string; joiningDate: string; exitDate?: string; day?: AttendanceDay; leave?: Pick<LeaveRequest, "paid" | "half"> },
): DayStatus {
  const { s, today, joiningDate, day, leave } = ctx;
  if (joiningDate && d < joiningDate) return "na";
  if (ctx.exitDate && d > ctx.exitDate) return "na";
  // Approved leave wins over a mark made before it was approved (e.g. marked absent, then sick leave approved),
  // unless HR marked them present that day.
  if (leave && isWorkingDay(s, d) && day?.mark !== "present") return leave.paid ? (leave.half ? "half-leave" : "leave") : leave.half ? "half-unpaid" : "unpaid";
  if (day?.mark) return day.mark;
  if (isHoliday(s, d)) return "holiday";
  if (s.weeklyOff.includes(weekday(d))) return "off";
  if (day?.checkIn) return "present";
  if (d > today) return "future";
  if (s.mode === "checkin" && d < today) return "absent";
  return "present";
}

export type MonthSummary = { present: number; half: number; absent: number; paidLeave: number; unpaidLeave: number; off: number; holidays: number; lop: number; days: Record<string, DayStatus> };

export function monthSummary(month: string, ctx: { s: AttendanceSettings; today: string; joiningDate: string; exitDate?: string; days: AttendanceDay[]; leaves: Pick<LeaveRequest, "from" | "to" | "paid" | "half" | "status">[] }): MonthSummary {
  const byDate = new Map(ctx.days.map((x) => [x.date, x]));
  const approved = ctx.leaves.filter((l) => l.status === "approved");
  const out: MonthSummary = { present: 0, half: 0, absent: 0, paidLeave: 0, unpaidLeave: 0, off: 0, holidays: 0, lop: 0, days: {} };
  for (const d of monthDates(month)) {
    const leave = approved.find((l) => l.from <= d && d <= l.to);
    const st = dayStatus(d, { s: ctx.s, today: ctx.today, joiningDate: ctx.joiningDate, exitDate: ctx.exitDate, day: byDate.get(d), leave });
    out.days[d] = st;
    out.lop += lopOf[st];
    if (st === "present") out.present++;
    else if (st === "half") out.half++;
    else if (st === "absent") out.absent++;
    else if (st === "leave") out.paidLeave++;
    else if (st === "half-leave") { out.paidLeave += 0.5; out.half++; }
    else if (st === "unpaid") out.unpaidLeave++;
    else if (st === "half-unpaid") { out.unpaidLeave += 0.5; out.half++; }
    else if (st === "off") out.off++;
    else if (st === "holiday") out.holidays++;
  }
  // Days before joining (or after leaving) are not paid either.
  out.lop += Object.values(out.days).filter((x) => x === "na").length;
  return out;
}

// Leave taken (approved) and waiting (pending) per type in a calendar year.
// A leave that crosses the new year (29 Dec to 3 Jan) is split: each year counts its own days.
export function leaveBalance(s: AttendanceSettings, leaves: (Pick<LeaveRequest, "type" | "from" | "days" | "status"> & Partial<Pick<LeaveRequest, "to" | "half">>)[], year: string) {
  const inYear = (l: (typeof leaves)[number]) => {
    const to = l.to || l.from;
    if (l.from.startsWith(year) && to.startsWith(year)) return l.days;
    if (to < `${year}-01-01` || l.from > `${year}-12-31`) return 0;
    return leaveDays(s, l.from < `${year}-01-01` ? `${year}-01-01` : l.from, to > `${year}-12-31` ? `${year}-12-31` : to, !!l.half);
  };
  return s.leaveTypes.map((t) => {
    const mine = leaves.filter((l) => l.type === t.id);
    const used = mine.filter((l) => l.status === "approved").reduce((a, l) => a + inYear(l), 0);
    const pending = mine.filter((l) => l.status === "pending").reduce((a, l) => a + inYear(l), 0);
    return { ...t, used, pending, left: t.perYear ? Math.max(0, t.perYear - used) : null };
  });
}
