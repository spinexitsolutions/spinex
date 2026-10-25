import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { billingCol, getProfile, toBill } from "@/lib/billing-db";
import { computeTotals, docTitle } from "@/lib/billing";
import { cleanClientInput, clientsCol, listPortalFiles, pOid, portalFilesBucket, ticketsCol, toClient, toTicket } from "@/lib/portal-db";

type Ctx = { params: { id: string } };

// Everything the admin client page needs: the client, shared files, support requests and quotations/invoices to link.
export async function GET(_req: Request, { params }: Ctx) {
  const deny = await guard("clients", "view");
  if (deny) return deny;
  const _id = pOid(params.id);
  const doc = _id && (await (await clientsCol()).findOne({ _id }));
  if (!doc) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const client = toClient(doc);
  const [files, tickets, bills, profile] = await Promise.all([
    listPortalFiles(client.id),
    (await ticketsCol()).find({ clientId: client.id }).sort({ updatedAt: -1 }).limit(300).toArray(),
    (await billingCol()).find({}).sort({ createdAt: -1 }).limit(1000).toArray(),
    getProfile(),
  ]);
  const billing = bills.map(toBill).map((d) => {
    const t = computeTotals(d, profile);
    return { id: d.id, type: d.type, title: docTitle(d.type, t.gstOn), number: d.number, date: d.date, status: d.status, name: d.client.name, company: d.client.company, email: d.client.email, total: t.total, balance: d.type === "invoice" ? t.balance : 0 };
  });
  return NextResponse.json({ client, files, tickets: tickets.map(toTicket), billing });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("clients");
  if (deny) return deny;
  const _id = pOid(params.id);
  const col = await clientsCol();
  const before = _id && (await col.findOne({ _id }));
  if (!_id || !before) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const data = cleanClientInput(await jsonBody(req));
  if (data.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return NextResponse.json({ error: "Add a valid email. The client logs in with it." }, { status: 400 });
  if (data.email && data.email !== before.email && (await col.findOne({ email: data.email, _id: { $ne: _id } }))) return NextResponse.json({ error: "Another client already uses this email." }, { status: 409 });
  const update: Record<string, unknown> = { $set: { ...data, updatedAt: new Date().toISOString() } };
  // Switching a client off, or changing their email, logs them out everywhere.
  if ((data.active === false && before.active !== false) || (data.email && data.email !== before.email)) update.$inc = { tokenVersion: 1 };
  const doc = await col.findOneAndUpdate({ _id }, update, { returnDocument: "after" });
  const c = toClient(doc!);
  await logActivity(await getSession(), "Client portal", data.active === false && before.active !== false ? "Switched off a client login" : "Edited a client", c.company || c.name, req);
  return NextResponse.json(c);
}

// Deletes the client with their shared files and support requests.
export async function DELETE(req: Request, { params }: Ctx) {
  const deny = await guard("clients");
  if (deny) return deny;
  const _id = pOid(params.id);
  const col = await clientsCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const c = toClient(doc);
  const bucket = await portalFilesBucket();
  for (const f of await bucket.find({ "metadata.clientId": c.id }).toArray()) await bucket.delete(f._id).catch(() => undefined);
  await (await ticketsCol()).deleteMany({ clientId: c.id });
  await col.deleteOne({ _id });
  await logActivity(await getSession(), "Client portal", "Deleted a client", c.company || c.name, req);
  return NextResponse.json({ ok: true });
}
