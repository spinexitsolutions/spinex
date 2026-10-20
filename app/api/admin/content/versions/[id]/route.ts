import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { guard } from "@/lib/admin-guard";
import { getVersion, saveContent } from "@/lib/content-server";
import { defaultContent, mergeContent } from "@/lib/content";

// Restores an older version. The current content is kept as a version too, so this can be undone.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("content");
  if (deny) return deny;
  const version = await getVersion(params.id);
  if (!version) return NextResponse.json({ error: "That version no longer exists." }, { status: 404 });
  const data = mergeContent(defaultContent, version.data);
  await saveContent(data, "Before restoring an older version");
  revalidateTag("content");
  return NextResponse.json(data);
}
