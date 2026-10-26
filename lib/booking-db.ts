// Server only. Call bookings ("bookings"), their settings, free slots, emails and reminders.
import { randomBytes } from "crypto";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import {
  addDays, addToCalendarLink, cleanBookingSettings, defaultBookingSettings, freeSlots, istToday, slotMs, timeLabel, whenLabel,
  type Booking, type BookingSettings,
} from "./booking";
import { busyTimes, cancelCallEvent, createCallEvent, googleKeys, moveCallEvent } from "./google-cal";
import { emailPerson, notifyAdmin } from "./notify";
import { sendWhatsAppAlert } from "./whatsapp-alert";
import { getContent } from "./content-server";
import { SITE_URL } from "./site";

export const bookingOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
export const newBookingToken = () => randomBytes(18).toString("base64url");

let ready = false;
export async function bookingsCol() {
  const col = (await getDb()).collection("bookings");
  if (!ready) {
    // Two people can never get the same time: only one booked call per start time.
    await col.createIndex({ start: 1 }, { unique: true, partialFilterExpression: { status: "confirmed" } }).catch(() => undefined);
    await col.createIndex({ token: 1 }).catch(() => undefined);
    ready = true;
  }
  return col;
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const doc = await (await getDb()).collection<{ _id: string; value?: Record<string, unknown> }>("settings").findOne({ _id: "booking" });
  return doc?.value ? cleanBookingSettings({ ...defaultBookingSettings, ...doc.value }) : defaultBookingSettings;
}
export async function saveBookingSettings(next: BookingSettings) {
  await (await getDb()).collection<{ _id: string }>("settings").updateOne({ _id: "booking" }, { $set: { value: next, updatedAt: new Date().toISOString() } }, { upsert: true });
}

export function toBooking(doc: WithId<Document>): Booking {
  const r = doc as WithId<Document> & Partial<Booking>;
  return {
    id: String(doc._id),
    name: r.name ?? "", phone: r.phone ?? "", email: r.email ?? "", company: r.company ?? "", topic: r.topic ?? "", message: r.message ?? "",
    start: r.start ?? "", end: r.end ?? "", date: r.date ?? "", time: r.time ?? "",
    status: (["confirmed", "cancelled", "done", "noshow"].includes(String(r.status)) ? r.status : "confirmed") as Booking["status"],
    token: r.token ?? "", meetMode: r.meetMode === "link" || r.meetMode === "phone" ? r.meetMode : "google", meetLink: r.meetLink ?? "",
    calendarEventId: r.calendarEventId ?? "", leadId: r.leadId ?? "",
    reminded: { day: !!r.reminded?.day, hour: !!r.reminded?.hour },
    cancelledBy: r.cancelledBy ?? "", note: r.note ?? "", createdAt: r.createdAt ?? "", updatedAt: r.updatedAt ?? "",
  };
}
// What the client may see on their own link (no private note).
export const publicBooking = (b: Booking) => ({ ...b, note: "", leadId: "", calendarEventId: "" });

// Booked calls and Google busy times for the booking window.
async function taken(s: BookingSettings, now: number, exceptId?: string) {
  const from = new Date(now).toISOString();
  const to = new Date(Date.parse(`${addDays(istToday(now), s.daysAhead + 1)}T00:00:00+05:30`)).toISOString();
  const q: Record<string, unknown> = { status: "confirmed", end: { $gt: from } };
  if (exceptId && bookingOid(exceptId)) q._id = { $ne: bookingOid(exceptId) };
  const booked = (await (await bookingsCol()).find(q, { projection: { start: 1, end: 1 } }).toArray()).map((b) => ({ start: Date.parse(String(b.start)), end: Date.parse(String(b.end)) }));
  const busy = s.meetMode === "google" ? await busyTimes(from, to).catch((e) => { console.error("Google busy times:", e); return []; }) : [];
  return { booked, busy };
}

