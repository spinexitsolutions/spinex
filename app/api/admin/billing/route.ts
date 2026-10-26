import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { billOid, billingCol, getProfile, newToken, nextNumber, toBill, sellerNow } from "@/lib/billing-db";
import { addDays, todayIST, type BillDoc, type BillItem } from "@/lib/billing";
import { leadsCol } from "@/lib/lead-db";

// List quotations and invoices (newest first). ?leadId= shows only one lead's documents.
export async function GET(req: Request) {
  const deny = await guard("billing", "view");
  if (deny) return deny;
  const leadId = new URL(req.url).searchParams.get("leadId");
  const docs = await (await billingCol()).find(leadId ? { leadId } : {}).sort({ createdAt: -1 }).limit(2000).toArray();
  return NextResponse.json(docs.map(toBill));
}

// New quotation or invoice: blank, from a lead ({ type, leadId }) or from a quotation ({ fromQuote }).
export async function POST(req: Request) {
  const deny = await guard("billing");
  if (deny) return deny;
  const session = await getSession();
  const b = await jsonBody(req);
  const profile = await getProfile();
  const col = await billingCol();
  const date = todayIST();
  const stamp = new Date().toISOString();
  const itemId = () => Math.random().toString(36).slice(2, 10);

  // Quotation → invoice
  if (b.fromQuote) {
    const qid = billOid(String(b.fromQuote));
    const quote = qid && (await col.findOne({ _id: qid, type: "quote" }));
    if (!quote) return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    const q = toBill(quote);
    if (q.invoiceId) return NextResponse.json({ error: "This quotation already has an invoice.", id: q.invoiceId === "pending" ? undefined : q.invoiceId }, { status: 409 });
    // Claim the quotation first, so a double click (or two people) can't make two invoices from it.
    const claimed = await col.findOneAndUpdate({ _id: qid, type: "quote", invoiceId: { $in: ["", null] } }, { $set: { invoiceId: "pending" } });
    if (!claimed) return NextResponse.json({ error: "An invoice is already being made from this quotation. Refresh in a moment." }, { status: 409 });
    const doc: Omit<BillDoc, "id"> = {
      type: "invoice",
      number: await nextNumber("invoice", date, profile),
      date,
      dueDate: addDays(date, profile.invoiceDueDays),
      status: "unpaid",
      client: q.client,
      items: q.items,
      discount: q.discount,
      notes: q.notes,
      terms: profile.invoiceTerms,
      paid: 0,
      leadId: q.leadId,
      fromQuote: q.id,
      fromQuoteNumber: q.number,
      invoiceId: "",
      shareToken: newToken(),
      signers: q.signers ?? null,
      createdBy: session?.name ?? "",
      createdAt: stamp,
      updatedAt: stamp,
      seller: await sellerNow(),
    };
    let insertedId;
    try {
      ({ insertedId } = await col.insertOne(doc));
    } catch (e) {
      await col.updateOne({ _id: qid, invoiceId: "pending" }, { $set: { invoiceId: "" } }); // let them try again
      throw e;
    }
    await col.updateOne({ _id: qid }, { $set: { invoiceId: String(insertedId), status: "accepted", updatedAt: stamp } });
    await logActivity(session, "Invoices", `Made invoice ${doc.number} from quotation ${q.number}`, q.client.company || q.client.name, req);
    if (q.leadId) {
      const lid = billOid(q.leadId);
      if (lid) await (await leadsCol()).updateOne({ _id: lid, status: { $ne: "lost" } }, { $set: { status: "won", updatedAt: stamp } });
    }
    return NextResponse.json({ ...doc, id: String(insertedId) }, { status: 201 });
  }

  const type = b.type === "invoice" ? "invoice" : "quote";
  let client = { name: "", company: "", phone: "", email: "", address: "", state: "", gstin: "" };
  let items: BillItem[] = [{ id: itemId(), description: "", sac: profile.defaultSac, qty: 1, rate: 0, gst: profile.defaultGst }];
  let leadId = "";
  if (b.leadId) {
    const lid = billOid(String(b.leadId));
    const lead = lid && (await (await leadsCol()).findOne({ _id: lid }));
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    leadId = String(lead._id);
    client = { ...client, name: String(lead.name ?? ""), phone: String(lead.phone ?? ""), email: String(lead.email ?? "") };
    const services = String(lead.services ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const value = Number(lead.value) || 0;
    items = (services.length ? services : [""]).map((d, i) => ({ id: itemId(), description: d, sac: profile.defaultSac, qty: 1, rate: i === 0 ? value : 0, gst: profile.defaultGst }));
    if (type === "quote") await (await leadsCol()).updateOne({ _id: lid, status: { $in: ["new", "contacted"] } }, { $set: { status: "quote", updatedAt: stamp } });
  }

  const doc: Omit<BillDoc, "id"> = {
    type,
    number: await nextNumber(type, date, profile),
    date,
    dueDate: addDays(date, type === "quote" ? profile.quoteValidDays : profile.invoiceDueDays),
    status: type === "quote" ? "draft" : "unpaid",
    client,
    items,
    discount: 0,
    notes: "",
    terms: type === "quote" ? profile.quoteTerms : profile.invoiceTerms,
    paid: 0,
    leadId,
    fromQuote: "",
    fromQuoteNumber: "",
    invoiceId: "",
    shareToken: newToken(),
    signers: null,
    createdBy: session?.name ?? "",
    createdAt: stamp,
    updatedAt: stamp,
    seller: await sellerNow(),
  };
  const { insertedId } = await col.insertOne(doc);
  await logActivity(session, "Invoices", `Created ${type === "quote" ? "quotation" : "invoice"} ${doc.number}`, client.company || client.name, req);
  return NextResponse.json({ ...doc, id: String(insertedId) }, { status: 201 });
}
