import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { attendanceCol } from "@/lib/leave-db";
import { employeesCol, payOid } from "@/lib/payroll-db";

// Marks one day for one employee: { employeeId, date, mark: "present" | "half" | "absent" | "" } ("" = back to automatic).
export async function POST(req: Request) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const b = await jsonBody(req);
  const date = String(b.date ?? "");
  const mark = ["present", "half", "absent"].includes(String(b.mark)) ? String(b.mark) : "";
  const eid = payOid(String(b.employeeId ?? ""));
  if (!eid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const emp = await (await employeesCol()).findOne({ _id: eid }, { projection: { name: 1 } });
  if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  const session = await getSession();
  const col = await attendanceCol();
  const _id = `${eid}:${date}`;
  const now = new Date().toISOString();
  if (mark) await col.updateOne({ _id }, { $set: { employeeId: String(eid), date, mark: mark as "present", markedBy: session?.name ?? "", updatedAt: now } }, { upsert: true });
  else await col.updateOne({ _id }, { $unset: { mark: "", markedBy: "" }, $set: { updatedAt: now } });
  await logActivity(session, "Attendance", `Marked ${date} as ${mark || "automatic"}`, String(emp.name ?? ""), req);
  return NextResponse.json({ ok: true });
}
