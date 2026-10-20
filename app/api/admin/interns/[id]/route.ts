import { NextResponse } from "next/server";
import { GridFSBucket, ObjectId } from "mongodb";
import { guard, jsonBody } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { clean, internsCol, oid, toIntern } from "@/lib/intern-db";
import { mailStatus } from "@/lib/intern-mail";
import { readContentFromDb } from "@/lib/content-server";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("people");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  const body = await jsonBody(req);
  const data = clean(body);
  if (data.name === "") return NextResponse.json({ error: "Enter the intern's name." }, { status: 400 });
  if (data.startDate && data.endDate && data.endDate < data.startDate) return NextResponse.json({ error: "End date can't be before the start date." }, { status: 400 });
  const doc = await (await internsCol()).findOneAndUpdate({ _id }, { $set: data }, { returnDocument: "after" });
  if (!doc) return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  const intern = toIntern(doc);
  let emailed = false;
  if (body.notify && data.status) {
    const content = await readContentFromDb();
    emailed = await mailStatus(intern, content.contact);
  }
  return NextResponse.json({ ...intern, emailed });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("people");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  const col = await internsCol();
  const doc = await col.findOneAndDelete({ _id });
  if (doc?.resumeId && ObjectId.isValid(String(doc.resumeId))) {
    const bucket = new GridFSBucket(await getDb(), { bucketName: "resumes" });
    await bucket.delete(new ObjectId(String(doc.resumeId))).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
