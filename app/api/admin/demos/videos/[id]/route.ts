import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { deleteAtFor, deleteDemoVideo, demoOid, toVideo, videosCol } from "@/lib/demos-db";

export const dynamic = "force-dynamic";

// Rename a demo video, or change how long it is kept ({ keepDays }: days from now, 0 = keep).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("demos");
  if (deny) return deny;
  const _id = demoOid(params.id);
  if (!_id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const b = await jsonBody(req);
  const set: Record<string, unknown> = {};
  if (b.keepDays !== undefined) set.deleteAt = deleteAtFor(Math.min(365, Math.max(0, Math.round(Number(b.keepDays) || 0))));
  if (b.title !== undefined) {
    const title = String(b.title ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!title) return NextResponse.json({ error: "Give the video a name." }, { status: 400 });
    set.title = title;
  }
  const doc = await (await videosCol()).findOneAndUpdate({ _id }, { $set: set }, { returnDocument: "after" });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(toVideo(doc));
}

// Delete a demo video, its file and all its client links.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("demos");
  if (deny) return deny;
  const _id = demoOid(params.id);
  if (!_id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const doc = await (await videosCol()).findOne({ _id });
  if (!(await deleteDemoVideo(_id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await logActivity(await getSession(), "Demo videos", `Deleted "${String(doc?.title ?? "")}" and its links`, "", req);
  return NextResponse.json({ ok: true });
}
