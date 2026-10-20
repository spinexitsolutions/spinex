import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { billOid, billingCol, cleanBillInput, toBill } from "@/lib/billing-db";

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
  const doc = await col.findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  return NextResponse.json(toBill(doc!));
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
  return NextResponse.json({ ok: true });
}
