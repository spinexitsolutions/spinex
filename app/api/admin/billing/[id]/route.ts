import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { billOid, billingCol, cleanBillInput, toBill } from "@/lib/billing-db";
import { financialYear } from "@/lib/billing";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = billOid(params.id);
  const doc = _id && (await (await billingCol()).findOne({ _id }));
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(toBill(doc));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = billOid(params.id);
  const col = await billingCol();
  const current = _id && (await col.findOne({ _id }));
  if (!_id || !current) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const data = cleanBillInput(await jsonBody(req), current.type === "invoice" ? "invoice" : "quote");
  if (data.date === "") delete data.date;
  // An invoice number belongs to one financial year (INV/2026-27/005), so its date has to stay in that year.
  if (current.type === "invoice" && data.date) {
    const fy = String(current.number ?? "").split("/").find((x) => /^\d{4}-\d{2}$/.test(x));
    if (fy && financialYear(data.date) !== fy) {
      return NextResponse.json({ error: `This invoice number is for the ${fy} financial year, so its date must be between 1 April and 31 March of that year.` }, { status: 400 });
    }
  }
  const doc = await col.findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  const b = toBill(doc!);
  const statusNote = data.status && data.status !== current.status ? ` (status → ${data.status})` : "";
  const paidNote = data.paid !== undefined && data.paid !== Number(current.paid ?? 0) ? ` (payment ₹${data.paid})` : "";
  await logActivity(await getSession(), "Invoices", `Edited ${b.type === "quote" ? "quotation" : "invoice"} ${b.number}${statusNote}${paidNote}`, b.client.company || b.client.name, req);
  return NextResponse.json(b);
}

// Quotations can be deleted. Invoices keep their number (GST needs an unbroken series), so they are cancelled instead.
export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = billOid(params.id);
  const col = await billingCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (doc.type === "invoice") return NextResponse.json({ error: "Invoices can't be deleted, so the invoice numbers stay in order. Mark it as Cancelled instead." }, { status: 400 });
  if (doc.invoiceId) return NextResponse.json({ error: "This quotation already has an invoice, so it is kept." }, { status: 400 });
  await col.deleteOne({ _id });
  await logActivity(await getSession(), "Invoices", `Deleted quotation ${doc.number}`, String(doc.client?.company || doc.client?.name || ""), _req);
  return NextResponse.json({ ok: true });
}
