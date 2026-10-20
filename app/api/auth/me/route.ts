import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/admin-guard";

export async function GET() {
  const s = await getSession();
  if (!s) return unauthorized();
  return NextResponse.json(s);
}
