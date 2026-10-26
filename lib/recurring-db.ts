// Server only. Recurring bills ("recurring_bills") and making their invoices.
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { billingCol, getProfile, newToken, nextNumber } from "./billing-db";
import { addDays, computeTotals, inr, todayIST, type BillDoc, type BillItem } from "./billing";
import { addMonths, fillItem, periodLabel, stepMonths, type Frequency, type Recurring } from "./recurring";
import { emailPerson, notifyAdmin } from "./notify";
import { sendWhatsAppTo } from "./whatsapp-alert";
import { clientsCol } from "./portal-db";
import { getReminderSettings } from "./payment-reminders";
import { SITE_URL } from "./site";

export const recOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
export const recurringCol = async () => (await getDb()).collection("recurring_bills");

const s = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const isDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ""));

export function toRecurring(doc: WithId<Document>): Recurring {
  const r = doc as WithId<Document> & Partial<Recurring>;
  return {
    id: String(doc._id), title: r.title ?? "", client: { name: "", company: "", phone: "", email: "", address: "", state: "", gstin: "", ...(r.client ?? {}) },
    items: Array.isArray(r.items) ? r.items : [], discount: Number(r.discount) || 0, notes: r.notes ?? "",
    frequency: (["monthly", "quarterly", "yearly"].includes(String(r.frequency)) ? r.frequency : "monthly") as Frequency,
    day: Number(r.day) || 1, nextDate: r.nextDate ?? "", endDate: r.endDate ?? "", dueDays: Number(r.dueDays ?? 7), autoSend: r.autoSend !== false, active: r.active !== false,
    count: Number(r.count) || 0, lastInvoiceId: r.lastInvoiceId ?? "", lastNumber: r.lastNumber ?? "", lastDate: r.lastDate ?? "",
    createdBy: r.createdBy ?? "", createdAt: r.createdAt ?? "", updatedAt: r.updatedAt ?? "",
  };
}

export function cleanRecurringInput(b: Record<string, unknown>): Partial<Recurring> {
  const out: Partial<Recurring> = {};
  if (b.title !== undefined) out.title = s(b.title, 120);
  if (b.client && typeof b.client === "object") {
    const c = b.client as Record<string, unknown>;
    out.client = { name: s(c.name, 120), company: s(c.company, 140), phone: s(c.phone, 30), email: s(c.email, 160).toLowerCase(), address: s(c.address, 500), state: s(c.state, 60), gstin: s(c.gstin, 20).toUpperCase() };
  }
  if (Array.isArray(b.items)) {
    out.items = (b.items as Record<string, unknown>[]).filter((x) => x && typeof x === "object").slice(0, 30).map((x, i): BillItem => ({
      id: s(x.id, 20) || `i${i}`, description: s(x.description, 500), sac: s(x.sac, 12), qty: Math.max(0, Number(x.qty) || 0), rate: Math.max(0, Math.round((Number(x.rate) || 0) * 100) / 100), gst: [0, 5, 12, 18, 28].includes(Number(x.gst)) ? Number(x.gst) : 18,
    })).filter((x) => x.description);
  }
  if (b.discount !== undefined) out.discount = Math.max(0, Number(b.discount) || 0);
  if (b.notes !== undefined) out.notes = s(b.notes, 2000);
  if (b.frequency !== undefined) out.frequency = (["monthly", "quarterly", "yearly"].includes(String(b.frequency)) ? b.frequency : "monthly") as Frequency;
  if (b.day !== undefined) out.day = Math.min(28, Math.max(1, Math.round(Number(b.day) || 1)));
  if (b.nextDate !== undefined && isDate(b.nextDate)) out.nextDate = String(b.nextDate);
  if (b.endDate !== undefined) out.endDate = isDate(b.endDate) ? String(b.endDate) : "";
  if (b.dueDays !== undefined) out.dueDays = Math.min(90, Math.max(0, Math.round(Number(b.dueDays) || 0)));
  if (b.autoSend !== undefined) out.autoSend = !!b.autoSend;
  if (b.active !== undefined) out.active = !!b.active;
  return out;
}

