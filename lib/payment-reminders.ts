// Server only. Payment reminders for unpaid invoices (before and after the due date), by email and WhatsApp.
import { getDb } from "./db";
import { billOid, billingCol, getProfile, toBill } from "./billing-db";
import { computeTotals, inr, todayIST, type BillDoc } from "./billing";
import { emailPerson, notifyAdmin } from "./notify";
import { sendWhatsAppTo } from "./whatsapp-alert";
import { writeState } from "./settings-db";
import { SITE_URL } from "./site";

export type ReminderSettings = { enabled: boolean; steps: string; email: boolean; whatsapp: boolean; summary: boolean; message: string };
export const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  steps: "-3, 0, 3, 7, 15",
  email: true,
  whatsapp: true,
  summary: true,
  message: "This is a friendly reminder that invoice {number} for {amount} {due}. You can see the invoice and pay online here: {link}\n\nIf you have already paid, please ignore this message. Thank you!",
};
export type ReminderLog = { at: string; step: number; email: boolean; whatsapp: boolean; manual: boolean; by: string };

export async function getReminderSettings(): Promise<ReminderSettings> {
  const doc = await (await getDb()).collection<{ _id: string; value?: Partial<ReminderSettings> }>("settings").findOne({ _id: "payreminders" });
  return cleanReminderSettings({ ...defaultReminderSettings, ...(doc?.value ?? {}) });
}
export function cleanReminderSettings(b: Record<string, unknown>): ReminderSettings {
  return {
    enabled: !!b.enabled,
    steps: stepsOf(String(b.steps ?? "")).join(", ") || defaultReminderSettings.steps,
    email: b.email !== false,
    whatsapp: b.whatsapp !== false,
    summary: b.summary !== false,
    message: String(b.message ?? "").trim().slice(0, 1500) || defaultReminderSettings.message,
  };
}
export async function saveReminderSettings(s: ReminderSettings) {
  await (await getDb()).collection<{ _id: string }>("settings").updateOne({ _id: "payreminders" }, { $set: { value: s, updatedAt: new Date().toISOString() } }, { upsert: true });
}

// "-3, 0, 3, 7, 15" → days from the due date (negative = before it).
export function stepsOf(text: string) {
  return Array.from(new Set(text.split(/[\s,]+/).map((x) => Math.round(Number(x))).filter((n) => Number.isFinite(n) && n >= -30 && n <= 120))).sort((a, b) => a - b);
}
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
const longDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// The reminder step due today for an invoice: the latest step reached that wasn't sent yet. A missed day still sends it (once).
export function dueStep(d: Pick<BillDoc, "dueDate"> & { payReminderKeys?: string[] }, steps: number[], today: string) {
  if (!d.dueDate) return null;
  const late = daysBetween(d.dueDate, today);
  const reached = steps.filter((s) => s <= late);
  if (!reached.length) return null;
  const step = reached[reached.length - 1];
  const key = `${d.dueDate}:${step}`;
  if ((d.payReminderKeys ?? []).includes(key)) return null;
  // Earlier steps are marked too, so a late start doesn't send several in a row.
  return { step, late, keys: reached.map((s) => `${d.dueDate}:${s}`) };
}

export function reminderText(s: ReminderSettings, d: BillDoc, balance: number, late: number, brand: string) {
  const due = late < 0 ? `is due on ${longDate(d.dueDate)}` : late === 0 ? "is due today" : `was due on ${longDate(d.dueDate)} (${late} day${late === 1 ? "" : "s"} ago)`;
  return s.message
    .replace(/\{name\}/g, (d.client.name || d.client.company || "there").split(" ")[0])
    .replace(/\{number\}/g, d.number)
    .replace(/\{amount\}/g, inr(balance, 0))
    .replace(/\{due\}/g, due)
    .replace(/\{days\}/g, String(Math.max(0, late)))
    .replace(/\{link\}/g, `${SITE_URL}/d/${d.shareToken}`)
    .replace(/\{brand\}/g, brand);
}

