import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { hasDb } from "@/lib/db";
import { backupDue, cronKey, getAutomation, nowIST, runBackup, runReminders } from "@/lib/automation";
import { runAmcReminders } from "@/lib/amc";
import { runBookingReminders } from "@/lib/booking-db";
import { runReviewRequests } from "@/lib/reviews-db";
import { runFeedbackRequests } from "@/lib/feedback-db";
import { runPaymentReminders } from "@/lib/payment-reminders";
import { runRecurring } from "@/lib/recurring-db";
import { runRepeatingExpenses } from "@/lib/accounts-db";
import { runLeadFollowups } from "@/lib/lead-followups";
import { claimState, readState, writeState } from "@/lib/settings-db";
import { SITE_URL } from "@/lib/site";

// Called by a scheduler (Vercel Cron, cron-job.org or a server crontab), ideally every hour.
// Each job keeps track of when it last ran, so extra calls do nothing.
// Link: /api/cron?key=<key from Admin → Automation and backups>  (or header "Authorization: Bearer <CRON_SECRET>")
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Both sides are hashed first, so any key (any length, any characters) is compared safely.
const digest = (v: string) => createHash("sha256").update(v).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

async function allowed(req: Request) {
  const url = new URL(req.url);
  const given = url.searchParams.get("key") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!given) return false;
  const env = process.env.CRON_SECRET || "";
  if (env && same(given, env)) return true;
  return same(given, await cronKey());
}

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ ok: false, error: "No database." }, { status: 503 });
  if (!(await allowed(req))) return NextResponse.json({ ok: false, error: "Wrong or missing key." }, { status: 401 });

  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  const [settings, state] = await Promise.all([getAutomation(), readState("automation")]);
  const now = nowIST();
  const done: Record<string, unknown> = {};
  await writeState("automation", { lastCron: new Date().toISOString() });

  if (settings.remindersOn && state.lastReminders !== now.date && now.hour >= settings.reminderHour && (await claimState("automation", "gateReminders", now.date))) {
    done.reminders = await runReminders(origin).catch((e) => ({ error: String(e) }));
  }
  // Monthly bills first (so a new invoice is counted), then payment reminders. Once a day, at the reminder hour.
  if (now.hour >= settings.reminderHour && (await claimState("automation", "lastBilling", now.date))) {
    done.recurring = await runRecurring().catch((e) => ({ error: String(e) }));
    done.payments = await runPaymentReminders().catch((e) => ({ error: String(e) }));
  }
  // Separate, so a slow billing run that hits the time limit doesn't hold this back.
  if (await claimState("automation", "lastExpenses", now.date)) {
    done.expenses = await runRepeatingExpenses().catch((e) => ({ error: String(e) }));
  }
  if (settings.amcRemindersOn && state.lastAmc !== now.date && now.hour >= settings.reminderHour && (await claimState("automation", "gateAmc", now.date))) {
    done.amc = await runAmcReminders(origin, { days: settings.amcRemindDays, emailClient: settings.amcEmailClient, whatsapp: settings.whatsappSummary }).catch((e) => ({ error: String(e) }));
  }
  // Call reminders are checked on every run (the scheduler should run every hour).
  done.calls = await runBookingReminders().catch((e) => ({ error: String(e) }));
  done.reviews = await runReviewRequests().catch((e) => ({ error: String(e) }));
  done.feedback = await runFeedbackRequests().catch((e) => ({ error: String(e) }));
  done.followups = await runLeadFollowups().catch((e) => ({ error: String(e) }));
  if (backupDue(settings, String(state.lastBackup || "")) && (await claimState("automation", "gateBackup", `${now.date}T${now.hour}`))) {
    done.backup = await runBackup().catch((e) => ({ error: String(e) }));
  }
  return NextResponse.json({ ok: true, at: now, done });
}
