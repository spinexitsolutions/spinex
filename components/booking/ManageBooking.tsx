"use client";

import { useState } from "react";
import { CalendarCheck, CalendarPlus, Loader2, Video, X } from "lucide-react";
import { addToCalendarLink, bookingStatusLabel, dateLabel, timeLabel, type Booking } from "@/lib/booking";
import BookingWidget from "./BookingWidget";

type B = Pick<Booking, "name" | "date" | "time" | "start" | "end" | "status" | "meetLink" | "topic" | "phone">;

export default function ManageBooking({ brand, logo, booking, token, canMove, duration, topics }: { brand: string; logo: string; booking: B; token: string; canMove: boolean; duration: number; topics: string[] }) {
  const [mode, setMode] = useState<"view" | "move" | "cancel">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const upcoming = booking.status === "confirmed" && Date.parse(booking.start) > Date.now();

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/booking/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't cancel.");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        {logo ? <img src={logo} alt="" className="h-10 w-10 object-contain" /> : null}
        <p className="font-display text-lg font-semibold">{brand}</p>
      </div>
      <section className="rounded-[28px] border border-line bg-white p-7 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-lav-700">Free consultation call</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{dateLabel(booking.date)}, {timeLabel(booking.time)}</h1>
        <p className="mt-1 text-muted">India time · {booking.name}{booking.topic ? ` · ${booking.topic}` : ""}</p>
        <p className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${booking.status === "confirmed" ? "bg-emerald-50 text-emerald-800" : "bg-mist text-muted"}`}>{bookingStatusLabel[booking.status]}</p>
        {msg && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p>}
        {upcoming && mode === "view" && (
          <div className="mt-6 flex flex-wrap gap-2">
            {booking.meetLink ? <a href={booking.meetLink} target="_blank" rel="noreferrer" className="btn-dark px-5 py-3 text-sm"><Video size={16} /> Join Google Meet</a> : <p className="w-full rounded-xl bg-mist px-4 py-3 text-sm">We&apos;ll call you on <b>{booking.phone}</b> at this time.</p>}
            <a href={addToCalendarLink(booking, `Call with ${brand}`, booking.meetLink ? `Google Meet: ${booking.meetLink}` : "We'll call you.")} target="_blank" rel="noreferrer" className="btn-ghost px-5 py-3 text-sm"><CalendarPlus size={16} /> Add to Google Calendar</a>
            {canMove && <button onClick={() => setMode("move")} className="btn-ghost px-5 py-3 text-sm"><CalendarCheck size={16} /> Change time</button>}
            <button onClick={() => setMode("cancel")} className="rounded-full px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"><X size={16} className="inline" /> Cancel call</button>
          </div>
        )}
        {mode === "cancel" && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5">
            <p className="font-semibold">Cancel this call?</p>
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={cancel} disabled={busy} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Yes, cancel</button>
              <button onClick={() => setMode("view")} className="btn-ghost bg-white px-5 py-2.5 text-sm">Keep it</button>
            </div>
          </div>
        )}
        {booking.status === "cancelled" && <a href="/book" className="btn-dark mt-6 px-5 py-3 text-sm">Book another time</a>}
      </section>
      {mode === "move" && <BookingWidget topics={topics} duration={duration} moveToken={token} onMoved={(when) => { setMsg(`Moved to ${when}. We've emailed you the new time.`); setMode("view"); setTimeout(() => window.location.reload(), 1500); }} />}
    </div>
  );
}
