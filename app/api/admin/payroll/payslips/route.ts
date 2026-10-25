import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { daysIn, draftSlip, monthLabel, recalc, validMonth, withAttendance, type Payslip } from "@/lib/payroll";
import { monthAttendance } from "@/lib/leave-db";
import { employeesCol, newSlipToken, payOid, payslipsCol, toEmployee, toPayslip } from "@/lib/payroll-db";

// ?month=2026-10 → that month's payslips. Always includes the list of months that have payslips.
export async function GET(req: Request) {
  const deny = await guard("payroll", "view");
  if (deny) return deny;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  const col = await payslipsCol();
  const [months, docs] = await Promise.all([
    col.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$month", n: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 60 }]).toArray(),
    validMonth(month) ? col.find({ month }).sort({ "emp.name": 1 }).limit(2000).toArray() : Promise.resolve([]),
  ]);
  return NextResponse.json({ months: months.map((m) => ({ month: m._id, count: m.n })), payslips: docs.map(toPayslip) });
}

// { month } makes draft payslips for every working employee who doesn't have one for that month yet.
// { month, employeeId } makes one.
export async function POST(req: Request) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const b = await jsonBody(req);
  const month = String(b.month ?? "");
  if (!validMonth(month)) return NextResponse.json({ error: "Pick a month." }, { status: 400 });
  const monthEnd = `${month}-${String(daysIn(month)).padStart(2, "0")}`;
  const eid = b.employeeId ? payOid(String(b.employeeId)) : null;
  if (b.employeeId && !eid) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  const filter = eid ? { _id: eid } : { active: { $ne: false } };
  const employees = (await (await employeesCol()).find(filter).toArray()).map(toEmployee).filter((e) => eid || !e.joiningDate || e.joiningDate <= monthEnd);
  if (!employees.length) return NextResponse.json({ error: eid ? "Employee not found." : "No working employees yet. Add employees first." }, { status: 400 });
  const col = await payslipsCol();
  const session = await getSession();
  const now = new Date().toISOString();
  let made = 0;
  let skipped = 0;
  const noSalary: string[] = [];
  let lastId = "";
  // Paid days come from Attendance and leave (absent days, unpaid leave, half days, days before joining).
  const { summaries } = await monthAttendance(month, employees);
  for (const e of employees) {
    if (!e.earnings.some((r) => r.amount > 0)) noSalary.push(e.name);
    try {
      const sm = summaries.get(e.id);
      const base = draftSlip(e, month);
      const slip = sm ? recalc(withAttendance(base as Payslip, sm)) : base;
      const { insertedId } = await col.insertOne({ ...slip, number: "", verifyCode: "", token: newSlipToken(), createdBy: session?.name ?? "", createdAt: now, updatedAt: now });
      lastId = String(insertedId);
      made++;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        skipped++;
        if (eid) lastId = String((await col.findOne({ employeeId: e.id, month }))?._id ?? "");
      } else throw err;
    }
  }
  if (made) await logActivity(session, "Payroll", `Made ${made} draft payslip${made > 1 ? "s" : ""} for ${monthLabel(month)}`, eid ? employees[0].name : "", req);
  return NextResponse.json({ made, skipped, noSalary, id: lastId }, { status: made ? 201 : 200 });
}
