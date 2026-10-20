import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { guard } from "@/lib/admin-guard";
import { readContentFromDb, saveContent } from "@/lib/content-server";
import { defaultContent, mergeContent, type SiteContent } from "@/lib/content";

export async function GET() {
  const deny = await guard("content", false);
  if (deny) return deny;
  return NextResponse.json(await readContentFromDb());
}

export async function PUT(req: Request) {
  const deny = await guard("content");
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const data = mergeContent(defaultContent, body as Partial<SiteContent>);
  await saveContent(data);
  revalidateTag("content");
  return NextResponse.json(data);
}
