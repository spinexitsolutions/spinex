import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { gstReport } from "@/lib/accounts-db";
import { todayIST } from "@/lib/billing";

export const dynamic = "force-dynamic";
const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

// GST summary for a period (?from=&to=, default this month). &format=csv downloads a file for the CA (opens in Excel).
export async function GET(req: Request) {
  const deny = await guard("accounts", "view");
  if (deny) return deny;
  const u = new URL(req.url).searchParams;
  const m = todayIST().slice(0, 7);
  const from = day(u.get("from")) || `${m}-01`;
  const to = day(u.get("to")) || `${m}-31`;
  const r = await gstReport(from, to);
  if (u.get("format") !== "csv") return NextResponse.json(r);

  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...a: unknown[]) => a.map(cell).join(",");
  const t = r.totals;
  const lines = [
    row("GST summary", `${from} to ${to}`), row("Our GSTIN", r.ourGstin || "(not set)"), "",
    row("", "Taxable value", "CGST", "SGST", "IGST", "Total GST"),
    row("GST collected on sales (output)", t.taxable, t.cgst, t.sgst, t.igst, t.gstOut),
    row("GST paid on purchases (input)", "", "", "", "", t.gstIn),
    row("Input credit usable (vendor GSTIN on bill)", "", "", "", "", t.eligibleIn),
    row("GST to pay (output - usable input)", "", "", "", "", t.payable),
    ...(t.carryForward ? [row("Extra input credit to carry forward", "", "", "", "", t.carryForward)] : []),
    "", row("SALES (invoices)"),
    row("Invoice no", "Date", "Client", "Client GSTIN", "Place of supply", "B2B/B2C", "GST rates", "Taxable value", "CGST", "SGST", "IGST", "Invoice total"),
    ...r.sales.map((s) => row(s.number, s.date, s.client, s.gstin, s.state, s.type, s.rates, s.taxable, s.cgst, s.sgst, s.igst, s.total)),
    "", row("PURCHASES (expenses with GST)"),
    row("Date", "Vendor", "Vendor GSTIN", "Bill no", "Category", "Amount before GST", "GST", "Total"),
    ...r.purchases.map((p) => row(p.date, p.vendor, p.gstin, p.billNo, p.category, p.taxable, p.gst, p.total)),
  ];
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="gst-summary-${from}-to-${to}.csv"` },
  });
}
