import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getDb, hasDb } from "@/lib/db";
import { findAccountByEmail } from "@/lib/account";
import { emailPerson } from "@/lib/notify";
import { clientIp, rateLimited } from "@/lib/antispam";
import { logActivity } from "@/lib/activity";
import { SITE_URL } from "@/lib/site";

// "Forgot password": emails a link (valid 30 minutes) to set a new password.
// The answer is the same whether or not the email is registered, so nobody can find out who has an account.
export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null);
  const email = String((raw as { email?: unknown } | null)?.email ?? "").trim().toLowerCase().slice(0, 200);
  const reply = NextResponse.json({ ok: true, message: "If this email has an admin account, a reset link is on its way. Check your inbox and spam folder." });
  if (!hasDb() || !/^\S+@\S+\.\S+$/.test(email)) return reply;
  if (await rateLimited(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000).catch(() => false)) {
    return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  }
  if (await rateLimited(`forgot-email:${email}`, 3, 60 * 60 * 1000).catch(() => false)) return reply;

  const account = await findAccountByEmail(email).catch(() => null);
  if (!account || !account.active || !account.email) return reply;
  const token = randomBytes(32).toString("base64url");
  const col = (await getDb()).collection("password_resets");
  await col.createIndex({ exp: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
  await col.insertOne({ _id: createHash("sha256").update(token).digest("hex") as never, uid: account.uid, exp: new Date(Date.now() + 30 * 60 * 1000) });
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
  await emailPerson(
    account.email,
    "Reset your Spinex admin password",
    "Set a new password",
    [
      "Someone (hopefully you) asked to reset the password for your Spinex admin login.",
      "The button below works once and stops working after 30 minutes. If you didn't ask for this, ignore this email: your password stays the same.",
    ],
    { label: "Set a new password", url: `${origin}/admin/reset?token=${token}` },
  );
  await logActivity({ uid: account.uid, name: account.name || account.email, role: account.role }, "Login", "Asked for a password reset link", "", req);
  return reply;
}
