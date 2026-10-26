// Server only. Automatic follow-up emails to new leads (day 2 and day 5 by default) until someone marks them Contacted.
import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { leadsCol } from "./lead-db";
import { emailPerson, smtpSettings } from "./notify";
import { getContent } from "./content-server";
import { getBookingSettings } from "./booking-db";
import { SITE_URL } from "./site";

export type FollowupStep = { day: number; on: boolean; subject: string; body: string };
export type FollowupSettings = { enabled: boolean; enabledAt: string; steps: FollowupStep[]; portfolioPath: string; fromHour: number; toHour: number };
export type FollowupLog = { day: number; at: string; ok: boolean; subject: string };

export const defaultFollowups: FollowupSettings = {
  enabled: false,
  enabledAt: "",
  portfolioPath: "/work",
  fromHour: 10,
  toHour: 19,
  steps: [
    {
      day: 2, on: true,
      subject: "{name}, here's some of our recent work",
      body: "Hi {name},\n\nThanks again for your enquiry about {service}. We haven't been able to speak yet, so here are a few projects we've built for businesses like yours: {portfolio}\n\nIf it's easier, book a free call at a time that suits you and we'll go through your plan, cost and timeline: {book}\n\nOr just reply to this email.\n\nTeam {brand}",
    },
    {
      day: 5, on: true,
      subject: "Still planning your {service}?",
      body: "Hi {name},\n\nJust checking in on your {service} plans. If the timing isn't right, no problem: reply and tell us when to get back to you.\n\nA short call usually answers most questions about cost and timeline: {book}\n\nTeam {brand}",
    },
  ],
};

export function cleanFollowups(b: Record<string, unknown>, prev: FollowupSettings): FollowupSettings {
  const s = (v: unknown, max: number) => String(v ?? "").slice(0, max);
  const stepsIn = Array.isArray(b.steps) ? (b.steps as Record<string, unknown>[]) : prev.steps;
  const steps = stepsIn.slice(0, 4).map((x) => ({ day: Math.max(1, Math.min(60, Math.round(Number(x.day) || 1))), on: x.on !== false, subject: s(x.subject, 200).trim() || "Following up on your enquiry", body: s(x.body, 4000).trim() }))
    .filter((x) => x.body).sort((a, z) => a.day - z.day)
    .filter((x, i, a) => !i || a[i - 1].day !== x.day);
  const enabled = b.enabled === undefined ? prev.enabled : !!b.enabled;
  const hour = (v: unknown, d: number, max = 23) => Math.max(0, Math.min(max, Math.round(Number(v ?? d))));
  const path = s(b.portfolioPath ?? prev.portfolioPath, 300).trim();
  return {
    enabled,
    // Turning it on never emails old leads: only leads that come in from now.
    enabledAt: enabled ? (prev.enabled && prev.enabledAt ? prev.enabledAt : new Date().toISOString()) : "",
    steps: steps.length ? steps : prev.steps,
    portfolioPath: /^(\/|https?:\/\/)/.test(path) ? path : "/work",
    fromHour: hour(b.fromHour, prev.fromHour),
    toHour: hour(b.toHour, prev.toHour, 24), // 24 = until midnight
  };
}

const settings = async () => (await getDb()).collection<{ _id: string; value?: Partial<FollowupSettings> }>("settings");
export async function getFollowups(): Promise<FollowupSettings> {
  const doc = await (await settings()).findOne({ _id: "lead_followups" });
  return doc?.value ? { ...defaultFollowups, ...doc.value, steps: doc.value.steps?.length ? doc.value.steps : defaultFollowups.steps } : defaultFollowups;
}
export async function saveFollowups(v: FollowupSettings) {
  await (await settings()).updateOne({ _id: "lead_followups" }, { $set: { value: v, updatedAt: new Date().toISOString() } }, { upsert: true });
}

