import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-auth";
import { getContent } from "@/lib/content-server";
import PortalLogin from "@/components/portal/PortalLogin";
import LoginShell from "@/components/portal/LoginShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff login", robots: { index: false, follow: false } };

export default async function StaffLoginPage({ searchParams }: { searchParams: { email?: string } }) {
  if (await getStaffSession()) redirect("/staff");
  const content = await getContent();
  return (
    <LoginShell kind="staff" content={content}>
      <PortalLogin initialEmail={String(searchParams.email ?? "").slice(0, 160)} api="/api/staff/login" next="/staff" placeholder="you@yourwork.email" intro="Log in with your work email. We’ll send you a 6-digit code, no password needed." />
    </LoginShell>
  );
}
