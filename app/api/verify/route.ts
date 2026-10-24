import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { internsCol } from "@/lib/intern-db";
import { isLetterCode, templateFor } from "@/lib/letters";
import { lettersCol } from "@/lib/letter-db";

// Public check for internship certificates (SPX-2026-0001) and HR letters (SPX-L-7KQ2X9).
// Returns only what's printed on the document.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim().toUpperCase() ?? "";
  const letter = isLetterCode(id);
  if (!letter && !/^SPX-\d{4}-\d{4,}$/.test(id)) return NextResponse.json({ valid: false, error: "Enter a number like SPX-2026-0001 or SPX-L-7KQ2X9." }, { status: 400 });
  if (!hasDb()) return NextResponse.json({ valid: false, error: "Verification is offline right now." }, { status: 503 });

  if (letter) {
    const doc = await (await lettersCol()).findOne({ verifyCode: id, status: { $in: ["issued", "revoked"] } }, { projection: { type: 1, number: 1, status: 1, date: 1, person: 1, fields: 1 } });
    if (!doc) return NextResponse.json({ valid: false });
    if (doc.status === "revoked") return NextResponse.json({ valid: false, error: "This letter was withdrawn by the company and is no longer valid." });
    const f = (doc.fields ?? {}) as Record<string, string>;
    return NextResponse.json({
      valid: true,
      kind: "letter",
      certId: id,
      letterType: templateFor(String(doc.type)).label,
      number: doc.number,
      name: doc.person?.name ?? "",
      role: f.newDesignation || f.designation || f.role || "",
      issuedOn: doc.date,
    });
  }

  const doc = await (await internsCol()).findOne({ certId: id }, { projection: { name: 1, role: 1, startDate: 1, endDate: 1, issuedOn: 1, certId: 1 } });
  if (!doc) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, kind: "certificate", certId: doc.certId, name: doc.name, role: doc.role, startDate: doc.startDate, endDate: doc.endDate, issuedOn: doc.issuedOn });
}
