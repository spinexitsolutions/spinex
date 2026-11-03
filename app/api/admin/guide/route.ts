import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSession, unauthorized } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

// Admin panel help guide (PDF). Only for people signed in to the admin panel.
export async function GET() {
  if (!(await getSession())) return unauthorized();
  try {
    const pdf = await readFile(join(process.cwd(), "docs", "admin-guide.pdf"));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Spinex-Admin-Panel-Guide.pdf"',
        "Cache-Control": "private, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Guide not found", { status: 404 });
  }
}
