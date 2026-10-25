import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { monthLabel, validMonth } from "@/lib/payroll";
import { payslipsCol, toPayslip } from "@/lib/payroll-db";
import { emailSlip, issueSlip } from "@/lib/payslip-issue";
import { SITE_URL } from "@/lib/site";

export const maxDuration = 60;

// { month, action: "issue" } issues every draft of the month. { month, action: "send" } also emails everyone not emailed yet.
export async function POST(req: Request) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const { month, action } = await jsonBody(req);
  if (!validMonth(month) || !["issue", "send"].includes(String(action))) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const col = await payslipsCol();
  const slips = (await col.find({ month, status: { $in: ["draft", "issued"] } }).toArray()).map(toPayslip);
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  let issued = 0;
  let sent = 0;
  const problems: string[] = [];
  for (const s of slips) {
    let slip = s;
    try {
      if (slip.status === "draft") {
        slip = await issueSlip(slip);
        issued++;
      }
    } catch (e) {
      problems.push(`${s.emp.name || "Unnamed"}: ${e instanceof Error ? e.message : "couldn't issue"}`);
      continue;
    }
    if (action === "send" && !slip.sentAt) {
      const r = await emailSlip(slip, origin);
      if (r.ok) sent++;
      else problems.push(`${slip.emp.name}: ${r.error}`);
    }
  }
  await logActivity(await getSession(), "Payroll", `${action === "send" ? "Issued and emailed" : "Issued"} ${monthLabel(month)} payslips (${issued} issued${action === "send" ? `, ${sent} emailed` : ""})`, "", req);
  const parts = [issued ? `${issued} issued` : "", action === "send" ? `${sent} emailed` : ""].filter(Boolean);
  return NextResponse.json({ ok: true, issued, sent, problems, message: parts.length ? parts.join(", ") : "Nothing new to do. All are already issued." });
}
