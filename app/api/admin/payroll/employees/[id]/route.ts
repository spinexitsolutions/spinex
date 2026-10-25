import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { cleanEmployeeInput, employeesCol, payOid, payslipsCol, toEmployee } from "@/lib/payroll-db";
import { loginsCol } from "@/lib/portal-db";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const _id = payOid(params.id);
  const col = await employeesCol();
  const before = _id && (await col.findOne({ _id }));
  if (!_id || !before) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  const data = cleanEmployeeInput(await jsonBody(req));
  if (data.name === "") return NextResponse.json({ error: "Add the employee's name." }, { status: 400 });
  if (data.empCode && (await col.findOne({ empCode: data.empCode, _id: { $ne: _id } }))) return NextResponse.json({ error: "Another employee already has this employee ID." }, { status: 409 });
  const update: Record<string, unknown> = { $set: { ...data, updatedAt: new Date().toISOString() } };
  // Marking them as left, or changing their email, logs them out of the staff portal.
  const logout = (data.active === false && before.active !== false) || (data.email !== undefined && data.email !== before.email);
  if (logout) update.$inc = { tokenVersion: 1 };
  const doc = await col.findOneAndUpdate({ _id }, update, { returnDocument: "after" });
  if (logout) await (await loginsCol()).deleteMany({ clientId: `staff:${String(_id)}` });
  const e = toEmployee(doc!);
  await logActivity(await getSession(), "Payroll", "Edited an employee's salary details", e.name, req);
  return NextResponse.json(e);
}

// Employees with issued payslips are kept (mark them inactive instead), so old payslips stay verifiable.
export async function DELETE(req: Request, { params }: Ctx) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const _id = payOid(params.id);
  const col = await employeesCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  const slips = await payslipsCol();
  if (await slips.findOne({ employeeId: String(_id), status: { $ne: "draft" } })) return NextResponse.json({ error: "This employee has issued payslips. Turn off “Currently working” instead of deleting." }, { status: 409 });
  await slips.deleteMany({ employeeId: String(_id), status: "draft" });
  await col.deleteOne({ _id });
  await logActivity(await getSession(), "Payroll", "Deleted an employee", String(doc.name ?? ""), req);
  return NextResponse.json({ ok: true });
}
