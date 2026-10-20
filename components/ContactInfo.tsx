"use client";

import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { useContent } from "./ContentProvider";

export default function ContactInfo() {
  const { content } = useContent();
  const c = content.contact;
  const items = [
    { Icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    { Icon: Phone, label: "Phone", value: `+91 ${c.phone}`, href: `tel:+91${c.phone}` },
    { Icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: `https://wa.me/${c.whatsapp}` },
    { Icon: MapPin, label: "Office", value: c.location, href: `https://maps.google.com/?q=${encodeURIComponent(c.location)}` },
  ];
  return (
    <div className="space-y-3">
      {items.map(({ Icon, label, value, href }) => (
        <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="group flex items-center gap-4 rounded-2xl border border-line p-5 transition hover:border-ink">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-lav-300 transition-transform duration-300 group-hover:-rotate-6"><Icon size={20} /></span>
          <span className="min-w-0">
            <span className="block text-sm text-muted">{label}</span>
            <span className="block break-words font-semibold">{value}</span>
          </span>
        </a>
      ))}
      <div className="overflow-hidden rounded-2xl border border-line">
        <iframe title="Office location" src={`https://www.google.com/maps?q=${encodeURIComponent(c.location)}&output=embed`} className="h-56 w-full grayscale" loading="lazy" />
      </div>
    </div>
  );
}
