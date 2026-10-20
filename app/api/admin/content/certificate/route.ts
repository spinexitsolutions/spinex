import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { guard } from "@/lib/admin-guard";
import { ContentConflictError, readContentDoc, saveContent } from "@/lib/content-server";
import { cleanCertificate } from "@/lib/content-sanitize";

// Certificate settings (title, text, verify link, signers). HR can change these without access to the
// rest of the website content. Only the certificate part is replaced; the save goes into version history.
export async function PUT(req: Request) {
  const deny = (await guard("people")) && (await guard("content"));
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as { certificate?: unknown } | null;
  // The admin panel sends the content version it loaded; we report whether it was still current,
  // so the panel doesn't hide someone else's newer save from its own next content save.
  // "none" = the panel loaded before any content was saved (same as an empty save time).
  const rawBase = (req.headers.get("x-base-updated") ?? "").trim();
  const clientBase = rawBase === "none" ? "" : rawBase;
  const certificate = cleanCertificate(body && typeof body === "object" ? body.certificate : null);
  if (!certificate) {
    return NextResponse.json({ error: "Check the certificate settings: title, text and verify link must be text, with at most 3 signers." }, { status: 400 });
  }
  // Read, change and save with a concurrency check, so an admin saving other content at the same
  // moment isn't overwritten. On a clash, read the fresh copy and try again.
  for (let attempt = 0; attempt < 3; attempt++) {
    let doc;
    try {
      doc = await readContentDoc();
    } catch (e) {
      console.error("Could not load site content:", e);
      return NextResponse.json({ error: "Couldn't load the website content from the database. Please try again." }, { status: 503 });
    }
    try {
      const updatedAt = await saveContent({ ...doc.content, certificate }, "Before changing certificate settings", doc.updatedAt || undefined);
      revalidateTag("content");
      const baseWasCurrent = rawBase !== "" && rawBase !== "unknown" && clientBase === (doc.updatedAt || "");
      return NextResponse.json({ certificate }, { headers: { "x-content-updated": updatedAt, "x-base-current": baseWasCurrent ? "1" : "0" } });
    } catch (e) {
      if (!(e instanceof ContentConflictError)) throw e;
    }
  }
  return NextResponse.json({ error: "The website content is being saved by someone else right now. Please try again.", conflict: true }, { status: 409 });
}
