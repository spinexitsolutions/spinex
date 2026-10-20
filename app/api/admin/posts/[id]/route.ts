import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { guard } from "@/lib/admin-guard";
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
  const data = cleanPost(await req.json().catch(() => ({})));
  if (data.title === "") return NextResponse.json({ error: "Add a title." }, { status: 400 });
  if (data.slug !== undefined || data.title !== undefined) {
    data.slug = await uniqueSlug(String(data.slug || data.title || "post"), params.id);
  }
  if (data.status === "published" && !data.publishedAt) data.publishedAt = new Date().toISOString().slice(0, 10);
  const doc = await (await postsCol()).findOneAndUpdate({ _id }, { $set: { ...data, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  if (!doc) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  revalidateTag("posts");
  return NextResponse.json(toPost(doc));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await guard("content");
  if (deny) return deny;
  const _id = oid(params.id);
  if (!_id) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  await (await postsCol()).deleteOne({ _id });
  revalidateTag("posts");
  return NextResponse.json({ ok: true });
}