const abs = (p: string) => (/^https?:\/\//.test(p) ? p : `${SITE_URL}${p}`);
const istHour = (ms = Date.now()) => new Date(ms + 5.5 * 3600e3).getUTCHours();

type LeadRow = { _id: ObjectId; name?: string; email?: string; services?: string; createdAt?: string; followupKeys?: number[]; unsubToken?: string };

// The email for one step, with the placeholders filled in. Also used for the preview in admin.
export async function followupEmail(step: FollowupStep, lead: { name?: string; services?: string }, s: FollowupSettings, unsubUrl: string) {
  const [content, booking] = await Promise.all([getContent().catch(() => null), getBookingSettings().catch(() => null)]);
  const brand = content?.brand.name || "Spinex IT Solutions";
  const book = booking?.enabled ? abs("/book") : abs("/contact");
  const vars: Record<string, string> = {
    name: (lead.name || "").trim().split(/\s+/)[0] || "there",
    service: (lead.services || "").split(",")[0].trim() || "your project",
    brand, portfolio: abs(s.portfolioPath || "/work"), book,
    phone: content?.contact.phone || "", whatsapp: content?.contact.whatsapp || "",
  };
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const subject = fill(step.subject);
  const paras = fill(step.body).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  paras.push(`Don't want these emails? Stop them here: ${unsubUrl}`);
  return { subject, title: subject, paras, button: { label: booking?.enabled ? "Book a free call" : "See our work", url: booking?.enabled ? book : vars.portfolio } };
}

// Run on every scheduler call. Sends at most one email per lead per run, only during office hours (India time).
export async function runLeadFollowups(now = Date.now()) {
  const s = await getFollowups();
  const steps = s.steps.filter((x) => x.on);
  if (!s.enabled || !steps.length) return { sent: 0, skipped: "off" };
  const h = istHour(now);
  if (h < s.fromHour || h >= Math.max(s.toHour, s.fromHour + 1)) return { sent: 0, skipped: "outside hours" };
  const smtp = await smtpSettings();
  if (!smtp.SMTP_HOST || !smtp.SMTP_USER || !smtp.SMTP_PASS) return { sent: 0, skipped: "email not set up" };

  const maxDay = steps[steps.length - 1].day;
  const oldest = new Date(Math.max(Date.parse(s.enabledAt) || now, now - (maxDay + 10) * 86400e3)).toISOString();
  const col = await leadsCol();
  const leads = (await col.find({ status: "new", email: { $regex: "@" }, noFollowups: { $ne: true }, createdAt: { $gte: oldest, $lte: new Date(now - steps[0].day * 86400e3).toISOString() } }).limit(300).toArray()) as unknown as LeadRow[];
  let sent = 0;
  let failed = 0;
  for (const l of leads) {
    const age = (now - Date.parse(l.createdAt || "")) / 86400e3;
    const done = l.followupKeys ?? [];
    // The latest step that is due; earlier ones that were missed (e.g. while email was down) are skipped, not sent late in a burst.
    const due = steps.filter((x) => x.day <= age && !done.includes(x.day));
    const step = due[due.length - 1];
    if (!step) continue;
    const token = l.unsubToken || randomBytes(16).toString("base64url");
    const keys = due.map((x) => x.day);
    // Claim first, so two scheduler calls at the same time can't both send it.
    const claim = await col.updateOne({ _id: l._id, status: "new", followupKeys: { $ne: step.day } }, { $addToSet: { followupKeys: { $each: keys } }, $set: { unsubToken: token } });
    if (!claim.modifiedCount) continue;
    const mail = await followupEmail(step, l, s, `${SITE_URL}/stop-emails/${token}`);
    const ok = await emailPerson(l.email!, mail.subject, mail.title, mail.paras, mail.button);
    const log: FollowupLog = { day: step.day, at: new Date().toISOString(), ok, subject: mail.subject };
    await col.updateOne({ _id: l._id }, { $push: { followups: log } as never, ...(ok ? {} : { $pull: { followupKeys: step.day } as never }) });
    if (ok) sent++;
    else {
      failed++;
      // Try again next run, but never more than 3 times for the same step.
      const tries = (await col.findOne({ _id: l._id }, { projection: { followups: 1 } }))?.followups?.filter((f: FollowupLog) => f.day === step.day && !f.ok).length ?? 0;
      if (tries >= 3) await col.updateOne({ _id: l._id }, { $addToSet: { followupKeys: step.day } });
    }
  }
  return { sent, failed };
}

export async function stopFollowups(token: string) {
  if (!token || token.length < 10) return null;
  const col = await leadsCol();
  const r = await col.findOneAndUpdate({ unsubToken: token }, { $set: { noFollowups: true, noFollowupsAt: new Date().toISOString() } }, { returnDocument: "after" });
  return r ? { name: String(r.name || "") } : null;
}
export async function findByStopToken(token: string) {
  if (!token || token.length < 10) return null;
  const r = await (await leadsCol()).findOne({ unsubToken: token }, { projection: { name: 1, noFollowups: 1 } });
  return r ? { name: String(r.name || ""), stopped: !!r.noFollowups } : null;
}
