import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { getProfile } from "@/lib/billing-db";
import { writeSetting } from "@/lib/settings-db";
import { defaultProfile } from "@/lib/billing";

// Your business details for quotations and invoices. Anyone who makes quotes can read them; owner and admin can change them.
export async function GET() {
  const deny = await guard("leads");
  if (deny) return deny;
  return NextResponse.json(await getProfile());
}

export async function PUT(req: Request) {
  const deny = await guard("leads");
  if (deny) return deny;
  const s = await getSession();
  if (s?.role !== "owner" && s?.role !== "admin") return NextResponse.json({ error: "Only the owner or an admin can change billing details." }, { status: 403 });
  const b = await jsonBody(req);
  if (typeof b.gstin === "string") b.gstin = b.gstin.trim().toUpperCase();
  if (typeof b.pan === "string") b.pan = b.pan.trim().toUpperCase();
  return NextResponse.json(await writeSetting("billing", defaultProfile, b));
}
