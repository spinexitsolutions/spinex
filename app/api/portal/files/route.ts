import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/antispam";
import { getClientSession } from "@/lib/client-auth";
import { notifyAdmin } from "@/lib/notify";
import { originOf, savePortalFile, tooBig } from "@/lib/portal-db";

// The client sends files to the team (logo, photos, content …). Field "file", optional "note" and "projectId".
export async function POST(req: Request) {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (await rateLimited(`portal-upload:${client.id}:${clientIp(req)}`, 40, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many uploads. Please wait a while." }, { status: 429 });
  if (tooBig(req)) return NextResponse.json({ error: "That file is larger than 4 MB. Share big files as a Google Drive link in a support message." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  const projectId = String(form?.get("projectId") ?? "");
  const out = await savePortalFile(file, {
    clientId: client.id,
    projectId: client.projects.some((p) => p.id === projectId) ? projectId : "",
    by: "client",
    byName: client.name,
    note: String(form?.get("note") ?? ""),
  });
  if ("error" in out) return NextResponse.json({ error: out.error }, { status: 400 });
  await notifyAdmin(`New file from ${client.company || client.name}`, [["Client", client.company || client.name], ["File", file.name], ["Note", String(form?.get("note") ?? "")]], `${originOf(req)}/admin/clients/${client.id}`);
  return NextResponse.json({ ok: true, id: out.id }, { status: 201 });
}
