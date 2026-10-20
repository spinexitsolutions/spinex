import { Readable } from "stream";
import { GridFSBucket, ObjectId } from "mongodb";
import { guard } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { getIntern } from "@/lib/intern-db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const deny = await guard("people", "view");
  if (deny) return deny;
  const intern = await getIntern(params.id);
  if (!intern?.resumeId || !ObjectId.isValid(intern.resumeId)) return new Response("No resume uploaded.", { status: 404 });
  const bucket = new GridFSBucket(await getDb(), { bucketName: "resumes" });
  const stream = bucket.openDownloadStream(new ObjectId(intern.resumeId));
  const name = (intern.resumeName || `${intern.name}-resume.pdf`).replace(/[^\w.\- ]/g, "");
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "X-Content-Type-Options": "nosniff" },
  });
}
