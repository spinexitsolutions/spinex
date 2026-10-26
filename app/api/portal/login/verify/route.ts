import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { clientCookie, createClientToken } from "@/lib/client-auth";
import { MAX_DAILY_FAILS, clientsCol, countLoginFail, hashSecret, isJsonRequest, loginLocked, loginsCol, normEmail, originOf, sameHash } from "@/lib/portal-db";
import { notifyAdmin } from "@/lib/notify";

const WRONG = "That code isn't right or has expired. Ask for a new one.";

// Step 2 of client login: check the code. Each code allows 5 tries; the try is counted before checking.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Login is offline right now." }, { status: 503 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const b = await jsonBody(req);
  const email = normEmail(b.email);
  const code = String(b.code ?? "").replace(/\s/g, "");
  if (await rateLimited(`portal-verify-ip:${clientIp(req)}`, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait an hour." }, { status: 429 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });

  const clients = await clientsCol();
  const client = await clients.findOne({ email, active: { $ne: false } });
  if (!client) return NextResponse.json({ error: WRONG }, { status: 400 });
  const cid = String(client._id);
  if (await loginLocked(cid)) return NextResponse.json({ error: "Too many wrong codes today. Please try again tomorrow, or ask us for a login link." }, { status: 429 });
  const logins = await loginsCol();
  const row = await logins.findOneAndUpdate(
    { kind: "code", clientId: String(client._id), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } },
    { sort: { _id: -1 }, returnDocument: "after" },
  );
  if (!row || !sameHash(String(row.hash), hashSecret(code))) {
    // Only guesses against a real code count toward the daily lock, so a stranger can't lock someone out.
    const fails = row ? await countLoginFail(cid) : 0;
    if (fails === MAX_DAILY_FAILS) {
      await logins.deleteMany({ clientId: cid });
      await notifyAdmin(`Client portal login locked: ${client.company || client.name}`, [["Client", String(client.company || client.name)], ["Email", email], ["Why", `${MAX_DAILY_FAILS} wrong codes today. Email login is locked until tomorrow. You can send a one-time login link from the admin panel.`]], `${originOf(req)}/admin/clients/${cid}`);
    }
    return NextResponse.json({ error: WRONG }, { status: 400 });
  }
  // One use only: if two requests race, only the one that removes the code logs in.
  const used = await logins.deleteOne({ _id: row._id });
  if (!used.deletedCount) return NextResponse.json({ error: WRONG }, { status: 400 });

  await clients.updateOne({ _id: client._id }, { $set: { lastLoginAt: new Date().toISOString() } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clientCookie(await createClientToken(String(client._id), Number(client.tokenVersion) || 0)));
  return res;
}
