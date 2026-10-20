import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { guard } from "@/lib/admin-guard";
import { cleanPost, postsCol, toPost, uniqueSlug } from "@/lib/post-db";

export async function GET() {
  const deny = await guard("content");
  if (deny) return deny;
  const docs = await (await postsCol()).find({}, { projection: { body: 0 } }).sort({ updatedAt: -1 }).limit(1000).toArray();
  return NextResponse.json(docs.map(toPost));
}

export async function POST(req: Request) {
  const deny = await guard("content");
  if (deny) return deny;
  const data = cleanPost(await req.json().catch(() => ({})));
  const title = String(data.title || "Untitled post");
  const stamp = new Date().toISOString();
  const doc = {
    title,
    excerpt: "", cover: "", body: "", category: "", tags: [], author: "Spinex Team", seoTitle: "", seoDescription: "",
    ...data,
    slug: await uniqueSlug(String(data.slug || title)),
    status: data.status ?? "draft",
    publishedAt: data.publishedAt || (data.status === "published" ? stamp.slice(0, 10) : ""),
    createdAt: stamp,
    updatedAt: stamp,
  };
  const { insertedId } = await (await postsCol()).insertOne(doc);
  revalidateTag("posts");
  return NextResponse.json(toPost({ _id: insertedId, ...doc }), { status: 201 });
}
