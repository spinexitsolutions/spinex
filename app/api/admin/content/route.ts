import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { guard } from "@/lib/admin-guard";
import { ContentConflictError, readContentDoc, saveContent } from "@/lib/content-server";
import { defaultContent, mergeContent } from "@/lib/content";
import { cleanContentInput, sanitizeUrls } from "@/lib/content-sanitize";

// The admin panel sends back the "x-content-updated" value it loaded as "x-base-updated" when saving,
// so a save never silently overwrites changes someone else made in the meantime.
export async function GET() {
  const deny = await guard("content", false);
  if (deny) return deny;
  try {
    const { content, updatedAt } = await readContentDoc();
    return NextResponse.json(content, { headers: { "x-content-updated": updatedAt } });
  } catch (e) {
    console.error("Could not load site content:", e);
    return NextResponse.json({ error: "Couldn't load the website content from the database. Please try again." }, { status: 503 });
  }
}

export async function PUT(req: Request) {
  const deny = await guard("content");
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const data = sanitizeUrls(mergeContent(defaultContent, cleanContentInput(body as Record<string, unknown>, defaultContent)));
  // "none" = the panel loaded before any content was saved; "unknown" = it never got the version.
  const raw = req.headers.get("x-base-updated")?.trim() || "";
  const base = raw === "none" ? "" : raw === "unknown" ? "unknown" : raw || undefined;
  let updatedAt: string;
  try {
    updatedAt = await saveContent(data, "Saved", base);
  } catch (e) {
    if (e instanceof ContentConflictError) return NextResponse.json({ error: e.message, conflict: true }, { status: 409 });
    throw e;
  }
  revalidateTag("content");
  return NextResponse.json(data, { headers: { "x-content-updated": updatedAt } });
}
