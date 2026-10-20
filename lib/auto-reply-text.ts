import type { SiteContent } from "./content";

// Pure helpers (no server code) shared by the lead form API and the admin preview.

// "98765 43210", "+91 98765-43210", "098765..." → "919876543210".
export function waNumber(v: string) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return d;
}

// Fills {name}, {service}, {phone}, {email} and {company} in the reply text set in Admin.
export function fillReply(text: string, v: { name: string; service: string; phone: string; email: string; company: string }) {
  return String(text || "")
    .replace(/\{name\}/gi, v.name)
    .replace(/\{service\}/gi, v.service)
    .replace(/\{phone\}/gi, v.phone)
    .replace(/\{email\}/gi, v.email)
    .replace(/\{company\}/gi, v.company);
}

// What the visitor receives, built from Admin → Auto-reply and alerts.
export function buildAutoReply(content: SiteContent, lead: { name?: string; services?: string; phone?: string; email?: string }) {
  const r = content.leadReplies;
  // Names are typed by the visitor: keep them short and on one line so the email can't be used to carry spam.
  const name = String(lead.name || "").replace(/\s+/g, " ").trim().split(" ")[0].slice(0, 40) || "there";
  const service = String(lead.services || "").replace(/\s+/g, " ").trim().slice(0, 120) || "your project";
  const vars = { name, service, phone: String(lead.phone || "").slice(0, 20), email: String(lead.email || "").slice(0, 120), company: content.brand.name };
  const subject = fillReply(r.replySubject, vars).replace(/\s+/g, " ").trim().slice(0, 150) || `Thanks for contacting ${content.brand.name}`;
  const title = fillReply(r.replyTitle, vars).trim().slice(0, 150);
  const paragraphs = fillReply(r.replyBody, vars).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const wa = waNumber(content.contact.whatsapp || "");
  const button = r.replyWhatsappButton && wa ? { label: "Chat with us on WhatsApp", url: `https://wa.me/${wa}` } : undefined;
  return { subject, title, paragraphs, button };
}