export async function availableDays(s: BookingSettings, now = Date.now(), exceptId?: string) {
  const t = await taken(s, now, exceptId);
  const today = istToday(now);
  const days: { date: string; slots: string[] }[] = [];
  for (let i = 0; i <= s.daysAhead; i++) {
    const date = addDays(today, i);
    const slots = freeSlots(s, date, { now, ...t });
    if (slots.length) days.push({ date, slots });
  }
  return days;
}

export async function slotIsFree(s: BookingSettings, date: string, time: string, exceptId?: string) {
  const t = await taken(s, Date.now(), exceptId);
  return freeSlots(s, date, { now: Date.now(), ...t }).includes(time);
}

const origin = (req?: Request) => (process.env.NODE_ENV === "production" || !req ? SITE_URL : new URL(req.url).origin);
const callTitle = async (b: Pick<Booking, "name" | "company">) => `Consultation call: ${b.company || b.name} × ${(await getContent()).brand.name || "Spinex IT Solutions"}`;

// Meet link for a new or moved call. Google: a new event (and Meet link) per call; otherwise the fixed link.
export async function meetingFor(b: Pick<Booking, "name" | "company" | "email" | "phone" | "topic" | "message" | "start" | "end" | "token">, s: BookingSettings) {
  if (s.meetMode === "phone") return { meetMode: "phone" as const, meetLink: "", calendarEventId: "", problem: "" };
  if (s.meetMode === "google" && (await googleKeys()).connected) {
    try {
      const e = await createCallEvent({
        requestId: b.token.slice(0, 30),
        title: await callTitle(b),
        description: [`Name: ${b.name}`, b.company && `Company: ${b.company}`, `Phone: ${b.phone}`, `Email: ${b.email}`, b.topic && `Topic: ${b.topic}`, b.message && `Notes: ${b.message}`, "", `Booked on ${SITE_URL}/book`].filter((x) => x !== false && x !== undefined).join("\n"),
        start: b.start, end: b.end, email: b.email, name: b.name,
      });
      return { meetMode: "google" as const, meetLink: e.meetLink || s.meetLink, calendarEventId: e.id, problem: e.meetLink ? "" : "Google made the event but no Meet link." };
    } catch (err) {
      return { meetMode: (s.meetLink ? "link" : "phone") as "link" | "phone", meetLink: s.meetLink, calendarEventId: "", problem: err instanceof Error ? err.message : "Google Calendar error" };
    }
  }
  return { meetMode: (s.meetLink ? "link" : "phone") as "link" | "phone", meetLink: s.meetLink, calendarEventId: "", problem: s.meetMode === "google" ? "Google Calendar isn't connected." : "" };
}

export async function moveMeeting(b: Booking, start: string, end: string) {
  if (b.calendarEventId) await moveCallEvent(b.calendarEventId, start, end).catch((e) => console.error("Move calendar event:", e));
}
export async function cancelMeeting(b: Booking) {
  if (b.calendarEventId) await cancelCallEvent(b.calendarEventId).catch((e) => console.error("Cancel calendar event:", e));
}

const how = (b: Booking) => (b.meetLink ? `Join on Google Meet: ${b.meetLink}` : `We'll call you on ${b.phone}.`);

