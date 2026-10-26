// Expenses, monthly profit and loss, and the GST summary for the CA. Shared by the server and the admin screen.

export const EXPENSE_CATEGORIES = [
  "Rent", "Software and tools", "Ads and marketing", "Freelancers", "Electricity and internet", "Phone and mobile",
  "Office supplies", "Equipment", "Travel and food", "Bank and payment charges", "Professional fees (CA, legal)", "Taxes and fees", "Other",
] as const;
export const PAID_VIA = ["Bank transfer", "UPI", "Card", "Cash", "Cheque"];

export type Expense = {
  id: string;
  date: string;
  category: string;
  vendor: string;
  description: string;
  amount: number; // before GST
  gst: number; // GST on the vendor's bill (input tax credit, if their bill has your GSTIN)
  vendorGstin: string;
  billNo: string;
  paidVia: string;
  repeat: boolean; // add it again every month (rent, subscriptions)
  copiedTo: string; // next month's copy (repeat chain)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthRow = {
  month: string; // YYYY-MM
  sales: number; // invoiced, before GST
  invoiced: number; // with GST
  received: number; // paid so far on those invoices
  gstOut: number;
  expenses: number; // before GST
  gstIn: number;
  salaries: number; // gross pay on issued payslips
  profit: number;
  byCategory: Record<string, number>;
};

// Indian financial year "2026-27" → its 12 months, April to March.
export function fyMonths(fy: string) {
  const y = Number(fy.slice(0, 4));
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1;
    return `${m <= 3 ? y + 1 : y}-${String(m).padStart(2, "0")}`;
  });
}
export const fyOf = (date: string) => {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};
export const monthName = (m: string, opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function cleanExpenseInput(b: Record<string, unknown>) {
  const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
  const out: Partial<Expense> = {};
  if (b.date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) out.date = String(b.date);
  if (b.category !== undefined) out.category = (EXPENSE_CATEGORIES as readonly string[]).includes(String(b.category)) ? String(b.category) : "Other";
  if (b.vendor !== undefined) out.vendor = s(b.vendor, 120);
  if (b.description !== undefined) out.description = s(b.description, 300);
  if (b.amount !== undefined) out.amount = Math.max(0, Math.min(1e9, r2(Number(b.amount))));
  if (b.gst !== undefined) out.gst = Math.max(0, Math.min(1e9, r2(Number(b.gst))));
  if (b.vendorGstin !== undefined) out.vendorGstin = s(b.vendorGstin, 15).toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (b.billNo !== undefined) out.billNo = s(b.billNo, 40);
  if (b.paidVia !== undefined) out.paidVia = PAID_VIA.includes(String(b.paidVia)) ? String(b.paidVia) : "Bank transfer";
  if (b.repeat !== undefined) out.repeat = !!b.repeat;
  return out;
}
