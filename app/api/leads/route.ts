import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { cleanLead, leadsCol } from "@/lib/lead-db";
import { LEAD_SOURCES, type LeadSource } from "@/lib/leads";
import { notifyAdmin } from "@/lib/notify";
import { checkHuman } from "@/lib/antispam";
import { sendLeadWebhook } from "@/lib/webhook";
import { getContent } from "@/lib/content-server";
import { sendAutoReply } from "@/lib/auto-reply";
import { leadAlertText, sendWhatsAppAlert } from "@/lib/whatsapp-alert";

// Public endpoint used by the contact form, home contact section and project planner.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Our form is offline right now. Please message us on WhatsApp." }, { status: 503 });

  const raw: unknown = await req.json().catch(() => null);
  const body = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const human = await checkHuman(req, body, "lead", 8);
  if (!human.ok) return human.silent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: human.error }, { status: human.status });

  const data = cleanLead(body);
  const errors: Record<string, string> = {};
  if (!data.name) errors.name = "Enter your name.";
  if ((data.phone ?? "").replace(/\D/g, "").length < 10) errors.phone = "Enter a 10-digit phone number.";
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.email = "Check the email address.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please fix the highlighted fields.", errors }, { status: 400 });

  const source = (Object.keys(LEAD_SOURCES).includes(String(body.source)) ? body.source : "contact") as LeadSource;
  const plan = String(body.plan ?? "").slice(0, 2000);
  const stamp = new Date().toISOString();

  const col = await leadsCol();
  // One thank-you email per address per day, so the form can't be used to flood someone's inbox.
  const repliedToday = data.email
    ? (await col.countDocuments({ email: data.email, createdAt: { $gte: new Date(Date.now() - 864e5).toISOString() } }, { collation: { locale: "en", strength: 2 } }).catch(() => 1)) > 0
    : true;
  await col.insertOne({ ...data, plan, source, status: "new", value: "", followUp: "", notes: "", createdAt: stamp, updatedAt: stamp });

  const content = await getContent().catch(() => null);
  const adminUrl = `${new URL(req.url).origin}/admin`;

  // Webhook, alert email, thank-you email and WhatsApp alert run side by side; all give up quickly and never throw.
  await Promise.allSettled([
    content && !repliedToday ? sendAutoReply(content, data) : Promise.resolve(false),
    content?.leadReplies?.whatsappAlert
      ? sendWhatsAppAlert(leadAlertText({ ...data }, LEAD_SOURCES[source], adminUrl)).then((r) => {
          if (!r.ok && r.via) console.error("WhatsApp alert failed:", r.error);
          return r;
        })
      : Promise.resolve(null),
    sendLeadWebhook({ ...data, plan, source, sourceLabel: LEAD_SOURCES[source], createdAt: stamp }),
    notifyAdmin(
      `New enquiry from ${data.name}`,
      [
        ["Name", data.name],
        ["Phone", data.phone],
        ["Email", data.email ?? ""],
        ["Needs", data.services ?? ""],
        ["Budget", data.budget ?? ""],
        ["Message", data.message ?? ""],
        ["Plan", plan],
        ["From", LEAD_SOURCES[source]],
      ],
      adminUrl,
    ),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
