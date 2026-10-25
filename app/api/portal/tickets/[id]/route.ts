import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { clientIp, rateLimited } from "@/lib/antispam";
import { getClientSession } from "@/lib/client-auth";
import { notifyAdmin } from "@/lib/notify";
import { originOf, pOid, ticketsCol } from "@/lib/portal-db";

// The client replies to a support request ({ message }), or marks it solved ({ action: "close" }).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const _id = pOid(params.id);
  const col = await ticketsCol();
  const t = _id && (await col.findOne({ _id, clientId: client.id }));
  if (!_id || !t) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const b = await jsonBody(req);
  const now = new Date().toISOString();
  if (b.action === "close") {
    await col.updateOne({ _id }, { $set: { status: "closed", updatedAt: now } });
    return NextResponse.json({ ok: true });
  }
  if (await rateLimited(`portal-reply:${client.id}:${clientIp(req)}`, 60, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many messages. Please wait a while." }, { status: 429 });
  const text = String(b.message ?? "").trim().slice(0, 5000);
  if (!text) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  await col.updateOne(
    { _id },
    { $push: { messages: { id: Math.random().toString(36).slice(2, 10), from: "client", name: client.name, text, at: now } } as never, $set: { status: "open", teamUnread: true, updatedAt: now } },
  );
  await notifyAdmin(`Client reply: ${t.subject}`, [["Client", client.company || client.name], ["Message", text]], `${originOf(req)}/admin/clients/${client.id}?tab=support`);
  return NextResponse.json({ ok: true });
}
