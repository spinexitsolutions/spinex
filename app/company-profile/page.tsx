import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/admin-guard";
import { getContent } from "@/lib/content-server";
import { SITE_URL } from "@/lib/site";
import ProfileDocument from "@/components/profile/ProfileDocument";
import PrintShell from "@/components/billing/PrintShell";

// Company profile brochure: view and download as PDF. Edited in Admin → Company profile.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: `${content.profile.title} | ${content.brand.name}`,
    description: content.profile.tagline,
    robots: { index: false, follow: true },
  };
}

export default async function CompanyProfilePage() {
  const content = await getContent();
  if (!content.profile.public && process.env.LETTER_SAMPLES !== "1") {
    const session = await getSession().catch(() => null);
    if (!session) notFound();
  }
  const site = content.profile.website.trim() ? (/^https?:\/\//.test(content.profile.website) ? content.profile.website.trim() : `https://${content.profile.website.trim()}`) : SITE_URL;
  const qr = await QRCode.toDataURL(site, { margin: 0, width: 300, color: { dark: "#14111F", light: "#FFFFFF" } });
  return (
    <PrintShell fileName={`${content.brand.name} - ${content.profile.title} ${content.profile.year}`.trim()} extra={<Link href="/" className="btn-ghost px-4 py-2.5 text-sm">Visit website</Link>}>
      <ProfileDocument content={content} qr={qr} />
    </PrintShell>
  );
}
