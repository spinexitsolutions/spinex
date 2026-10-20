import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { hashPassword, toUser, usersCol, validRole } from "@/lib/users";
import { cleanAccess } from "@/lib/roles";
import { getSession } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const deny = await guard("users");
  if (deny) return deny;
  const docs = await (await usersCol()).find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(docs.map(toUser));
}

export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const b = await jsonBody(req); // a "null" body is treated as empty
  const name = String(b.name ?? "").trim().slice(0, 80);
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  if (!name) return NextResponse.json({ error: "Enter a name." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (email === (process.env.ADMIN_EMAIL || "").trim().toLowerCase()) return NextResponse.json({ error: "That email is the owner login." }, { status: 400 });
  const col = await usersCol();
  if (await col.findOne({ email })) return NextResponse.json({ error: "A team member with this email already exists." }, { status: 400 });
  const role = validRole(b.role);
  const doc = { name, email, role, access: cleanAccess(b.access, role), active: true, passwordHash: hashPassword(password), tokenVersion: 0, createdAt: new Date().toISOString(), lastLogin: "" };
  const { insertedId } = await col.insertOne(doc);
  await logActivity(await getSession(), "Team", `Added team member (${doc.role})`, `${doc.name} (${doc.email})`, req);
  return NextResponse.json(toUser({ _id: insertedId, ...doc }), { status: 201 });
}
