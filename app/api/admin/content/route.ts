import { NextResponse } from "next/server";
import { contentChanges, logActivity } from "@/lib/activity";
import { allowed } from "@/lib/roles";
import { revalidateTag } from "next/cache";
import { getSession, guard } from "@/lib/admin-guard";
import { ContentConflictError, readContentDoc, saveContent } from "@/lib/content-server";
import { defaultContent, mergeContent } from "@/lib/content";
import { cleanContentInput, sanitizeUrls } from "@/lib/content-sanitize";

// The admin panel sends back the "x-content-updated" value it loaded as "x-base-updated" when saving,
// so a save never silently overwrites changes someone else made in the meantime.
export async function GET() {
  const deny = await guard("content", "view", false);
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
  // A wrong file (e.g. another JSON backup) would otherwise reset the whole site to the defaults.
  if (!Object.keys(defaultContent).some((k) => k in body)) {
    return NextResponse.json({ error: "This file doesn't look like website content." }, { status: 400 });
  }
  const data = sanitizeUrls(mergeContent(defaultContent, cleanContentInput(body as Record<string, unknown>, defaultContent)));
  // Tracking IDs (GA, GTM, pixel…) end up as scripts on every page: only owners and admins may change them.
  const session = await getSession();
  if (!allowed(session, "integrations", "edit")) {
    try {
      data.integrations = (await readContentDoc()).content.integrations;
    } catch (e) {
      console.error("Could not load site content:", e);
      return NextResponse.json({ error: "Couldn't load the website content from the database. Please try again." }, { status: 503 });
    }
  }
  // "none" = the panel loaded before any content was saved; "unknown" = it never got the version.
  const raw = req.headers.get("x-base-updated")?.trim() || "";
  const base = raw === "none" ? "" : raw === "unknown" ? "unknown" : raw || undefined;
  const before = await readContentDoc().then((d) => d.content as unknown as Record<string, unknown>).catch(() => null);
  let updatedAt: string;
  try {
    updatedAt = await saveContent(data, "Saved", base);
  } catch (e) {
    if (e instanceof ContentConflictError) return NextResponse.json({ error: e.message, conflict: true }, { status: 409 });
    throw e;
  }
  revalidateTag("content");
  const parts = contentChanges(before, data as unknown as Record<string, unknown>);
  if (parts.length) await logActivity(session, "Website content", `Changed ${parts.join(", ")}`, "", req);
  return NextResponse.json(data, { headers: { "x-content-updated": updatedAt } });
}
