import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { emailPerson } from "@/lib/notify";
import { clientsCol, hashSecret, isJsonRequest, loginLocked, loginsCol, newLoginCode, normEmail, validEmail } from "@/lib/portal-db";
import { getContent } from "@/lib/content-server";

// Step 1 of client login: email a 6-digit code (valid 10 minutes). The reply never says whether the email exists.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Login is offline right now." }, { status: 503 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const email = normEmail((await jsonBody(req)).email);
  if (!validEmail(email)) return NextResponse.json({ error: "Enter the email address you gave us." }, { status: 400 });
  if (await rateLimited(`portal-code-ip:${clientIp(req)}`, 10, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait an hour and try again." }, { status: 429 });
  if (await rateLimited(`portal-code:${email}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many codes asked for this email. Please wait an hour." }, { status: 429 });

  const client = await (await clientsCol()).findOne({ email, active: { $ne: false } }, { projection: { _id: 1, name: 1 } });
  if (client && !(await loginLocked(String(client._id)))) {
    const code = newLoginCode();
    // One code per client: a new one replaces the old one (and its used-up tries).
    await (await loginsCol()).updateOne(
      { kind: "code", clientId: String(client._id) },
      { $set: { hash: hashSecret(code), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } },
      { upsert: true },
    ).catch(() => undefined);
    const brand = (await getContent()).brand.name || "Spinex IT Solutions";
    // Sent without waiting, so the reply takes the same time whether or not the email has an account.
    void emailPerson(email, `${code} is your ${brand} login code`, "Your login code", [
      `Hi ${String(client.name || "").split(" ")[0] || "there"},`,
      `Your code to open the ${brand} client portal is:`,
      code,
      "It works for 10 minutes. If you didn't ask for it, you can ignore this email.",
    ]).catch((e) => console.error("Portal code email failed:", e));
  }
  return NextResponse.json({ ok: true, message: "If this email has a client account, we've sent a 6-digit code to it." });
}
