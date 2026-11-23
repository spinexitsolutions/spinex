import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasDb } from "@/lib/db";
import { linkState } from "@/lib/demos";
import { PASS_HOURS, checkPass, linksCol, makePass, passCookie, toLink } from "@/lib/demos-db";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

// The client pressed Play on /v/<token>: check the link (and PIN), count one view and give this browser a
// pass to stream the video for a few hours. Reloading within that time doesn't count again.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{8,40}$/.test(token)) return bad("This link isn't valid.", 404);
  const col = await linksCol();
  const doc = await col.findOne({ token });
  if (!doc) return bad("This link isn't valid.", 404);
  const link = toLink(doc);
  if (link.revoked) return bad("This link has been turned off.", 410);
  if (await checkPass(cookies().get(passCookie(token))?.value, token)) return NextResponse.json({ ok: true, viewsLeft: link.maxViews ? Math.max(0, link.maxViews - link.views) : null });

  const state = linkState(link);
  if (state === "expired") return bad("This link has expired.", 410);
  if (state === "used") return bad("All views of this link have been used.", 410);

  if (link.pin) {
    if (Number(doc.pinFails) >= 10) return bad("Too many wrong PINs. Please ask us for a new link.", 429);
    const pin = String(((await req.json().catch(() => ({}))) as { pin?: unknown }).pin ?? "").replace(/\D/g, "");
    if (pin !== link.pin) {
      await col.updateOne({ _id: doc._id }, { $inc: { pinFails: 1 } });
      return bad("That PIN isn't right.", 403);
    }
  }

  const now = new Date();
  const counted = await col.findOneAndUpdate(
    { _id: doc._id, revoked: { $ne: true }, expiresAt: { $gt: now.toISOString() }, $or: [{ maxViews: 0 }, { $expr: { $lt: ["$views", "$maxViews"] } }] },
    { $inc: { views: 1 }, $set: { lastViewedAt: now.toISOString(), pinFails: 0 } },
    { returnDocument: "after" },
  );
  if (!counted) return bad("This link can't be played any more.", 410);
  const l = toLink(counted);
  const res = NextResponse.json({ ok: true, viewsLeft: l.maxViews ? Math.max(0, l.maxViews - l.views) : null }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(passCookie(token), await makePass(token, l.id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: `/api/demo/${token}`, maxAge: PASS_HOURS * 3600 });
  return res;
}
