// Monthly (or quarterly / yearly) bills: an invoice made on its own every period, e.g. SEO or social media retainers.
import type { BillClient, BillItem } from "./billing";

export type Frequency = "monthly" | "quarterly" | "yearly";
export const frequencyLabel: Record<Frequency, string> = { monthly: "Every month", quarterly: "Every 3 months", yearly: "Every year" };
export type Recurring = {
  id: string;
  title: string; // e.g. SEO retainer
  client: BillClient;
  items: BillItem[]; // {month} {year} {period} in a description are filled in on each invoice
  discount: number;
  notes: string;
  frequency: Frequency;
  day: number; // day of the month the invoice is made (1–28)
  nextDate: string; // next invoice date
  endDate: string; // stop after this date ("" = keep going)
  dueDays: number;
  autoSend: boolean; // email (and WhatsApp) the invoice to the client
  active: boolean;
  count: number; // invoices made so far
  lastInvoiceId: string;
  lastNumber: string;
  lastDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const ym = (d: string) => d.slice(0, 7);
export function addMonths(date: string, n: number, day: number) {
  const [y, m] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(28, Math.max(1, day))).padStart(2, "0")}`;
}
export const stepMonths: Record<Frequency, number> = { monthly: 1, quarterly: 3, yearly: 12 };

// "November 2026", or "November 2026 to January 2027" for longer periods.
export function periodLabel(date: string, f: Frequency) {
  const m = (d: string) => new Date(`${ym(d)}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  if (f === "monthly") return m(date);
  const end = addMonths(date, stepMonths[f] - 1, 1);
  return `${m(date)} to ${m(end)}`;
}
export function fillItem(text: string, date: string, f: Frequency) {
  const mon = new Date(`${ym(date)}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" });
  return text.replace(/\{month\}/g, mon).replace(/\{year\}/g, date.slice(0, 4)).replace(/\{period\}/g, periodLabel(date, f));
}
