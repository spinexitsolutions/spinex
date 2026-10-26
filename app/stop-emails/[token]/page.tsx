import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDb } from "@/lib/db";
import { findByStopToken } from "@/lib/lead-followups";
import { getContent } from "@/lib/content-server";
import StopEmails from "@/components/StopEmails";

// Link at the bottom of every automatic follow-up email. One click (a button, so email scanners can't trigger it).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stop follow-up emails", robots: { index: false, follow: false } };

export default async function StopEmailsPage({ params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{10,40}$/.test(token)) notFound();
  const lead = await findByStopToken(token);
  if (!lead) notFound();
  const content = await getContent();
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 py-10">
      <StopEmails token={token} brand={content.brand.name || "Spinex IT Solutions"} name={lead.name.split(" ")[0] || ""} stopped={lead.stopped} />
    </main>
  );
}
