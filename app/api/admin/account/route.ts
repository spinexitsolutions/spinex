import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession, jsonBody, unauthorized } from "@/lib/admin-guard";
import { createToken, type Session } from "@/lib/auth";
import { sessionCookie } from "@/lib/session-cookie";
import { checkSecondStep, disableTotp, enableTotp, getAccount, passwordMatches, setBackupCodes, setPassword, startTotp, type Account } from "@/lib/account";
import { hashCode, newBackupCodes, newTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { logActivity } from "@/lib/activity";
import { hasDb } from "@/lib/db";

// "My account" for whoever is logged in: two-step login, backup codes and password.
export async function GET() {
  const s = await getSession();
  if (!s) return unauthorized();
  const a = hasDb() ? await getAccount(s.uid) : null;
  return NextResponse.json({
    name: s.name, email: s.email, role: s.role,
    twoStep: !!a?.totpEnabled,
    backupLeft: a?.backupCodes.length ?? 0,
    canSave: hasDb(),
    ownerEnvPassword: s.uid === "env" && !a?.passwordHash,
  });
}

// Changes that bump the "log out everywhere" counter re-issue this browser's login, so you stay logged in here.
// (The session is passed in: after the counter changes, the old cookie no longer reads as logged in.)
async function keepLoggedIn(res: NextResponse, a: Account | null, s: Session) {
  if (a) res.cookies.set(sessionCookie(await createToken({ email: s.email, name: s.name, role: s.role, uid: s.uid, tv: a.tokenVersion })));
  return res;
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return unauthorized();
  if (!hasDb()) return NextResponse.json({ error: "Database isn't connected." }, { status: 503 });
  const b = await jsonBody(req);
  const action = String(b.action ?? "");
  const a = await getAccount(s.uid);
  if (!a) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  if (action === "start2fa") {
    if (a.totpEnabled) return NextResponse.json({ error: "Two-step login is already on." }, { status: 400 });
    const secret = newTotpSecret();
    await startTotp(a, secret);
    const url = otpauthUrl(secret, s.email || "admin");
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 240 });
    return NextResponse.json({ qr, secret: secret.replace(/(.{4})/g, "$1 ").trim() });
  }

  if (action === "confirm2fa") {
    if (!a.totpPending || !verifyTotp(a.totpPending, String(b.code ?? ""))) {
      return NextResponse.json({ error: "That code isn't right. Type the 6 digits showing in the app now." }, { status: 400 });
    }
    const codes = newBackupCodes();
    const updated = await enableTotp(a, codes.map(hashCode));
    await logActivity(s, "Login", "Turned on two-step login", "", req);
    return keepLoggedIn(NextResponse.json({ ok: true, codes }), updated, s);
  }

  if (action === "disable2fa") {
    if (!passwordMatches(a, String(b.password ?? ""))) return NextResponse.json({ error: "Wrong password." }, { status: 400 });
    if (!(await checkSecondStep(a, String(b.code ?? "")))) return NextResponse.json({ error: "That code isn't right." }, { status: 400 });
    const updated = await disableTotp(a);
    await logActivity(s, "Login", "Turned off two-step login", "", req);
    return keepLoggedIn(NextResponse.json({ ok: true }), updated, s);
  }

  if (action === "backupCodes") {
    if (!a.totpEnabled || !verifyTotp(a.totpSecret, String(b.code ?? ""))) return NextResponse.json({ error: "That code isn't right." }, { status: 400 });
    const codes = newBackupCodes();
    await setBackupCodes(a, codes.map(hashCode));
    await logActivity(s, "Login", "Made new backup codes", "", req);
    return NextResponse.json({ ok: true, codes });
  }

  if (action === "password") {
    if (!passwordMatches(a, String(b.current ?? ""))) return NextResponse.json({ error: "Your current password is wrong." }, { status: 400 });
    const next = String(b.next ?? "");
    if (next.length < 8) return NextResponse.json({ error: "Use at least 8 characters." }, { status: 400 });
    const updated = await setPassword(a, next);
    await logActivity(s, "Login", "Changed own password", "", req);
    return keepLoggedIn(NextResponse.json({ ok: true }), updated, s);
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
