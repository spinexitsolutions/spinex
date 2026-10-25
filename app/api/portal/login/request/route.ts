import { NextResponse } from "next/server";
import { jsonBody } from "@/lib/admin-guard";
import { hasDb } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/antispam";
import { emailPerson } from "@/lib/notify";
import { clientsCol, hashSecret, loginsCol, newLoginCode, normEmail, validEmail } from "@/lib/portal-db";
import { getContent } from "@/lib/content-server";

// Step 1 of client login: email a 6-digit code (valid 10 minutes). The reply never says whether the email exists.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Login is offline right now." }, { status: 503 });
  const email = normEmail((await jsonBody(req)).email);
  if (!validEmail(email)) return NextResponse.json({ error: "Enter the email address you gave us." }, { status: 400 });
  if (await rateLimited(`portal-code-ip:${clientIp(req)}`, 10, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many tries. Please wait an hour and try again." }, { status: 429 });
  if (await rateLimited(`portal-code:${email}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many codes asked for this email. Please wait an hour." }, { status: 429 });

  const client = await (await clientsCol()).findOne({ email, active: { $ne: false } }, { projection: { _id: 1, name: 1 } });
  if (client) {
    const code = newLoginCode();
    const logins = await loginsCol();
    await logins.deleteMany({ kind: "code", clientId: String(client._id) });
    await logins.insertOne({ kind: "code", clientId: String(client._id), hash: hashSecret(code), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    const brand = (await getContent()).brand.name || "Spinex IT Solutions";
    await emailPerson(email, `${code} is your ${brand} login code`, "Your login code", [
      `Hi ${String(client.name || "").split(" ")[0] || "there"},`,
      `Your code to open the ${brand} client portal is:`,
      code,
      "It works for 10 minutes. If you didn't ask for it, you can ignore this email.",
    ]);
  }
  return NextResponse.json({ ok: true, message: "If this email has a client account, we've sent a 6-digit code to it." });
}
