// Server only: quotations and invoices in the "billing" collection.
import { randomBytes } from "crypto";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getDb } from "./db";
import { readSetting } from "./settings-db";
import {
  GST_RATES, INVOICE_STATUSES, QUOTE_STATUSES, defaultProfile, financialYear,
  type BillClient, type BillDoc, type BillItem, type BillingProfile, type DocStatus, type DocType,
} from "./billing";

export const billingCol = async () => (await getDb()).collection("billing");
export const getProfile = async () => {
  const p = await readSetting<BillingProfile>("billing", defaultProfile);
  // Old built-in website address → the one to print now (only when it was never changed by hand).
  if (p.website === "spinexwebsolutions.in") p.website = defaultProfile.website;
  return p;
};

// Stored on each new quotation or invoice (see BillDoc.seller).
export const sellerNow = async () => {
  const p = await getProfile();
  return { gstin: String(p.gstin || "").trim(), state: String(p.state || "").trim() };
};

export function toBill(doc: WithId<Document>): BillDoc {
  const { _id, ...rest } = doc;
  return {
    type: "quote", number: "", date: "", dueDate: "", status: "draft",
    client: { name: "", company: "", phone: "", email: "", address: "", state: "", gstin: "" },
    items: [], discount: 0, notes: "", terms: "", paid: 0, leadId: "", fromQuote: "", fromQuoteNumber: "", invoiceId: "",
    shareToken: "", signers: null, createdBy: "", createdAt: "", updatedAt: "",
    ...(rest as Partial<BillDoc>),
    id: String(_id),
  };
}

export const newToken = () => randomBytes(18).toString("base64url");

// Next number in this financial year: QT/2026-27/001. Uses an atomic counter, so two people never get the same number.
export async function nextNumber(type: DocType, date: string, profile: BillingProfile) {
  const fy = financialYear(date);
  const prefix = (type === "quote" ? profile.quotePrefix : profile.invoicePrefix).trim().replace(/[^A-Za-z0-9-]/g, "") || (type === "quote" ? "QT" : "INV");
  const counters = (await getDb()).collection<{ _id: string; seq: number }>("counters");
  const bump = () => counters.findOneAndUpdate({ _id: `${type}:${fy}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  // Two people starting a new year's series at the same moment: one upsert loses the race, so try once more.
  const res = await bump().catch((e) => {
    if ((e as { code?: number }).code === 11000) return bump();
    throw e;
  });
  const seq = res?.seq ?? 1;
  return `${prefix}/${fy}/${String(seq).padStart(3, "0")}`;
}

const s = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const n = (v: unknown, min = 0, max = 1e10) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x * 100) / 100)) : 0;
};
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");

// Fields the admin screen may change. Number, type and links are set by the server only.
export function cleanBillInput(input: Record<string, unknown>, type: DocType) {
  const out: Partial<BillDoc> = {};
  if ("date" in input) out.date = date(input.date);
  if ("dueDate" in input) out.dueDate = date(input.dueDate);
  if ("status" in input) {
    const allowed: readonly string[] = type === "quote" ? QUOTE_STATUSES : INVOICE_STATUSES;
    if (allowed.includes(String(input.status))) out.status = String(input.status) as DocStatus;
  }
  if (input.client && typeof input.client === "object") {
    const c = input.client as Record<string, unknown>;
    out.client = {
      name: s(c.name, 120), company: s(c.company, 160), phone: s(c.phone, 30), email: s(c.email, 160),
      address: s(c.address, 500), state: s(c.state, 60), gstin: s(c.gstin, 15).toUpperCase(),
    } satisfies BillClient;
  }
  if (Array.isArray(input.items)) {
    out.items = input.items.slice(0, 100).filter((x) => x && typeof x === "object").map((x) => {
      const it = x as Record<string, unknown>;
      const gst = Number(it.gst);
      return {
        id: s(it.id, 40) || randomBytes(4).toString("hex"),
        description: s(it.description, 1000),
        sac: s(it.sac, 10),
        qty: n(it.qty, 0, 1e6),
        rate: n(it.rate, 0, 1e9),
        gst: GST_RATES.includes(gst) ? gst : 0,
      } satisfies BillItem;
    });
  }
  if ("discount" in input) out.discount = n(input.discount);
  if ("paid" in input) out.paid = n(input.paid);
  if ("notes" in input) out.notes = s(input.notes, 2000);
  if ("terms" in input) out.terms = s(input.terms, 3000);
  if ("signers" in input) out.signers = Array.isArray(input.signers) ? input.signers.map((x) => s(x, 40)).filter(Boolean).slice(0, 6) : null;
  return out;
}

export const billOid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
