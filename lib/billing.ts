// Quotations and invoices: shared types and GST maths. Pure code, used by the server and the admin screens.

export type DocType = "quote" | "invoice";
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;
export const INVOICE_STATUSES = ["unpaid", "partly-paid", "paid", "cancelled"] as const;
export type DocStatus = (typeof QUOTE_STATUSES)[number] | (typeof INVOICE_STATUSES)[number];
export const statusLabel: Record<DocStatus, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected",
  unpaid: "Unpaid", "partly-paid": "Partly paid", paid: "Paid", cancelled: "Cancelled",
};

export const GST_RATES = [0, 5, 12, 18, 28];

export type BillItem = { id: string; description: string; sac: string; qty: number; rate: number; gst: number };

// People who sign quotations and invoices. "show" = ticked by default on new documents.
export type BillSigner = { id: string; name: string; title: string; image: string; show: boolean };

export type BillClient = { name: string; company: string; phone: string; email: string; address: string; state: string; gstin: string };

export type BillDoc = {
  id: string;
  type: DocType;
  number: string; // QT/2026-27/001 or INV/2026-27/001
  date: string; // yyyy-mm-dd
  dueDate: string; // quote: valid till; invoice: due date
  status: DocStatus;
  client: BillClient;
  items: BillItem[];
  discount: number; // ₹, before tax
  notes: string;
  terms: string;
  paid: number; // ₹ received so far (invoices)
  leadId: string;
  fromQuote: string; // quote id this invoice was made from
  fromQuoteNumber: string;
  invoiceId: string; // set on a quote once it is turned into an invoice
  shareToken: string; // for the client's view-only link
  signers: string[] | null; // signer ids shown on this document; null = the default ticks from Billing details
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// Your business details printed on every quotation and invoice (Admin → Quotes and invoices → Settings).
export type BillingProfile = {
  legalName: string;
  address: string;
  state: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upi: string;
  quoteTerms: string;
  invoiceTerms: string;
  quoteValidDays: number;
  invoiceDueDays: number;
  defaultGst: number;
  defaultSac: string;
  signature: string; // old single signature image (kept for documents made before signers existed)
  signers: BillSigner[];
  quotePrefix: string;
  invoicePrefix: string;
};

export const defaultProfile: BillingProfile = {
  legalName: "Spinex IT Solutions",
  address: "Jaipur, Rajasthan",
  state: "Rajasthan",
  gstin: "",
  pan: "",
  phone: "",
  email: "spinexitsolutions@gmail.com",
  website: "spinexitsolutions.com",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  upi: "",
  quoteTerms: "50% advance to start the work, balance before the website goes live.\nPrices are valid till the date shown above.\nDomain, hosting and paid plugins are charged separately unless listed.",
  invoiceTerms: "Please pay by the due date.\nThis is a computer-generated invoice.",
  quoteValidDays: 15,
  invoiceDueDays: 7,
  defaultGst: 18,
  defaultSac: "998314",
  signature: "",
  signers: [
    { id: "s1", name: "Palak Pareek", title: "Founder", image: "", show: true },
    { id: "s2", name: "Supriya Banetiya", title: "E-commerce and Operations", image: "", show: true },
    { id: "s3", name: "Shiva Pareek", title: "Video and Creative", image: "", show: false },
  ],
  quotePrefix: "QT",
  invoicePrefix: "INV",
};

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Outside India",
];

// GST state code = first two digits of a GSTIN.
export const STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", Punjab: "03", Chandigarh: "04", Uttarakhand: "05", Haryana: "06", Delhi: "07",
  Rajasthan: "08", "Uttar Pradesh": "09", Bihar: "10", Sikkim: "11", "Arunachal Pradesh": "12", Nagaland: "13", Manipur: "14",
  Mizoram: "15", Tripura: "16", Meghalaya: "17", Assam: "18", "West Bengal": "19", Jharkhand: "20", Odisha: "21", Chhattisgarh: "22",
  "Madhya Pradesh": "23", Gujarat: "24", "Dadra and Nagar Haveli and Daman and Diu": "26", Maharashtra: "27", Karnataka: "29",
  Goa: "30", Lakshadweep: "31", Kerala: "32", "Tamil Nadu": "33", Puducherry: "34", "Andaman and Nicobar Islands": "35",
  Telangana: "36", "Andhra Pradesh": "37", Ladakh: "38",
};

export const stateFromGstin = (gstin: string) => {
  const code = String(gstin || "").trim().slice(0, 2);
  return Object.keys(STATE_CODES).find((s) => STATE_CODES[s] === code) || "";
};

export const validGstin = (g: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(g || "").trim().toUpperCase());

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : 0);

export type TaxLine = { rate: number; taxable: number; cgst: number; sgst: number; igst: number };
export type Totals = {
  subtotal: number; // before discount
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  roundOff: number;
  total: number; // rounded to the rupee
  interState: boolean; // IGST instead of CGST + SGST
  exportSupply: boolean; // client outside India: zero-rated (export under LUT), no GST charged
  gstOn: boolean; // false when you have no GSTIN: no tax is charged
  byRate: TaxLine[];
  lines: { id: string; amount: number }[]; // qty × rate per item
  balance: number; // total − paid
};

