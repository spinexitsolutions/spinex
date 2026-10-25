// Server only. Online invoice payments with Razorpay (Orders API + Checkout + webhook).
import { createHmac, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { getSecret } from "./secrets";
import { billingCol, getProfile, toBill } from "./billing-db";
import { computeTotals, inr } from "./billing";
import { notifyAdmin } from "./notify";
import { sendWhatsAppAlert } from "./whatsapp-alert";
import { logActivity } from "./activity";
import { getContent } from "./content-server";
import { SITE_URL } from "./site";

export async function razorpayKeys() {
  const [keyId, keySecret, webhookSecret] = await Promise.all([getSecret("RAZORPAY_KEY_ID"), getSecret("RAZORPAY_KEY_SECRET"), getSecret("RAZORPAY_WEBHOOK_SECRET")]);
  return { keyId, keySecret, webhookSecret, enabled: !!keyId && !!keySecret };
}

async function rzp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { keyId, keySecret } = await razorpayKeys();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(data.error?.description || `Razorpay error ${res.status}`);
  return data;
}

export type RzpOrder = { id: string; amount: number; currency: string; receipt: string; status: string };
export type RzpPayment = { id: string; order_id: string; amount: number; currency: string; status: string; method: string; email?: string; contact?: string; notes?: Record<string, string> };

const ordersCol = async () => (await getDb()).collection<{ _id: string; billId: string; amount: number; createdAt: Date }>("online_orders");
let paymentsReady = false;
export async function paymentsCol() {
  const col = (await getDb()).collection<{ _id: string; billId: string; orderId: string; amount: number; method: string; source: string; at: Date }>("online_payments");
  if (!paymentsReady) {
    await col.createIndex({ billId: 1, at: -1 }).catch(() => undefined);
    paymentsReady = true;
  }
  return col;
}

// New Razorpay order for what is still due on an invoice (amount in paise).
export async function createOrderForBill(billId: string, number: string, amountRupees: number) {
  const amount = Math.round(amountRupees * 100);
  const order = await rzp<RzpOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount, currency: "INR", receipt: number.slice(0, 40), notes: { billId, invoice: number } }),
  });
  await (await ordersCol()).updateOne({ _id: order.id }, { $set: { billId, amount, createdAt: new Date() } }, { upsert: true });
  return order;
}

export async function orderBill(orderId: string) {
  return (await (await ordersCol()).findOne({ _id: orderId }))?.billId ?? "";
}

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// The signature Checkout returns after a payment: HMAC-SHA256(order_id|payment_id, key secret).
export async function checkoutSignatureOk(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = await razorpayKeys();
  if (!keySecret || !signature) return false;
  return safeEqual(createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}

// Webhook signature: HMAC-SHA256(raw body, webhook secret).
export async function webhookSignatureOk(raw: string, signature: string) {
  const { webhookSecret } = await razorpayKeys();
  if (!webhookSecret || !signature) return false;
  return safeEqual(createHmac("sha256", webhookSecret).update(raw).digest("hex"), signature);
}

export const fetchPayment = (id: string) => rzp<RzpPayment>(`/payments/${encodeURIComponent(id)}`);
export const capturePayment = (id: string, amount: number) => rzp<RzpPayment>(`/payments/${encodeURIComponent(id)}/capture`, { method: "POST", body: JSON.stringify({ amount, currency: "INR" }) });

// Adds a captured payment to its invoice once (safe to call again for the same payment: from the browser and the webhook).
export async function recordPayment(p: { billId: string; orderId: string; paymentId: string; amountPaise: number; method: string; source: "checkout" | "webhook"; req?: Request }) {
  const _id = ObjectId.isValid(p.billId) ? new ObjectId(p.billId) : null;
  if (!_id || !p.paymentId || p.amountPaise <= 0) return { recorded: false };
  const amount = Math.round(p.amountPaise) / 100;
  try {
    await (await paymentsCol()).insertOne({ _id: p.paymentId, billId: p.billId, orderId: p.orderId, amount, method: p.method, source: p.source, at: new Date() });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { recorded: false, already: true };
    throw e;
  }
  const col = await billingCol();
  const now = new Date().toISOString();
  const after = await col.findOneAndUpdate(
    { _id, type: "invoice" },
    { $inc: { paid: amount }, $push: { onlinePayments: { id: p.paymentId, orderId: p.orderId, amount, method: p.method, at: now } } as never, $set: { updatedAt: now } },
    { returnDocument: "after" },
  );
  if (!after) return { recorded: false };
  const doc = toBill(after);
  const t = computeTotals(doc, await getProfile());
  if (doc.status !== "cancelled") {
    const status = doc.paid >= t.total - 0.5 ? "paid" : "partly-paid";
    if (status !== doc.status) await col.updateOne({ _id }, { $set: { status } });
  }
  const who = doc.client.company || doc.client.name || "A client";
  const adminUrl = `${process.env.NODE_ENV === "production" || !p.req ? SITE_URL : new URL(p.req.url).origin}/admin/billing/${doc.id}`;
  const left = Math.max(0, t.total - doc.paid);
  const content = await getContent().catch(() => null);
  await Promise.all([
    notifyAdmin(`Payment received: ${inr(amount, 0)} for ${doc.number} (${who})`, [["Invoice", doc.number], ["Client", who], ["Amount", inr(amount)], ["Method", p.method || "online"], ["Razorpay payment", p.paymentId], ["Still due", inr(left)]], adminUrl).catch(() => undefined),
    content?.leadReplies?.whatsappAlert ? sendWhatsAppAlert(`💰 Payment received\n${who} paid ${inr(amount, 0)} for ${doc.number} by ${p.method || "online payment"}.${left > 0 ? `\nStill due: ${inr(left, 0)}` : "\nFully paid."}\n${adminUrl}`).catch(() => undefined) : Promise.resolve(),
  ]);
  await logActivity({ name: "Razorpay", uid: "", role: "" }, "Invoices", `Online payment ${inr(amount, 0)} received for invoice ${doc.number} (${p.paymentId})`, who, p.req);
  return { recorded: true, paid: doc.paid, total: t.total };
}
