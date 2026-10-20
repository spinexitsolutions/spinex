import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { oid } from "@/lib/intern-db";
import { cleanLead, leadsCol, toLead } from "@/lib/lead-db";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  const data = cleanLead(await jsonBody(req));
  if (data.name === "") return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  const doc = await (await leadsCol()).findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  if (!doc) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json(toLead(doc));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  await (await leadsCol()).deleteOne({ _id });
  return NextResponse.json({ ok: true });
}
