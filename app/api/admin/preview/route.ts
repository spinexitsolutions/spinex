import { NextResponse } from "next/server";
import { draftMode } from "next/headers";
import { getSession, guard } from "@/lib/admin-guard";
import { defaultContent, mergeContent } from "@/lib/content";
import { cleanContentInput, sanitizeUrls } from "@/lib/content-sanitize";
import { readContentDoc } from "@/lib/content-server";
import { getDb } from "@/lib/db";
import { allowed } from "@/lib/roles";

// "Preview" in the admin panel: keeps the unsaved changes aside (for this person only) and turns on
// preview mode in their browser, so the website shows those changes to them alone until they save or exit.
export async function POST(req: Request) {
  const deny = await guard("content", "view");
  if (deny) return deny;
  const s = await getSession();
  const body = await req.json().catch(() => null);
  if (!s || !body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Nothing to preview." }, { status: 400 });
  // Same clean-up as saving, so a preview can never show something a save wouldn't allow.
  const data = sanitizeUrls(mergeContent(defaultContent, cleanContentInput(body as Record<string, unknown>, defaultContent)));
  if (!allowed(s, "integrations", "edit")) data.integrations = (await readContentDoc()).content.integrations;
  await (await getDb()).collection<{ _id: string }>("settings").updateOne(
    { _id: `content_preview:${s.uid}` },
    { $set: { data, updatedAt: new Date() } },
    { upsert: true },
  );
  draftMode().enable();
  return NextResponse.json({ ok: true });
}

// "Exit preview" (also called after saving): back to the live website, and the preview copy is removed.
export async function DELETE() {
  const s = await getSession();
  draftMode().disable();
  if (s) await (await getDb()).collection<{ _id: string }>("settings").deleteOne({ _id: `content_preview:${s.uid}` }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
