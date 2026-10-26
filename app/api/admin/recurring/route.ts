import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { billOid, billingCol, toBill } from "@/lib/billing-db";
import { todayIST } from "@/lib/billing";
import { addMonths } from "@/lib/recurring";
import { cleanRecurringInput, recurringCol, toRecurring } from "@/lib/recurring-db";

export async function GET() {
  const deny = await guard("billing", "view");
  if (deny) return deny;
  const docs = await (await recurringCol()).find({}).sort({ active: -1, nextDate: 1 }).limit(500).toArray();
  return NextResponse.json(docs.map(toRecurring));
}

// New monthly bill. { fromInvoice } copies the client and items of an invoice (first new invoice next month, same day).
export async function POST(req: Request) {
  const deny = await guard("billing");
  if (deny) return deny;
  const b = await jsonBody(req);
  const session = await getSession();
  const today = todayIST();
  let base: Record<string, unknown> = { title: "Monthly services", frequency: "monthly", day: Math.min(28, Number(today.slice(8, 10))), dueDays: 7, autoSend: true, active: true, items: [], discount: 0, notes: "", client: {} };
  if (b.fromInvoice) {
    const _id = billOid(String(b.fromInvoice));
    const doc = _id && (await (await billingCol()).findOne({ _id, type: "invoice" }));
    if (!doc) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    const inv = toBill(doc);
    const already = await (await recurringCol()).findOne({ fromInvoiceId: inv.id, active: { $ne: false } });
    if (already) return NextResponse.json({ error: `This invoice already repeats every month ("${String(already.title ?? "")}"). Open Quotes and invoices → Monthly bills to change it.` }, { status: 409 });
    base.fromInvoiceId = inv.id;
    base = { ...base, title: inv.items[0]?.description || "Monthly services", client: inv.client, items: inv.items.map((it) => ({ ...it, description: /\{month\}|\{period\}/.test(it.description) ? it.description : `${it.description} ({period})` })), discount: inv.discount, notes: "", day: Math.min(28, Number(inv.date.slice(8, 10)) || 1) };
  }
  const data = cleanRecurringInput({ ...base, ...b });
  const day = data.day ?? 1;
  const next = data.nextDate || (Number(today.slice(8, 10)) < day && !b.fromInvoice ? `${today.slice(0, 8)}${String(day).padStart(2, "0")}` : addMonths(today, 1, day));
  const now = new Date().toISOString();
  const doc = { ...data, ...(base.fromInvoiceId ? { fromInvoiceId: base.fromInvoiceId } : {}), nextDate: next, endDate: data.endDate ?? "", count: 0, lastInvoiceId: "", lastNumber: "", lastDate: "", createdBy: session?.name ?? "", createdAt: now, updatedAt: now };
  const { insertedId } = await (await recurringCol()).insertOne(doc);
  await logActivity(session, "Invoices", `Set up a monthly bill (${data.title})`, data.client?.company || data.client?.name || "", req);
  return NextResponse.json({ ...toRecurring({ ...doc, _id: insertedId }) }, { status: 201 });
}
