import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-auth";
import { getContent } from "@/lib/content-server";
import { leaveBalance, todayIST } from "@/lib/leave";
import { attendanceCol, leavesCol, monthAttendance, toLeave } from "@/lib/leave-db";
import { payslipsCol, toPayslip } from "@/lib/payroll-db";
import { slipTotals } from "@/lib/payroll";
import StaffHome from "@/components/staff/StaffHome";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff portal", robots: { index: false, follow: false } };

export default async function StaffPage() {
  const emp = await getStaffSession();
  if (!emp) redirect("/staff/login");
  const today = todayIST();
  const month = today.slice(0, 7);
  const [content, leavesRaw, day, slipsRaw, att] = await Promise.all([
    getContent(),
    (await leavesCol()).find({ employeeId: emp.id }).sort({ from: -1 }).limit(100).toArray(),
    (await attendanceCol()).findOne({ _id: `${emp.id}:${today}` }),
    (await payslipsCol()).find({ employeeId: emp.id, status: "issued" }).sort({ month: -1 }).limit(24).toArray(),
    monthAttendance(month, [{ id: emp.id, joiningDate: emp.joiningDate, exitDate: emp.exitDate }]),
  ]);
  const leaves = leavesRaw.map(toLeave);
  const balance = leaveBalance(att.settings, leaves, today.slice(0, 4));
  const payslips = slipsRaw.map(toPayslip).map((p) => ({ id: p.id, month: p.month, net: slipTotals(p).net, token: p.token, number: p.number }));
  return (
    <StaffHome
      brand={content.brand.name}
      logo={content.brand.logo}
      emp={{ name: emp.name, designation: emp.designation, empCode: emp.empCode }}
      today={today}
      checkIn={day?.checkIn ?? ""}
      checkOut={day?.checkOut ?? ""}
      settings={att.settings}
      month={month}
      summary={att.summaries.get(emp.id)!}
      leaves={leaves}
      balance={balance}
      payslips={payslips}
    />
  );
}
