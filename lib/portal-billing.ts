// Server only. Quotations and invoices linked to a portal client, with totals.
import { billingCol, getProfile, toBill } from "./billing-db";
import { computeTotals, docTitle } from "./billing";
import { pOid } from "./portal-db";
import type { PortalClient } from "./portal";

export async function clientBills(client: PortalClient) {
  const ids = client.billingIds.map(pOid).filter((x): x is NonNullable<typeof x> => !!x);
  if (!ids.length) return [];
  const [docs, profile] = await Promise.all([(await billingCol()).find({ _id: { $in: ids } }).sort({ date: -1, createdAt: -1 }).toArray(), getProfile()]);
  return docs.map(toBill).map((d) => {
    const t = computeTotals(d, profile);
    return { id: d.id, type: d.type, title: docTitle(d.type, t.gstOn), number: d.number, date: d.date, dueDate: d.dueDate, status: d.status, total: t.total, paid: d.type === "invoice" ? d.paid : 0, balance: d.type === "invoice" && d.status !== "cancelled" ? t.balance : 0, link: `/d/${d.shareToken}` };
  });
}
