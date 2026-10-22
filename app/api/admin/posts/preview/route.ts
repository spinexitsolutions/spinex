import { NextResponse } from "next/server";
import { getSession, guard, jsonBody } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { cleanPost } from "@/lib/post-db";

// "Preview" in the blog editor: keeps the post as it is on screen (saved or not) for this person only,
// so /blog/preview can show it with the real website design before it goes live.
export async function POST(req: Request) {
  const deny = await guard("blog", "view");
  if (deny) return deny;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const data = cleanPost(await jsonBody(req));
  await (await getDb()).collection<{ _id: string }>("settings").updateOne(
    { _id: `post_preview:${s.uid}` },
    { $set: { data, updatedAt: new Date() } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true, url: "/blog/preview" });
}

export async function DELETE() {
  const s = await getSession();
  if (s) await (await getDb()).collection<{ _id: string }>("settings").deleteOne({ _id: `post_preview:${s.uid}` }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
