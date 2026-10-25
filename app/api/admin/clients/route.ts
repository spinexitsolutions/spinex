import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { leadsCol } from "@/lib/lead-db";
import { clientsCol, normEmail, pOid, ticketsCol, toClient, validEmail } from "@/lib/portal-db";

// All portal clients, newest first, with their open support requests.
export async function GET() {
  const deny = await guard("clients", "view");
  if (deny) return deny;
  const [docs, open] = await Promise.all([
    (await clientsCol()).find({}).sort({ createdAt: -1 }).limit(2000).toArray(),
    (await ticketsCol()).aggregate<{ _id: string; open: number; unread: number }>([
      { $match: { status: { $ne: "closed" } } },
      { $group: { _id: "$clientId", open: { $sum: 1 }, unread: { $sum: { $cond: ["$teamUnread", 1, 0] } } } },
    ]).toArray(),
  ]);
  const byClient = new Map(open.map((o) => [o._id, o]));
  return NextResponse.json(docs.map((d) => {
    const c = toClient(d);
    return { ...c, openTickets: byClient.get(c.id)?.open ?? 0, unreadTickets: byClient.get(c.id)?.unread ?? 0 };
  }));
}

// New client: { name, company, email, phone } or { leadId } to copy a lead's details.
export async function POST(req: Request) {
  const deny = await guard("clients");
  if (deny) return deny;
  const b = await jsonBody(req);
  let name = String(b.name ?? "").trim().slice(0, 120);
  let company = String(b.company ?? "").trim().slice(0, 140);
  let email = normEmail(b.email);
  let phone = String(b.phone ?? "").trim().slice(0, 30);
  if (b.leadId) {
    const lid = pOid(String(b.leadId));
    const lead = lid && (await (await leadsCol()).findOne({ _id: lid }));
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    name = name || String(lead.name ?? "");
    email = email || normEmail(lead.email);
    phone = phone || String(lead.phone ?? "");
  }
  if (!name) return NextResponse.json({ error: "Add the client's name." }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Add a valid email. The client logs in with it." }, { status: 400 });
  const col = await clientsCol();
  if (await col.findOne({ email })) return NextResponse.json({ error: "A client with this email already exists." }, { status: 409 });
  const now = new Date().toISOString();
  const doc = { name, company, email, phone, active: true, projects: [], billingIds: [], notes: "", tokenVersion: 0, lastLoginAt: "", invitedAt: "", createdAt: now, updatedAt: now };
  const { insertedId } = await col.insertOne(doc);
  await logActivity(await getSession(), "Client portal", "Added a client", company || name, req);
  return NextResponse.json({ ...doc, id: String(insertedId) }, { status: 201 });
}
