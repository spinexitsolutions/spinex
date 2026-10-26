import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { addMonths, stepMonths } from "@/lib/recurring";
import { cleanRecurringInput, makeRecurringInvoice, recOid, recurringCol, toRecurring } from "@/lib/recurring-db";
import { todayIST } from "@/lib/billing";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("billing");
  if (deny) return deny;
  const _id = recOid(params.id);
  const col = await recurringCol();
  if (!_id || !(await col.findOne({ _id }))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const data = cleanRecurringInput(await jsonBody(req));
  const doc = await col.findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  return NextResponse.json(toRecurring(doc!));
}

export async function DELETE(req: Request, { params }: Ctx) {
  const deny = await guard("billing");
  if (deny) return deny;
  const _id = recOid(params.id);
  const col = await recurringCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await col.deleteOne({ _id });
  await logActivity(await getSession(), "Invoices", "Deleted a monthly bill (invoices made stay)", String(doc.title ?? ""), req);
  return NextResponse.json({ ok: true });
}

// { action: "now" } makes the next period's invoice today (and moves on to the period after).
export async function POST(req: Request, { params }: Ctx) {
  const deny = await guard("billing");
  if (deny) return deny;
  const _id = recOid(params.id);
  const col = await recurringCol();
  const raw = _id && (await col.findOne({ _id }));
  if (!_id || !raw) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { action } = await jsonBody(req);
  if (action !== "now") return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const r = toRecurring(raw);
  if (!r.client.name && !r.client.company) return NextResponse.json({ error: "Add the client first." }, { status: 400 });
  if (!r.items.length) return NextResponse.json({ error: "Add at least one item." }, { status: 400 });
  const period = r.nextDate || todayIST();
  const claim = await col.updateOne({ _id, nextDate: r.nextDate }, { $set: { nextDate: addMonths(period, stepMonths[r.frequency], r.day), updatedAt: new Date().toISOString() } });
  if (!claim.modifiedCount) return NextResponse.json({ error: "This bill just changed. Reload the page." }, { status: 409 });
  const session = await getSession();
  const out = await makeRecurringInvoice(r, period, session?.name ?? "");
  if (!out.made) return NextResponse.json({ error: `Not made: ${out.reason}.` }, { status: 409 });
  await col.updateOne({ _id }, { $inc: { count: 1 }, $set: { lastInvoiceId: out.id, lastNumber: out.number, lastDate: todayIST() } });
  await logActivity(session, "Invoices", `Made invoice ${out.number} from a monthly bill`, r.client.company || r.client.name, req);
  return NextResponse.json({ ...out, recurring: toRecurring((await col.findOne({ _id }))!) });
}
