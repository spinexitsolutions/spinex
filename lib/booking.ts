// Free consultation call booking: settings, slot rules and labels. Shared by the server, admin screens and the public page.
// All times are India time (Asia/Kolkata, UTC+5:30, no daylight saving).

export type DayHours = { on: boolean; start: string; end: string }; // "10:00" – "18:00"
export type MeetMode = "google" | "link" | "phone";
export type BookingSettings = {
  enabled: boolean;
  title: string;
  intro: string;
  duration: number; // minutes
  buffer: number; // free minutes after each call
  minNoticeHours: number; // earliest booking from now
  daysAhead: number; // how far ahead people can book
  maxPerDay: number; // 0 = no limit
  week: DayHours[]; // index 0 = Sunday … 6 = Saturday
  blocked: string[]; // dates with no calls (holidays, travel)
  meetMode: MeetMode; // google: a new Meet link per call (Google Calendar connected); link: one fixed link; phone: we call them
  meetLink: string;
  topics: string[]; // "What do you want to talk about?" choices; empty = the services on the website
  reminders: boolean;
};

const day = (on: boolean): DayHours => ({ on, start: "10:00", end: "18:00" });
export const defaultBookingSettings: BookingSettings = {
  enabled: false,
  title: "Book a free consultation call",
  intro: "Pick a time that suits you. We'll talk about your idea, answer your questions and suggest the best way forward. No cost, no pressure.",
  duration: 30,
  buffer: 15,
  minNoticeHours: 3,
  daysAhead: 14,
  maxPerDay: 6,
  week: [day(false), day(true), day(true), day(true), day(true), day(true), { on: true, start: "10:00", end: "14:00" }],
  blocked: [],
  meetMode: "google",
  meetLink: "",
  topics: [],
  reminders: true,
};

export type BookingStatus = "confirmed" | "cancelled" | "done" | "noshow";
export const bookingStatusLabel: Record<BookingStatus, string> = { confirmed: "Booked", cancelled: "Cancelled", done: "Call done", noshow: "Didn't join" };

export type Booking = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  topic: string;
  message: string;
  start: string; // ISO (UTC)
  end: string;
  date: string; // India date YYYY-MM-DD
  time: string; // India time HH:MM
  status: BookingStatus;
  token: string;
  meetMode: MeetMode;
  meetLink: string;
  calendarEventId: string;
  leadId: string;
  reminded: { day: boolean; hour: boolean };
  cancelledBy: string; // "client" | team member name
  note: string; // private team note
  createdAt: string;
  updatedAt: string;
};

const IST = 5.5 * 3600 * 1000;
export const istToday = (now = Date.now()) => new Date(now + IST).toISOString().slice(0, 10);
export const istTime = (iso: string) => new Date(Date.parse(iso) + IST).toISOString().slice(11, 16);
export const slotMs = (date: string, time: string) => Date.parse(`${date}T${time}:00+05:30`);
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const weekdayOf = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();

export const timeLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const dateLabel = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
export const whenLabel = (b: Pick<Booking, "date" | "time">) => `${dateLabel(b.date)}, ${timeLabel(b.time)}`;

type Interval = { start: number; end: number };

// Free start times on one day: inside working hours, not too soon, not touching another call (with buffer) or a busy time in Google Calendar.
export function freeSlots(s: BookingSettings, date: string, ctx: { now: number; booked: Interval[]; busy: Interval[] }) {
  const today = istToday(ctx.now);
  if (date < today || date > addDays(today, s.daysAhead) || s.blocked.includes(date)) return [];
  const hours = s.week[weekdayOf(date)];
  if (!hours?.on) return [];
  const sameDay = ctx.booked.filter((b) => istToday(b.start) === date);
  if (s.maxPerDay > 0 && sameDay.length >= s.maxPerDay) return [];
  const step = s.duration + s.buffer;
  const out: string[] = [];
  const earliest = ctx.now + s.minNoticeHours * 3600e3;
  for (let m = toMin(hours.start); m + s.duration <= toMin(hours.end); m += step) {
    const t = toTime(m);
    const start = slotMs(date, t);
    const end = start + s.duration * 60e3;
    if (start < earliest) continue;
    const clash = (x: Interval) => start < x.end + s.buffer * 60e3 && x.start < end + s.buffer * 60e3;
    if (ctx.booked.some(clash) || ctx.busy.some((x) => start < x.end && x.start < end)) continue;
    out.push(t);
  }
  return out;
}

// Link that opens Google Calendar with the call filled in (works for anyone, no login to our site).
export function addToCalendarLink(b: Pick<Booking, "start" | "end" | "meetLink">, title: string, details: string) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${f(b.start)}/${f(b.end)}`, details, location: b.meetLink || "" });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function cleanBookingSettings(b: Record<string, unknown>): BookingSettings {
  const d = defaultBookingSettings;
  const n = (v: unknown, min: number, max: number, def: number) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : def);
  const t = (v: unknown, def: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v ?? "")) ? String(v) : def);
  const week = Array.from({ length: 7 }, (_, i) => {
    const w = (Array.isArray(b.week) ? (b.week as Record<string, unknown>[])[i] : null) ?? d.week[i];
    const start = t(w.start, d.week[i].start);
    let end = t(w.end, d.week[i].end);
    if (toMin(end) <= toMin(start)) end = toTime(Math.min(23 * 60 + 59, toMin(start) + 60));
    return { on: !!w.on, start, end };
  });
  const link = String(b.meetLink ?? "").trim().slice(0, 300);
  return {
    enabled: !!b.enabled,
    title: String(b.title ?? d.title).trim().slice(0, 100) || d.title,
    intro: String(b.intro ?? d.intro).trim().slice(0, 500),
    duration: [15, 20, 30, 45, 60, 90].includes(Number(b.duration)) ? Number(b.duration) : d.duration,
    buffer: n(b.buffer, 0, 120, d.buffer),
    minNoticeHours: n(b.minNoticeHours, 0, 168, d.minNoticeHours),
    daysAhead: n(b.daysAhead, 1, 90, d.daysAhead),
    maxPerDay: n(b.maxPerDay, 0, 50, d.maxPerDay),
    week,
    blocked: Array.from(new Set((Array.isArray(b.blocked) ? b.blocked : []).map(String).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)))).sort().slice(0, 200),
    meetMode: b.meetMode === "link" || b.meetMode === "phone" ? b.meetMode : "google",
    meetLink: /^https:\/\//.test(link) ? link : "",
    topics: (Array.isArray(b.topics) ? b.topics : []).map((x) => String(x).trim().slice(0, 80)).filter(Boolean).slice(0, 20),
    reminders: b.reminders !== false,
  };
}
