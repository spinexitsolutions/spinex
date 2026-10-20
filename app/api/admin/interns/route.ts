import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { clean, internsCol, toIntern } from "@/lib/intern-db";

export async function GET() {
  const deny = await guard("people", "view");
  if (deny) return deny;
  const docs = await (await internsCol()).find().sort({ createdAt: -1 }).limit(2000).toArray();
  return NextResponse.json(docs.map(toIntern));
}

export async function POST(req: Request) {
  const deny = await guard("people");
  if (deny) return deny;
  const body = await jsonBody(req);
  const data = clean(body);
  if (!data.name) return NextResponse.json({ error: "Enter the intern's name." }, { status: 400 });
  const doc = { status: "applied", ...data, kind: body.kind === "job" ? "job" : "internship", source: "admin", certId: "", issuedOn: "", createdAt: new Date().toISOString() };
  const col = await internsCol();
  const { insertedId } = await col.insertOne(doc);
  return NextResponse.json(toIntern({ _id: insertedId, ...doc }), { status: 201 });
}
