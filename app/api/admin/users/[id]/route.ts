import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { oid } from "@/lib/intern-db";
import { hashPassword, toUser, usersCol, validRole } from "@/lib/users";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("users");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  const b = await jsonBody(req); // a "null" body is treated as empty
  const set: Record<string, unknown> = {};
  if (b.name !== undefined) set.name = String(b.name).trim().slice(0, 80);
  if (b.role !== undefined) set.role = validRole(b.role);
  if (b.active !== undefined) set.active = !!b.active;
  if (b.password) {
    if (String(b.password).length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    set.passwordHash = hashPassword(String(b.password));
  }
  // Nothing to change: MongoDB rejects an empty $set, so just return the member as they are.
  if (!Object.keys(set).length) {
    const cur = await (await usersCol()).findOne({ _id }, { projection: { passwordHash: 0 } });
    return cur ? NextResponse.json(toUser(cur)) : NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }
  // A new password or deactivation logs out the member's existing sessions.
  const update: Record<string, unknown> = { $set: set };
  if (set.passwordHash !== undefined || set.active === false) update.$inc = { tokenVersion: 1 };
  const doc = await (await usersCol()).findOneAndUpdate({ _id }, update, { returnDocument: "after", projection: { passwordHash: 0 } });
  if (!doc) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  return NextResponse.json(toUser(doc));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("users");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  await (await usersCol()).deleteOne({ _id });
  return NextResponse.json({ ok: true });
}
