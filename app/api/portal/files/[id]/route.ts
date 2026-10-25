import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getSession } from "@/lib/admin-guard";
import { can } from "@/lib/roles";
import { getClientSession } from "@/lib/client-auth";
import { pOid, portalFilesBucket } from "@/lib/portal-db";

// Download a portal file: the client it belongs to, or a team member with Client portal access.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const _id = pOid(params.id);
  if (!_id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const bucket = await portalFilesBucket();
  const file = (await bucket.find({ _id }).limit(1).toArray())[0];
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const owner = String(file.metadata?.clientId ?? "");
  const client = await getClientSession();
  const ok = (client && client.id === owner) || can(await getSession(), "clients", "view");
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const stream = Readable.toWeb(bucket.openDownloadStream(_id)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": String(file.metadata?.contentType || "application/octet-stream"),
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
