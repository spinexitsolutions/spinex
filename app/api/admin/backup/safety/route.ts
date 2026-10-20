import { NextResponse } from "next/server";
import { guard } from "@/lib/admin-guard";
import { listSafetyCopies, readSafetyCopy } from "@/lib/automation";

// Owner only: the copies saved automatically just before each restore (last 3). ?id= downloads one.
export async function GET(req: Request) {
  const deny = await guard("users");
  if (deny) return deny;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json(await listSafetyCopies());
  const f = await readSafetyCopy(id);
  if (!f) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new Response(new Uint8Array(f.file), {
    headers: { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="before-restore-${f.name}"`, "Cache-Control": "no-store" },
  });
}
