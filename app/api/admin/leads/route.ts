import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { leadsCol, toLead } from "@/lib/lead-db";

export async function GET() {
  const deny = await guard("leads");
  if (deny) return deny;
  const docs = await (await leadsCol()).find().sort({ createdAt: -1 }).limit(3000).toArray();
  return NextResponse.json(docs.map(toLead));
}
