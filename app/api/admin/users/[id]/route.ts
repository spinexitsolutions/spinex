import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { oid } from "@/lib/intern-db";
import { hashPassword, toUser, usersCol, validRole } from "@/lib/users";
import { getSession } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { AREAS, cleanAccess, roleLabel, type Access, type Role } from "@/lib/roles";

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
  // Access per area. Choosing a role without ticks gives that role's ready-made access.
  let before: Access | null = null;
  if (b.access !== undefined || set.role !== undefined) {
    const cur = await (await usersCol()).findOne({ _id }, { projection: { role: 1, access: 1 } });
    if (!cur) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    const role = (set.role ?? cur.role ?? "editor") as Role;
    before = cleanAccess(cur.access ?? null, (cur.role ?? "editor") as Role);
    set.access = cleanAccess(b.access !== undefined ? b.access : null, role);
  }
  if (b.active !== undefined) set.active = !!b.active;
  if (b.password) {
    if (String(b.password).length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    set.passwordHash = hashPassword(String(b.password));
  }
  // The member lost their phone and backup codes: the owner turns two-step login off so they can set it up again.
  if (b.reset2fa) Object.assign(set, { totpSecret: "", totpPending: "", totpEnabled: false, backupCodes: [], totpLastStep: 0 });
  // Nothing to change: MongoDB rejects an empty $set, so just return the member as they are.
  if (!Object.keys(set).length) {
    const cur = await (await usersCol()).findOne({ _id }, { projection: { passwordHash: 0 } });
    return cur ? NextResponse.json(toUser(cur)) : NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }
  // A new password or deactivation logs out the member's existing sessions.
  const update: Record<string, unknown> = { $set: set };
  if (set.passwordHash !== undefined || set.active === false || b.reset2fa) update.$inc = { tokenVersion: 1 };
  const doc = await (await usersCol()).findOneAndUpdate({ _id }, update, { returnDocument: "after", projection: { passwordHash: 0 } });
  if (!doc) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  const changes = [
    set.name !== undefined && "name",
    set.role !== undefined && `role to ${roleLabel[set.role as keyof typeof roleLabel] ?? set.role}`,
    set.active !== undefined && (set.active ? "unblocked" : "blocked"),
    set.passwordHash !== undefined && "password reset",
    b.reset2fa && "two-step login turned off",
    before && set.access && `access (${AREAS.filter((a) => before![a.id] !== (set.access as Access)[a.id]).map((a) => `${a.label}: ${(set.access as Access)[a.id]}`).join(", ") || "no change"})`,
  ].filter(Boolean);
  await logActivity(await getSession(), "Team", `Changed team member: ${changes.join(", ")}`, String(doc.name || doc.email), req);
  return NextResponse.json(toUser(doc));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("users");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  const gone = await (await usersCol()).findOneAndDelete({ _id }, { projection: { name: 1, email: 1 } });
  if (gone) await logActivity(await getSession(), "Team", "Removed team member", String(gone.name || gone.email), _req);
  return NextResponse.json({ ok: true });
}
