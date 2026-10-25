import { NextResponse } from "next/server";
import { orderBill, recordPayment, webhookSignatureOk, type RzpPayment } from "@/lib/razorpay";

// Razorpay → Webhooks → this URL, event "payment.captured". Records payments even if the client closed the page.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await webhookSignatureOk(raw, req.headers.get("x-razorpay-signature") || ""))) return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  let event: { event?: string; payload?: { payment?: { entity?: RzpPayment } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body." }, { status: 400 });
  }
  const pay = event.payload?.payment?.entity;
  if (event.event === "payment.captured" && pay?.id && pay.order_id && pay.status === "captured") {
    const billId = await orderBill(pay.order_id); // only orders this site made (never trust payment notes)
    if (billId) await recordPayment({ billId, orderId: pay.order_id, paymentId: pay.id, amountPaise: pay.amount, method: pay.method, source: "webhook", req });
  }
  // Always 200 for a correctly signed event, so Razorpay doesn't keep retrying ones we don't use.
  return NextResponse.json({ ok: true });
}
