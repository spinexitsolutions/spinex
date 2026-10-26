// Server only. Feedback requests and answers ("feedback"), and adding approved ones to Testimonials.
import { randomBytes } from "crypto";
import { ObjectId, type Document, type WithId } from "mongodb";
import { revalidateTag } from "next/cache";
import { getDb } from "./db";
import { emailPerson, notifyAdmin } from "./notify";
import { sendWhatsAppAlert } from "./whatsapp-alert";
import { getContent, readContentDoc, saveContent } from "./content-server";
import { SITE_URL } from "./site";
import { cleanFeedbackSettings, defaultFeedbackSettings, type Feedback, type FeedbackSettings } from "./feedback";

export const fbOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export async function getFeedbackSettings(): Promise<FeedbackSettings> {
  const doc = await (await getDb()).collection<{ _id: string; value?: Record<string, unknown> }>("settings").findOne({ _id: "feedback" });
  return cleanFeedbackSettings({ ...defaultFeedbackSettings, ...(doc?.value ?? {}) });
}
export async function saveFeedbackSettings(s: FeedbackSettings) {
  await (await getDb()).collection<{ _id: string }>("settings").updateOne({ _id: "feedback" }, { $set: { value: s, updatedAt: new Date().toISOString() } }, { upsert: true });
}

let ready = false;
export async function feedbackCol() {
  const col = (await getDb()).collection("feedback");
  if (!ready) {
    await col.createIndex({ token: 1 }, { unique: true }).catch(() => undefined);
    await col.createIndex({ status: 1, sendAt: 1 }).catch(() => undefined);
    ready = true;
  }
  return col;
}

export function toFeedback(doc: WithId<Document>): Feedback {
  const r = doc as WithId<Document> & Partial<Feedback>;
  return {
    id: String(doc._id), name: r.name ?? "", email: r.email ?? "", phone: r.phone ?? "", project: r.project ?? "", clientId: r.clientId ?? "",
    source: r.source === "project" || r.source === "lead" ? r.source : "manual", token: r.token ?? "",
    status: (["scheduled", "sent", "answered", "cancelled", "failed"].includes(String(r.status)) ? r.status : "scheduled") as Feedback["status"],
    sendAt: r.sendAt ?? "", sentAt: r.sentAt ?? "", reminded: !!r.reminded, error: r.error ?? "", by: r.by ?? "", createdAt: r.createdAt ?? "",
    response: r.response ?? null, approval: r.approval === "approved" || r.approval === "hidden" ? r.approval : "pending",
    testimonialId: r.testimonialId ?? "", quote: r.quote ?? "",
  };
}

// One feedback request per project (and per email for 6 months), so nobody gets asked twice.
export async function queueFeedback(p: { name: string; email: string; phone?: string; project?: string; clientId?: string; source: Feedback["source"]; by?: string; now?: boolean }) {
  const email = p.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { queued: false, reason: "no email" };
  const s = await getFeedbackSettings();
  const col = await feedbackCol();
  if (!p.now && (await col.findOne({ email, status: { $ne: "cancelled" }, createdAt: { $gte: new Date(Date.now() - 180 * 864e5).toISOString() } }))) return { queued: false, reason: "already asked in the last 6 months" };
  const now = new Date();
  const doc = { name: p.name.trim().slice(0, 120), email, phone: (p.phone ?? "").slice(0, 20), project: (p.project ?? "").slice(0, 140), clientId: p.clientId ?? "", source: p.source, token: randomBytes(15).toString("base64url"), status: "scheduled", sendAt: new Date(now.getTime() + (p.now ? 0 : s.delayDays * 864e5)).toISOString(), sentAt: "", reminded: false, error: "", by: p.by ?? "", createdAt: now.toISOString(), response: null, approval: "pending", testimonialId: "", quote: "" };
  const { insertedId } = await col.insertOne(doc);
  if (p.now) await sendFeedbackRequest(toFeedback({ ...doc, _id: insertedId } as WithId<Document>), false);
  return { queued: true, id: String(insertedId) };
}

