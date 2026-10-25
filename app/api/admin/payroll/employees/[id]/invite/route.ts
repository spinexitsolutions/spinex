import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard } from "@/lib/admin-guard";
import { emailPerson } from "@/lib/notify";
import { employeesCol, payOid, toEmployee } from "@/lib/payroll-db";
import { getContent } from "@/lib/content-server";
import { SITE_URL } from "@/lib/site";

// Emails the employee how to open the staff portal (they log in with a code sent to the same email).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const _id = payOid(params.id);
  const doc = _id && (await (await employeesCol()).findOne({ _id }));
  if (!doc) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  const e = toEmployee(doc);
  if (!e.active) return NextResponse.json({ error: "This employee is marked as left." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.email)) return NextResponse.json({ error: "Add the employee's email first, then save." }, { status: 400 });
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const brand = (await getContent()).brand.name || "Spinex IT Solutions";
  const ok = await emailPerson(e.email, `Your ${brand} staff portal`, "Your staff portal is ready", [
    `Hi ${e.name.split(" ")[0] || "there"},`,
    "On the staff portal you can apply for leave, check in each day, see your leave balance and download your payslips.",
    `Log in with this email (${e.email}). We send you a 6-digit code each time, no password needed.`,
  ], { label: "Open staff portal", url: `${origin}/staff/login?email=${encodeURIComponent(e.email)}` });
  if (!ok) return NextResponse.json({ error: "The email couldn't be sent. Check Admin → API keys → Email alerts." }, { status: 502 });
  await (await employeesCol()).updateOne({ _id: _id! }, { $set: { invitedAt: new Date().toISOString() } });
  await logActivity(await getSession(), "Payroll", "Emailed a staff portal invite", e.name, req);
  return NextResponse.json({ ok: true, message: `Invite sent to ${e.email}` });
}
