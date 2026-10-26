import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanReminderSettings, getReminderSettings, saveReminderSettings } from "@/lib/payment-reminders";
import { canWhatsAppClients } from "@/lib/whatsapp-alert";
import { readState } from "@/lib/settings-db";

export async function GET() {
  const deny = await guard("billing", "view");
  if (deny) return deny;
  const [settings, state, wa] = await Promise.all([getReminderSettings(), readState("payreminders"), canWhatsAppClients()]);
  return NextResponse.json({ settings, state, canWhatsApp: wa });
}

export async function PUT(req: Request) {
  const deny = await guard("billing");
  if (deny) return deny;
  const next = cleanReminderSettings(await jsonBody(req));
  await saveReminderSettings(next);
  await logActivity(await getSession(), "Invoices", `Payment reminders ${next.enabled ? "on" : "off"} (${next.steps} days)`, "", req);
  return NextResponse.json(next);
}
