import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-auth";
import { getContent } from "@/lib/content-server";
import PortalLogin from "@/components/portal/PortalLogin";
import LoginShell from "@/components/portal/LoginShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client login", robots: { index: false, follow: false } };

export default async function PortalLoginPage({ searchParams }: { searchParams: { email?: string } }) {
  if (await getClientSession()) redirect("/portal");
  const content = await getContent();
  return (
    <LoginShell kind="client" content={content}>
      <PortalLogin initialEmail={String(searchParams.email ?? "").slice(0, 160)} />
    </LoginShell>
  );
}
