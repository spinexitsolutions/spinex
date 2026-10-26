import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanExpenseInput } from "@/lib/accounts";
import { expOid, expensesCol, toExpense } from "@/lib/accounts-db";
import { inr } from "@/lib/billing";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("accounts");
  if (deny) return deny;
  const _id = expOid(params.id);
  if (!_id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const data = cleanExpenseInput(await jsonBody(req));
  const col = await expensesCol();
  const r = await col.findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  if (!r) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const e = toExpense(r);
  await logActivity(await getSession(), "Expenses", `Changed an expense (${inr(e.amount + e.gst)}, ${e.category})`, e.vendor || e.description, req);
  return NextResponse.json(e);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("accounts");
  if (deny) return deny;
  const _id = expOid(params.id);
  const col = await expensesCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await col.deleteOne({ _id: doc._id });
  // Deleting a repeating expense ends the repeat: the month before keeps pointing at this one, so it
  // isn't made again tomorrow.
  const e = toExpense(doc);
  await logActivity(await getSession(), "Expenses", `Deleted an expense (${inr(e.amount + e.gst)}, ${e.category})`, e.vendor || e.description, req);
  return NextResponse.json({ ok: true });
}
