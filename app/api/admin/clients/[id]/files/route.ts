import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession, guard } from "@/lib/admin-guard";
import { clientsCol, listPortalFiles, pOid, portalFilesBucket, savePortalFile, toClient } from "@/lib/portal-db";

type Ctx = { params: { id: string } };

// The team shares a file with the client. Fields: "file", optional "note" and "projectId".
export async function POST(req: Request, { params }: Ctx) {
  const deny = await guard("clients");
  if (deny) return deny;
  const _id = pOid(params.id);
  const doc = _id && (await (await clientsCol()).findOne({ _id }));
  if (!doc) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const c = toClient(doc);
  const session = await getSession();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  const projectId = String(form?.get("projectId") ?? "");
  const out = await savePortalFile(file, {
    clientId: c.id,
    projectId: c.projects.some((p) => p.id === projectId) ? projectId : "",
    by: "team",
    byName: session?.name ?? "Team",
    note: String(form?.get("note") ?? ""),
  });
  if ("error" in out) return NextResponse.json({ error: out.error }, { status: 400 });
  await logActivity(session, "Client portal", `Shared file ${file.name}`, c.company || c.name, req);
  return NextResponse.json({ files: await listPortalFiles(c.id) }, { status: 201 });
}

// ?fid= removes one file.
export async function DELETE(req: Request, { params }: Ctx) {
  const deny = await guard("clients");
  if (deny) return deny;
  const fid = pOid(new URL(req.url).searchParams.get("fid") ?? "");
  const bucket = await portalFilesBucket();
  const f = fid && (await bucket.find({ _id: fid, "metadata.clientId": params.id }).limit(1).toArray())[0];
  if (!fid || !f) return NextResponse.json({ error: "File not found." }, { status: 404 });
  await bucket.delete(fid);
  await logActivity(await getSession(), "Client portal", `Deleted file ${f.filename}`, "", req);
  return NextResponse.json({ files: await listPortalFiles(params.id) });
}
