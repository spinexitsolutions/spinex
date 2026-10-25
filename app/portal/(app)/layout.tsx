import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-auth";
import { getContent } from "@/lib/content-server";
import { ticketsCol } from "@/lib/portal-db";
import PortalNav from "@/components/portal/PortalNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client portal", robots: { index: false, follow: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const client = await getClientSession();
  if (!client) redirect("/portal/login");
  const [content, unread] = await Promise.all([getContent(), (await ticketsCol()).countDocuments({ clientId: client.id, clientUnread: true })]);
  return (
    <div className="min-h-screen bg-mist lg:flex">
      <PortalNav brand={content.brand.name} logo={content.brand.logo} name={client.name} company={client.company} unread={unread} />
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
