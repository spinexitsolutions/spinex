import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { billOid, billingCol, cleanBillInput, toBill } from "@/lib/billing-db";
import { financialYear } from "@/lib/billing";
import { getDb } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const deny = await guard("billing", "view");
  if (deny) return deny;
  const _id = billOid(params.id);
  const doc = _id && (await (await billingCol()).findOne({ _id }));
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(toBill(doc));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("billing");
  if (deny) return deny;
  const _id = billOid(params.id);
  const col = await billingCol();
  const current = _id && (await col.findOne({ _id }));
  if (!_id || !current) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const data = cleanBillInput(await jsonBody(req), current.type === "invoice" ? "invoice" : "quote");
  // A quotation the client accepted online is locked: only its status and signatures can change.
  if (current.type === "quote" && current.acceptance) {
    for (const k of Object.keys(data)) if (k !== "status" && k !== "signers") delete (data as Record<string, unknown>)[k];
  }
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

// Quotations and invoices can be deleted (not a quotation that already became an invoice).
// Deleting the newest invoice of a year gives its number back, so the next invoice reuses it and the series has no gap.
export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("billing");
  if (deny) return deny;
  const _id = billOid(params.id);
  const col = await billingCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const who = String(doc.client?.company || doc.client?.name || "");

  if (doc.type === "quote") {
    if (doc.invoiceId) return NextResponse.json({ error: "This quotation already has an invoice. Delete the invoice first if it was a mistake." }, { status: 400 });
    await col.deleteOne({ _id });
    await logActivity(await getSession(), "Invoices", `Deleted quotation ${doc.number}`, who, _req);
    return NextResponse.json({ ok: true });
  }

  if (Number(doc.paid ?? 0) > 0) {
    return NextResponse.json({ error: "A payment is recorded on this invoice. Set \"Payment received\" to 0 and save first, or mark it as Cancelled instead." }, { status: 400 });
  }
  const parts = String(doc.number ?? "").split("/");
  const fy = parts.find((x) => /^\d{4}-\d{2}$/.test(x));
  const seq = Number(parts[parts.length - 1]);
  await col.deleteOne({ _id });
  // Give the number back only if no newer invoice took the next one meanwhile.
  let reused = false;
  if (fy && Number.isInteger(seq) && seq > 0) {
    const r = await (await getDb()).collection<{ _id: string; seq: number }>("counters").updateOne({ _id: `invoice:${fy}`, seq }, { $inc: { seq: -1 } });
    reused = r.modifiedCount === 1;
  }
  // The quotation it came from can be turned into an invoice again.
  await col.updateOne({ type: "quote", invoiceId: String(_id) }, { $set: { invoiceId: "", updatedAt: new Date().toISOString() } });
  await logActivity(await getSession(), "Invoices", `Deleted invoice ${doc.number}${reused ? " (number will be reused)" : " (gap left in numbering)"}`, who, _req);
  return NextResponse.json({ ok: true, reused });
}
