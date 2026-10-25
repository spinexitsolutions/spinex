import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { hasDb } from "@/lib/db";
import { getLetterhead, letterVerifyBase } from "@/lib/letter-db";
import { verifyLabel, verifyLink } from "@/lib/letters";
import { monthLabel } from "@/lib/payroll";
import { payslipsCol, toPayslip } from "@/lib/payroll-db";
import { getContent } from "@/lib/content-server";
import PayslipDocument from "@/components/payroll/PayslipDocument";
import PrintShell from "@/components/billing/PrintShell";

// The employee's own view-only link to a payslip: /p/<secret token>. Drafts are never shown here.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payslip", robots: { index: false, follow: false } };

export default async function SharedPayslipPage({ params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const raw = await (await payslipsCol()).findOne({ token, status: { $in: ["issued", "revoked"] } });
  if (!raw) notFound();
  const slip = toPayslip(raw);
  const [head, content] = await Promise.all([getLetterhead(), getContent()]);
  const base = letterVerifyBase(content.certificate.verifyUrl);
  const qr = slip.status === "issued" ? await QRCode.toDataURL(verifyLink(base, slip.verifyCode), { margin: 0, width: 240, color: { dark: "#1D1A26", light: "#FFFFFF" } }) : "";
  return (
    <PrintShell fileName={`Payslip ${monthLabel(slip.month)} - ${slip.emp.name}`}>
      <PayslipDocument slip={slip} head={head} logo={content.brand.logo} qr={qr} verifyUrl={verifyLabel(base)} />
    </PrintShell>
  );
}
