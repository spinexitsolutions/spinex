import { Readable } from "stream";
import { ObjectId } from "mongodb";
import { hasDb } from "@/lib/db";
import { uploadsBucket } from "@/lib/uploads-server";
import { imageHeaders, pickWidth, resized } from "@/lib/img-server";

// Public: serves an uploaded image. Files never change, so browsers can cache them for a year.
// With ?w=320 (or another standard width) a smaller WebP copy of a photo is sent instead.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!hasDb() || !ObjectId.isValid(params.id)) return new Response("Not found", { status: 404 });
  const bucket = await uploadsBucket();
  const _id = new ObjectId(params.id);
  const [file] = await bucket.find({ _id }).limit(1).toArray();
  if (!file) return new Response("Not found", { status: 404 });
  const type = String(file.metadata?.contentType ?? "");
  const w = pickWidth(new URL(req.url).searchParams.get("w"));
  if (w && /^image\/(jpeg|png|webp|avif)$/.test(type)) {
    try {
      const buf = await resized(`file:${params.id}`, async () => {
        const chunks: Buffer[] = [];
        for await (const c of bucket.openDownloadStream(_id)) chunks.push(c as Buffer);
        return Buffer.concat(chunks);
      }, w);
      return new Response(new Uint8Array(buf), { headers: imageHeaders });
    } catch {
      // fall through to the original file
    }
  }
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
