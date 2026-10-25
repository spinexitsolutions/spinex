import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { clientCookie, createClientToken } from "@/lib/client-auth";
import { clientsCol, hashSecret, loginsCol, pOid } from "@/lib/portal-db";

// One-time login link made by the team (Admin → Client portal → Copy login link). Works once, for 7 days.
// It is used by a button press (POST), so email link scanners that open links can't use it up.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Login is offline right now." }, { status: 503 });
  if (await rateLimited(`portal-link-ip:${clientIp(req)}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait an hour." }, { status: 429 });
  const t = String((await jsonBody(req)).t ?? "");
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(t)) return NextResponse.json({ error: "This login link isn't valid." }, { status: 400 });
  const row = await (await loginsCol()).findOneAndDelete({ kind: "link", hash: hashSecret(t), expiresAt: { $gt: new Date() } });
  const _id = row && pOid(String(row.clientId));
  const clients = await clientsCol();
  const client = _id && (await clients.findOne({ _id, active: { $ne: false } }));
  if (!client) return NextResponse.json({ error: "This login link has expired or was already used. Log in with your email instead." }, { status: 400 });
  await clients.updateOne({ _id: client._id }, { $set: { lastLoginAt: new Date().toISOString() } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clientCookie(await createClientToken(String(client._id), Number(client.tokenVersion) || 0)));
  return res;
}