export async function emailBooking(kind: "booked" | "moved" | "cancelled" | "reminder-day" | "reminder-hour", b: Booking, req?: Request) {
  const content = await getContent().catch(() => null);
  const brand = content?.brand.name || "Spinex IT Solutions";
  const manage = `${origin(req)}/b/${b.token}`;
  const first = b.name.split(" ")[0] || "there";
  const when = `${whenLabel(b)} (India time)`;
  const cal = addToCalendarLink(b, `Call with ${brand}`, `${how(b)}\n\nChange or cancel: ${manage}`);
  const subject = {
    booked: `Call booked: ${when}`,
    moved: `Call moved to ${when}`,
    cancelled: `Call cancelled: ${when}`,
    "reminder-day": `Reminder: our call tomorrow at ${timeLabel(b.time)}`,
    "reminder-hour": `Starting soon: our call at ${timeLabel(b.time)}`,
  }[kind];
  const title = { booked: "Your call is booked", moved: "Your call has a new time", cancelled: "Your call is cancelled", "reminder-day": "See you tomorrow", "reminder-hour": "Our call starts soon" }[kind];
  const paras = kind === "cancelled"
    ? [`Hi ${first},`, `Your call on ${when} is cancelled.`, "Book another time whenever you like."]
    : [`Hi ${first},`, `${kind === "reminder-hour" ? "Our call starts" : "Your free consultation call is on"} ${kind === "reminder-hour" ? `at ${timeLabel(b.time)} today` : when}.`, how(b), ...(b.topic ? [`Topic: ${b.topic}`] : []), `Add it to your calendar: ${cal}`, `Need another time? Change or cancel here: ${manage}`, `Team ${brand}`];
  const button = kind === "cancelled" ? { label: "Book another time", url: `${origin(req)}/book` } : b.meetLink ? { label: "Join Google Meet", url: b.meetLink } : { label: "Change or cancel", url: manage };
  return b.email ? emailPerson(b.email, subject, title, paras, button) : false;
}

export async function alertTeam(kind: "booked" | "moved" | "cancelled" | "soon", b: Booking, extra = "") {
  const content = await getContent().catch(() => null);
  const head = { booked: "New call booked", moved: "Call moved", cancelled: "Call cancelled", soon: "Call in 1 hour" }[kind];
  const rows: [string, string][] = [["When", `${whenLabel(b)} (India time)`], ["Name", b.name], ["Company", b.company], ["Phone", b.phone], ["Email", b.email], ["Topic", b.topic], ["Notes", b.message], ["Meeting", b.meetLink || `Phone call on ${b.phone}`], ...(extra ? [["Note", extra] as [string, string]] : [])];
  await notifyAdmin(`${head}: ${b.name}, ${whenLabel(b)}`, rows, `${SITE_URL}/admin#bookings`).catch(() => undefined);
  if (content?.leadReplies?.whatsappAlert) {
    const icon = { booked: "📅", moved: "🔁", cancelled: "❌", soon: "⏰" }[kind];
    await sendWhatsAppAlert(`${icon} ${head}\n${b.name}${b.company ? ` (${b.company})` : ""}, ${b.phone}\n${whenLabel(b)}${b.topic ? `\nTopic: ${b.topic}` : ""}${b.meetLink ? `\n${b.meetLink}` : ""}${extra ? `\n${extra}` : ""}`).catch(() => undefined);
  }
}

// Run by the scheduler (every hour): a reminder the day before and one about an hour before.
export async function runBookingReminders() {
  const s = await getBookingSettings();
  if (!s.reminders) return { day: 0, hour: 0 };
  const col = await bookingsCol();
  const now = Date.now();
  const soon = (await col.find({ status: "confirmed", start: { $gt: new Date(now).toISOString(), $lte: new Date(now + 26 * 3600e3).toISOString() } }).limit(200).toArray()).map(toBooking);
  let day = 0;
  let hour = 0;
  for (const b of soon) {
    const left = Date.parse(b.start) - now;
    if (left <= 90 * 60e3 && !b.reminded.hour) {
      const r = await col.updateOne({ _id: bookingOid(b.id)!, "reminded.hour": { $ne: true } }, { $set: { "reminded.hour": true, "reminded.day": true } });
      if (r.modifiedCount) {
        await emailBooking("reminder-hour", b);
        await alertTeam("soon", b);
        hour++;
      }
    } else if (left > 3 * 3600e3 && !b.reminded.day) {
      const r = await col.updateOne({ _id: bookingOid(b.id)!, "reminded.day": { $ne: true } }, { $set: { "reminded.day": true } });
      if (r.modifiedCount) {
        await emailBooking("reminder-day", b);
        day++;
      }
    }
  }
  return { day, hour };
}

export const slotStart = (date: string, time: string, minutes: number) => {
  const start = slotMs(date, time);
  return { start: new Date(start).toISOString(), end: new Date(start + minutes * 60e3).toISOString() };
};
