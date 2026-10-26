import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { whenLabel } from "@/lib/booking";
import { alertTeam, bookingsCol, cancelMeeting, emailBooking, getBookingSettings, moveMeeting, slotIsFree, slotStart, toBooking } from "@/lib/booking-db";
import { leadsCol } from "@/lib/lead-db";
import { bookingOid } from "@/lib/booking-db";

// The client's own link: { action: "cancel" } or { action: "move", date, time }. Only before the call starts.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!hasDb()) return NextResponse.json({ error: "Offline right now." }, { status: 503 });
  if (!(req.headers.get("content-type") || "").includes("application/json")) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (await rateLimited(`booking-change:${clientIp(req)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many changes. Please wait a while." }, { status: 429 });
  const token = String(params.token || "");
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const col = await bookingsCol();
  const doc = await col.findOne({ token });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const b = toBooking(doc);
  if (b.status !== "confirmed" || Date.parse(b.start) <= Date.now()) return NextResponse.json({ error: b.status === "cancelled" ? "This call is already cancelled." : "This call can't be changed any more." }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const now = new Date().toISOString();

  if (body.action === "cancel") {
    const out = await col.findOneAndUpdate({ _id: doc._id, status: "confirmed" }, { $set: { status: "cancelled", cancelledBy: "client", updatedAt: now } }, { returnDocument: "after" });
    if (!out) return NextResponse.json({ error: "This call just changed. Reload the page." }, { status: 409 });
    const done = toBooking(out);
    await cancelMeeting(done);
    if (b.leadId && bookingOid(b.leadId)) await (await leadsCol()).updateOne({ _id: bookingOid(b.leadId)! }, { $set: { followUpNote: "Cancelled the consultation call. Call them back?", updatedAt: now } });
    await Promise.allSettled([emailBooking("cancelled", done, req), alertTeam("cancelled", done, "Cancelled by the client")]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "move") {
    const date = String(body.date ?? "");
    const time = String(body.time ?? "");
    const s = await getBookingSettings();
    if (!s.enabled) return NextResponse.json({ error: "Booking is closed right now. Please contact us." }, { status: 403 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !(await slotIsFree(s, date, time, b.id))) return NextResponse.json({ error: "That time isn't free any more. Please choose another.", taken: true }, { status: 409 });
    const { start, end } = slotStart(date, time, s.duration);
    let out;
    try {
      out = await col.findOneAndUpdate({ _id: doc._id, status: "confirmed", start: b.start }, { $set: { start, end, date, time, reminded: { day: Date.parse(start) - Date.now() < 20 * 3600e3, hour: false }, updatedAt: now } }, { returnDocument: "after" });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return NextResponse.json({ error: "That time was just taken. Please choose another.", taken: true }, { status: 409 });
      throw e;
    }
    if (!out) return NextResponse.json({ error: "This call just changed. Reload the page." }, { status: 409 });
    const moved = toBooking(out);
    await moveMeeting(moved, start, end);
    if (b.leadId && bookingOid(b.leadId)) await (await leadsCol()).updateOne({ _id: bookingOid(b.leadId)! }, { $set: { followUp: date, updatedAt: now } });
    await Promise.allSettled([emailBooking("moved", moved, req), alertTeam("moved", moved, `Was ${whenLabel(b)}`)]);
    return NextResponse.json({ ok: true, when: whenLabel(moved) });
  }
  return NextResponse.json({ error: "Bad request." }, { status: 400 });
}
