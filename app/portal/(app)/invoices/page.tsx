import { ArrowUpRight } from "lucide-react";
import { getClientSession } from "@/lib/client-auth";
import { clientBills } from "@/lib/portal-billing";
import { inr, statusLabel } from "@/lib/billing";
import { shortDate } from "@/lib/portal";

export default async function PortalInvoices() {
  const client = (await getClientSession())!;
  const bills = await clientBills(client);
  const due = bills.reduce((s, b) => s + b.balance, 0);
  const paid = bills.filter((b) => b.type === "invoice").reduce((s, b) => s + Math.min(b.paid, b.total), 0);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Invoices and payments</h1>
      <p className="mt-1 text-muted">Your quotations and invoices. Open one to download the PDF or pay by UPI.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-line bg-white p-6"><p className="text-sm text-muted">Amount due</p><p className={`mt-1 font-display text-3xl font-semibold ${due > 0 ? "text-lav-700" : ""}`}>{inr(due, 0)}</p></div>
        <div className="rounded-[24px] border border-line bg-white p-6"><p className="text-sm text-muted">Paid so far</p><p className="mt-1 font-display text-3xl font-semibold">{inr(paid, 0)}</p></div>
      </div>
      {bills.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">No quotations or invoices yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[20px] border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-muted">
                <th className="px-5 py-3 font-semibold">Document</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
                <th className="px-5 py-3 text-right font-semibold">Due</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3.5"><span className="block font-semibold">{b.number}</span><span className="text-xs text-muted">{b.title}</span></td>
                  <td className="px-5 py-3.5 text-muted">{shortDate(b.date)}{b.dueDate && b.type === "invoice" && b.balance > 0 ? <span className="block text-xs">Due {shortDate(b.dueDate)}</span> : null}</td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums">{inr(b.total, 0)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{b.type === "invoice" ? <span className={b.balance > 0 ? "font-semibold text-lav-700" : "text-muted"}>{inr(b.balance, 0)}</span> : <span className="text-muted">-</span>}</td>
                  <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.status === "paid" || b.status === "accepted" ? "bg-emerald-50 text-emerald-800" : b.status === "cancelled" || b.status === "rejected" ? "bg-mist text-muted" : "bg-amber-50 text-amber-800"}`}>{statusLabel[b.status]}</span></td>
                  <td className="px-5 py-3.5 text-right"><a href={b.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-lav-700 hover:underline">{b.balance > 0 ? "View and pay" : "View"} <ArrowUpRight size={14} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
