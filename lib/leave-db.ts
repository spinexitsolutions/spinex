// Server only. Leave requests ("leaves"), daily attendance marks ("attendance") and the attendance settings.
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { readSetting } from "./settings-db";
import { defaultAttendanceSettings, monthDates, monthSummary, todayIST, type AttendanceDay, type AttendanceSettings, type Holiday, type LeaveRequest, type LeaveType } from "./leave";
import type { Employee } from "./payroll";

export const leaveOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

let leavesReady = false;
export async function leavesCol() {
  const col = (await getDb()).collection("leaves");
  if (!leavesReady) {
    await col.createIndex({ employeeId: 1, from: 1 }).catch(() => undefined);
    await col.createIndex({ status: 1, createdAt: -1 }).catch(() => undefined);
    leavesReady = true;
  }
  return col;
}
// One document per employee per day: _id "<employeeId>:<YYYY-MM-DD>".
export const attendanceCol = async () => (await getDb()).collection<AttendanceDay & { _id: string; ip?: string; markedBy?: string; updatedAt?: string }>("attendance");

const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const isDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ""));

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const raw = await readSetting<AttendanceSettings>("attendance", defaultAttendanceSettings);
  return cleanAttendanceSettings(raw as unknown as Record<string, unknown>);
}

export function cleanAttendanceSettings(b: Record<string, unknown>): AttendanceSettings {
  const weeklyOff = Array.isArray(b.weeklyOff) ? Array.from(new Set((b.weeklyOff as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))) : defaultAttendanceSettings.weeklyOff;
  const holidays: Holiday[] = (Array.isArray(b.holidays) ? (b.holidays as Record<string, unknown>[]) : [])
    .filter((h) => h && isDate(h.date)).map((h) => ({ date: String(h.date), label: s(h.label, 60) || "Holiday" }))
    .sort((a, c) => a.date.localeCompare(c.date)).slice(0, 200);
  let leaveTypes: LeaveType[] = (Array.isArray(b.leaveTypes) ? (b.leaveTypes as Record<string, unknown>[]) : [])
    .filter((t) => t && s(t.label)).slice(0, 12)
    .map((t, i) => ({ id: s(t.id, 24).replace(/[^\w-]/g, "") || `type${i}`, label: s(t.label, 40), paid: t.paid !== false, perYear: Math.max(0, Math.min(365, Math.round(Number(t.perYear) || 0))) }));
  if (!leaveTypes.length) leaveTypes = defaultAttendanceSettings.leaveTypes;
  return { mode: b.mode === "checkin" ? "checkin" : "present", weeklyOff, holidays, leaveTypes };
}

export async function saveAttendanceSettings(next: AttendanceSettings) {
  await (await getDb()).collection<{ _id: string }>("settings").updateOne({ _id: "attendance" }, { $set: { value: next, updatedAt: new Date().toISOString() } }, { upsert: true });
}

export function toLeave(doc: WithId<Document>): LeaveRequest {
  const r = doc as WithId<Document> & Partial<LeaveRequest>;
  return {
    id: String(doc._id),
    employeeId: r.employeeId ?? "",
    empName: r.empName ?? "",
    type: r.type ?? "",
    typeLabel: r.typeLabel ?? "",
    paid: r.paid !== false,
    from: r.from ?? "",
    to: r.to ?? r.from ?? "",
    half: !!r.half,
    days: Number(r.days) || 0,
    reason: r.reason ?? "",
    status: (["pending", "approved", "rejected", "cancelled"].includes(String(r.status)) ? r.status : "pending") as LeaveRequest["status"],
    byAdmin: !!r.byAdmin,
    decidedBy: r.decidedBy ?? "",
    decidedAt: r.decidedAt ?? "",
    decisionNote: r.decisionNote ?? "",
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  };
}

// Leaves that touch a date range (any status).
export async function leavesBetween(from: string, to: string, employeeId?: string) {
  const q: Record<string, unknown> = { from: { $lte: to }, to: { $gte: from } };
  if (employeeId) q.employeeId = employeeId;
  return (await (await leavesCol()).find(q).limit(5000).toArray()).map(toLeave);
}

// Another leave (waiting or approved) on any of these days?
export async function overlappingLeave(employeeId: string, from: string, to: string, exceptId?: string) {
  const q: Record<string, unknown> = { employeeId, status: { $in: ["pending", "approved"] }, from: { $lte: to }, to: { $gte: from } };
  if (exceptId && leaveOid(exceptId)) q._id = { $ne: leaveOid(exceptId) };
  const doc = await (await leavesCol()).findOne(q);
  return doc ? toLeave(doc) : null;
}

// Attendance summary of a month for some employees (for the admin grid and for payslips).
export async function monthAttendance(month: string, employees: Pick<Employee, "id" | "joiningDate">[]) {
  const dates = monthDates(month);
  const [settings, days, leaves] = await Promise.all([
    getAttendanceSettings(),
    (await attendanceCol()).find({ employeeId: { $in: employees.map((e) => e.id) }, date: { $gte: dates[0], $lte: dates[dates.length - 1] } }).toArray(),
    leavesBetween(dates[0], dates[dates.length - 1]),
  ]);
  const today = todayIST();
  const out = new Map<string, ReturnType<typeof monthSummary>>();
  for (const e of employees) {
    out.set(e.id, monthSummary(month, { s: settings, today, joiningDate: e.joiningDate, days: days.filter((d) => d.employeeId === e.id), leaves: leaves.filter((l) => l.employeeId === e.id) }));
  }
  return { settings, summaries: out };
}
