import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanFollowups, followupEmail, getFollowups, saveFollowups } from "@/lib/lead-followups";
import { leadsCol } from "@/lib/lead-db";
import { emailPerson, smtpSettings } from "@/lib/notify";
import { getBookingSettings } from "@/lib/booking-db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const deny = await guard("leads", "view");
  if (deny) return deny;
  const [s, smtp, booking, col] = await Promise.all([getFollowups(), smtpSettings(), getBookingSettings(), leadsCol()]);
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const [sent30, stopped] = await Promise.all([
    col.aggregate([{ $match: { "followups.at": { $gte: since } } }, { $unwind: "$followups" }, { $match: { "followups.at": { $gte: since }, "followups.ok": true } }, { $count: "n" }]).toArray(),
    col.countDocuments({ noFollowups: true, unsubToken: { $exists: true } }),
  ]);
  return NextResponse.json({ settings: s, emailReady: !!(smtp.SMTP_HOST && smtp.SMTP_USER && smtp.SMTP_PASS), bookingOn: booking.enabled, sent30: sent30[0]?.n ?? 0, stopped, canEdit: !(await guard("leads")) });
}

export async function PUT(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const prev = await getFollowups();
  const next = cleanFollowups(await jsonBody(req), prev);
  await saveFollowups(next);
  if (prev.enabled !== next.enabled) await logActivity(await getSession(), "Leads", next.enabled ? "Turned on automatic follow-up emails" : "Turned off automatic follow-up emails", "", req);
  else await logActivity(await getSession(), "Leads", "Changed the follow-up emails", "", req);
  return NextResponse.json({ settings: next });
}

// { step: 0, name } → preview. Add { sendTo: true } to email the preview to the alert email (or your own).
export async function POST(req: Request) {
  const deny = await guard("leads", "view");
  if (deny) return deny;
  const b = await jsonBody(req);
  const s = cleanFollowups({ ...(b.settings && typeof b.settings === "object" ? (b.settings as Record<string, unknown>) : {}) }, await getFollowups());
  const step = s.steps[Math.max(0, Math.min(s.steps.length - 1, Number(b.step) || 0))];
  const mail = await followupEmail(step, { name: String(b.name || "Rahul Sharma"), services: String(b.service || "Website design") }, s, `${SITE_URL}/stop-emails/example`);
  if (!b.sendTo) return NextResponse.json(mail);
  const session = await getSession();
  const to = (await smtpSettings()).NOTIFY_EMAIL || session?.email || "";
  if (!to) return NextResponse.json({ error: "No email to send the test to. Set the alert email in API keys." }, { status: 400 });
  const ok = await emailPerson(to, `[Test] ${mail.subject}`, mail.title, mail.paras, mail.button);
  return ok ? NextResponse.json({ ok: true, to }) : NextResponse.json({ error: "Couldn't send. Check the email settings in API keys." }, { status: 502 });
}
