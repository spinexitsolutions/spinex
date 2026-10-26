import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDb } from "@/lib/db";
import { bookingsCol, getBookingSettings, toBooking } from "@/lib/booking-db";
import { getContent } from "@/lib/content-server";
import ManageBooking from "@/components/booking/ManageBooking";
import { dateLabel, timeLabel } from "@/lib/booking";

// The client's own link to their call: see it, join, move or cancel. /b/<secret token>
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your call", robots: { index: false, follow: false } };

export default async function BookingLinkPage({ params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const doc = await (await bookingsCol()).findOne({ token });
  if (!doc) notFound();
  const b = toBooking(doc);
  const [s, content] = await Promise.all([getBookingSettings(), getContent()]);
  const topics = s.topics.length ? s.topics : content.services.map((x) => x.title).filter(Boolean).slice(0, 12);
  return (
    <main className="min-h-screen bg-mist px-4 py-10 sm:py-16">
      <ManageBooking brand={content.brand.name} logo={content.brand.logo} booking={{ name: b.name, date: b.date, time: b.time, start: b.start, end: b.end, status: b.status, meetLink: b.meetLink, topic: b.topic, phone: b.phone }} token={token} canMove={s.enabled} duration={s.duration} topics={topics} whenText={`${dateLabel(b.date)}, ${timeLabel(b.time)}`} upcoming={b.status === "confirmed" && Date.parse(b.start) > Date.now()} />
    </main>
  );
}
