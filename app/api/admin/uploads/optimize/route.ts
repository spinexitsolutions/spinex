import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { guard } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { uploadsBucket } from "@/lib/uploads-server";
import { optimizeImage } from "@/lib/image-optimize";

export const maxDuration = 60;

const streamToBuffer = (s: NodeJS.ReadableStream) =>
  new Promise<Buffer>((resolve, reject) => {
    const parts: Buffer[] = [];
    s.on("data", (c: Buffer) => parts.push(c)).on("error", reject).on("end", () => resolve(Buffer.concat(parts)));
  });

// Makes images uploaded earlier smaller (same link, so nothing on the website needs changing).
// Works in batches of about 40 seconds; the admin screen calls it again until nothing is left.
export async function POST() {
  const deny = await guard("content");
  if (deny) return deny;
  const started = Date.now();
  const bucket = await uploadsBucket();
  const filesCol = (await getDb()).collection("uploads.files");
  const query = { "metadata.contentType": { $in: ["image/jpeg", "image/png", "image/webp", "image/avif"] }, "metadata.optimized": { $ne: true }, length: { $gt: 150 * 1024 } };
  let done = 0;
  let saved = 0;
  for (const f of await filesCol.find(query).limit(200).toArray()) {
    if (Date.now() - started > 40_000) break;
    const id = f._id as ObjectId;
    const original = await streamToBuffer(bucket.openDownloadStream(id));
    const img = await optimizeImage(original, String(f.metadata?.contentType ?? ""), String(f.filename ?? "image"));
    if (img.changed) {
      // Keep a safety copy until the new version is stored under the same id.
      const backupId = await new Promise<ObjectId>((res, rej) => {
        const up = bucket.openUploadStream(`backup-${f.filename}`, { metadata: { ...(f.metadata ?? {}), optimizeBackup: true } });
        up.on("error", rej).on("finish", () => res(up.id as ObjectId));
        up.end(original);
      });
      await bucket.delete(id);
      await new Promise<void>((res, rej) => {
        const up = bucket.openUploadStreamWithId(id, img.name, { metadata: { contentType: img.type, optimized: true, originalSize: original.length } });
        up.on("error", rej).on("finish", () => res());
        up.end(img.buf);
      });
      await bucket.delete(backupId);
      saved += original.length - img.buf.length;
    } else {
      await filesCol.updateOne({ _id: id }, { $set: { "metadata.optimized": true } });
    }
    done++;
  }
  const left = await filesCol.countDocuments(query);
  return NextResponse.json({ done, left, savedKb: Math.round(saved / 1024) });
}
