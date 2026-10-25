import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { emailPerson } from "@/lib/notify";
import { getContent } from "@/lib/content-server";
import { clientsCol, hashSecret, loginsCol, newLinkToken, originOf, pOid, toClient } from "@/lib/portal-db";

// { action: "invite" }  emails the client how to log in.
// { action: "link" }    makes a one-time login link (7 days) to send on WhatsApp.
// { action: "logout" }  ends all of the client's sessions.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("clients");
  if (deny) return deny;
  const _id = pOid(params.id);
  const col = await clientsCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const c = toClient(doc);
  if (!c.active) return NextResponse.json({ error: "This client's login is switched off. Switch it on first." }, { status: 400 });
  const action = String((await jsonBody(req)).action ?? "");
  const origin = originOf(req);
  const session = await getSession();

  if (action === "logout") {
    await col.updateOne({ _id }, { $inc: { tokenVersion: 1 } });
    await (await loginsCol()).deleteMany({ clientId: c.id });
    await logActivity(session, "Client portal", "Logged a client out everywhere", c.company || c.name, req);
    return NextResponse.json({ ok: true, message: "Logged out on all devices." });
  }

  if (action === "link") {
    const t = newLinkToken();
    await (await loginsCol()).insertOne({ kind: "link", clientId: c.id, hash: hashSecret(t), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) });
    await logActivity(session, "Client portal", "Made a one-time login link", c.company || c.name, req);
    return NextResponse.json({ ok: true, url: `${origin}/portal/magic?t=${t}` });
  }

  if (action === "invite") {
    const brand = (await getContent()).brand.name || "Spinex IT Solutions";
    const ok = await emailPerson(c.email, `Your ${brand} client portal`, "Your client portal is ready", [
      `Hi ${c.name.split(" ")[0] || "there"},`,
      `You can now follow your project with ${brand} online: see progress and updates, download files, check invoices and send us support requests.`,
      `To log in, open the portal and enter this email address (${c.email}). We'll email you a 6-digit code. No password needed.`,
    ], { label: "Open client portal", url: `${origin}/portal/login?email=${encodeURIComponent(c.email)}` });
    if (!ok) return NextResponse.json({ error: "The email couldn't be sent. Check Admin → API keys → Email alerts, or use Copy login link." }, { status: 502 });
    await col.updateOne({ _id }, { $set: { invitedAt: new Date().toISOString() } });
    await logActivity(session, "Client portal", `Emailed a portal invite to ${c.email}`, c.company || c.name, req);
    return NextResponse.json({ ok: true, message: `Invite sent to ${c.email}` });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
