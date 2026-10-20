import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { listVersions } from "@/lib/content-server";

export async function GET() {
  const deny = await guard("content");
  if (deny) return deny;
  return NextResponse.json(await listVersions());
}
