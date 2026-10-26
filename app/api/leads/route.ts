import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { cleanLead, leadsCol } from "@/lib/lead-db";
import { LEAD_SOURCES, type LeadSource } from "@/lib/leads";
import { checkHuman } from "@/lib/antispam";
import { cleanTrack } from "@/lib/attribution";
import { announceLead } from "@/lib/lead-announce";

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
  // The contact page and product forms ask for an email (it gets the thank-you reply); the quick home form and planner don't.
  const needsEmail = body.source === "contact" || body.source === "product" || body.source === undefined;
  if (needsEmail && !data.email) errors.email = "Enter your email address.";
  else if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = "Check the email address.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please fix the highlighted fields.", errors }, { status: 400 });

  // Ad sources are only set by the Meta and Google webhooks, never by the website forms.
  const source = (Object.keys(LEAD_SOURCES).includes(String(body.source)) && !["meta", "google", "booking"].includes(String(body.source)) ? body.source : "contact") as LeadSource;
  const plan = String(body.plan ?? "").slice(0, 2000);
  const stamp = new Date().toISOString();
  const track = cleanTrack(body.track);

  const col = await leadsCol();
  // One thank-you email per address per day, so the form can't be used to flood someone's inbox.
  const repliedToday = data.email
    ? (await col.countDocuments({ email: data.email, createdAt: { $gte: new Date(Date.now() - 864e5).toISOString() } }, { collation: { locale: "en", strength: 2 } }).catch(() => 1)) > 0
    : true;
  await col.insertOne({ ...data, plan, source, status: "new", value: "", followUp: "", followUpNote: "", assignedTo: "", assignedName: "", notes: "", track, createdAt: stamp, updatedAt: stamp });

  await announceLead({ data: data as Record<string, string> & { name: string; phone: string }, plan, source, track, stamp, adminUrl: `${new URL(req.url).origin}/admin`, autoReply: !repliedToday });

  return NextResponse.json({ ok: true }, { status: 201 });
}
