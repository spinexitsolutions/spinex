import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { clientIp, rateLimited } from "@/lib/antispam";
import { getClientSession } from "@/lib/client-auth";
import { notifyAdmin } from "@/lib/notify";
import { originOf, ticketsCol } from "@/lib/portal-db";

// The client opens a support request.
export async function POST(req: Request) {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (await rateLimited(`portal-ticket:${client.id}:${clientIp(req)}`, 15, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many requests. Please wait a while." }, { status: 429 });
  const b = await jsonBody(req);
  const subject = String(b.subject ?? "").trim().slice(0, 140);
  const text = String(b.message ?? "").trim().slice(0, 5000);
  if (!subject || !text) return NextResponse.json({ error: "Add a subject and a message." }, { status: 400 });
  const projectId = client.projects.some((p) => p.id === b.projectId) ? String(b.projectId) : "";
  const now = new Date().toISOString();
  const { insertedId } = await (await ticketsCol()).insertOne({
    clientId: client.id,
    clientName: client.company || client.name,
    projectId,
    subject,
    status: "open",
    messages: [{ id: Math.random().toString(36).slice(2, 10), from: "client", name: client.name, text, at: now }],
    teamUnread: true,
    clientUnread: false,
    createdAt: now,
    updatedAt: now,
  });
  await notifyAdmin(`Support request: ${subject}`, [["Client", client.company || client.name], ["Subject", subject], ["Message", text]], `${originOf(req)}/admin/clients/${client.id}?tab=support`);
  return NextResponse.json({ ok: true, id: String(insertedId) }, { status: 201 });
}
