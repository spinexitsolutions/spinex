import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { templateFor } from "@/lib/letters";
import { cleanLetterInput, getLetterhead, letterOid, lettersCol, toLetter } from "@/lib/letter-db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const deny = await guard("people", "view");
  if (deny) return deny;
  const _id = letterOid(params.id);
  const doc = _id && (await (await lettersCol()).findOne({ _id }));
  if (!doc) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  return NextResponse.json({ letter: toLetter(doc), letterhead: await getLetterhead() });
}

// Saves the editor. { action: "issue" | "revoke" | "restore" } changes the status instead.
export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("people");
  if (deny) return deny;
  const _id = letterOid(params.id);
  const col = await lettersCol();
  const current = _id && (await col.findOne({ _id }));
  if (!_id || !current) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const b = await jsonBody(req);
  const stamp = new Date().toISOString();
  const before = toLetter(current);
  const label = templateFor(before.type).label;

  if (b.action) {
    const set: Record<string, string> = { updatedAt: stamp };
    if (b.action === "issue") {
      if (!before.person.name.trim()) return NextResponse.json({ error: "Add the person's name first." }, { status: 400 });
      set.status = "issued";
      if (!before.issuedAt) set.issuedAt = stamp;
    } else if (b.action === "revoke") set.status = "revoked";
    else if (b.action === "restore") set.status = "issued";
    else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const doc = await col.findOneAndUpdate({ _id }, { $set: set }, { returnDocument: "after" });
    const verb = b.action === "issue" ? "Issued" : b.action === "revoke" ? "Revoked" : "Restored";
    await logActivity(await getSession(), "Letters", `${verb} ${label.toLowerCase()} ${before.number}`, before.person.name, req);
    return NextResponse.json(toLetter(doc!));
  }

  const data = cleanLetterInput(b);
  const doc = await col.findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: stamp } }, { returnDocument: "after" });
  await logActivity(await getSession(), "Letters", `Edited ${label.toLowerCase()} ${before.number}`, data.person?.name ?? before.person.name, req);
  return NextResponse.json(toLetter(doc!));
}

export async function DELETE(req: Request, { params }: Ctx) {
  const deny = await guard("people");
  if (deny) return deny;
  const _id = letterOid(params.id);
  const col = await lettersCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const l = toLetter(doc);
  await col.deleteOne({ _id });
  await logActivity(await getSession(), "Letters", `Deleted ${templateFor(l.type).label.toLowerCase()} ${l.number}`, l.person.name, req);
  return NextResponse.json({ ok: true });
}
