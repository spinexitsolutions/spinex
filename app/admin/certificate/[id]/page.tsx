import Link from "next/link";
import { notFound } from "next/navigation";
import { Great_Vibes, Playfair_Display } from "next/font/google";
import QRCode from "qrcode";
import { getIntern } from "@/lib/intern-db";
import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { readContentFromDb } from "@/lib/content-server";
import Certificate from "@/components/admin/Certificate";

export const dynamic = "force-dynamic";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-serif" });
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script" });

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!can(session, "people", "view")) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-muted">Your role doesn&apos;t have access to certificates.</div>;
  }
  const [intern, content] = await Promise.all([getIntern(params.id), readContentFromDb()]);
  if (!intern) notFound();
  if (!intern.certId) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl font-semibold">No certificate issued yet</p>
          <p className="mt-2 text-muted">Go back to Interns and press Issue certificate for {intern.name}.</p>
          <Link href="/admin" className="btn-dark mt-6">Back to admin</Link>
        </div>
      </div>
    );
  }

  // QR code opens the public verify page with this certificate number filled in.
  const base = content.certificate.verifyUrl.replace(/\/+$/, "");
  const verifyLink = `${/^https?:\/\//.test(base) ? base : `https://${base}`}?id=${encodeURIComponent(intern.certId)}`;
  const qr = await QRCode.toDataURL(verifyLink, { margin: 0, width: 300, color: { dark: "#120F1B", light: "#FFFFFF" } });

  return (
    <div className={`${serif.variable} ${script.variable}`}>
      <Certificate intern={intern} settings={content.certificate} company={content.brand.name} logo={content.brand.logo} qr={qr} />
    </div>
  );
}