let indexReady = false;
// Makes the invoice for one period. Safe to call twice for the same period: only one invoice is made.
export async function makeRecurringInvoice(r: Recurring, periodDate: string, by: string) {
  const bills = await billingCol();
  if (!indexReady) {
    await bills.createIndex({ recurringKey: 1 }, { unique: true, partialFilterExpression: { recurringKey: { $type: "string" } } }).catch(() => undefined);
    indexReady = true;
  }
  const profile = await getProfile();
  const date = todayIST();
  const stamp = new Date().toISOString();
  const key = `${r.id}:${periodDate}`;
  if (await bills.findOne({ recurringKey: key })) return { made: false, reason: "already made" };
  const inv: Omit<BillDoc, "id"> & { recurringId: string; recurringKey: string; period: string } = {
    type: "invoice",
    number: await nextNumber("invoice", date, profile),
    date,
    dueDate: addDays(date, r.dueDays),
    status: "unpaid",
    client: r.client,
    items: r.items.map((it, i) => ({ ...it, id: `${it.id || "i"}${i}`, description: fillItem(it.description, periodDate, r.frequency) })),
    discount: r.discount,
    notes: [r.notes, `For ${periodLabel(periodDate, r.frequency)}.`].filter(Boolean).join("\n"),
    terms: profile.invoiceTerms,
    paid: 0,
    leadId: "", fromQuote: "", fromQuoteNumber: "", invoiceId: "",
    shareToken: newToken(),
    signers: null,
    createdBy: by || "Monthly bills",
    createdAt: stamp,
    updatedAt: stamp,
    recurringId: r.id,
    recurringKey: key,
    period: periodLabel(periodDate, r.frequency),
  };
  let insertedId;
  try {
    ({ insertedId } = await bills.insertOne(inv));
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { made: false, reason: "already made" };
    throw e;
  }
  const id = String(insertedId);
  // Shown in the client's portal too, when they have one.
  if (r.client.email) await (await clientsCol()).updateOne({ email: r.client.email }, { $addToSet: { billingIds: id } }).catch(() => undefined);
  const t = computeTotals({ ...inv, id } as BillDoc, profile);
  let emailed = false;
  let whatsapp = false;
  if (r.autoSend) {
    const brand = profile.legalName || "Spinex IT Solutions";
    const first = (r.client.name || r.client.company || "there").split(" ")[0];
    const link = `${SITE_URL}/d/${inv.shareToken}`;
    if (r.client.email) emailed = await emailPerson(r.client.email, `Invoice ${inv.number} for ${inv.period} (${inr(t.total, 0)})`, `Your invoice for ${inv.period}`, [`Hi ${first},`, `Here is your invoice ${inv.number} for ${r.title || "our services"}, ${inv.period}.`, `Amount: ${inr(t.total, 0)}. Due by ${new Date(`${inv.dueDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.`, "You can see it, download the PDF and pay online from the button below.", `Team ${brand}`], { label: `View and pay ${inr(t.total, 0)}`, url: link });
    const rs = await getReminderSettings();
    if (rs.whatsapp && r.client.phone) whatsapp = (await sendWhatsAppTo(r.client.phone, `Hi ${first}, your invoice ${inv.number} for ${inv.period} is ready: ${inr(t.total, 0)}, due by ${inv.dueDate}. View and pay: ${link}\n\n- ${brand}`)).ok;
    if (emailed || whatsapp) await bills.updateOne({ _id: insertedId }, { $set: { sentAt: stamp } });
  }
  return { made: true, id, number: inv.number, total: t.total, emailed, whatsapp };
}

// Run once a day by the scheduler: every active bill whose date has come gets its invoice, then moves to the next period.
export async function runRecurring() {
  const col = await recurringCol();
  const today = todayIST();
  const lines: string[] = [];
  let made = 0;
  for (const raw of await col.find({ active: { $ne: false }, nextDate: { $gt: "", $lte: today } }).limit(500).toArray()) {
    const r = toRecurring(raw);
    if (r.endDate && r.nextDate > r.endDate) {
      await col.updateOne({ _id: raw._id }, { $set: { active: false, updatedAt: new Date().toISOString() } });
      continue;
    }
    const period = r.nextDate;
    const next = addMonths(period, stepMonths[r.frequency], r.day);
    // Move the date first, so two scheduler runs can't make the same period twice.
    const claim = await col.updateOne({ _id: raw._id, nextDate: period }, { $set: { nextDate: next, updatedAt: new Date().toISOString(), ...(r.endDate && next > r.endDate ? { active: false } : {}) } });
    if (!claim.modifiedCount) continue;
    const out = await makeRecurringInvoice(r, period, "").catch((e) => ({ made: false as const, reason: String(e) }));
    if (out.made) {
      made++;
      await col.updateOne({ _id: raw._id }, { $inc: { count: 1 }, $set: { lastInvoiceId: out.id, lastNumber: out.number, lastDate: today } });
      lines.push(`• ${r.client.company || r.client.name}: ${out.number}, ${inr(out.total ?? 0, 0)}${r.autoSend ? (out.emailed || out.whatsapp ? " · sent to client" : " · couldn't send to client") : " · not sent (send it yourself)"}`);
    } else if (out.reason !== "already made") lines.push(`• ${r.client.company || r.client.name}: FAILED (${out.reason})`);
  }
  if (lines.length) await notifyAdmin(`${made} monthly invoice${made === 1 ? "" : "s"} made`, [["Invoices", lines.join("\n")]], `${SITE_URL}/admin#billing`).catch(() => undefined);
  return { made };
}
