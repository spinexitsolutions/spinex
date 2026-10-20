import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession, guard } from "@/lib/admin-guard";
import { ContentConflictError, getVersion, readContentDoc, saveContent } from "@/lib/content-server";
import { defaultContent, mergeContent } from "@/lib/content";
import { cleanContentInput, sanitizeUrls } from "@/lib/content-sanitize";

// Restores an older version. The current content is kept as a version too, so this can be undone.
// Responds with the restored content and the new "x-content-updated" save time.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("content");
  if (deny) return deny;
  try {
    const version = await getVersion(params.id);
    if (!version) return NextResponse.json({ error: "That version no longer exists." }, { status: 404 });
    const raw: unknown = version.data;
    const saved = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    // Same clean-up as a normal save, so an old version can't bring back unsafe links or broken values.
    const data = sanitizeUrls(mergeContent(defaultContent, cleanContentInput(saved, defaultContent)));
    // Only owners and admins may change tracking IDs, also by restoring an old version.
    const session = await getSession();
    if (session?.role !== "owner" && session?.role !== "admin") data.integrations = (await readContentDoc()).content.integrations;
    const updatedAt = await saveContent(data, "Before restoring an older version");
    revalidateTag("content");
    return NextResponse.json(data, { headers: { "x-content-updated": updatedAt } });
  } catch (e) {
    if (e instanceof ContentConflictError) return NextResponse.json({ error: e.message, conflict: true }, { status: 409 });
    console.error("Could not restore the content version:", e);
    return NextResponse.json({ error: "Couldn't restore that version. Please try again." }, { status: 500 });
  }
}