// Your GSTIN decides whether GST is charged; same state → CGST + SGST, other state → IGST.
export function computeTotals(doc: Pick<BillDoc, "items" | "discount" | "client" | "paid">, profile: Pick<BillingProfile, "state" | "gstin">): Totals {
  const gstOn = !!String(profile.gstin || "").trim();
  const ours = String(profile.state || "").trim().toLowerCase();
  const theirs = String(doc.client?.state || stateFromGstin(doc.client?.gstin || "") || "").trim().toLowerCase();
  // Export of services (client outside India) is zero-rated when you supply under LUT, so no GST is added.
  const exportSupply = gstOn && theirs === "outside india";
  const interState = gstOn && !!theirs && !!ours && theirs !== ours;
  const lines = (doc.items || []).map((it) => ({ id: it.id, amount: r2(num(it.qty) * num(it.rate)), gst: Math.max(0, num(it.gst)) }));
  const subtotal = r2(lines.reduce((s, l) => s + l.amount, 0));
  const discount = r2(Math.min(Math.max(0, num(doc.discount)), subtotal));
  // The discount is shared across items by their amount, so each GST rate is charged on its share.
  const groups = new Map<number, number>();
  for (const l of lines) {
    const share = subtotal > 0 ? l.amount - (discount * l.amount) / subtotal : 0;
    const rate = gstOn && !exportSupply ? l.gst : 0;
    groups.set(rate, (groups.get(rate) ?? 0) + share);
  }
  const byRate: TaxLine[] = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([rate, taxable]) => {
    const t = r2(taxable);
    if (interState) return { rate, taxable: t, cgst: 0, sgst: 0, igst: r2((t * rate) / 100) };
    // CGST and SGST are each half the rate, so they are always the same amount.
    const half = r2((t * rate) / 200);
    return { rate, taxable: t, cgst: half, sgst: half, igst: 0 };
  });
  const taxable = r2(byRate.reduce((s, x) => s + x.taxable, 0));
  const cgst = r2(byRate.reduce((s, x) => s + x.cgst, 0));
  const sgst = r2(byRate.reduce((s, x) => s + x.sgst, 0));
  const igst = r2(byRate.reduce((s, x) => s + x.igst, 0));
  const tax = r2(cgst + sgst + igst);
  const exact = r2(taxable + tax);
  const total = Math.round(exact);
  const paid = r2(Math.max(0, num(doc.paid)));
  return {
    subtotal, discount, taxable, cgst, sgst, igst, tax, roundOff: r2(total - exact), total, interState, exportSupply, gstOn, byRate,
    lines: lines.map(({ id, amount }) => ({ id, amount })),
    balance: r2(Math.max(0, total - paid)),
  };
}

export const inr = (n: number, decimals = 2) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

// 125000 → "One Lakh Twenty-Five Thousand Rupees Only"
export function amountInWords(amount: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n: number) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? `-${ones[n % 10]}` : ""}`);
  const three = (n: number) => [n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred` : "", n % 100 ? two(n % 100) : ""].filter(Boolean).join(" ");
  const words = (n: number): string => {
    if (n === 0) return "";
    const parts: string[] = [];
    const crore = Math.floor(n / 1e7);
    const lakh = Math.floor((n % 1e7) / 1e5);
    const thousand = Math.floor((n % 1e5) / 1e3);
    const rest = n % 1e3;
    if (crore) parts.push(`${words(crore)} Crore`);
    if (lakh) parts.push(`${two(lakh)} Lakh`);
    if (thousand) parts.push(`${two(thousand)} Thousand`);
    if (rest) parts.push(three(rest));
    return parts.join(" ");
  };
  const n = Math.abs(Math.round((Number(amount) || 0) * 100));
  const rupees = Math.floor(n / 100);
  const paise = n % 100;
  const r = rupees ? `${words(rupees)} Rupees` : "Zero Rupees";
  return `${r}${paise ? ` and ${two(paise)} Paise` : ""} Only`;
}

// Indian financial year (April–March) for a date: "2026-27".
export function financialYear(date: string | Date = new Date()) {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (Number(days) || 0));
  return d.toISOString().slice(0, 10);
};

export const docTitle = (t: DocType, gstOn: boolean) => (t === "quote" ? "Quotation" : gstOn ? "Tax Invoice" : "Invoice");

export const blankItem = (gst: number, sac: string, id: string): BillItem => ({ id, description: "", sac, qty: 1, rate: 0, gst });

// Who signs this document: its own choice, or the default ticks. Old single-signature setups still work.
export function docSigners(doc: Pick<BillDoc, "signers">, profile: Pick<BillingProfile, "signers" | "signature">): BillSigner[] {
  const all = Array.isArray(profile.signers) ? profile.signers.filter((x) => x && x.id) : [];
  if (!all.length) return profile.signature ? [{ id: "legacy", name: "", title: "Authorised signatory", image: profile.signature, show: true }] : [];
  return Array.isArray(doc.signers) ? all.filter((x) => doc.signers!.includes(x.id)) : all.filter((x) => x.show);
}
