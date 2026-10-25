import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { emailPerson } from "@/lib/notify";
import { clientsCol, originOf, pOid, ticketsCol, toTicket } from "@/lib/portal-db";

// Team side of a support request: { message } replies (and emails the client), { action: "close" | "reopen" | "read" }.
export async function POST(req: Request, { params }: { params: { tid: string } }) {
  const deny = await guard("clients");
  if (deny) return deny;
  const _id = pOid(params.tid);
  const col = await ticketsCol();
  const t = _id && (await col.findOne({ _id }));
  if (!_id || !t) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const b = await jsonBody(req);
  const now = new Date().toISOString();
  const session = await getSession();
  if (b.action === "close" || b.action === "reopen" || b.action === "read") {
    const set = b.action === "read" ? { teamUnread: false } : { status: b.action === "close" ? "closed" : "open", teamUnread: false, updatedAt: now };
    const doc = await col.findOneAndUpdate({ _id }, { $set: set }, { returnDocument: "after" });
    return NextResponse.json(toTicket(doc!));
  }
  const text = String(b.message ?? "").trim().slice(0, 5000);
  if (!text) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  const doc = await col.findOneAndUpdate(
    { _id },
    { $push: { messages: { id: Math.random().toString(36).slice(2, 10), from: "team", name: session?.name ?? "Team", text, at: now } } as never, $set: { status: "answered", teamUnread: false, clientUnread: true, updatedAt: now } },
    { returnDocument: "after" },
  );
  const cid = pOid(String(t.clientId));
  const client = cid && (await (await clientsCol()).findOne({ _id: cid }));
  let emailed = false;
  if (client?.email && client.active !== false) {
    emailed = await emailPerson(String(client.email), `Re: ${t.subject}`, "New reply on your support request", [
      `Hi ${String(client.name || "").split(" ")[0] || "there"},`,
      `${session?.name ?? "Our team"} replied to “${t.subject}”:`,
      text,
    ], { label: "Open in client portal", url: `${originOf(req)}/portal/support?t=${params.tid}` });
  }
  await logActivity(session, "Client portal", `Replied to “${t.subject}”`, String(t.clientName ?? ""), req);
  return NextResponse.json({ ...toTicket(doc!), emailed });
}
