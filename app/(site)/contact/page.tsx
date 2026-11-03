import type { Metadata } from "next";
import { PageJsonLd } from "@/components/JsonLd";
import PageHeader from "@/components/PageHeader";
import ContactForm from "@/components/ContactForm";
import ContactInfo from "@/components/ContactInfo";
import Planner from "@/components/home/Planner";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { hasDb } from "@/lib/db";
import { getBookingSettings } from "@/lib/booking-db";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Spinex IT Solutions in Jaipur for a website, online store, app or digital marketing. Call, WhatsApp, email or book a free call; we reply within a day.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact Us | Spinex IT Solutions", description: "Contact Spinex IT Solutions in Jaipur for a website, online store, app or digital marketing. Call, WhatsApp, email or book a free call; we reply within a day.", url: "/contact", type: "website", images: ["/og-image.jpg"] },
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const booking = hasDb() ? await getBookingSettings().catch(() => null) : null;
  return (
    <>
      <PageJsonLd type="ContactPage" name={"Contact Spinex IT Solutions"} path="/contact" description={"Contact Spinex IT Solutions in Jaipur for a website, online store, app or digital marketing. Call, WhatsApp, email or book a free call; we reply within a day."} />
      <PageHeader page="contact" title="Tell us what you're building." intro="Share a few details and we'll get back within a day with next steps and a quote." />
      <section className="bg-white py-20 sm:py-28">
        {booking?.enabled && (
          <div className="container-x mb-10">
            <Link href="/book" className="group flex flex-wrap items-center gap-4 rounded-[24px] bg-ink px-6 py-5 text-white transition hover:bg-ink/90">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><CalendarCheck size={22} /></span>
              <span className="min-w-0 flex-1"><span className="block font-display text-lg font-semibold">{`Prefer to talk? Book a free ${booking.duration}-minute call`}</span><span className="block text-sm text-white/65">Pick a time that suits you{booking.meetMode === "phone" ? ". We call you." : " and get a Google Meet link right away."}</span></span>
              <span className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink">Choose a time</span>
            </Link>
          </div>
        )}
        <div className="container-x grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <ContactForm />
          <ContactInfo />
        </div>
      </section>
      <Planner />
    </>
  );
}
