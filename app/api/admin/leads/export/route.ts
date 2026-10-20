import { guard } from "@/lib/admin-guard";
import { leadsCol, toLead } from "@/lib/lead-db";
import { leadsToCSV } from "@/lib/leads";

export async function GET() {
  const deny = await guard("leads");
  if (deny) return deny;
  const docs = await (await leadsCol()).find().sort({ createdAt: -1 }).toArray();
  return new Response(leadsToCSV(docs.map(toLead)), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="spinex-leads-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
