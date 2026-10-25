import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { monthLabel, recalc, withAttendance } from "@/lib/payroll";
import { monthAttendance } from "@/lib/leave-db";
import { cleanSlipInput, payOid, payslipsCol, toPayslip } from "@/lib/payroll-db";
import { issueSlip } from "@/lib/payslip-issue";
import { getLetterhead } from "@/lib/letter-db";

type Ctx = { params: { id: string } };

async function load(id: string) {
  const _id = payOid(id);
  const doc = _id && (await (await payslipsCol()).findOne({ _id }));
  return doc ? { _id: _id!, slip: toPayslip(doc) } : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const deny = await guard("payroll", "view");
  if (deny) return deny;
  const found = await load(params.id);
  if (!found) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  return NextResponse.json({ payslip: found.slip, letterhead: await getLetterhead() });
}

// Only drafts can be changed. An issued payslip is made a draft first ("Edit again"), so a changed slip is never still "verified".
export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const found = await load(params.id);
  if (!found) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  const b = await jsonBody(req);
  if (found.slip.status !== "draft") return NextResponse.json({ error: "This payslip is issued. Press “Edit again” first." }, { status: 409 });
  if (b.version && b.version !== found.slip.updatedAt) return NextResponse.json({ error: "Someone else changed this payslip. Reload the page to see the latest copy." }, { status: 409 });
  const next = cleanSlipInput(b, found.slip);
  const { id: _skip, ...rest } = next;
  const stamp = new Date().toISOString();
  const doc = await (await payslipsCol()).findOneAndUpdate({ _id: found._id, status: "draft", updatedAt: found.slip.updatedAt }, { $set: { ...rest, updatedAt: stamp } }, { returnDocument: "after" });
  if (!doc) return NextResponse.json({ error: "Someone else changed this payslip. Reload the page to see the latest copy." }, { status: 409 });
  return NextResponse.json(toPayslip(doc));
}

// { action: "issue" | "revoke" | "draft" }
export async function POST(req: Request, { params }: Ctx) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const found = await load(params.id);
  if (!found) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  const { action } = await jsonBody(req);
  const col = await payslipsCol();
  const session = await getSession();
  const what = `${monthLabel(found.slip.month)} payslip ${found.slip.number}`.trim();
  const stamp = new Date().toISOString();
  try {
    if (action === "issue") {
      const out = await issueSlip(found.slip);
      await logActivity(session, "Payroll", `Issued ${monthLabel(out.month)} payslip ${out.number}`, out.emp.name, req);
      return NextResponse.json(out);
    }
    if (action === "attendance" && found.slip.status === "draft") {
      const { summaries } = await monthAttendance(found.slip.month, [{ id: found.slip.employeeId, joiningDate: found.slip.emp.joiningDate }]);
      const sm = summaries.get(found.slip.employeeId)!;
      const { id: _skip, ...next } = recalc(withAttendance(found.slip, sm));
      const doc = await col.findOneAndUpdate({ _id: found._id, status: "draft" }, { $set: { ...next, updatedAt: stamp } }, { returnDocument: "after" });
      return NextResponse.json(toPayslip(doc!));
    }
    if (action === "revoke" && found.slip.status === "issued") {
      const doc = await col.findOneAndUpdate({ _id: found._id }, { $set: { status: "revoked", updatedAt: stamp } }, { returnDocument: "after" });
      await logActivity(session, "Payroll", `Revoked ${what}`, found.slip.emp.name, req);
      return NextResponse.json(toPayslip(doc!));
    }
    if (action === "draft" && found.slip.status !== "draft") {
      // Keeps the number; the old verification code stops working and a new one is given when issued again.
      const doc = await col.findOneAndUpdate({ _id: found._id }, { $set: { status: "draft", verifyCode: "", updatedAt: stamp } }, { returnDocument: "after" });
      await logActivity(session, "Payroll", `Made ${what} a draft again`, found.slip.emp.name, req);
      return NextResponse.json(toPayslip(doc!));
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't do that." }, { status: 400 });
  }
  return NextResponse.json({ error: "That can't be done for this payslip." }, { status: 400 });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const deny = await guard("payroll");
  if (deny) return deny;
  const found = await load(params.id);
  if (!found) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  if (found.slip.number) return NextResponse.json({ error: "This payslip has been issued before, so it is kept. Revoke it instead." }, { status: 409 });
  await (await payslipsCol()).deleteOne({ _id: found._id });
  await logActivity(await getSession(), "Payroll", `Deleted a draft ${monthLabel(found.slip.month)} payslip`, found.slip.emp.name, req);
  return NextResponse.json({ ok: true });
}
