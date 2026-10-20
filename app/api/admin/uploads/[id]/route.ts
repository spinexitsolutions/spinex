import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { guard } from "@/lib/admin-guard";
import { uploadsBucket } from "@/lib/uploads-server";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("content");
  if (deny) return deny;
  if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  try {
    await (await uploadsBucket()).delete(new ObjectId(params.id));
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
