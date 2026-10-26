import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { checkHuman } from "@/lib/antispam";
import { leadsCol } from "@/lib/lead-db";
import { cleanTrack } from "@/lib/attribution";
import { announceLead } from "@/lib/lead-announce";
import { whenLabel } from "@/lib/booking";
import { alertTeam, bookingsCol, emailBooking, getBookingSettings, meetingFor, newBookingToken, slotIsFree, slotStart, toBooking } from "@/lib/booking-db";

const s = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

// Books a call: { date, time, name, phone, email, company, topic, message } plus the usual spam-check fields.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Booking is offline right now. Please message us on WhatsApp." }, { status: 503 });
  const raw: unknown = await req.json().catch(() => null);
  const b = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const settings = await getBookingSettings();
  if (!settings.enabled) return NextResponse.json({ error: "Call booking is closed right now. Please use the contact form." }, { status: 403 });
  const human = await checkHuman(req, b, "booking", 5);
  if (!human.ok) return human.silent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: human.error }, { status: human.status });

  const date = s(b.date, 10);
  const time = s(b.time, 5);
  const name = s(b.name, 120);
  const phone = s(b.phone, 20).replace(/[^\d+]/g, "");
  const email = s(b.email, 160).toLowerCase();
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter your name.";
  if (phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a 10-digit phone number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter your email. The meeting link is sent there.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) errors.time = "Choose a time.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please fix the highlighted fields.", errors }, { status: 400 });
  if (!(await slotIsFree(settings, date, time))) return NextResponse.json({ error: "Sorry, that time was just taken. Please choose another.", taken: true }, { status: 409 });

  const { start, end } = slotStart(date, time, settings.duration);
  const now = new Date().toISOString();
  const token = newBookingToken();
  const base = { name, phone, email, company: s(b.company, 140), topic: s(b.topic, 120), message: s(b.message, 1500), start, end, date, time, token };
  const col = await bookingsCol();
  // The time is held first (unique per start time), then the meeting is made.
  let insertedId;
  try {
    ({ insertedId } = await col.insertOne({ ...base, status: "confirmed", meetMode: settings.meetMode, meetLink: "", calendarEventId: "", leadId: "",
      // No "see you tomorrow" email for a call booked less than a day before.
      reminded: { day: Date.parse(start) - Date.now() < 20 * 3600e3, hour: false }, cancelledBy: "", note: "", createdAt: now, updatedAt: now }));
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return NextResponse.json({ error: "Sorry, that time was just taken. Please choose another.", taken: true }, { status: 409 });
    throw e;
  }
  const meet = await meetingFor(base, settings);

  // Also a lead, so it shows in Leads with the usual follow-up tools.
  const track = cleanTrack(b.track);
  const leadMsg = `Booked a free call: ${whenLabel(base)}${base.topic ? `\nTopic: ${base.topic}` : ""}${base.message ? `\n${base.message}` : ""}`;
  const lead = await (await leadsCol()).insertOne({ name, phone, email, services: base.topic, budget: "", message: leadMsg, plan: "", source: "booking", status: "new", value: "", followUp: date, followUpNote: "Consultation call", assignedTo: "", assignedName: "", notes: "", track, bookingId: String(insertedId), createdAt: now, updatedAt: now });
  const doc = await col.findOneAndUpdate({ _id: insertedId }, { $set: { meetMode: meet.meetMode, meetLink: meet.meetLink, calendarEventId: meet.calendarEventId, leadId: String(lead.insertedId) } }, { returnDocument: "after" });
  const booking = toBooking(doc!);

  await Promise.allSettled([
    emailBooking("booked", booking, req),
    alertTeam("booked", booking, meet.problem ? `Meet link problem: ${meet.problem}` : ""),
    announceLead({ data: { name, phone, email, services: base.topic, message: leadMsg }, source: "booking", track, stamp: now, adminUrl: `${new URL(req.url).origin}/admin`, autoReply: false, skipAlerts: true }),
  ]);
  return NextResponse.json({ ok: true, token, when: whenLabel(booking), meetLink: booking.meetLink, meetMode: booking.meetMode }, { status: 201 });
}
