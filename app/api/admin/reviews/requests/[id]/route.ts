import { NextResponse } from "next/server";
import { guard, jsonBody } from "@/lib/admin-guard";
import { requestsCol, reviewOid, sendRequest, toRequest } from "@/lib/reviews-db";

// { action: "send" } sends a scheduled or failed request now; { action: "cancel" } stops it.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("leads");
  if (deny) return deny;
  const _id = reviewOid(params.id);
  const col = await requestsCol();
  const doc = _id && (await col.findOne({ _id }));
  if (!_id || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const r = toRequest(doc);
  const { action } = await jsonBody(req);
  if (action === "cancel" && r.status === "scheduled") await col.updateOne({ _id }, { $set: { status: "cancelled" } });
  else if (action === "send" && (r.status === "scheduled" || r.status === "failed")) {
    if (r.status === "failed") await col.updateOne({ _id }, { $set: { status: "scheduled" } });
    const ok = await sendRequest({ ...r, status: "scheduled" }, false);
    if (!ok) return NextResponse.json({ error: "The email couldn't be sent. Check API keys → Email alerts." }, { status: 502 });
  } else return NextResponse.json({ error: "That can't be done now." }, { status: 400 });
  return NextResponse.json(toRequest((await col.findOne({ _id }))!));
}
