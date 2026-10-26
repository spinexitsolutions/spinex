import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Clock, MessageSquareText, Video } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BookingWidget from "@/components/booking/BookingWidget";
import { hasDb } from "@/lib/db";
import { getBookingSettings } from "@/lib/booking-db";
import { defaultBookingSettings } from "@/lib/booking";
import { getContent } from "@/lib/content-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Book a free consultation call",
  description: "Pick a time for a free call with Spinex IT Solutions, Jaipur. Talk about your website, app or online marketing.",
  alternates: { canonical: "/book" },
};

export default async function BookPage() {
  const [s, content] = await Promise.all([hasDb() ? getBookingSettings() : Promise.resolve(defaultBookingSettings), getContent()]);
  const topics = s.topics.length ? s.topics : content.services.map((x) => x.title).filter(Boolean).slice(0, 12);
  return (
    <>
      <PageHeader title={s.title} intro={s.intro} />
      <section className="bg-white py-14 sm:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          {s.enabled ? (
            <BookingWidget topics={topics} duration={s.duration} />
          ) : (
            <div className="rounded-[28px] border border-line bg-mist p-10 text-center">
              <CalendarCheck className="mx-auto text-lav-700" />
              <p className="mt-3 font-display text-xl font-semibold">Online booking is closed right now</p>
              <p className="mt-1 text-muted">Send us your details and we&apos;ll call you to set up a time.</p>
              <Link href="/contact" className="btn-dark mt-5 px-6 py-3 text-sm">Contact us</Link>
            </div>
          )}
          <aside className="space-y-4">
            {[
              [Clock, `${s.duration} minutes, free`, "A relaxed call to understand what you need. No sales pressure."],
              [s.meetMode === "phone" ? MessageSquareText : Video, s.meetMode === "phone" ? "We call you" : "On Google Meet", s.meetMode === "phone" ? "We call you on your phone at the time you pick." : "You get the meeting link by email right away, and a reminder before the call."],
              [CalendarCheck, "Clear next steps", "You leave with a rough plan, timeline and budget range for your project."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Clock;
              return (
                <div key={String(t)} className="flex gap-4 rounded-[24px] border border-line p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lav-100 text-lav-700"><I size={20} /></span>
                  <span><span className="block font-semibold">{String(t)}</span><span className="block text-sm text-muted">{String(d)}</span></span>
                </div>
              );
            })}
            <p className="px-1 text-sm text-muted">Prefer to write? <Link href="/contact" className="font-semibold text-lav-700 hover:underline">Send a message</Link> instead.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
