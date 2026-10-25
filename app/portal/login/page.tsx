import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getClientSession } from "@/lib/client-auth";
import { getContent } from "@/lib/content-server";
import PortalLogin from "@/components/portal/PortalLogin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client login", robots: { index: false, follow: false } };

export default async function PortalLoginPage({ searchParams }: { searchParams: { email?: string } }) {
  if (await getClientSession()) redirect("/portal");
  const content = await getContent();
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-lav-600/30 blur-[130px]" />
      <div className="relative flex w-full flex-col items-center">
        <PortalLogin initialEmail={String(searchParams.email ?? "").slice(0, 160)} brand={content.brand.name} />
        <Link href="/" className="mt-6 text-sm text-white/60 hover:text-white">Back to website</Link>
      </div>
    </main>
  );
}
