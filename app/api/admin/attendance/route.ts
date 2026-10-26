import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { monthDates } from "@/lib/leave";
import { leavesBetween, monthAttendance } from "@/lib/leave-db";
import { employeesCol, toEmployee } from "@/lib/payroll-db";
import { validMonth } from "@/lib/payroll";

// ?month=2026-10 → each employee's day-by-day status and totals, the month's leaves and the settings.
export async function GET(req: Request) {
  const deny = await guard("payroll", "view");
  if (deny) return deny;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!validMonth(month)) return NextResponse.json({ error: "Pick a month." }, { status: 400 });
  const dates = monthDates(month);
  const all = (await (await employeesCol()).find({}).sort({ name: 1 }).limit(2000).toArray()).map(toEmployee);
  // Working people who had joined by the end of the month (and people who left but have leave this month).
  const leaves = await leavesBetween(dates[0], dates[dates.length - 1]);
  const employees = all.filter((e) => (e.active || (e.exitDate && e.exitDate >= dates[0]) || leaves.some((l) => l.employeeId === e.id)) && (!e.joiningDate || e.joiningDate <= dates[dates.length - 1]) && (!e.exitDate || e.exitDate >= dates[0] || leaves.some((l) => l.employeeId === e.id)));
  const { settings, summaries } = await monthAttendance(month, employees);
  return NextResponse.json({
    settings,
    dates,
    employees: employees.map((e) => ({ id: e.id, name: e.name, empCode: e.empCode, designation: e.designation, summary: summaries.get(e.id) })),
    leaves: leaves.filter((l) => l.status === "approved" || l.status === "pending"),
  });
}
