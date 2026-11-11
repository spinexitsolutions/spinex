import type { Metadata } from "next";
import { PageJsonLd } from "@/components/JsonLd";
import PageHeader from "@/components/PageHeader";
import { ContactMain, ContactCards, ContactFaq } from "@/components/ContactPage";
import Planner from "@/components/home/Planner";
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
      <ContactMain booking={booking?.enabled ? { duration: booking.duration, meetMode: booking.meetMode } : null} />
      <ContactCards />
      <Planner />
      <ContactFaq />
    </>
  );
}
