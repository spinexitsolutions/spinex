import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { readContentFromDb } from "@/lib/content-server";
import { letterVerifyBase } from "@/lib/letter-db";
import LetterEditor from "@/components/letters/LetterEditor";

export const dynamic = "force-dynamic";

export default async function LetterPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!can(session, "people", "view")) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-muted">Your role doesn&apos;t have access to HR letters.</div>;
  }
  const content = await readContentFromDb().catch(() => null);
  return (
    <LetterEditor
      id={params.id}
      logo={content?.brand.logo ?? ""}
      verifyBase={letterVerifyBase(content?.certificate.verifyUrl)}
      readOnly={!can(session, "people", "edit")}
    />
  );
}
