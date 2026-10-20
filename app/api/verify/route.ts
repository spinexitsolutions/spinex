import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { internsCol } from "@/lib/intern-db";

// Public certificate check. Returns only what's printed on the certificate.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim().toUpperCase() ?? "";
  if (!/^SPX-\d{4}-\d{4,}$/.test(id)) return NextResponse.json({ valid: false, error: "Enter a number like SPX-2026-0001." }, { status: 400 });
  if (!hasDb()) return NextResponse.json({ valid: false, error: "Verification is offline right now." }, { status: 503 });
  const doc = await (await internsCol()).findOne({ certId: id }, { projection: { name: 1, role: 1, startDate: 1, endDate: 1, issuedOn: 1, certId: 1 } });
  if (!doc) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, certId: doc.certId, name: doc.name, role: doc.role, startDate: doc.startDate, endDate: doc.endDate, issuedOn: doc.issuedOn });
}
