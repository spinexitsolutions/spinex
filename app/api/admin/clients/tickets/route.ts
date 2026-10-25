import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { ticketsCol, toTicket } from "@/lib/portal-db";

// Every open support request, from all clients: urgent ones first, then new replies, then oldest waiting.
export async function GET() {
  const deny = await guard("clients", "view");
  if (deny) return deny;
  const docs = await (await ticketsCol()).find({ status: { $ne: "closed" } }).sort({ updatedAt: 1 }).limit(500).toArray();
  const list = docs.map(toTicket).map(({ messages, ...t }) => ({ ...t, messages: messages.length, last: messages[messages.length - 1]?.text.slice(0, 160) ?? "", lastFrom: messages[messages.length - 1]?.from ?? "client" }));
  list.sort((a, b) => Number(b.urgent && b.status === "open") - Number(a.urgent && a.status === "open") || Number(b.teamUnread) - Number(a.teamUnread) || Number(b.status === "open") - Number(a.status === "open"));
  return NextResponse.json(list);
}
