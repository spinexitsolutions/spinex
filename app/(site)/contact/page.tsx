import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ContactForm from "@/components/ContactForm";
import ContactInfo from "@/components/ContactInfo";
import Planner from "@/components/home/Planner";

export const metadata: Metadata = { title: "Contact", description: "Start a project with Spinex IT Solutions, Jaipur." };

export default function ContactPage() {
  return (
    <>
      <PageHeader page="contact" title="Tell us what you're building." intro="Share a few details and we'll get back within a day with next steps and a quote." />
      <section className="bg-white py-20 sm:py-28">
        <div className="container-x grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <ContactForm />
          <ContactInfo />
        </div>
      </section>
      <Planner />
    </>
  );
}
