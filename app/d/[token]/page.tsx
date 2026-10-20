import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDb } from "@/lib/db";
import { billingCol, getProfile, toBill } from "@/lib/billing-db";
import { computeTotals, docTitle } from "@/lib/billing";
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
  const [profile, content] = await Promise.all([getProfile(), getContent()]);
  const t = computeTotals(doc, profile);
  return (
    <PrintShell fileName={`${docTitle(doc.type, t.gstOn)} ${doc.number.replace(/\//g, "-")} - ${profile.legalName}`}>
      <BillDocument doc={doc} profile={profile} logo={content.brand.logo} />
    </PrintShell>
  );
}
