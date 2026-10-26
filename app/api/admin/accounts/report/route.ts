import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { fyOf, monthName } from "@/lib/accounts";
import { fyReport } from "@/lib/accounts-db";
import { todayIST } from "@/lib/billing";

export const dynamic = "force-dynamic";

// Month-by-month profit and loss for a financial year (?fy=2026-27).
export async function GET(req: Request) {
  const deny = await guard("accounts", "view");
  if (deny) return deny;
  const q = new URL(req.url).searchParams.get("fy") || "";
  const fy = /^\d{4}-\d{2}$/.test(q) ? q : fyOf(todayIST());
  const months = await fyReport(fy);
  const sum = (k: "sales" | "invoiced" | "received" | "gstOut" | "expenses" | "gstIn" | "salaries" | "profit") => Math.round(months.reduce((s, m) => s + m[k], 0) * 100) / 100;
  const byCategory: Record<string, number> = {};
  for (const m of months) for (const [k, v] of Object.entries(m.byCategory)) byCategory[k] = Math.round(((byCategory[k] ?? 0) + v) * 100) / 100;
  const totals = { sales: sum("sales"), invoiced: sum("invoiced"), received: sum("received"), gstOut: sum("gstOut"), expenses: sum("expenses"), gstIn: sum("gstIn"), salaries: sum("salaries"), profit: sum("profit"), byCategory };
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const cats = Object.keys(byCategory).sort();
    const row = (a: unknown[]) => a.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",");
    const lines = [
      row([`Profit and loss, financial year ${fy}`]), "",
      row(["Month", "Sales (before GST)", "Invoiced (with GST)", "Received", "Expenses (before GST)", "Salaries", "Profit", "GST collected", "GST on expenses", ...cats]),
      ...months.map((m) => row([monthName(m.month), m.sales, m.invoiced, m.received, m.expenses, m.salaries, m.profit, m.gstOut, m.gstIn, ...cats.map((c) => m.byCategory[c] ?? 0)])),
      row(["Total", totals.sales, totals.invoiced, totals.received, totals.expenses, totals.salaries, totals.profit, totals.gstOut, totals.gstIn, ...cats.map((c) => byCategory[c])]),
    ];
    return new NextResponse("\ufeff" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="profit-and-loss-${fy}.csv"` } });
  }
  return NextResponse.json({
    fy, today: todayIST(), months,
    totals,
  });
}
