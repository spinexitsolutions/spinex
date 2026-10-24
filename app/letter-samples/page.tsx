import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { getContent } from "@/lib/content-server";
import { letterVerifyBase } from "@/lib/letter-db";
import { templateFor, verifyLabel, verifyLink } from "@/lib/letters";
import { SAMPLE_HEAD, sampleLetters } from "@/lib/letter-samples";
import LetterDocument from "@/components/letters/LetterDocument";
import PrintShell from "@/components/billing/PrintShell";

// One sample of every HR letter type, filled with made-up data. For the team (login needed),
// and for the automatic check on GitHub that every letter fits on one page (LETTER_SAMPLES=1).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sample letters", robots: { index: false, follow: false } };

export default async function LetterSamplesPage({ searchParams }: { searchParams: { type?: string } }) {
  const ci = process.env.LETTER_SAMPLES === "1";
  if (!ci) {
    const session = await getSession().catch(() => null);
    if (!session) notFound();
    if (!can(session, "people", "view")) return <div className="grid min-h-screen place-items-center p-6 text-center text-muted">Your role doesn&apos;t have access to HR letters.</div>;
  }
  const content = await getContent();
  const base = letterVerifyBase(content.certificate.verifyUrl);
  const all = sampleLetters();
  const list = searchParams.type ? all.filter((l) => l.type === searchParams.type) : all;
  if (!list.length) notFound();
  const qrs = await Promise.all(list.map((l) => QRCode.toDataURL(verifyLink(base, l.verifyCode), { margin: 0, width: 240, color: { dark: "#1D1A26", light: "#FFFFFF" } })));

  return (
    <PrintShell
      fileName={list.length === 1 ? `Sample ${templateFor(list[0].type).label}` : "Spinex sample HR letters"}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin#letters" className="btn-ghost px-4 py-2.5 text-sm">Back to HR letters</Link>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900">Samples with made-up names and details</span>
        </div>
      }
    >
      <div className="space-y-8 print:space-y-0">
        {list.map((l, i) => (
          <div key={l.id} data-letter={l.type} className={i < list.length - 1 ? "print:break-after-page" : ""}>
            <p className="mx-auto mb-2 max-w-[210mm] text-sm font-semibold text-muted print:hidden">{i + 1}. {templateFor(l.type).label}</p>
            <LetterDocument letter={l} head={SAMPLE_HEAD} logo={content.brand.logo} qr={qrs[i]} verifyUrl={verifyLabel(base)} />
          </div>
        ))}
      </div>
    </PrintShell>
  );
}
