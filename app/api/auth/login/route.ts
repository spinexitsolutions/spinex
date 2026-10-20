import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { COOKIE, createToken, type Session } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { checkPassword, usersCol } from "@/lib/users";

const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

// The owner logs in with ADMIN_EMAIL / ADMIN_PASSWORD from .env.local.
// Team members added in Admin > Team log in with their own email and password.
export async function POST(req: Request) {
  const { ADMIN_EMAIL = "", ADMIN_PASSWORD = "", AUTH_SECRET = "" } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || AUTH_SECRET.length < 32) {
    return NextResponse.json({ error: "Admin login isn't set up. Add ADMIN_EMAIL, ADMIN_PASSWORD and AUTH_SECRET (32+ characters) to .env.local." }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

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
