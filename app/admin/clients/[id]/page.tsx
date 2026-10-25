import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import ClientEditor from "@/components/portal/ClientEditor";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const session = await getSession();
  if (!can(session, "clients", "view")) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-muted">Your role doesn&apos;t have access to the client portal.</div>;
  }
  return <ClientEditor id={params.id} initialTab={String(searchParams.tab ?? "projects")} readOnly={!can(session, "clients", "edit")} me={session?.name ?? "Team"} />;
}
