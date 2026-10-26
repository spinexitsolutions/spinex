import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { emailPerson } from "@/lib/notify";
import { hashSecret, isJsonRequest, loginLocked, loginsCol, newLoginCode, normEmail, validEmail } from "@/lib/portal-db";
import { employeesCol } from "@/lib/payroll-db";
import { getContent } from "@/lib/content-server";

// Staff login step 1: email a 6-digit code. The reply never says whether the email belongs to an employee.
export async function POST(req: Request) {
  const started = Date.now();
  let sending: Promise<unknown> = Promise.resolve();
  if (!hasDb()) return NextResponse.json({ error: "Login is offline right now." }, { status: 503 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const email = normEmail((await jsonBody(req)).email);
  if (!validEmail(email)) return NextResponse.json({ error: "Enter your work email address." }, { status: 400 });
  if (await rateLimited(`staff-code-ip:${clientIp(req)}`, 10, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait an hour and try again." }, { status: 429 });
  if (await rateLimited(`staff-code:${email}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many codes asked for this email. Please wait an hour." }, { status: 429 });
  const emp = await (await employeesCol()).findOne({ email, active: { $ne: false } }, { projection: { _id: 1, name: 1 } });
  if (emp && !(await loginLocked(`staff:${emp._id}`))) {
    const code = newLoginCode();
    await (await loginsCol()).updateOne(
      { kind: "staff-code", clientId: `staff:${emp._id}` },
      { $set: { hash: hashSecret(code), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } },
      { upsert: true },
    ).catch(() => undefined);
    const brand = (await getContent()).brand.name || "Spinex IT Solutions";
    sending = emailPerson(email, `${code} is your ${brand} staff login code`, "Your login code", [
      `Hi ${String(emp.name || "").split(" ")[0] || "there"},`,
      `Your code to open the ${brand} staff portal is:`,
      code,
      "It works for 10 minutes. If you didn't ask for it, you can ignore this email.",
    ]).catch((e) => console.error("Staff code email failed:", e));
  }
  // Wait for the email (some hosts stop work left running after the reply), and pad every reply to the same
  // length of time, so it never shows whether the email has an account.
  await sending;
  const left = 2500 - (Date.now() - started);
  if (left > 0) await new Promise((r) => setTimeout(r, left + Math.floor(Math.random() * 300)));
  return NextResponse.json({ ok: true, message: "If this is an employee email, we've sent a 6-digit code to it." });
}
