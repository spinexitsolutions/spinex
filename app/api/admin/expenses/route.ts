import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanExpenseInput } from "@/lib/accounts";
import { expensesCol, toExpense } from "@/lib/accounts-db";
import { todayIST, inr } from "@/lib/billing";

export const dynamic = "force-dynamic";

// ?month=YYYY-MM, or ?from=&to= dates. Default: this month.
export async function GET(req: Request) {
  const deny = await guard("accounts", "view");
  if (deny) return deny;
  const u = new URL(req.url).searchParams;
  const month = u.get("month") || todayIST().slice(0, 7);
  const from = u.get("from") || `${month}-01`;
  const to = u.get("to") || `${month}-31`;
  const q: Record<string, unknown> = { date: { $gte: from, $lte: to } };
  if (u.get("category")) q.category = u.get("category");
  const docs = await (await expensesCol()).find(q).sort({ date: -1, createdAt: -1 }).limit(5000).toArray();
  return NextResponse.json(docs.map(toExpense));
}

export async function POST(req: Request) {
  const deny = await guard("accounts");
  if (deny) return deny;
  const b = await jsonBody(req);
  const data = cleanExpenseInput(b);
  if (!data.amount && !data.gst) return NextResponse.json({ error: "Enter the amount.", errors: { amount: "Enter the amount" } }, { status: 400 });
  if (!data.vendor && !data.description) return NextResponse.json({ error: "Who was it paid to, or what was it for?", errors: { vendor: "Paid to whom?" } }, { status: 400 });
  const session = await getSession();
  const now = new Date().toISOString();
  const doc = {
    date: todayIST(), category: "Other", vendor: "", description: "", amount: 0, gst: 0, vendorGstin: "", billNo: "", paidVia: "Bank transfer", repeat: false,
    ...data, copiedTo: "", createdBy: session?.name ?? "", createdAt: now, updatedAt: now,
  };
  const { insertedId } = await (await expensesCol()).insertOne(doc);
  await logActivity(session, "Expenses", `Added an expense of ${inr(doc.amount + doc.gst)} (${doc.category})`, doc.vendor || doc.description, req);
  return NextResponse.json(toExpense({ ...doc, _id: insertedId }), { status: 201 });
}
