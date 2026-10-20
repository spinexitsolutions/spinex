import { Readable } from "stream";
import { ObjectId } from "mongodb";
import { hasDb } from "@/lib/db";
import { uploadsBucket } from "@/lib/uploads-server";

// Public: serves an uploaded image. Files never change, so browsers can cache them for a year.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!hasDb() || !ObjectId.isValid(params.id)) return new Response("Not found", { status: 404 });
  const bucket = await uploadsBucket();
  const _id = new ObjectId(params.id);
  const [file] = await bucket.find({ _id }).limit(1).toArray();
  if (!file) return new Response("Not found", { status: 404 });
  const stream = bucket.openDownloadStream(_id);
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    headers: {
      "Content-Type": String(file.metadata?.contentType ?? "application/octet-stream"),
      "Content-Length": String(file.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
