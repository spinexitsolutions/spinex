import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { clientIp, rateLimited } from "@/lib/antispam";
import { hasDb } from "@/lib/db";
import { billingCol, getProfile, toBill } from "@/lib/billing-db";
import { computeTotals, inr, quoteOpen, todayIST } from "@/lib/billing";
import { leadsCol } from "@/lib/lead-db";
import { notifyAdmin } from "@/lib/notify";
import { sendWhatsAppAlert } from "@/lib/whatsapp-alert";
import { getContent } from "@/lib/content-server";
import { SITE_URL } from "@/lib/site";
import { ObjectId } from "mongodb";

// The client's answer on a quotation link: { action: "accept", name, note, agree } or { action: "changes", name, text }.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!hasDb()) return NextResponse.json({ error: "This is offline right now. Please call or WhatsApp us." }, { status: 503 });
  if (!(req.headers.get("content-type") || "").includes("application/json")) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const token = String(params.token || "");
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`quote-answer:${clientIp(req)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait a while, or call us." }, { status: 429 });

  const col = await billingCol();
  const raw = await col.findOne({ shareToken: token, type: "quote" });
  if (!raw) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const doc = toBill(raw);
  const b = await jsonBody(req);
  const name = String(b.name ?? "").trim().slice(0, 100);
  const today = todayIST();
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const adminUrl = `${origin}/admin/billing/${doc.id}`;
  const who = doc.client.company || doc.client.name || "A client";
  const now = new Date().toISOString();
  if (!name) return NextResponse.json({ error: "Please type your name." }, { status: 400 });
  if (!quoteOpen(doc, today)) {
    return NextResponse.json({ error: doc.acceptance || doc.status === "accepted" ? "This quotation is already accepted." : doc.status === "rejected" ? "This quotation is closed. Please contact us for a new one." : "This quotation has expired. Please ask us for an updated one." }, { status: 409 });
  }
  const content = await getContent().catch(() => null);
  const alertOn = !!content?.leadReplies?.whatsappAlert;

  if (b.action === "accept") {
    if (b.agree !== true) return NextResponse.json({ error: "Please tick the box to confirm." }, { status: 400 });
    // The client must accept the same version they are looking at.
    if (String(b.version ?? "") !== doc.updatedAt) return NextResponse.json({ error: "This quotation was updated after you opened it. Please reload the page and check it again." }, { status: 409 });
    const total = computeTotals(doc, await getProfile()).total;
    const acceptance = { name, note: String(b.note ?? "").trim().slice(0, 1000), at: now, ip: clientIp(req).slice(0, 60), total };
    // Only one answer wins, even if the button is pressed twice or the quote was changed a moment ago.
    const res = await col.updateOne(
      { _id: new ObjectId(doc.id), type: "quote", acceptance: { $in: [null, undefined] }, status: { $nin: ["accepted", "rejected"] }, updatedAt: doc.updatedAt },
      { $set: { acceptance, status: "accepted", updatedAt: now } },
    );
    if (!res.modifiedCount) return NextResponse.json({ error: "This quotation was just updated. Please reload the page and check it again." }, { status: 409 });
    if (doc.leadId && ObjectId.isValid(doc.leadId)) await (await leadsCol()).updateOne({ _id: new ObjectId(doc.leadId), status: { $ne: "lost" } }, { $set: { status: "won", updatedAt: now } }).catch(() => undefined);
    const text = `✅ Quotation accepted\n${who} accepted ${doc.number} for ${inr(total, 0)}.\nBy: ${name}${acceptance.note ? `\nNote: ${acceptance.note}` : ""}\n${adminUrl}`;
    await Promise.all([
      notifyAdmin(`Quotation accepted: ${doc.number} (${who})`, [["Quotation", doc.number], ["Client", who], ["Amount", inr(total, 0)], ["Accepted by", name], ["Note", acceptance.note], ["Time", new Date(now).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })]], adminUrl),
      alertOn ? sendWhatsAppAlert(text).catch(() => undefined) : Promise.resolve(),
    ]);
    await logActivity({ name: `${name} (client)`, uid: "", role: undefined }, "Invoices", `Client accepted quotation ${doc.number} online`, who, req);
    return NextResponse.json({ ok: true, acceptance });
  }

  if (b.action === "changes") {
    const text = String(b.text ?? "").trim().slice(0, 3000);
    if (!text) return NextResponse.json({ error: "Please write what you'd like to change." }, { status: 400 });
    if ((doc.changes ?? []).length >= 30) return NextResponse.json({ error: "Please call or WhatsApp us about further changes." }, { status: 429 });
    const change = { id: Math.random().toString(36).slice(2, 10), name, text, at: now };
    await col.updateOne({ _id: new ObjectId(doc.id) }, { $push: { changes: change } as never });
    const msg = `✏️ Changes requested on ${doc.number}\n${who} (${name}):\n${text}\n${adminUrl}`;
    await Promise.all([
      notifyAdmin(`Changes requested: ${doc.number} (${who})`, [["Quotation", doc.number], ["Client", who], ["From", name], ["Message", text]], adminUrl),
      alertOn ? sendWhatsAppAlert(msg).catch(() => undefined) : Promise.resolve(),
    ]);
    return NextResponse.json({ ok: true, change });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
