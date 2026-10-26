// Server only. Expenses ("expenses"), monthly profit and loss, and the GST summary.
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { billingCol, getProfile, toBill } from "./billing-db";
import { computeTotals, todayIST } from "./billing";
import { payslipsCol, toPayslip } from "./payroll-db";
import { slipTotals } from "./payroll";
import { fyMonths, r2, type Expense, type MonthRow } from "./accounts";

export const expOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
let ready = false;
export async function expensesCol() {
  const col = (await getDb()).collection("expenses");
  if (!ready) {
    await col.createIndex({ date: -1 }).catch(() => undefined);
    ready = true;
  }
  return col;
}

export function toExpense(doc: WithId<Document>): Expense {
  const r = doc as WithId<Document> & Partial<Expense>;
  return {
    id: String(doc._id), date: r.date ?? "", category: r.category ?? "Other", vendor: r.vendor ?? "", description: r.description ?? "",
    amount: Number(r.amount) || 0, gst: Number(r.gst) || 0, vendorGstin: r.vendorGstin ?? "", billNo: r.billNo ?? "", paidVia: r.paidVia ?? "Bank transfer",
    repeat: !!r.repeat, copiedTo: r.copiedTo ?? "", createdBy: r.createdBy ?? "", createdAt: r.createdAt ?? "", updatedAt: r.updatedAt ?? "",
  };
}

const monthEnd = (m: string) => `${m}-31`;

// Invoices by invoice date (cancelled ones left out). Quotations never count.
async function invoicesBetween(from: string, to: string) {
  const profile = await getProfile();
  const docs = await (await billingCol()).find({ type: "invoice", status: { $ne: "cancelled" }, date: { $gte: from, $lte: to } }).sort({ date: 1, number: 1 }).limit(10000).toArray();
  return { profile, rows: docs.map(toBill).map((d) => ({ d, t: computeTotals(d, profile) })) };
}

// Profit and loss for a list of months (e.g. a financial year).
export async function monthlyReport(months: string[]): Promise<MonthRow[]> {
  const from = `${months[0]}-01`;
  const to = monthEnd(months[months.length - 1]);
  const [{ rows }, exps, slips] = await Promise.all([
    invoicesBetween(from, to),
    (await expensesCol()).find({ date: { $gte: from, $lte: to } }).limit(20000).toArray(),
    (await payslipsCol()).find({ status: "issued", month: { $gte: months[0], $lte: months[months.length - 1] } }).limit(20000).toArray(),
  ]);
  return months.map((m) => {
    const inv = rows.filter((x) => x.d.date.startsWith(m));
    const ex = exps.map(toExpense).filter((e) => e.date.startsWith(m));
    const sl = slips.map(toPayslip).filter((p) => p.month === m);
    const byCategory: Record<string, number> = {};
    for (const e of ex) byCategory[e.category] = r2((byCategory[e.category] ?? 0) + e.amount);
    const sales = r2(inv.reduce((s, x) => s + x.t.taxable, 0));
    const expenses = r2(ex.reduce((s, e) => s + e.amount, 0));
    const salaries = r2(sl.reduce((s, p) => s + slipTotals(p).gross, 0));
    return {
      month: m,
      sales,
      invoiced: r2(inv.reduce((s, x) => s + x.t.total, 0)),
      received: r2(inv.reduce((s, x) => s + Math.min(x.d.paid, x.t.total), 0)),
      gstOut: r2(inv.reduce((s, x) => s + x.t.tax, 0)),
      expenses,
      gstIn: r2(ex.reduce((s, e) => s + e.gst, 0)),
      salaries,
      profit: r2(sales - expenses - salaries),
      byCategory,
    };
  });
}
export const fyReport = (fy: string) => monthlyReport(fyMonths(fy));

// For the CA: every invoice (output GST) and every expense with GST (input credit) in a period.
export async function gstReport(from: string, to: string) {
  const [{ profile, rows }, exps] = await Promise.all([invoicesBetween(from, to), (await expensesCol()).find({ date: { $gte: from, $lte: to }, gst: { $gt: 0 } }).sort({ date: 1 }).limit(20000).toArray()]);
  const sales = rows.map(({ d, t }) => ({
    number: d.number, date: d.date, client: d.client.company || d.client.name, gstin: d.client.gstin, state: d.client.state || (t.interState ? "Other state" : profile.state),
    type: d.client.gstin ? "B2B" : "B2C", taxable: t.taxable, cgst: t.cgst, sgst: t.sgst, igst: t.igst, total: t.total, rates: t.byRate.filter((b) => b.taxable).map((b) => `${b.rate}%`).join(", "),
  }));
  const purchases = exps.map(toExpense).map((e) => ({ date: e.date, vendor: e.vendor, gstin: e.vendorGstin, billNo: e.billNo, category: e.category, taxable: e.amount, gst: e.gst, total: r2(e.amount + e.gst) }));
  const sum = (a: { [k: string]: unknown }[], k: string) => r2(a.reduce((s, x) => s + (Number(x[k]) || 0), 0));
  const out = { taxable: sum(sales, "taxable"), cgst: sum(sales, "cgst"), sgst: sum(sales, "sgst"), igst: sum(sales, "igst") };
  const gstOut = r2(out.cgst + out.sgst + out.igst);
  const gstIn = sum(purchases, "gst");
  // Credit only counts when the vendor's bill has their GSTIN.
  const eligibleIn = r2(purchases.filter((p) => p.gstin).reduce((s, p) => s + p.gst, 0));
  return { gstOn: !!profile.gstin, ourGstin: profile.gstin, from, to, sales, purchases, totals: { ...out, gstOut, gstIn, eligibleIn, payable: r2(Math.max(0, gstOut - eligibleIn)), carryForward: r2(Math.max(0, eligibleIn - gstOut)) } };
}

// Expenses marked "repeat every month" get next month's copy on the same day (rent, subscriptions).
export async function runRepeatingExpenses() {
  const col = await expensesCol();
  const today = todayIST();
  let made = 0;
  for (let round = 0; round < 24; round++) {
    const due = (await col.find({ repeat: true, copiedTo: { $in: ["", null] } }).limit(500).toArray()).map(toExpense).filter((e) => nextMonthDate(e.date) <= today);
    if (!due.length) break;
    for (const e of due) {
      const date = nextMonthDate(e.date);
      const now = new Date().toISOString();
      const copy = { date, category: e.category, vendor: e.vendor, description: e.description, amount: e.amount, gst: e.gst, vendorGstin: e.vendorGstin, billNo: "", paidVia: e.paidVia, repeat: true, copiedTo: "", createdBy: "Repeats monthly", createdAt: now, updatedAt: now };
      const ins = await col.insertOne(copy);
      const claim = await col.updateOne({ _id: expOid(e.id)!, copiedTo: { $in: ["", null] } }, { $set: { copiedTo: String(ins.insertedId) } });
      if (!claim.modifiedCount) await col.deleteOne({ _id: ins.insertedId }); // another run made it first
      else made++;
    }
  }
  return { made };
}
function nextMonthDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m, Math.min(day, last)));
  return t.toISOString().slice(0, 10);
}
