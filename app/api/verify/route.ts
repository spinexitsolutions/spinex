import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { internsCol } from "@/lib/intern-db";
import { isLetterCode, templateFor } from "@/lib/letters";
import { lettersCol } from "@/lib/letter-db";
import { isPayslipCode, monthLabel } from "@/lib/payroll";
import { payslipsCol } from "@/lib/payroll-db";

// Public check for internship certificates (SPX-2026-0001) and HR letters (SPX-L-7KQ2X9).
// Returns only what's printed on the document.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim().toUpperCase() ?? "";
  const letter = isLetterCode(id);
  const payslip = isPayslipCode(id);
  if (!letter && !payslip && !/^SPX-\d{4}-\d{4,}$/.test(id)) return NextResponse.json({ valid: false, error: "Enter a number like SPX-2026-0001, SPX-L-7KQ2X9 or SPX-P-4MW8RT." }, { status: 400 });
  if (!hasDb()) return NextResponse.json({ valid: false, error: "Verification is offline right now." }, { status: 503 });
  // Plenty for real checks, too few to guess codes.
  if (await rateLimited(`verify:${clientIp(req)}`, 60, 60 * 60 * 1000)) return NextResponse.json({ valid: false, error: "Too many checks from this connection. Please try again in an hour." }, { status: 429 });

  if (payslip) {
    const doc = await (await payslipsCol()).findOne({ verifyCode: id, status: { $in: ["issued", "revoked"] } }, { projection: { month: 1, number: 1, status: 1, emp: 1, earnings: 1, deductions: 1, issuedAt: 1 } });
    if (!doc) return NextResponse.json({ valid: false });
    if (doc.status === "revoked") return NextResponse.json({ valid: false, error: "This payslip was withdrawn by the company and is no longer valid." });
    const add = (rows: unknown) => (Array.isArray(rows) ? rows.reduce((s: number, r: { amount?: number }) => s + (Number(r?.amount) || 0), 0) : 0);
    const gross = add(doc.earnings);
    // Banks and landlords check the employee, month and pay; nothing else from the payslip is shown.
    return NextResponse.json({
      valid: true,
      kind: "payslip",
      certId: id,
      letterType: "Payslip",
      number: doc.number,
      name: doc.emp?.name ?? "",
      role: doc.emp?.designation ?? "",
      month: monthLabel(String(doc.month)),
      gross,
      net: Math.max(0, gross - add(doc.deductions)),
      issuedOn: doc.issuedAt ? new Date(Date.parse(String(doc.issuedAt)) + 5.5 * 3600e3).toISOString().slice(0, 10) : "",
    });
  }

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
