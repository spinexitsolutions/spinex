import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { internsCol, oid, toIntern } from "@/lib/intern-db";
import { mailCertificate } from "@/lib/intern-mail";

// Issues a certificate number once (SPX-YYYY-0001, counting up). Calling again keeps the same number.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("people");
  if (deny) return deny;
  const _id = oid(params.id);
  const col = await internsCol();
  const intern = _id ? await col.findOne({ _id }) : null;
  if (!_id || !intern) return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  if (!intern.name) return NextResponse.json({ error: "Add the intern's name before issuing a certificate." }, { status: 400 });
  if (intern.certId) return NextResponse.json(toIntern(intern));

  const counter = await (await getDb())
    .collection<{ _id: string; seq: number }>("counters")
    .findOneAndUpdate({ _id: "certificate" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  const seq = counter?.seq ?? 1;
  const certId = `SPX-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
  const today = new Date().toISOString().slice(0, 10);

  const updated = await col.findOneAndUpdate(
    { _id, certId: { $in: ["", null] } },
    { $set: { certId, issuedOn: today, status: "completed", endDate: intern.endDate || today } },
    { returnDocument: "after" },
  );
  const issued = toIntern(updated ?? (await col.findOne({ _id }))!);
  const { notify } = await req.json().catch(() => ({ notify: false }));
  const emailed = notify ? await mailCertificate(issued) : false;
  return NextResponse.json({ ...issued, emailed });
}
