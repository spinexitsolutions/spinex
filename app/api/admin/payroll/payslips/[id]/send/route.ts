import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard } from "@/lib/admin-guard";
import { monthLabel } from "@/lib/payroll";
import { payOid, payslipsCol, toPayslip } from "@/lib/payroll-db";
import { emailSlip, issueSlip } from "@/lib/payslip-issue";
import { SITE_URL } from "@/lib/site";

// Emails the employee a link to view and download the payslip. A draft is issued first.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const _id = payOid(params.id);
  const col = await payslipsCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  let slip = toPayslip(doc);
  if (slip.status === "revoked") return NextResponse.json({ error: "This payslip is revoked." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(slip.emp.email)) return NextResponse.json({ error: "Add the employee's email first, then save." }, { status: 400 });
  try {
    slip = await issueSlip(slip);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't issue it." }, { status: 400 });
  }
  const r = await emailSlip(slip, process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin);
  // Issued but not emailed: say so, and still return the issued slip so the screen shows it as issued.
  if (!r.ok) return NextResponse.json({ ok: false, error: `Issued, but the email couldn't be sent: ${r.error}`, payslip: slip });
  await logActivity(await getSession(), "Payroll", `Emailed ${monthLabel(slip.month)} payslip ${slip.number} to ${slip.emp.email}`, slip.emp.name, req);
  return NextResponse.json({ ok: true, message: `Sent to ${slip.emp.email}`, payslip: toPayslip((await col.findOne({ _id }))!) });
}
