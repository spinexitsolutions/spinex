import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { billingCol, getProfile, newToken, nextNumber } from "@/lib/billing-db";
import { addDays, todayIST, type BillDoc } from "@/lib/billing";
import { clientsCol, pOid, toClient } from "@/lib/portal-db";
import { addDaysTo, shortDate, todayIndia, yearEnd, type AmcPlan } from "@/lib/portal";

type Ctx = { params: { id: string } };

// The next year of a plan: it carries on from the old end date, or starts today if it lapsed over a month ago.
function nextTerm(a: AmcPlan) {
  const today = todayIndia();
  const carry = a.endDate ? addDaysTo(a.endDate, 1) : today;
  const start = carry < addDaysTo(today, -30) ? today : carry;
  return { start, end: yearEnd(start) };
}

// { action: "renew", amcId } moves the plan one year ahead. { action: "invoice", amcId } makes the renewal invoice.
export async function POST(req: Request, { params }: Ctx) {
  const b = await jsonBody(req);
  const action = String(b.action ?? "");
  const deny = await guard(action === "invoice" ? "billing" : "clients");
  if (deny) return deny;
  if (action === "invoice") {
    const alsoClients = await guard("clients");
    if (alsoClients) return alsoClients;
  }
  const _id = pOid(params.id);
  const col = await clientsCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const c = toClient(doc);
  const a = c.amcs.find((x) => x.id === String(b.amcId ?? ""));
  if (!a) return NextResponse.json({ error: "Save the AMC plan first, then try again." }, { status: 404 });
  const session = await getSession();
  const term = nextTerm(a);

  if (action === "renew") {
    // Only renews the copy the admin saw, so a double click can't add two years.
    if (String(b.endDate ?? "") !== a.endDate) return NextResponse.json({ error: "This plan was changed or already renewed. Reload the page." }, { status: 409 });
    const now = new Date().toISOString();
    const out = await col.findOneAndUpdate(
      { _id, amcs: { $elemMatch: { id: a.id, endDate: a.endDate } } },
      {
        $set: { "amcs.$[a].startDate": term.start, "amcs.$[a].endDate": term.end, "amcs.$[a].sent": [], updatedAt: now },
        $push: { "amcs.$[a].renewals": { at: now, by: session?.name ?? "", from: term.start, to: term.end } },
      } as never,
      { arrayFilters: [{ "a.id": a.id }], returnDocument: "after" },
    );
    if (!out) return NextResponse.json({ error: "This plan was changed or already renewed. Reload the page." }, { status: 409 });
    await logActivity(session, "Client portal", `Renewed ${a.title} till ${shortDate(term.end)}`, c.company || c.name, req);
    return NextResponse.json({ client: toClient(out) });
  }

  if (action === "invoice") {
    const bills = await billingCol();
    const tag = `${c.id}:${a.id}:${a.endDate}`;
    await bills.createIndex({ amcRenewal: 1 }, { unique: true, partialFilterExpression: { amcRenewal: { $type: "string" } } }).catch(() => undefined);
    const existing = await bills.findOne({ amcRenewal: tag });
    if (existing) return NextResponse.json({ error: "A renewal invoice for this term already exists.", id: String(existing._id) }, { status: 409 });
    const profile = await getProfile();
    const date = todayIST();
    const stamp = new Date().toISOString();
    const inv: Omit<BillDoc, "id"> & { amcRenewal: string } = {
      type: "invoice",
      number: await nextNumber("invoice", date, profile),
      date,
      dueDate: a.endDate && a.endDate > date ? a.endDate : addDays(date, profile.invoiceDueDays),
      status: "unpaid",
      client: { name: c.name, company: c.company, phone: c.phone, email: c.email, address: "", state: "", gstin: "" },
      items: [{ id: Math.random().toString(36).slice(2, 10), description: `${a.title} renewal (${shortDate(term.start)} to ${shortDate(term.end)})`, sac: profile.defaultSac, qty: 1, rate: a.amount, gst: profile.defaultGst }],
      discount: 0,
      notes: a.covers ? `Includes: ${a.covers.split("\n").map((x) => x.trim()).filter(Boolean).join(", ")}` : "",
      terms: profile.invoiceTerms,
      paid: 0,
      leadId: "",
      fromQuote: "",
      fromQuoteNumber: "",
      invoiceId: "",
      shareToken: newToken(),
      signers: null,
      createdBy: session?.name ?? "",
      createdAt: stamp,
      updatedAt: stamp,
      amcRenewal: tag,
    };
    let insertedId;
    try {
      ({ insertedId } = await bills.insertOne(inv));
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return NextResponse.json({ error: "A renewal invoice for this term already exists." }, { status: 409 });
      throw e;
    }
    // The client sees it in their portal straight away, and can pay it online.
    await col.updateOne({ _id }, { $addToSet: { billingIds: String(insertedId) } });
    await logActivity(session, "Invoices", `Made AMC renewal invoice ${inv.number}`, c.company || c.name, req);
    return NextResponse.json({ id: String(insertedId), number: inv.number }, { status: 201 });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
