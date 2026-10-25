import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { clientIp, rateLimited } from "@/lib/antispam";
import { billingCol } from "@/lib/billing-db";
import { capturePayment, checkoutSignatureOk, fetchPayment, orderBill, recordPayment } from "@/lib/razorpay";

// After Checkout says "paid": check Razorpay's signature, confirm the payment with Razorpay itself, then record it.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (await rateLimited(`pay-verify:${clientIp(req)}`, 40, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries." }, { status: 429 });
  const b = await jsonBody(req);
  const orderId = String(b.orderId ?? "");
  const paymentId = String(b.paymentId ?? "");
  const signature = String(b.signature ?? "");
  if (!/^order_\w{6,40}$/.test(orderId) || !/^pay_\w{6,40}$/.test(paymentId)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (!(await checkoutSignatureOk(orderId, paymentId, signature))) return NextResponse.json({ error: "We couldn't confirm this payment. If money was deducted, it will show here within a few minutes." }, { status: 400 });

  const raw = await (await billingCol()).findOne({ shareToken: String(params.token || ""), type: "invoice" }, { projection: { _id: 1 } });
  const billId = raw ? String(raw._id) : "";
  if (!billId || (await orderBill(orderId)) !== billId) return NextResponse.json({ error: "This payment doesn't belong to this invoice." }, { status: 400 });

  try {
    let pay = await fetchPayment(paymentId);
    if (pay.order_id !== orderId) return NextResponse.json({ error: "This payment doesn't belong to this invoice." }, { status: 400 });
    if (pay.status === "authorized") pay = await capturePayment(paymentId, pay.amount);
    if (pay.status !== "captured") return NextResponse.json({ ok: false, pending: true, message: "Payment is being processed. It will show here once the bank confirms it." });
    const out = await recordPayment({ billId, orderId, paymentId, amountPaise: pay.amount, method: pay.method, source: "checkout", req });
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    console.error("Razorpay verify failed:", e);
    return NextResponse.json({ ok: false, pending: true, message: "Payment received by the bank. It will show here within a few minutes." });
  }
}
