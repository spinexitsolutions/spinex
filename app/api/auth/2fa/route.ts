import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { createToken, verifyTicket } from "@/lib/auth";
import { checkSecondStep, getAccount } from "@/lib/account";
import { usersCol } from "@/lib/users";
import { recentHits, recordHit } from "@/lib/antispam";
import { logActivity } from "@/lib/activity";
import { sessionCookie } from "@/lib/session-cookie";

// Second step of the login: the 6-digit code from the authenticator app, or a backup code.
export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null);
  const body = (raw && typeof raw === "object" ? raw : {}) as { ticket?: unknown; code?: unknown };
  const ticket = await verifyTicket(String(body.ticket ?? ""));
  if (!ticket) return NextResponse.json({ error: "This took too long. Log in again.", restart: true }, { status: 401 });

  const key = `login-2fa:${ticket.uid}`;
  if ((await recentHits(key, 15 * 60 * 1000).catch(() => 0)) >= 6) {
    return NextResponse.json({ error: "Too many wrong codes. Try again in 15 minutes." }, { status: 429 });
  }
  const account = await getAccount(ticket.uid);
  if (!account || !account.active || account.tokenVersion !== (ticket.tv ?? 0)) {
    return NextResponse.json({ error: "Log in again.", restart: true }, { status: 401 });
  }
  const used = await checkSecondStep(account, String(body.code ?? "").trim().slice(0, 20));
  if (!used) {
    await recordHit(key).catch(() => undefined);
    await logActivity(ticket, "Login", "Wrong two-step code", "", req);
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "That code isn't right. Check the app and try again." }, { status: 401 });
  }
  if (account.uid !== "env") await (await usersCol()).updateOne({ _id: new ObjectId(account.uid) }, { $set: { lastLogin: new Date().toISOString() } });
  await logActivity(ticket, "Login", used === "backup" ? `Logged in with a backup code (${account.backupCodes.length - 1} left)` : "Logged in (two-step)", "", req);
  const res = NextResponse.json({ ok: true, backupLeft: used === "backup" ? account.backupCodes.length - 1 : undefined });
  res.cookies.set(sessionCookie(await createToken(ticket)));
  return res;
}
