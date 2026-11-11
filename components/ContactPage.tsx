"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarCheck, Clock, Mail, MapPin, Phone } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import ContactForm from "./ContactForm";
import { useContent } from "./ContentProvider";
import { SplitHeading, ease } from "./Reveal";

type Booking = { duration: number; meetMode: string } | null;

// Contact page: a dark box like the home page contact section, with the enquiry form on the right.
export function ContactMain({ booking }: { booking: Booking }) {
  const { content } = useContent();
  const c = content.contact;
  const p = content.contactPage;
  const tiles = [
    { Icon: WhatsAppIcon, label: "WhatsApp", value: "Chat with us now", href: `https://wa.me/${c.whatsapp}`, tone: "bg-[#25D366] text-white" },
    { Icon: Phone, label: "Call us", value: `+91 ${c.phone}`, href: `tel:+91${c.phone}`, tone: "bg-lav-600 text-white" },
    booking
      ? { Icon: CalendarCheck, label: `Free ${booking.duration}-minute call`, value: "Pick a time that suits you", href: "/book", tone: "bg-[#f0abfc] text-[#3b0a45]" }
      : { Icon: MapPin, label: "Visit", value: c.location, href: `https://maps.google.com/?q=${encodeURIComponent(c.location)}`, tone: "bg-white/10 text-white" },
  ];

  return (
    <section className="bg-white px-3 py-3 sm:px-5 sm:py-5">
      <div className="relative overflow-hidden rounded-[32px] bg-ink px-5 py-16 text-white sm:px-10 sm:py-24 grain">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-lav-600/30 blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-[1180px] gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="flex flex-col">
            {p.eyebrow && <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-lav-300">{p.eyebrow}</p>}
            <SplitHeading key={p.heading} text={p.heading} className="h-display mt-4 text-4xl sm:text-6xl" />
            {p.intro && <p className="mt-5 max-w-md text-lg text-white/65">{p.intro}</p>}
            <a href={`mailto:${c.email}`} className="group mt-8 inline-flex max-w-full items-center gap-3 self-start border-b-2 border-white/25 pb-1.5 font-display text-xl font-medium transition-colors hover:border-lav-300 sm:text-2xl [overflow-wrap:anywhere]">
              {c.email}
              <ArrowUpRight size={20} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>

            {p.steps.length > 0 && (
              <ol className="mt-9 border-t border-white/10">
                {p.steps.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3.5 border-b border-white/10 py-3.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[13px] font-bold">{i + 1}</span>
                    <span className="font-semibold">{s.title}</span>
                    {s.note && <span className="ml-auto text-right text-sm text-white/55">{s.note}</span>}
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-auto grid gap-3 pt-9">
              {tiles.map(({ Icon, label, value, href, tone }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.6, ease }}
                  className="group flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/[0.05] p-4 transition-colors hover:border-white/25 hover:bg-white/10"
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[14px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 ${tone}`}>
                    <Icon size={label === "WhatsApp" ? 24 : 19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-white/55">{label}</span>
                    <span className="block font-medium leading-snug [overflow-wrap:break-word]">{value}</span>
                  </span>
                  <ArrowUpRight size={18} className="shrink-0 text-white/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                </motion.a>
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease }}>
            <ContactForm className="h-full border-0 sm:p-8" tall />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Office hours, email and the map, under the dark box.
export function ContactCards() {
  const { content } = useContent();
  const c = content.contact;
  const p = content.contactPage;
  return (
    <section className="bg-white pb-20 pt-12 sm:pb-24 sm:pt-16">
      <div className={`container-x grid gap-4 sm:grid-cols-2 ${p.showMap ? "lg:grid-cols-[1fr_1fr_1.6fr]" : ""}`}>
        {(p.hours || p.hoursNote) && (
          <div className="rounded-[24px] border border-line p-6">
            <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-lav-100 text-lav-600"><Clock size={20} /></span>
            <p className="mt-4 text-[17px] font-semibold">Office hours</p>
            <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{p.hours}{p.hoursNote && <><br />{p.hoursNote}</>}</p>
          </div>
        )}
        <a href={`mailto:${c.email}`} className="group rounded-[24px] border border-line p-6 transition hover:border-ink">
          <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-lav-100 text-lav-600"><Mail size={20} /></span>
          <p className="mt-4 text-[17px] font-semibold">Prefer email?</p>
          <p className="mt-1 text-[14.5px] leading-relaxed text-muted [overflow-wrap:anywhere]">{c.email}{p.emailNote && <><br />{p.emailNote}</>}</p>
        </a>
        {p.showMap && (
          <div className="min-h-[220px] overflow-hidden rounded-[24px] border border-line sm:col-span-2 lg:col-span-1">
            <iframe title="Office location" src={`https://www.google.com/maps?q=${encodeURIComponent(c.location)}&output=embed`} className="h-full min-h-[220px] w-full grayscale" loading="lazy" />
          </div>
        )}
      </div>
    </section>
  );
}

// Common questions at the end of the contact page.
export function ContactFaq() {
  const { content } = useContent();
  const p = content.contactPage;
  if (!p.faqs.length) return null;
  return (
    <section className="border-t border-line bg-white py-20 sm:py-24">
      <div className="container-x">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-lav-700">Questions</p>
        <SplitHeading text={p.faqTitle || "Before you reach out."} className="h-display mt-3 text-4xl sm:text-6xl" />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {p.faqs.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, ease }} className="rounded-[22px] border border-line bg-mist p-6">
              <h3 className="text-[17px] font-semibold">{f.q}</h3>
              <p className="mt-2 leading-relaxed text-muted">{f.a}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-muted">Still have a question? <Link href={`https://wa.me/${content.contact.whatsapp}`} target="_blank" className="font-semibold text-ink underline underline-offset-4 hover:text-lav-700">Ask us on WhatsApp</Link></p>
      </div>
    </section>
  );
}
