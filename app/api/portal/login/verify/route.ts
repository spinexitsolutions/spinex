import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { clientCookie, createClientToken } from "@/lib/client-auth";
import { clientsCol, hashSecret, loginsCol, normEmail, sameHash } from "@/lib/portal-db";

const WRONG = "That code isn't right or has expired. Ask for a new one.";

// Step 2 of client login: check the code. Each code allows 5 tries; the try is counted before checking.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Login is offline right now." }, { status: 503 });
  const b = await jsonBody(req);
  const email = normEmail(b.email);
  const code = String(b.code ?? "").replace(/\s/g, "");
  if (await rateLimited(`portal-verify-ip:${clientIp(req)}`, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait an hour." }, { status: 429 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });

  const clients = await clientsCol();
  const client = await clients.findOne({ email, active: { $ne: false } });
  if (!client) return NextResponse.json({ error: WRONG }, { status: 400 });
  const logins = await loginsCol();
  const row = await logins.findOneAndUpdate(
    { kind: "code", clientId: String(client._id), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } },
    { sort: { _id: -1 }, returnDocument: "after" },
  );
  if (!row || !sameHash(String(row.hash), hashSecret(code))) return NextResponse.json({ error: WRONG }, { status: 400 });
  // One use only: if two requests race, only the one that removes the code logs in.
  const used = await logins.deleteOne({ _id: row._id });
  if (!used.deletedCount) return NextResponse.json({ error: WRONG }, { status: 400 });

  await clients.updateOne({ _id: client._id }, { $set: { lastLoginAt: new Date().toISOString() } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clientCookie(await createClientToken(String(client._id), Number(client.tokenVersion) || 0)));
  return res;
}
