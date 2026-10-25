import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { clientIp, rateLimited } from "@/lib/antispam";
import { getClientSession } from "@/lib/client-auth";
import { notifyAdmin } from "@/lib/notify";
import { isJsonRequest, originOf, ticketsCol } from "@/lib/portal-db";
import { coveringAmc, mainAmc, shortDate, ticketKindLabel, type TicketKind } from "@/lib/portal";
import { sendWhatsAppAlert } from "@/lib/whatsapp-alert";
import { getContent } from "@/lib/content-server";

// The client opens a support request.
export async function POST(req: Request) {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (await rateLimited(`portal-ticket:${client.id}:${clientIp(req)}`, 15, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many requests. Please wait a while." }, { status: 429 });
  const b = await jsonBody(req);
  const subject = String(b.subject ?? "").trim().slice(0, 140);
  const text = String(b.message ?? "").trim().slice(0, 5000);
  if (!subject || !text) return NextResponse.json({ error: "Add a subject and a message." }, { status: 400 });
  const projectId = client.projects.some((p) => p.id === b.projectId) ? String(b.projectId) : "";
  const kind: TicketKind = (["problem", "change", "question", "renewal"] as const).find((k) => k === b.kind) ?? "question";
  const urgent = kind === "problem" && !!b.urgent;
  // Which maintenance plan covers this request today (checked here, not trusted from the browser).
  const cover = coveringAmc(client.amcs);
  const last = cover ?? mainAmc(client.amcs);
  const now = new Date().toISOString();
  const { insertedId } = await (await ticketsCol()).insertOne({
    clientId: client.id,
    clientName: client.company || client.name,
    projectId,
    kind,
    urgent,
    amcId: last?.id ?? "",
    amcTitle: last?.title ?? "",
    amcCovered: !!cover,
    subject,
    status: "open",
    messages: [{ id: Math.random().toString(36).slice(2, 10), from: "client", name: client.name, text, at: now }],
    teamUnread: true,
    clientUnread: false,
    createdAt: now,
    updatedAt: now,
  });
  const who = client.company || client.name;
  const amcText = cover ? `Covered by ${cover.title} (till ${shortDate(cover.endDate)})` : last ? `Not covered: ${last.title} ended ${shortDate(last.endDate)}` : "No AMC";
  const link = `${originOf(req)}/admin/clients/${client.id}?tab=support`;
  await notifyAdmin(`${urgent ? "URGENT " : ""}${kind === "renewal" ? "AMC renewal request" : "Support request"}: ${subject}`, [["Client", who], ["Type", `${ticketKindLabel[kind]}${urgent ? " (urgent)" : ""}`], ["AMC", amcText], ["Subject", subject], ["Message", text]], link);
  // Urgent problems and renewal requests also come on WhatsApp, when WhatsApp alerts are set up.
  if (urgent || kind === "renewal") {
    const content = await getContent().catch(() => null);
    if (content?.leadReplies?.whatsappAlert) await sendWhatsAppAlert(`${urgent ? "🚨 Urgent problem" : "🔁 AMC renewal request"} from ${who}\n${subject}\n${text.slice(0, 300)}\n${amcText}\n${link}`).catch(() => undefined);
  }
  return NextResponse.json({ ok: true, id: String(insertedId) }, { status: 201 });
}
