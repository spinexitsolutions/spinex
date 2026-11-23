import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { demoOid, linksCol, toLink } from "@/lib/demos-db";

export const dynamic = "force-dynamic";

// Turn a link off or on, give it more days or more views.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("demos");
  if (deny) return deny;
  const _id = demoOid(params.id);
  if (!_id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const col = await linksCol();
  const cur = await col.findOne({ _id });
  if (!cur) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const b = await jsonBody(req);
  const set: Record<string, unknown> = {};
  let what = "";
  if (b.action === "off") { set.revoked = true; what = "Turned off"; }
  else if (b.action === "on") { set.revoked = false; what = "Turned on"; }
  else if (b.action === "extend") {
    const days = Math.min(90, Math.max(1, Math.round(Number(b.days) || 3)));
    const from = Math.max(Date.now(), Date.parse(String(cur.expiresAt)) || 0);
    set.expiresAt = new Date(from + days * 864e5).toISOString();
    set.revoked = false;
    what = `Gave ${days} more days to`;
  } else if (b.action === "views") {
    const more = Math.min(100, Math.max(1, Math.round(Number(b.views) || 3)));
    set.maxViews = (Number(cur.maxViews) || 0) === 0 ? 0 : Math.max(Number(cur.views) || 0, Number(cur.maxViews) || 0) + more;
    what = `Gave ${more} more views to`;
  } else return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const doc = await col.findOneAndUpdate({ _id }, { $set: set }, { returnDocument: "after" });
  await logActivity(await getSession(), "Demo videos", `${what} the link for ${String(cur.client)}`, "", req);
  return NextResponse.json(toLink(doc!));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("demos");
  if (deny) return deny;
  const _id = demoOid(params.id);
  if (!_id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const col = await linksCol();
  const cur = await col.findOneAndDelete({ _id });
  if (!cur) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await logActivity(await getSession(), "Demo videos", `Deleted the link for ${String(cur.client)}`, "", req);
  return NextResponse.json({ ok: true });
}
