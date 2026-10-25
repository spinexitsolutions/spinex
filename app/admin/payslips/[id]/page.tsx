import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { readContentFromDb } from "@/lib/content-server";
import { letterVerifyBase } from "@/lib/letter-db";
import PayslipEditor from "@/components/payroll/PayslipEditor";

export const dynamic = "force-dynamic";

export default async function PayslipPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!can(session, "payroll", "view")) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-muted">Your role doesn&apos;t have access to payslips.</div>;
  }
  const content = await readContentFromDb().catch(() => null);
  return <PayslipEditor id={params.id} logo={content?.brand.logo ?? ""} verifyBase={letterVerifyBase(content?.certificate.verifyUrl)} readOnly={!can(session, "payroll", "edit")} />;
}
