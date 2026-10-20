import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { readContentFromDb } from "@/lib/content-server";
import BillingEditor from "@/components/billing/BillingEditor";

export const dynamic = "force-dynamic";

export default async function BillingDocPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!can(session, "billing", "view")) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-muted">Your role doesn&apos;t have access to quotations and invoices.</div>;
  }
  const content = await readContentFromDb().catch(() => null);
  return <BillingEditor id={params.id} logo={content?.brand.logo ?? ""} readOnly={!can(session, "billing", "edit")} />;
}
