import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDb } from "@/lib/db";
import { billingCol, getProfile, toBill } from "@/lib/billing-db";
import { computeTotals, docTitle, inr, quoteOpen, todayIST } from "@/lib/billing";
import { getSession } from "@/lib/admin-guard";
import QuoteResponse from "@/components/billing/QuoteResponse";
import PayOnline from "@/components/billing/PayOnline";
import { razorpayKeys } from "@/lib/razorpay";
import { getContent } from "@/lib/content-server";
import BillDocument from "@/components/billing/BillDocument";
import PrintShell from "@/components/billing/PrintShell";

// The client's view-only link to a quotation or invoice: /d/<secret token>.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Document", robots: { index: false, follow: false } };

export default async function SharedDocPage({ params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const raw = await (await billingCol()).findOne({ shareToken: token });
  if (!raw) notFound();
  const doc = toBill(raw);
  // Note when the client opens it (not when the team checks the link). Never touches updatedAt.
  if (!(await getSession().catch(() => null))) {
    const at = new Date().toISOString();
    const col = await billingCol();
    await col.updateOne({ _id: raw._id }, { $inc: { viewCount: 1 }, $set: { lastViewedAt: at } }).catch(() => undefined);
    await col.updateOne({ _id: raw._id, viewedAt: { $in: [null, ""] } }, { $set: { viewedAt: at } }).catch(() => undefined);
  }
  const [profile, content] = await Promise.all([getProfile(), getContent()]);
  const t = computeTotals(doc, profile);
  return (
    <PrintShell fileName={`${docTitle(doc.type, t.gstOn)} ${doc.number.replace(/\//g, "-")} - ${profile.legalName}`}>
      <BillDocument doc={doc} profile={profile} logo={content.brand.logo} />
      {doc.type === "invoice" && doc.status !== "cancelled" && t.balance >= 1 && (await razorpayKeys()).enabled && <PayOnline token={token} due={inr(t.balance, 0)} />}
      {doc.type === "quote" && (
        <QuoteResponse
          token={token}
          version={doc.updatedAt}
          open={quoteOpen(doc, todayIST())}
          expired={!!doc.dueDate && doc.dueDate < todayIST()}
          closed={doc.status === "rejected"}
          acceptance={doc.acceptance ?? (doc.status === "accepted" ? { name: doc.client.name || "you", note: "", at: doc.updatedAt, ip: "", total: t.total } : null)}
          changes={doc.changes ?? []}
          company={doc.client.company}
          total={inr(t.total, 0)}
        />
      )}
    </PrintShell>
  );
}
