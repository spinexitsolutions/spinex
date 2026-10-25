"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";

type RazorpayHandlerResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance }
}

const loadCheckout = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// "Pay now" on the client's invoice link (UPI, cards, netbanking and wallets through Razorpay).
export default function PayOnline({ token, due }: { token: string; due: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      if (!(await loadCheckout()) || !window.Razorpay) throw new Error("The payment window couldn't load. Check your internet and try again.");
      const res = await fetch(`/api/pay/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const o = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(o.error || "Couldn't start the payment.");
      const rz = new window.Razorpay({
        key: o.keyId,
        order_id: o.orderId,
        amount: o.amount,
        currency: o.currency,
        name: o.name,
        description: o.description,
        ...(o.logo ? { image: o.logo } : {}),
        prefill: o.prefill,
        theme: { color: "#6e59d9" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (r: RazorpayHandlerResponse) => {
          const v = await fetch(`/api/pay/${token}/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }) });
          const d = await v.json().catch(() => ({}));
          setBusy(false);
          if (d.ok) {
            setDone("Payment successful. Thank you! Your receipt is on its way from Razorpay.");
            setTimeout(() => window.location.reload(), 2500);
          } else setDone(d.message || d.error || "Payment received. It will show here shortly.");
        },
      });
      rz.on("payment.failed", (r) => {
        setError(r.error?.description || "The payment failed. No money was taken. Please try again.");
        setBusy(false);
      });
      rz.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the payment.");
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto mt-6 max-w-[210mm] rounded-2xl border border-line bg-white p-5 sm:p-6 print:hidden">
      {done ? (
        <p className="flex items-start gap-3 text-emerald-800"><CheckCircle2 className="mt-0.5 shrink-0" size={22} /> {done}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold">Pay {due} online</p>
            <p className="text-sm text-muted">UPI, debit or credit card, netbanking or wallet. Secured by Razorpay.</p>
          </div>
          <button onClick={pay} disabled={busy} className="btn-dark px-6 py-3.5 text-sm">{busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Pay {due} now</button>
          {error && <p className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
