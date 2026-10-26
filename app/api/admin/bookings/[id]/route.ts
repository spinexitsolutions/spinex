import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { whenLabel } from "@/lib/booking";
import { bookingOid, bookingsCol, cancelMeeting, emailBooking, toBooking } from "@/lib/booking-db";

// { action: "cancel" (emails the client) | "done" | "noshow" | "reopen" | "note", note }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = bookingOid(params.id);
  const col = await bookingsCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const b = toBooking(doc);
  const { action, note } = await jsonBody(req);
  const session = await getSession();
  const now = new Date().toISOString();
  const set: Record<string, unknown> = { updatedAt: now };
  if (action === "note") set.note = String(note ?? "").slice(0, 2000);
  else if (action === "cancel" && b.status === "confirmed") Object.assign(set, { status: "cancelled", cancelledBy: session?.name ?? "Team" });
  else if ((action === "done" || action === "noshow") && b.status !== "cancelled") set.status = action;
  else if (action === "reopen" && (b.status === "done" || b.status === "noshow")) set.status = "confirmed";
  else return NextResponse.json({ error: "That can't be done for this booking." }, { status: 400 });
  let out;
  try {
    out = await col.findOneAndUpdate({ _id, status: b.status }, { $set: set }, { returnDocument: "after" });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return NextResponse.json({ error: "Another call is booked at this time." }, { status: 409 });
    throw e;
  }
  if (!out) return NextResponse.json({ error: "This booking just changed. Reload the page." }, { status: 409 });
  const after = toBooking(out);
  if (action === "cancel") {
    await cancelMeeting(after);
    await emailBooking("cancelled", after, req);
  }
  if (action !== "note") await logActivity(session, "Call booking", `${action === "cancel" ? "Cancelled" : action === "done" ? "Marked done" : action === "noshow" ? "Marked didn't join" : "Reopened"} the call on ${whenLabel(b)}`, b.name, req);
  return NextResponse.json(after);
}
