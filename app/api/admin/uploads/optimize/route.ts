import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { guard } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { uploadsBucket } from "@/lib/uploads-server";
import { optimizeImage } from "@/lib/image-optimize";
import { readState, writeState } from "@/lib/settings-db";

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
  const query = {
    "metadata.contentType": { $in: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
    "metadata.optimized": { $ne: true },
    "metadata.optimizeBackup": { $ne: true },
    length: { $gt: 150 * 1024 },
  };
  // Only one batch at a time (two editors pressing the button together would fight over the same files).
  const lock = await readState("optimize");
  if (lock.running && Date.now() - Number(lock.running) < 90_000) return NextResponse.json({ error: "Images are already being optimised. Try again in a minute." }, { status: 409 });
  await writeState("optimize", { running: Date.now() });
  try {
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
      const put = (buf: Buffer, name: string, metadata: Record<string, unknown>) =>
        new Promise<void>((res, rej) => {
          const up = bucket.openUploadStreamWithId(id, name, { metadata });
          up.on("error", rej).on("finish", () => res());
          up.end(buf);
        });
      await bucket.delete(id);
      try {
        await put(img.buf, img.name, { contentType: img.type, optimized: true, originalSize: original.length });
      } catch (e) {
        // Writing the smaller file failed: put the original back under the same id so nothing breaks.
        await bucket.delete(id).catch(() => undefined); // remove any half-written copy
        await put(original, String(f.filename ?? "image"), { ...(f.metadata ?? {}), optimized: true });
        console.error("Optimise failed, original restored:", e);
      }
      await bucket.delete(backupId);
      saved += original.length - img.buf.length;
    } else {
      await filesCol.updateOne({ _id: id }, { $set: { "metadata.optimized": true } });
    }
    done++;
  }
  const left = await filesCol.countDocuments(query);
  return NextResponse.json({ done, left, savedKb: Math.round(saved / 1024) });
  } finally {
    await writeState("optimize", { running: 0 });
  }
}