export async function sendFeedbackRequest(f: Feedback, reminder: boolean) {
  const s = await getFeedbackSettings();
  const brand = (await getContent().catch(() => null))?.brand.name || "Spinex IT Solutions";
  const fill = (t: string) => t.replace(/\{name\}/g, f.name.split(" ")[0] || "there").replace(/\{project\}/g, f.project || "your project").replace(/\{brand\}/g, brand);
  const ok = await emailPerson(f.email, reminder ? `Reminder: ${fill(s.subject)}` : fill(s.subject), "How did we do?", [`Hi ${f.name.split(" ")[0] || "there"},`, ...fill(s.message).split(/\n{2,}/), ...(reminder ? ["(Just a gentle reminder. Thank you!)"] : []), `Team ${brand}`], { label: "★ Rate our work", url: `${SITE_URL}/f/${f.token}` });
  const col = await feedbackCol();
  if (reminder) await col.updateOne({ _id: fbOid(f.id)! }, { $set: { reminded: true } });
  else await col.updateOne({ _id: fbOid(f.id)!, status: { $in: ["scheduled", "failed"] } }, ok ? { $set: { status: "sent", sentAt: new Date().toISOString(), error: "" } } : { $set: { status: "failed", error: "Email couldn't be sent. Check API keys → Email alerts." } });
  return ok;
}

// Scheduler: send due requests, and one reminder to people who haven't answered.
export async function runFeedbackRequests() {
  const s = await getFeedbackSettings();
  const col = await feedbackCol();
  let sent = 0;
  let reminders = 0;
  for (const d of await col.find({ status: "scheduled", sendAt: { $lte: new Date().toISOString() } }).limit(50).toArray()) if (await sendFeedbackRequest(toFeedback(d), false)) sent++;
  if (s.reminderDays > 0) {
    for (const d of await col.find({ status: "sent", reminded: false, sentAt: { $lte: new Date(Date.now() - s.reminderDays * 864e5).toISOString() } }).limit(50).toArray()) {
      const claim = await col.updateOne({ _id: d._id, reminded: false }, { $set: { reminded: true } });
      if (claim.modifiedCount && (await sendFeedbackRequest(toFeedback(d), true))) reminders++;
    }
  }
  return { sent, reminders };
}

// The client's answer. Low ratings reach the team at once (email and WhatsApp) so they can call the client.
export async function saveAnswer(token: string, a: Feedback["response"]) {
  const col = await feedbackCol();
  const doc = await col.findOneAndUpdate({ token, status: { $in: ["sent", "scheduled", "failed"] } }, { $set: { response: a, status: "answered", quote: a!.liked } }, { returnDocument: "after" });
  if (!doc) return null;
  const f = toFeedback(doc);
  const r = a!;
  const low = r.rating <= 3;
  await notifyAdmin(`${low ? "⚠️ Low rating" : "New feedback"}: ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} from ${f.name}`, [["Client", `${f.name}${r.company ? `, ${r.company}` : ""}`], ["Project", f.project], ["Rating", `${r.rating} / 5`], ["What they liked", r.liked], ["What could be better (private)", r.better], ["OK to show on website", r.publish ? "Yes" : "No"], ["Next step", low ? "Call them today and fix it." : r.publish && r.liked ? "Approve it in Admin → Client feedback to add it to Testimonials." : ""]], `${SITE_URL}/admin#feedback`).catch(() => undefined);
  if (low) {
    const content = await getContent().catch(() => null);
    if (content?.leadReplies?.whatsappAlert) await sendWhatsAppAlert(`⚠️ Low rating ${r.rating}/5 from ${f.name}${f.project ? ` (${f.project})` : ""}\n${r.better || r.liked}\n${SITE_URL}/admin#feedback`).catch(() => undefined);
  }
  return f;
}

// Approve → added to Website content → Testimonials (shown on the home page). Saved as a new content version.
export async function publishTestimonial(f: Feedback, quote: string, by: string) {
  const r = f.response!;
  const { content, updatedAt } = await readContentDoc();
  const id = `fb-${f.id.slice(-8)}`;
  const t = { id, name: r.displayName || f.name, role: [r.role, r.company].filter(Boolean).join(", "), quote: quote.trim().slice(0, 600), rating: String(r.rating) };
  const list = content.testimonials.filter((x) => x.id !== id);
  await saveContent({ ...content, testimonials: [t, ...list] }, `Testimonial from client feedback (${t.name}) by ${by}`, updatedAt);
  revalidateTag("content");
  return id;
}
export async function unpublishTestimonial(id: string, by: string) {
  const { content, updatedAt } = await readContentDoc();
  if (!content.testimonials.some((x) => x.id === id)) return;
  await saveContent({ ...content, testimonials: content.testimonials.filter((x) => x.id !== id) }, `Removed testimonial from client feedback by ${by}`, updatedAt);
  revalidateTag("content");
}
