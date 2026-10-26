import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { MAX_DAILY_FAILS, countLoginFail, hashSecret, isJsonRequest, loginLocked, loginsCol, normEmail, originOf, sameHash } from "@/lib/portal-db";
import { employeesCol } from "@/lib/payroll-db";
import { createStaffToken, staffCookie } from "@/lib/staff-auth";
import { notifyAdmin } from "@/lib/notify";

const WRONG = "That code isn't right or has expired. Ask for a new one.";

// Staff login step 2: check the code (5 tries per code, 10 wrong codes a day locks the email login until tomorrow).
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Login is offline right now." }, { status: 503 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const b = await jsonBody(req);
  const email = normEmail(b.email);
  const code = String(b.code ?? "").replace(/\s/g, "");
  if (await rateLimited(`staff-verify-ip:${clientIp(req)}`, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait an hour." }, { status: 429 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });
  const col = await employeesCol();
  const emp = await col.findOne({ email, active: { $ne: false } });
  if (!emp) return NextResponse.json({ error: WRONG }, { status: 400 });
  const key = `staff:${emp._id}`;
  if (await loginLocked(key)) return NextResponse.json({ error: "Too many wrong codes today. Please try again tomorrow." }, { status: 429 });
  const logins = await loginsCol();
  const row = await logins.findOneAndUpdate(
    { kind: "staff-code", clientId: key, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  );
  if (!row || !sameHash(String(row.hash), hashSecret(code))) {
    // Only guesses against a real code count toward the daily lock, so a stranger can't lock someone out.
    if (row && (await countLoginFail(key)) === MAX_DAILY_FAILS) {
      await logins.deleteMany({ clientId: key });
      await notifyAdmin(`Staff portal login locked: ${emp.name}`, [["Employee", String(emp.name)], ["Email", email], ["Why", `${MAX_DAILY_FAILS} wrong codes today. Email login is locked until tomorrow.`]], `${originOf(req)}/admin#payslips`);
    }
    return NextResponse.json({ error: WRONG }, { status: 400 });
  }
  const used = await logins.deleteOne({ _id: row._id });
  if (!used.deletedCount) return NextResponse.json({ error: WRONG }, { status: 400 });
  await col.updateOne({ _id: emp._id }, { $set: { lastLoginAt: new Date().toISOString() } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(staffCookie(await createStaffToken(String(emp._id), Number(emp.tokenVersion) || 0)));
  return res;
}
