import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { billOid, billingCol, toBill } from "@/lib/billing-db";
import { todayIST } from "@/lib/billing";
import { getReminderSettings, sendReminder } from "@/lib/payment-reminders";

// { action: "send" } sends a payment reminder now; "pause" / "resume" switches automatic reminders for this invoice.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("billing");
  if (deny) return deny;
  const _id = billOid(params.id);
  const col = await billingCol();
  const doc = _id && (await col.findOne({ _id, type: "invoice" }));
  if (!_id || !doc) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const d = toBill(doc);
  const { action } = await jsonBody(req);
  const session = await getSession();
  if (action === "pause" || action === "resume") {
    await col.updateOne({ _id }, { $set: { noReminders: action === "pause" } });
    return NextResponse.json({ ok: true, noReminders: action === "pause" });
  }
  if (action !== "send") return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (d.status === "cancelled" || d.status === "paid") return NextResponse.json({ error: "This invoice isn't waiting for payment." }, { status: 400 });
  const late = d.dueDate ? Math.round((Date.parse(`${todayIST()}T00:00:00Z`) - Date.parse(`${d.dueDate}T00:00:00Z`)) / 864e5) : 0;
  const settings = await getReminderSettings();
  // Sent by hand: email and WhatsApp are tried even if they are off for the automatic ones.
  const r = await sendReminder(d, { ...settings, email: true, whatsapp: true }, { step: late, late, manual: true, by: session?.name ?? "" });
  if (!r.email && !r.whatsapp) return NextResponse.json({ error: r.error }, { status: 502 });
  await logActivity(session, "Invoices", `Sent a payment reminder for ${d.number}`, d.client.company || d.client.name, req);
  const after = toBill((await col.findOne({ _id }))!);
  return NextResponse.json({ ok: true, email: r.email, whatsapp: r.whatsapp, payReminders: after.payReminders ?? [] });
}
