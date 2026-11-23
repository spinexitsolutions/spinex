import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { demoOid, linksCol, newDemoToken, toLink, videosCol } from "@/lib/demos-db";

export const dynamic = "force-dynamic";

// A new private link to one video, for one client.
export async function POST(req: Request) {
  const deny = await guard("demos");
  if (deny) return deny;
  const b = await jsonBody(req);
  const vid = demoOid(String(b.videoId ?? ""));
  const video = vid ? await (await videosCol()).findOne({ _id: vid }) : null;
  if (!video) return NextResponse.json({ error: "Choose a video." }, { status: 400 });
  if (video.status !== "ready") return NextResponse.json({ error: "This video is still being prepared. Try again in a minute." }, { status: 400 });
  const client = String(b.client ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!client) return NextResponse.json({ error: "Type the client's name." }, { status: 400 });
  const phone = String(b.phone ?? "").replace(/[^\d+ ]/g, "").trim().slice(0, 20);
  const days = Math.min(90, Math.max(1, Math.round(Number(b.days) || 3)));
  const maxViews = Math.min(100, Math.max(0, Math.round(Number(b.maxViews) || 0)));
  const pin = String(b.pin ?? "").replace(/\D/g, "").slice(0, 6);
  if (pin && pin.length < 4) return NextResponse.json({ error: "The PIN needs 4 to 6 digits." }, { status: 400 });
  const s = await getSession();
  const col = await linksCol();
  const doc = {
    videoId: String(vid), title: String(video.title ?? ""), token: newDemoToken(), client, phone, expiresAt: new Date(Date.now() + days * 864e5).toISOString(), maxViews, views: 0,
    pin, showName: b.showName !== false, revoked: false, createdAt: new Date().toISOString(), lastViewedAt: "", pinFails: 0, by: s?.name || s?.email || "",
  };
  const { insertedId } = await col.insertOne(doc);
  await logActivity(s, "Demo videos", `Made a link to "${String(video.title)}" for ${client}`, "", req);
  return NextResponse.json(toLink({ _id: insertedId, ...doc }));
}
