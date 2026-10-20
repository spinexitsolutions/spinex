import type { SiteContent } from "./content";
import { emailPerson } from "./notify";
import { buildAutoReply } from "./auto-reply-text";

// Thank-you email to the visitor after an enquiry (text from Admin → Auto-reply and alerts).
export async function sendAutoReply(content: SiteContent, lead: { name?: string; services?: string; phone?: string; email?: string }) {
  if (!content.leadReplies?.autoReply || !lead.email) return false;
  const m = buildAutoReply(content, lead);
  return emailPerson(lead.email, m.subject, m.title, m.paragraphs, m.button);
}
