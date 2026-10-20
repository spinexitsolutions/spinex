import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { COOKIE, createToken, type Session } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { checkPassword, usersCol } from "@/lib/users";
import { clientIp, recentHits, recordHit } from "@/lib/antispam";

// Failed logins allowed per connection and per email address in 15 minutes.
const MAX_FAILS = 10;
const WINDOW = 15 * 60 * 1000;

const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

// The owner logs in with ADMIN_EMAIL / ADMIN_PASSWORD from .env.local.
// Team members added in Admin > Team log in with their own email and password.
export async function POST(req: Request) {
  const { ADMIN_EMAIL = "", ADMIN_PASSWORD = "", AUTH_SECRET = "" } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || AUTH_SECRET.length < 32) {
    return NextResponse.json({ error: "Admin login isn't set up. Add ADMIN_EMAIL, ADMIN_PASSWORD and AUTH_SECRET (32+ characters) to .env.local." }, { status: 500 });
  }
  const raw: unknown = await req.json().catch(() => null);
  const body = (raw && typeof raw === "object" ? raw : {}) as { email?: unknown; password?: unknown };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(body.password ?? "").slice(0, 500);

  // Stop password guessing: too many failed attempts from this connection or for this email.
  // Per connection, and per email+connection pair, so a stranger can't lock the owner out by guessing.
  const ip = clientIp(req);
  const keys = [`login-ip:${ip}`, `login-email:${email}|${ip}`];
  const fails = await Promise.all(keys.map((k) => recentHits(k, WINDOW).catch(() => 0)));
  if (fails.some((n) => n >= MAX_FAILS)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  let session: Session | null = null;
  if (same(email, ADMIN_EMAIL.trim().toLowerCase()) && same(password, ADMIN_PASSWORD)) {
    session = { email, name: "Owner", role: "owner", uid: "env" };
  } else if (hasDb()) {
    const col = await usersCol();
    const user = await col.findOne({ email });
    if (user && user.active !== false && checkPassword(password, user.passwordHash)) {
      session = { email, name: user.name || email, role: user.role, uid: String(user._id) };
      await col.updateOne({ _id: user._id }, { $set: { lastLogin: new Date().toISOString() } });
    }
  }

  if (!session) {
    await Promise.all(keys.map((k) => recordHit(k).catch(() => undefined)));
    await new Promise((r) => setTimeout(r, 700)); // slows down guessing
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
