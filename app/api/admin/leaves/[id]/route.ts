import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { emailPerson } from "@/lib/notify";
import { rangeText } from "@/lib/leave";
import { leaveOid, leavesCol, overlappingLeave, toLeave } from "@/lib/leave-db";
import { employeesCol, payOid } from "@/lib/payroll-db";
import { SITE_URL } from "@/lib/site";

// { action: "approve" | "reject" | "cancel", note } — the employee gets an email about approve and reject.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const _id = leaveOid(params.id);
  const col = await leavesCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  const l = toLeave(doc);
  const b = await jsonBody(req);
  const action = String(b.action ?? "");
  const note = String(b.note ?? "").trim().slice(0, 300);
  const allowed: Record<string, string[]> = { approve: ["pending", "rejected"], reject: ["pending", "approved"], cancel: ["pending", "approved"] };
  if (!allowed[action]?.includes(l.status)) return NextResponse.json({ error: "That can't be done for this request." }, { status: 400 });
  if (action === "approve") {
    const clash = await overlappingLeave(l.employeeId, l.from, l.to, l.id);
    if (clash && clash.status === "approved") return NextResponse.json({ error: `Another approved leave covers these days (${rangeText(clash.from, clash.to, clash.half)}).` }, { status: 409 });
  }
  const session = await getSession();
  const now = new Date().toISOString();
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled";
  const out = await col.findOneAndUpdate({ _id, status: l.status }, { $set: { status, decidedBy: session?.name ?? "", decidedAt: now, decisionNote: note, updatedAt: now } }, { returnDocument: "after" });
  if (!out) return NextResponse.json({ error: "This request just changed. Reload the page." }, { status: 409 });
  const when = rangeText(l.from, l.to, l.half);
  let emailed = false;
  if (action !== "cancel") {
    const eid = payOid(l.employeeId);
    const emp = eid && (await (await employeesCol()).findOne({ _id: eid }, { projection: { email: 1, name: 1 } }));
    if (emp?.email) {
      const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
      emailed = await emailPerson(String(emp.email), `Leave ${status === "approved" ? "approved" : "not approved"}: ${when}`, status === "approved" ? "Your leave is approved" : "Your leave was not approved", [
        `Hi ${String(emp.name || "").split(" ")[0] || "there"},`,
        `Your ${l.typeLabel.toLowerCase()} for ${when} (${l.days} working day${l.days === 1 ? "" : "s"}) is ${status === "approved" ? "approved" : "not approved"}.`,
        ...(note ? [`Note from ${session?.name ?? "HR"}: ${note}`] : []),
      ], { label: "Open staff portal", url: `${origin}/staff` });
    }
  }
  await logActivity(session, "Attendance", `${status === "approved" ? "Approved" : status === "rejected" ? "Didn't approve" : "Cancelled"} ${l.typeLabel.toLowerCase()} ${when}`, l.empName, req);
  return NextResponse.json({ ...toLeave(out), emailed });
}
