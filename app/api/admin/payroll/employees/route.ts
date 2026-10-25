import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { blankEmployee } from "@/lib/payroll";
import { cleanEmployeeInput, employeesCol, toEmployee } from "@/lib/payroll-db";

export async function GET() {
  const deny = await guard("payroll", "view");
  if (deny) return deny;
  const docs = await (await employeesCol()).find({}).sort({ active: -1, name: 1 }).limit(2000).toArray();
  return NextResponse.json(docs.map(toEmployee));
}

// New employee. Employee ID is SPX-E-001, SPX-E-002… unless one is given.
export async function POST(req: Request) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const data = cleanEmployeeInput(await jsonBody(req));
  if (!data.name) return NextResponse.json({ error: "Add the employee's name." }, { status: 400 });
  const col = await employeesCol();
  if (!data.empCode) {
    let n = (await col.countDocuments()) + 1;
    while (await col.findOne({ empCode: `SPX-E-${String(n).padStart(3, "0")}` })) n++;
    data.empCode = `SPX-E-${String(n).padStart(3, "0")}`;
  }
  if (await col.findOne({ empCode: data.empCode })) return NextResponse.json({ error: "Another employee already has this employee ID." }, { status: 409 });
  const now = new Date().toISOString();
  const doc = { ...blankEmployee(), ...data, createdAt: now, updatedAt: now };
  const { insertedId } = await col.insertOne(doc);
  await logActivity(await getSession(), "Payroll", "Added an employee", doc.name, req);
  return NextResponse.json({ ...doc, id: String(insertedId) }, { status: 201 });
}
