import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { leadTeam } from "@/lib/team";

// Names for the "Assigned to" list on leads (no emails are sent to the browser).
export async function GET() {
  const deny = await guard("leads", "view");
  if (deny) return deny;
  return NextResponse.json((await leadTeam()).map(({ id, name, role }) => ({ id, name, role })));
}
