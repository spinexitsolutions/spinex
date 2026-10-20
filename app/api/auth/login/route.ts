import { NextResponse } from "next/server";
import { createTicket, createToken, type Session } from "@/lib/auth";
import { sessionCookie } from "@/lib/session-cookie";
import { DUMMY_HASH, findAccountByEmail, getAccount, ownerTwoStepBypassed, passwordMatches } from "@/lib/account";
import { checkPassword, usersCol } from "@/lib/users";
import { rateLimited } from "@/lib/antispam";
import { clientIp, recentHits, recordHit } from "@/lib/antispam";
import { logActivity } from "@/lib/activity";
import { ObjectId } from "mongodb";

// Failed logins allowed per connection and per email address in 15 minutes.
const MAX_FAILS = 10;
const WINDOW = 15 * 60 * 1000;
// Failed logins allowed for one email across all connections (stops guessing spread over many IPs).
const MAX_EMAIL_FAILS = 30;


// The owner logs in with ADMIN_EMAIL and ADMIN_PASSWORD from .env.local (or the password set later in Admin → My account).
// Team members added in Admin > Team log in with their own email and password.
// With two-step login on, a correct password returns a short ticket and the app code is asked next (/api/auth/2fa).
export async function POST(req: Request) {
  const { ADMIN_EMAIL = "", ADMIN_PASSWORD = "", AUTH_SECRET = "" } = process.env;
  // ADMIN_PASSWORD is needed only until the owner sets a password in Admin → My account.
  const ownerHasPassword = !!(await getAccount("env").catch(() => null))?.passwordHash;
  if (!ADMIN_EMAIL || (!ADMIN_PASSWORD && !ownerHasPassword) || AUTH_SECRET.length < 32) {
    return NextResponse.json({ error: "Admin login isn't set up. Add ADMIN_EMAIL, ADMIN_PASSWORD and AUTH_SECRET (32+ characters) to .env.local." }, { status: 500 });
  }
  const raw: unknown = await req.json().catch(() => null);
  const body = (raw && typeof raw === "object" ? raw : {}) as { email?: unknown; password?: unknown };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(body.password ?? "").slice(0, 500);

  // Stop password guessing: too many failed attempts from this connection or for this email.
  // Per connection, and per email+connection pair, so a stranger can't lock the owner out by guessing.
  const ip = clientIp(req);
  const emailKey = `login-email-all:${email}`;
  const keys = [`login-ip:${ip}`, `login-email:${email}|${ip}`, emailKey];
  const limits = [MAX_FAILS, MAX_FAILS, MAX_EMAIL_FAILS];
  const fails = await Promise.all(keys.map((k) => recentHits(k, WINDOW).catch(() => 0)));
  // Per-connection limits block outright. The all-connections limit for an email only blocks wrong
  // passwords (checked below), so a stranger guessing can't lock the real person out.
  if (fails.slice(0, 2).some((n, i) => n >= limits[i])) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const emailLocked = fails[2] >= limits[2];

  // Every attempt from this connection counts (recorded first), so a burst of parallel requests can't slip past.
  if (await rateLimited(`login-try:${ip}`, 30, WINDOW).catch(() => false)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const account = await findAccountByEmail(email).catch(() => null);
  if (!account) checkPassword(password, DUMMY_HASH); // same work as a real check, so the reply time doesn't reveal which emails exist
  const ok = !!account && account.active && passwordMatches(account, password);

  if (!ok || !account) {
    await Promise.all(keys.map((k) => recordHit(k).catch(() => undefined)));
    // Logged, but at most 5 times per account in 15 minutes so the log can't be flooded.
    if (account && !(await rateLimited(`log-fail:${account.uid}`, 5, WINDOW).catch(() => true))) {
      await logActivity({ uid: account.uid, name: account.name || email, role: account.role }, "Login", "Wrong password", "", req);
    }
    await new Promise((r) => setTimeout(r, 700)); // slows down guessing
    if (emailLocked) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  const session: Session = { email, name: account.uid === "env" ? "Owner" : account.name || email, role: account.role as Session["role"], uid: account.uid, tv: account.tokenVersion };

  if (account.totpEnabled && !(account.uid === "env" && ownerTwoStepBypassed())) {
    return NextResponse.json({ needCode: true, ticket: await createTicket(session) });
  }

  if (account.uid !== "env") await (await usersCol()).updateOne({ _id: new ObjectId(account.uid) }, { $set: { lastLogin: new Date().toISOString() } });
  await logActivity(session, "Login", "Logged in", "", req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(await createToken(session)));
  return res;
}