// Sends one reminder for one invoice. Returns which channels worked.
export async function sendReminder(d: BillDoc, s: ReminderSettings, opts: { step: number; late: number; manual: boolean; by: string; keys?: string[] }) {
  const profile = await getProfile();
  const t = computeTotals(d, profile);
  if (t.balance < 1) return { email: false, whatsapp: false, error: "Nothing is due on this invoice." };
  const brand = profile.legalName || "Spinex IT Solutions";
  const text = reminderText(s, d, t.balance, opts.late, brand);
  const first = (d.client.name || d.client.company || "there").split(" ")[0];
  let email = false;
  let whatsapp = false;
  if (s.email && d.client.email) {
    email = await emailPerson(d.client.email, opts.late > 0 ? `Payment overdue: invoice ${d.number} (${inr(t.balance, 0)})` : `Payment reminder: invoice ${d.number} (${inr(t.balance, 0)})`, opts.late > 0 ? "A gentle reminder about your payment" : "Payment reminder", [`Hi ${first},`, ...text.split(/\n{2,}/), `Team ${brand}`], { label: `View and pay ${inr(t.balance, 0)}`, url: `${SITE_URL}/d/${d.shareToken}` });
  }
  if (s.whatsapp && d.client.phone) {
    whatsapp = (await sendWhatsAppTo(d.client.phone, `Hi ${first}, ${text}\n\n- ${brand}`)).ok;
  }
  const log: ReminderLog = { at: new Date().toISOString(), step: opts.step, email, whatsapp, manual: opts.manual, by: opts.by };
  const update: Record<string, unknown> = { $push: { payReminders: { $each: [log], $slice: -30 } } };
  // A step counts as done only when something went out, so a failed one is tried again tomorrow.
  if ((email || whatsapp) && opts.keys?.length) update.$addToSet = { payReminderKeys: { $each: opts.keys } };
  await (await billingCol()).updateOne({ _id: billOid(d.id)! }, update as never);
  return { email, whatsapp, error: email || whatsapp ? "" : !d.client.email && !d.client.phone ? "The invoice has no client email or phone." : "Couldn't send. Check email and WhatsApp in API keys." };
}

// Run once a day by the scheduler.
export async function runPaymentReminders() {
  const s = await getReminderSettings();
  if (!s.enabled) return { sent: 0, overdue: 0 };
  const today = todayIST();
  const steps = stepsOf(s.steps);
  const profile = await getProfile();
  const docs = (await (await billingCol()).find({ type: "invoice", status: { $in: ["unpaid", "partly-paid"] }, noReminders: { $ne: true }, dueDate: { $gt: "" } }).limit(2000).toArray());
  let sent = 0;
  const lines: string[] = [];
  let overdueTotal = 0;
  for (const raw of docs) {
    const d = toBill(raw);
    const t = computeTotals(d, profile);
    if (t.balance < 1) continue;
    const late = daysBetween(d.dueDate, today);
    if (late > 0) overdueTotal += t.balance;
    const due = dueStep({ dueDate: d.dueDate, payReminderKeys: (raw.payReminderKeys as string[]) ?? [] }, steps, today);
    if (!due) continue;
    const r = await sendReminder(d, s, { step: due.step, late: due.late, manual: false, by: "", keys: due.keys });
    if (r.email || r.whatsapp) sent++;
    lines.push(`• ${d.client.company || d.client.name}: ${d.number}, ${inr(t.balance, 0)}, ${late > 0 ? `${late} days late` : late === 0 ? "due today" : `due in ${-late} days`} · ${[r.email && "email", r.whatsapp && "WhatsApp"].filter(Boolean).join(" + ") || "not sent"}`);
  }
  if (s.summary && lines.length) {
    await notifyAdmin(`${sent} payment reminder${sent === 1 ? "" : "s"} sent`, [["Reminders", lines.join("\n")], ["Overdue in total", inr(overdueTotal, 0)]], `${SITE_URL}/admin#billing`).catch(() => undefined);
  }
  await writeState("payreminders", { lastRun: today, lastResult: lines.length ? `${sent} sent, ${inr(overdueTotal, 0)} overdue` : "Nothing due today" });
  return { sent, overdue: overdueTotal };
}
