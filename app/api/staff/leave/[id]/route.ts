import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-auth";
import { isJsonRequest, originOf } from "@/lib/portal-db";
import { notifyAdmin } from "@/lib/notify";
import { rangeText, todayIST } from "@/lib/leave";
import { leaveOid, leavesCol, toLeave } from "@/lib/leave-db";

// The employee cancels their own leave: a waiting one any time, an approved one only before it starts.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const emp = await getStaffSession();
  if (!emp) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const _id = leaveOid(params.id);
  const col = await leavesCol();
  const doc = _id && (await col.findOne({ _id, employeeId: emp.id }));
  if (!_id || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const l = toLeave(doc);
  const ok = l.status === "pending" || (l.status === "approved" && l.from > todayIST());
  if (!ok) return NextResponse.json({ error: l.status === "approved" ? "This leave has started. Ask HR to change it." : "This request can't be cancelled." }, { status: 400 });
  const now = new Date().toISOString();
  const res = await col.updateOne({ _id, status: l.status }, { $set: { status: "cancelled", updatedAt: now } });
  if (!res.modifiedCount) return NextResponse.json({ error: "This request just changed. Reload the page." }, { status: 409 });
  if (l.status === "approved") await notifyAdmin(`Leave cancelled: ${emp.name}, ${rangeText(l.from, l.to, l.half)}`, [["Employee", emp.name], ["Leave", l.typeLabel], ["Dates", rangeText(l.from, l.to, l.half)]], `${originOf(req)}/admin#attendance`).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
