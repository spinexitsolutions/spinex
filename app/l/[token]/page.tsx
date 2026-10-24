import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { hasDb } from "@/lib/db";
import { getLetterhead, letterVerifyBase, lettersCol, toLetter } from "@/lib/letter-db";
import { templateFor, verifyLabel, verifyLink } from "@/lib/letters";
import { getContent } from "@/lib/content-server";
import LetterDocument from "@/components/letters/LetterDocument";
import PrintShell from "@/components/billing/PrintShell";

// The person's own view-only link to their letter: /l/<secret token>.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Letter", robots: { index: false, follow: false } };

export default async function SharedLetterPage({ params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const raw = await (await lettersCol()).findOne({ token });
  if (!raw) notFound();
  const letter = toLetter(raw);
  const [head, content] = await Promise.all([getLetterhead(), getContent()]);
  const base = letterVerifyBase(content.certificate.verifyUrl);
  const qr = letter.status === "issued" ? await QRCode.toDataURL(verifyLink(base, letter.verifyCode), { margin: 0, width: 240, color: { dark: "#1D1A26", light: "#FFFFFF" } }) : "";
  return (
    <PrintShell fileName={`${templateFor(letter.type).label} - ${letter.person.name || letter.number.replace(/\//g, "-")}`}>
      <LetterDocument letter={letter} head={head} logo={content.brand.logo} qr={qr} verifyUrl={verifyLabel(base)} />
    </PrintShell>
  );
}
