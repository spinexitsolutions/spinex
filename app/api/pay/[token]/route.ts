import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/antispam";
import { hasDb } from "@/lib/db";
import { billingCol, getProfile, toBill } from "@/lib/billing-db";
import { computeTotals } from "@/lib/billing";
import { createOrderForBill, razorpayKeys } from "@/lib/razorpay";
import { getContent } from "@/lib/content-server";

// "Pay now" on an invoice link: makes a Razorpay order for the amount still due.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!hasDb()) return NextResponse.json({ error: "Online payment is offline right now. Please pay by UPI or bank transfer." }, { status: 503 });
  if (!(req.headers.get("content-type") || "").includes("application/json")) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const token = String(params.token || "");
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await rateLimited(`pay-order:${clientIp(req)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait a while." }, { status: 429 });
  const keys = await razorpayKeys();
  if (!keys.enabled) return NextResponse.json({ error: "Online payment isn't set up yet. Please pay by UPI or bank transfer." }, { status: 400 });

  const raw = await (await billingCol()).findOne({ shareToken: token, type: "invoice" });
  if (!raw) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const doc = toBill(raw);
  if (doc.status === "cancelled") return NextResponse.json({ error: "This invoice is cancelled." }, { status: 400 });
  const [profile, content] = await Promise.all([getProfile(), getContent()]);
  const due = Math.round(computeTotals(doc, profile).balance * 100) / 100;
  if (due < 1) return NextResponse.json({ error: "Nothing is due on this invoice." }, { status: 400 });
  try {
    const order = await createOrderForBill(doc.id, doc.number, due);
    return NextResponse.json({
      keyId: keys.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: profile.legalName,
      description: `Invoice ${doc.number}`,
      logo: content.brand.logo && /^https?:\/\//.test(content.brand.logo) ? content.brand.logo : "",
      prefill: { name: doc.client.name, email: doc.client.email, contact: doc.client.phone },
    });
  } catch (e) {
    console.error("Razorpay order failed:", e);
    return NextResponse.json({ error: "Couldn't start the payment. Please try again, or pay by UPI." }, { status: 502 });
  }
}
