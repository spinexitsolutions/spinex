import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { isOwner } from "@/lib/roles";
import { checkSecondStep, getAccount, ownerTwoStepBypassed, passwordMatches } from "@/lib/account";
import { rateLimited } from "@/lib/antispam";
import { logActivity } from "@/lib/activity";
import { revealSecrets } from "@/lib/secrets";

// Admin → API keys → "Show saved keys". Owner only, and only after typing the password again
// (plus the 6-digit code when two-step login is on). Every view is written to the Activity log.
export async function POST(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const s = await getSession();
  if (!s || !isOwner(s)) return NextResponse.json({ error: "Only the owner can see saved keys." }, { status: 403 });
  if (await rateLimited(`reveal-keys:${s.uid}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many tries. Please wait 15 minutes and try again." }, { status: 429 });
  }
  const b = (await jsonBody(req)) as { password?: unknown; code?: unknown };
  const password = typeof b.password === "string" ? b.password : "";
  const code = typeof b.code === "string" ? b.code.trim() : "";
  const account = await getAccount(s.uid);
  if (!account || !password || !(await passwordMatches(account, password))) {
    await logActivity(s, "API keys", "Tried to view saved keys: wrong password", "", req);
    return NextResponse.json({ error: "That password is not right." }, { status: 400 });
  }
  if (account.totpEnabled && !ownerTwoStepBypassed()) {
    if (!code) return NextResponse.json({ error: "Enter the 6-digit code from your authenticator app.", needCode: true }, { status: 400 });
    if (!(await checkSecondStep(account, code))) {
      await logActivity(s, "API keys", "Tried to view saved keys: wrong two-step code", "", req);
      return NextResponse.json({ error: "That code is not right.", needCode: true }, { status: 400 });
    }
  }
  const out = await revealSecrets();
  await logActivity(s, "API keys", "Viewed saved API keys", "", req);
  return NextResponse.json({ ...out, needCode: false }, { headers: { "cache-control": "no-store" } });
}
