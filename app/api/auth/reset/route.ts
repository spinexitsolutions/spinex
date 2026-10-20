import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDb, hasDb } from "@/lib/db";
import { getAccount, setPassword } from "@/lib/account";
import { clientIp, rateLimited } from "@/lib/antispam";
import { logActivity } from "@/lib/activity";

// Sets a new password from the emailed link. Logs out every other session of that person.
// Two-step login stays on: the code from the app is still needed at the next login.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "Database isn't connected." }, { status: 503 });
  if (await rateLimited(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000).catch(() => false)) {
    return NextResponse.json({ error: "Too many tries. Try again in an hour." }, { status: 429 });
  }
  const raw: unknown = await req.json().catch(() => null);
  const b = (raw && typeof raw === "object" ? raw : {}) as { token?: unknown; password?: unknown };
  const password = String(b.password ?? "");
  if (password.length < 8) return NextResponse.json({ error: "Use at least 8 characters." }, { status: 400 });
  const col = (await getDb()).collection("password_resets");
  const id = createHash("sha256").update(String(b.token ?? "")).digest("hex");
  const doc = await col.findOneAndDelete({ _id: id as never, exp: { $gt: new Date() } });
  if (!doc) return NextResponse.json({ error: "This link has expired or was already used. Ask for a new one." }, { status: 400 });
  const account = await getAccount(String(doc.uid));
  if (!account || !account.active) return NextResponse.json({ error: "This account no longer exists." }, { status: 400 });
  await setPassword(account, password);
  await col.deleteMany({ uid: account.uid });
  await logActivity({ uid: account.uid, name: account.name || account.email, role: account.role }, "Login", "Set a new password from the reset link", "", req);
  return NextResponse.json({ ok: true });
}
