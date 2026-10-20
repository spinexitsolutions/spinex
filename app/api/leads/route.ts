import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { cleanLead, leadsCol } from "@/lib/lead-db";
import { LEAD_SOURCES, type LeadSource } from "@/lib/leads";
import { notifyAdmin } from "@/lib/notify";
import { checkHuman } from "@/lib/antispam";


// Public endpoint used by the contact form, home contact section and project planner.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Our form is offline right now. Please message us on WhatsApp." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
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

  await (await leadsCol()).insertOne({ ...data, plan, source, status: "new", value: "", followUp: "", notes: "", createdAt: stamp, updatedAt: stamp });

  await notifyAdmin(
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
    `${new URL(req.url).origin}/admin`,
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
