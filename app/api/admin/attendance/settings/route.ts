import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanAttendanceSettings, getAttendanceSettings, saveAttendanceSettings } from "@/lib/leave-db";

export async function GET() {
  const deny = await guard("payroll", "view");
  if (deny) return deny;
  return NextResponse.json(await getAttendanceSettings());
}

export async function PUT(req: Request) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const next = cleanAttendanceSettings(await jsonBody(req));
  await saveAttendanceSettings(next);
  await logActivity(await getSession(), "Attendance", `Changed attendance settings (${next.holidays.length} holidays, ${next.leaveTypes.length} leave types)`, "", req);
  return NextResponse.json(next);
}
