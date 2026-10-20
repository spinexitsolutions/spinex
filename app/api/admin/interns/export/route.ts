import { guard } from "@/lib/admin-guard";
import { internsCol, toIntern } from "@/lib/intern-db";
import { toCSV } from "@/lib/interns";

export async function GET() {
  const deny = await guard("people", "view");
  if (deny) return deny;
  const docs = await (await internsCol()).find().sort({ createdAt: -1 }).toArray();
  return new Response(toCSV(docs.map(toIntern)), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="spinex-interns-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
