import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { revalidateTag } from "next/cache";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { oid } from "@/lib/intern-db";
import { cleanPost, postsCol, toPost, uniqueSlug } from "@/lib/post-db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const deny = await guard("content");
  if (deny) return deny;
  const _id = oid(params.id);
  const doc = _id ? await (await postsCol()).findOne({ _id }) : null;
  if (!doc) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json(toPost(doc));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const deny = await guard("content");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  const data = cleanPost(await jsonBody(req));
  if (data.title === "") return NextResponse.json({ error: "Add a title." }, { status: 400 });
  if (data.slug !== undefined || data.title !== undefined) {
    data.slug = await uniqueSlug(String(data.slug || data.title || "post"), params.id);
  }
  if (data.status === "published" && !data.publishedAt) data.publishedAt = new Date().toISOString().slice(0, 10);
  const doc = await (await postsCol()).findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  if (!doc) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  revalidateTag("posts");
  await logActivity(await getSession(), "Blog", data.status === "published" ? "Published / updated a post" : "Edited a post", String(doc.title ?? ""), req);
  return NextResponse.json(toPost(doc));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("content");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  const gone = await (await postsCol()).findOneAndDelete({ _id }, { projection: { title: 1 } });
  if (gone) await logActivity(await getSession(), "Blog", "Deleted a post", String(gone.title ?? ""), _req);
  revalidateTag("posts");
  return NextResponse.json({ ok: true });
}
