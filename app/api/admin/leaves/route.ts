import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { leaveBalance, leaveDays, rangeText, todayIST } from "@/lib/leave";
import { getAttendanceSettings, leavesCol, overlappingLeave, toLeave } from "@/lib/leave-db";
import { employeesCol, payOid, toEmployee } from "@/lib/payroll-db";

// Leave requests: waiting ones first, then the latest. Each comes with that employee's balance for the year.
export async function GET(req: Request) {
  const deny = await guard("payroll", "view");
  if (deny) return deny;
  const status = new URL(req.url).searchParams.get("status") ?? "";
  const col = await leavesCol();
  const q = ["pending", "approved", "rejected", "cancelled"].includes(status) ? { status } : {};
  const list = (await col.find(q).sort({ createdAt: -1 }).limit(500).toArray()).map(toLeave);
  list.sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  const s = await getAttendanceSettings();
  const year = todayIST().slice(0, 4);
  const ids = Array.from(new Set(list.map((l) => l.employeeId)));
  const all = (await col.find({ employeeId: { $in: ids } }).toArray()).map(toLeave);
  const balances = Object.fromEntries(ids.map((id) => [id, leaveBalance(s, all.filter((l) => l.employeeId === id), year)]));
  const pending = await col.countDocuments({ status: "pending" });
  return NextResponse.json({ leaves: list, balances, pending, settings: s });
}

// The team adds leave for someone (already approved): { employeeId, type, from, to, half, reason }.
export async function POST(req: Request) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const b = await jsonBody(req);
  const eid = payOid(String(b.employeeId ?? ""));
  const doc = eid && (await (await employeesCol()).findOne({ _id: eid }));
  if (!doc) return NextResponse.json({ error: "Choose the employee." }, { status: 400 });
  const emp = toEmployee(doc);
  const s = await getAttendanceSettings();
  const type = s.leaveTypes.find((t) => t.id === b.type);
  if (!type) return NextResponse.json({ error: "Choose the type of leave." }, { status: 400 });
  const from = String(b.from ?? "");
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(b.to ?? "")) ? String(b.to) : from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || to < from) return NextResponse.json({ error: "Choose the dates." }, { status: 400 });
  const half = !!b.half && from === to;
  const days = leaveDays(s, from, to, half);
  if (!days) return NextResponse.json({ error: "These days are weekly offs or holidays." }, { status: 400 });
  const clash = await overlappingLeave(emp.id, from, to);
  if (clash) return NextResponse.json({ error: `${emp.name} already has leave on these days (${rangeText(clash.from, clash.to, clash.half)}).` }, { status: 409 });
  const session = await getSession();
  const now = new Date().toISOString();
  const row = { employeeId: emp.id, empName: emp.name, type: type.id, typeLabel: type.label, paid: type.paid, from, to, half, days, reason: String(b.reason ?? "").trim().slice(0, 500), status: "approved", byAdmin: true, decidedBy: session?.name ?? "", decidedAt: now, decisionNote: "", createdAt: now, updatedAt: now };
  const { insertedId } = await (await leavesCol()).insertOne(row);
  await logActivity(session, "Attendance", `Added ${type.label.toLowerCase()} ${rangeText(from, to, half)}`, emp.name, req);
  return NextResponse.json({ ...row, id: String(insertedId) }, { status: 201 });
}
